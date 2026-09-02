/**
 * 株式会社アース 入居者管理システム
 * 全データクラウド同期用 Google Apps Script
 *
 * 書き込みは A/B 二重領域のうち非稼働側へ保存・検証してから切り替えます。
 * ScriptLock により複数端末からの同時書き込みも直列化します。
 */

var CLOUD_SHEET_NAME = '_クラウド同期';
var RESIDENT_SHEET_NAME = '入居者データ';
var CHUNK_SIZE = 40000;

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cloudSheet = ss.getSheetByName(CLOUD_SHEET_NAME);
    var currentRevision = cloudSheet ? String(cloudSheet.getRange('B1').getValue() || '') : '';
    var requestedRevision = e && e.parameter ? String(e.parameter.since || '') : '';
    if (currentRevision && requestedRevision === currentRevision) {
      return jsonOutput_({
        status: 'success',
        storageMode: 'canonical',
        unchanged: true,
        revision: currentRevision
      });
    }
    var canonical = readCanonicalState_(ss);
    if (canonical) {
      return jsonOutput_({
        status: 'success',
        storageMode: 'canonical',
        revision: canonical.revision,
        updatedAt: canonical.updatedAt,
        data: canonical.data
      });
    }

    return jsonOutput_({
      status: 'success',
      storageMode: 'legacy',
      residents: readLegacyResidents_(ss),
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    return jsonOutput_({ status: 'error', message: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      throw new Error('他の端末が保存中です。しばらくしてから自動再送します。');
    }

    var payload = JSON.parse(e.postData.contents || '{}');
    var cloudData = payload.data || {
      schemaVersion: 1,
      residents: payload.residents || [],
      masters: payload.masters || {},
      columns: payload.columns || [],
      moveOutLogs: payload.moveOutLogs || [],
      snapshots: payload.snapshots || [],
      lastUpdated: payload.timestamp || new Date().toISOString()
    };

    if (!cloudData || !Array.isArray(cloudData.residents)) {
      throw new Error('保存データの形式が不正です');
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = writeCanonicalState_(ss, cloudData, payload.requestId || 'manual');

    // 人が確認しやすい一覧表も更新する。同期の正本は二重保存領域側。
    writeReadableResidents_(ss, cloudData.residents);

    return jsonOutput_({
      status: 'success',
      message: '全データのクラウド保存が完了しました',
      revision: result.revision,
      updatedAt: result.updatedAt,
      residentCount: cloudData.residents.length
    });
  } catch (err) {
    return jsonOutput_({ status: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function writeCanonicalState_(ss, cloudData, requestId) {
  var sheet = ss.getSheetByName(CLOUD_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CLOUD_SHEET_NAME);
    sheet.getRange('A1:C1').setValues([['A', '', '']]);
    sheet.hideSheet();
  }

  var activeSlot = String(sheet.getRange('A1').getValue() || 'A').toUpperCase() === 'B' ? 'B' : 'A';
  var targetSlot = activeSlot === 'A' ? 'B' : 'A';
  var targetColumn = targetSlot === 'A' ? 1 : 2;
  var json = JSON.stringify(cloudData);
  var chunks = [];
  for (var i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push([json.substring(i, i + CHUNK_SIZE)]);
  }
  if (chunks.length === 0) chunks.push(['{}']);

  var requiredRows = chunks.length + 2;
  if (sheet.getMaxRows() < requiredRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  }

  var checksum = sha256_(json);
  var updatedAt = new Date().toISOString();
  var revision = updatedAt + '_' + requestId;
  var metadata = {
    revision: revision,
    updatedAt: updatedAt,
    chunkCount: chunks.length,
    checksum: checksum,
    schemaVersion: cloudData.schemaVersion || 2
  };

  sheet.getRange(2, targetColumn, sheet.getMaxRows() - 1, 1).clearContent();
  sheet.getRange(3, targetColumn, chunks.length, 1).setValues(chunks);
  sheet.getRange(2, targetColumn).setValue(JSON.stringify(metadata));
  SpreadsheetApp.flush();

  var verified = readSlot_(sheet, targetSlot);
  if (!verified || verified.checksum !== checksum) {
    throw new Error('クラウド保存後の検証に失敗しました。以前の正常データを維持します。');
  }

  // 有効スロットの切り替えを最後の1回の書き込みで行う
  sheet.getRange('A1:C1').setValues([[targetSlot, revision, updatedAt]]);
  SpreadsheetApp.flush();
  return { revision: revision, updatedAt: updatedAt };
}

function readCanonicalState_(ss) {
  var sheet = ss.getSheetByName(CLOUD_SHEET_NAME);
  if (!sheet) return null;

  var activeSlot = String(sheet.getRange('A1').getValue() || 'A').toUpperCase() === 'B' ? 'B' : 'A';
  var primary = readSlot_(sheet, activeSlot);
  if (primary) return primary;

  // 稼働側が破損している場合は直前の正常スロットへ自動フォールバック
  return readSlot_(sheet, activeSlot === 'A' ? 'B' : 'A');
}

function readSlot_(sheet, slot) {
  try {
    var column = slot === 'B' ? 2 : 1;
    var metadataText = String(sheet.getRange(2, column).getValue() || '');
    if (!metadataText) return null;
    var metadata = JSON.parse(metadataText);
    var chunkCount = Number(metadata.chunkCount || 0);
    if (!chunkCount || chunkCount < 1) return null;

    var values = sheet.getRange(3, column, chunkCount, 1).getValues();
    var json = values.map(function(row) { return String(row[0] || ''); }).join('');
    if (sha256_(json) !== metadata.checksum) return null;

    return {
      revision: metadata.revision,
      updatedAt: metadata.updatedAt,
      checksum: metadata.checksum,
      data: JSON.parse(json)
    };
  } catch (err) {
    return null;
  }
}

function sha256_(text) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function writeReadableResidents_(ss, residents) {
  var sheet = ss.getSheetByName(RESIDENT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(RESIDENT_SHEET_NAME);

  var header = [
    '部屋番号', '名前', '介護度', '年齢', '誕生日', '入居日',
    '負担割合', '被保険者番号', '保険者', '認定開始日', '認定満了日', '更新申請状況',
    '訪問医', '口腔衛生', '福祉用具', 'ごはん', 'おかず', 'とろみ', 'エアコン', '早出し',
    '備考', 'フロアメモ', 'フロア予定(JSON)', '物品購入依頼',
    '清掃状況', '入居予定者', '入居予定日', '入居予定補足'
  ];
  var rows = [header];
  residents.forEach(function(r) {
    rows.push([
      r.room || '', r.name || '', r.careLevel || '', r.age || '', r.birthday || '', r.entryDate || '',
      r.copay || r.copayRate || '', r.insNumber || r.insurerNumber || '', r.insurerName || '',
      r.certStartDate || '', r.certEndDate || '', r.certStatus || '',
      r.doctor || '', r.dental || '', r.equipment || '', r.foodMain || r.foodRice || '',
      r.foodSide || r.foodDish || '', r.foodThick || '', r.airConditioner || '〇',
      r.earlyFood || r.earlyDelivery ? 'ON' : '', r.note || '', r.floorMemo || '',
      JSON.stringify(Array.isArray(r.floorEvents) ? r.floorEvents : []), r.purchaseRequest ? 'ON' : '',
      r.cleaningStatus || '', r.plannedResidentName || '', r.plannedEntryDate || '', r.plannedResidentNote || ''
    ]);
  });

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, header.length).setValues(rows);
  sheet.getRange(1, 1, 1, header.length)
    .setBackground('#247d1b')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function readLegacyResidents_(ss) {
  var sheet = ss.getSheetByName(RESIDENT_SHEET_NAME) || ss.getSheetByName('入居者管理表') || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var header = data[0];
  var colMap = {};
  for (var c = 0; c < header.length; c++) {
    var label = String(header[c] || '').trim();
    if (label) colMap[label] = c;
  }

  var getValue = function(row, name, fallbackIndex) {
    if (colMap[name] !== undefined) return row[colMap[name]];
    return fallbackIndex !== undefined && fallbackIndex < row.length ? row[fallbackIndex] : '';
  };
  var residents = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var room = String(getValue(row, '部屋番号', 0) || '').replace(/[^0-9]/g, '');
    if (!room) continue;
    var events = [];
    try { events = JSON.parse(String(getValue(row, 'フロア予定(JSON)') || '[]')); } catch (ignore) {}

    residents.push({
      id: 'res_' + room,
      room: room,
      floor: room.indexOf('2') === 0 ? 2 : (room.indexOf('3') === 0 ? 3 : 1),
      name: String(getValue(row, '名前', 1) || '').trim(),
      careLevel: String(getValue(row, '介護度', 2) || '').trim(),
      age: getValue(row, '年齢', 3) ? parseInt(getValue(row, '年齢', 3), 10) : null,
      birthday: formatCellDate_(getValue(row, '誕生日', 4)),
      entryDate: formatCellDate_(getValue(row, '入居日', 5)),
      copay: String(getValue(row, '負担割合', 6) || '').trim(),
      insNumber: String(getValue(row, '被保険者番号', 7) || '').trim(),
      insurerName: String(getValue(row, '保険者', 8) || '').trim(),
      certStartDate: formatCellDate_(getValue(row, '認定開始日', 9)),
      certEndDate: formatCellDate_(getValue(row, '認定満了日', 10)),
      certStatus: String(getValue(row, '更新申請状況', 11) || '').trim(),
      doctor: String(getValue(row, '訪問医', 12) || '').trim(),
      dental: String(getValue(row, '口腔衛生', 13) || '').trim(),
      equipment: String(getValue(row, '福祉用具', 14) || '').trim(),
      foodMain: String(getValue(row, 'ごはん', 15) || '').trim(),
      foodSide: String(getValue(row, 'おかず', 16) || '').trim(),
      foodThick: String(getValue(row, 'とろみ', 17) || '').trim(),
      airConditioner: String(getValue(row, 'エアコン', 18) || '〇').trim(),
      earlyFood: String(getValue(row, '早出し', 19) || '').toUpperCase() === 'ON',
      note: String(getValue(row, '備考') || ''),
      floorMemo: String(getValue(row, 'フロアメモ') || ''),
      floorEvents: Array.isArray(events) ? events : [],
      purchaseRequest: String(getValue(row, '物品購入依頼') || '').toUpperCase() === 'ON',
      cleaningStatus: String(getValue(row, '清掃状況') || ''),
      plannedResidentName: String(getValue(row, '入居予定者') || ''),
      plannedEntryDate: formatCellDate_(getValue(row, '入居予定日')),
      plannedResidentNote: String(getValue(row, '入居予定補足') || ''),
      status: String(getValue(row, '名前', 1) || '').trim() ? '入居中' : '空室'
    });
  }
  return residents;
}

function formatCellDate_(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  }
  return String(value).trim();
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
