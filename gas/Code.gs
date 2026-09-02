/**
 * 株式会社アース 入居者管理システム
 * Google Apps Script (GAS) 連携スクリプト
 * 
 * 【設定方法】
 * 1. Googleスプレッドシートの上部メニュー「拡張機能」>「Apps Script」を開きます。
 * 2. このコードをエディタに貼り付けて保存します。
 * 3. 右上の「デプロイ」>「新しいデプロイ」をクリックします。
 * 4. 種類の選択で「ウェブアプリ」を選択します。
 *    - 次のユーザーとして実行: 「自分」
 *    - アクセスできるユーザー: 「全員」
 * 5. 「デプロイ」をクリックし、発行された「ウェブアプリのURL」をコピーします。
 * 6. 入居者管理Webアプリの「スプレッドシート連携設定」にそのURLを貼り付けます。
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('入居者管理表') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', residents: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var header = data[0];
    var residents = [];

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var room = String(row[0] || '').trim();
      var name = String(row[1] || '').trim();
      
      // 集計行・空行をスキップ
      if (!room || room.indexOf('数') >= 0 || room.indexOf('計') >= 0 || room.indexOf('平均') >= 0) {
        continue;
      }

      var roomNum = room.replace(/[^0-9]/g, '') || room;
      var floor = roomNum.indexOf('2') === 0 ? 2 : (roomNum.indexOf('3') === 0 ? 3 : 1);

      residents.push({
        id: 'res_' + roomNum,
        room: roomNum,
        floor: floor,
        name: name,
        entryDate: formatCellDate(row[2]),
        careLevel: parseCareLevel(row[3]),
        birthday: formatCellDate(row[4]),
        age: row[5] ? parseInt(row[5], 10) : null,
        doctor: String(row[6] || '').trim(),
        dental: String(row[7] || '').trim(),
        equipment: String(row[8] || '').trim(),
        foodMain: String(row[9] || '').trim(),
        foodSide: String(row[10] || '').trim(),
        foodThick: String(row[11] || '').trim(),
        airConditioner: String(row[12] || '〇').trim(),
        earlyFood: Boolean(row[13] && String(row[13]).indexOf('早') >= 0),
        status: name ? '入居中' : '空室',
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
    var sheet = ss.getSheetByName('入居者管理表');
    if (!sheet) {
      sheet = ss.insertSheet('入居者管理表');
    }

    // 既存データをクリアしてヘッダーを書き込み
    sheet.clear();

    var outputRows = [
      ['部屋番号', '名前', '入居日', '介護度', '誕生日', '年齢', '訪問医', '口腔衛生', '福祉用具', 'ごはん', 'おかず', 'とろみ', 'エアコン', '早出し']
    ];

    var totalCare = 0;
    var careCount = 0;
    var totalAge = 0;
    var ageCount = 0;
    var occupiedCount = 0;

    residents.forEach(function(r) {
      if (r.name) {
        occupiedCount++;
        if (r.careLevel) {
          totalCare += parseInt(r.careLevel, 10);
          careCount++;
        }
        if (r.age) {
          totalAge += parseInt(r.age, 10);
          ageCount++;
        }
      }

      outputRows.push([
        r.room,
        r.name || '',
        r.entryDate || '',
        r.careLevel || '',
        r.birthday || '',
        r.age || '',
        r.doctor || '',
        r.dental || '',
        r.equipment || '',
        r.foodMain || '',
        r.foodSide || '',
        r.foodThick || '',
        r.airConditioner || '〇',
        r.earlyFood ? '早出し' : ''
      ]);
    });

    // 集計行
    outputRows.push([]);
    outputRows.push([
      '入居者数', occupiedCount,
      '合計定員', residents.length,
      '平均介護度', careCount > 0 ? (totalCare / careCount).toFixed(2) : 0,
      '平均年齢', ageCount > 0 ? (totalAge / ageCount).toFixed(1) : 0
    ]);

    sheet.getRange(1, 1, outputRows.length, outputRows[0].length).setValues(outputRows);

    // 見出しのスタイル装飾
    sheet.getRange(1, 1, 1, outputRows[0].length)
      .setBackground('#e2f0df')
      .setFontColor('#17332b')
      .setFontWeight('bold');

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'スプレッドシートを更新しました（' + residents.length + '件）',
      updatedCount: residents.length
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

function parseCareLevel(val) {
  if (!val) return null;
  var str = String(val);
  var num = parseInt(str.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}
