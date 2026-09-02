/**
 * 株式会社アース 入居者管理システム
 * Google Apps Script (GAS) 完全自動クラウド共有スクリプト
 * 
 * 【設定手順（1回のみ・3分で完了）】
 * 1. 施設のGoogleスプレッドシートを開きます。
 * 2. 上部メニュー「拡張機能」>「Apps Script」を開きます。
 * 3. このコードをすべてエディタに貼り付けて「保存」します。
 * 4. 右上の「デプロイ」>「新しいデプロイ」をクリックします。
 * 5. 歯車アイコンから「ウェブアプリ」を選択します：
 *    - 次のユーザーとして実行: 「自分」
 *    - アクセスできるユーザー: 「全員」
 * 6. 「デプロイ」をクリックし、発行された「ウェブアプリのURL」をコピーします。
 * 7. Webアプリ側の「クラウド共有設定」に貼り付ければ、全PC・全スタッフで自動共有が始まります！
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('入居者データ') || ss.getSheetByName('入居者管理表') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', residents: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var header = data[0];
    var colMap = {};
    for (var c = 0; c < header.length; c++) {
      var h = String(header[c] || '').trim();
      if (h) colMap[h] = c;
    }

    var residents = [];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var room = String(row[colMap['部屋番号'] !== undefined ? colMap['部屋番号'] : 0] || '').trim();
      var name = String(row[colMap['名前'] !== undefined ? colMap['名前'] : 1] || '').trim();
      
      // 集計行・空行をスキップ
      if (!room || room.indexOf('数') >= 0 || room.indexOf('計') >= 0 || room.indexOf('平均') >= 0) {
        continue;
      }

      var roomNum = room.replace(/[^0-9]/g, '') || room;
      var floor = roomNum.indexOf('2') === 0 ? 2 : (roomNum.indexOf('3') === 0 ? 3 : 1);

      var getVal = function(colName, fallbackIdx) {
        if (colMap[colName] !== undefined) return row[colMap[colName]];
        if (fallbackIdx !== undefined && fallbackIdx < row.length) return row[fallbackIdx];
        return '';
      };

      residents.push({
        id: 'res_' + roomNum,
        room: roomNum,
        floor: floor,
        name: name,
        careLevel: String(getVal('介護度', 2) || '').trim(),
        age: getVal('年齢', 3) ? parseInt(getVal('年齢', 3), 10) : null,
        birthday: formatCellDate(getVal('誕生日', 4)),
        entryDate: formatCellDate(getVal('入居日', 5)),
        copayRate: String(getVal('負担割合', 6) || '').trim(),
        insurerNumber: String(getVal('被保険者番号', 7) || '').trim(),
        insurerName: String(getVal('保険者', 8) || '').trim(),
        certStartDate: formatCellDate(getVal('認定開始日', 9)),
        certEndDate: formatCellDate(getVal('認定満了日', 10)),
        certStatus: String(getVal('更新申請状況', 11) || '').trim(),
        doctor: String(getVal('訪問医', 12) || '').trim(),
        dental: String(getVal('口腔衛生', 13) || '').trim(),
        equipment: String(getVal('福祉用具', 14) || '').trim(),
        foodRice: String(getVal('ごはん', 15) || '').trim(),
        foodDish: String(getVal('おかず', 16) || '').trim(),
        foodThick: String(getVal('とろみ', 17) || '').trim(),
        airConditioner: String(getVal('エアコン', 18) || '〇').trim(),
        earlyDelivery: String(getVal('早出し', 19) || '').trim(),
        isMovedOut: false,
        note: ''
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      residents: residents,
      lastUpdated: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var residents = payload.residents || [];

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('入居者データ') || ss.getSheetByName('入居者管理表');
    if (!sheet) {
      sheet = ss.insertSheet('入居者データ');
    }

    sheet.clear();

    var header = [
      '部屋番号', '名前', '介護度', '年齢', '誕生日', '入居日',
      '負担割合', '被保険者番号', '保険者', '認定開始日', '認定満了日', '更新申請状況',
      '訪問医', '口腔衛生', '福祉用具', 'ごはん', 'おかず', 'とろみ', 'エアコン', '早出し'
    ];

    var outputRows = [header];

    residents.forEach(function(r) {
      outputRows.push([
        r.room || '',
        r.name || '',
        r.careLevel || '',
        r.age || '',
        r.birthday || '',
        r.entryDate || '',
        r.copayRate || '',
        r.insurerNumber || '',
        r.insurerName || '',
        r.certStartDate || '',
        r.certEndDate || '',
        r.certStatus || '',
        r.doctor || '',
        r.dental || '',
        r.equipment || '',
        r.foodRice || '',
        r.foodDish || '',
        r.foodThick || '',
        r.airConditioner || '〇',
        r.earlyDelivery || ''
      ]);
    });

    sheet.getRange(1, 1, outputRows.length, header.length).setValues(outputRows);

    // ヘッダースタイル
    sheet.getRange(1, 1, 1, header.length)
      .setBackground('#247d1b')
      .setFontColor('#ffffff')
      .setFontWeight('bold');

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: '自動保存が完了しました（' + residents.length + '件）',
      updatedCount: residents.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatCellDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy/MM/dd');
  }
  return String(val).trim();
}
