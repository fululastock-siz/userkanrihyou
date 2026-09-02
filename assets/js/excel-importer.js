/**
 * 株式会社アース 入居者管理システム
 * ExcelImporter - .xls / .xlsx / .csv ファイル解析 & 差分プレビューモジュール
 */

(function(window) {
  'use strict';

  // 列名の自動判別用エイリアスマップ
  const COLUMN_ALIASES = {
    room: ['部屋番号', '部屋', '居室番号', '居室', '号室', 'Room', 'room'],
    name: ['名前', '氏名', '入居者名', '利用者名', 'お客様名', 'Name', 'name'],
    entryDate: ['入居日', '入所日', '契約開始日', '入居年月日', 'EntryDate'],
    careLevel: ['介護度', '要介護度', '要介護', 'CareLevel'],
    birthday: ['誕生日', '生年月日', '生年月', 'Birthday'],
    age: ['年齢', 'Age', 'age'],
    doctor: ['訪問医', '往診医', '主治医', 'クリニック', '医療機関', 'Doctor'],
    dental: ['口腔衛生', '訪問歯科', '歯科', 'Dental'],
    equipment: ['福祉用具', '用具', '車椅子', '歩行器', 'レンタル', 'Equipment'],
    foodMain: ['ごはん', '主食', '主食形態', 'ご飯', 'Rice'],
    foodSide: ['おかず', '副食', '副食形態', 'SideDish'],
    foodThick: ['とろみ', 'トロミ', 'Thickener'],
    airConditioner: ['エアコン', '冷暖房', '空調', 'AC'],
    earlyFood: ['早出し', '食事時間', '早出', 'EarlyFood']
  };

  // Excelの日付シリアル値を YYYY/MM/DD に変換
  function excelSerialToDateStr(serial) {
    if (typeof serial === 'number') {
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const y = date_info.getUTCFullYear();
      const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date_info.getUTCDate()).padStart(2, '0');
      return `${y}/${m}/${d}`;
    }
    return String(serial || '');
  }

  // 和暦（S24/06/08, T15/3/21 など）や日付文字列の正規化
  function normalizeDateStr(val) {
    if (!val) return '';
    if (typeof val === 'number') return excelSerialToDateStr(val);
    return String(val).trim();
  }

  // 介護度の正規化 (1〜5 または 要介護1〜5)
  function normalizeCareLevel(val) {
    if (val === null || val === undefined || val === '') return null;
    const str = String(val).trim();
    if (str.includes('5')) return 5;
    if (str.includes('4')) return 4;
    if (str.includes('3')) return 3;
    if (str.includes('2')) return 2;
    if (str.includes('1')) return 1;
    if (str.includes('支援2')) return '要支援2';
    if (str.includes('支援1')) return '要支援1';
    if (str.includes('自立')) return '自立';
    const num = parseInt(str, 10);
    return isNaN(num) ? null : num;
  }

  class ExcelImporter {
    constructor() {
      this.currentParsedData = [];
      this.diffSummary = { newCount: 0, updateCount: 0, sameCount: 0, leaveCount: 0 };
    }

    /**
     * ArrayBuffer または File からワークブックを読み込む
     */
    async parseFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: false });

            // 解析対象のシート名を決定（入居者管理表などの名前を優先）
            let targetSheetName = workbook.SheetNames[0];
            for (const sname of workbook.SheetNames) {
              if (sname.includes('入居') || sname.includes('管理') || sname.includes('利用者') || sname.includes('名簿')) {
                targetSheetName = sname;
                break;
              }
            }

            const sheet = workbook.Sheets[targetSheetName];
            const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            const parsedResidents = this.processSheetRows(rawJson);
            const diffResults = this.generateDiff(parsedResidents);

            this.currentParsedData = parsedResidents;

            resolve({
              sheetNames: workbook.SheetNames,
              activeSheet: targetSheetName,
              residents: parsedResidents,
              diff: diffResults
            });
          } catch (err) {
            reject(err);
          }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
    }

    /**
     * 2次元配列のシート行からヘッダー行を特定し入居者オブジェクトへ変換
     */
    processSheetRows(rows) {
      if (!rows || rows.length < 2) return [];

      // ヘッダー行の検出（1〜10行目の中で「部屋」「名前」「氏名」等が含まれる行を探す）
      let headerRowIndex = -1;
      let colMap = {};

      for (let r = 0; r < Math.min(rows.length, 10); r++) {
        const row = rows[r];
        const tempMap = this.mapHeaderColumns(row);
        if (tempMap.room !== undefined || (tempMap.name !== undefined && tempMap.careLevel !== undefined)) {
          headerRowIndex = r;
          colMap = tempMap;
          break;
        }
      }

      if (headerRowIndex === -1) {
        // 見つからなければ 0 行目をヘッダーと仮定
        headerRowIndex = 0;
        colMap = this.mapHeaderColumns(rows[0]);
      }

      const results = [];

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const rawRoom = colMap.room !== undefined ? row[colMap.room] : '';
        const rawName = colMap.name !== undefined ? row[colMap.name] : '';

        // 部屋番号も氏名もない行はスキップ
        if (!rawRoom && !rawName) continue;

        // 集計行などの除外
        const rawRoomStr = String(rawRoom).trim();
        const rawNameStr = String(rawName).trim();
        if (rawRoomStr.includes('数') || rawRoomStr.includes('計') || rawRoomStr.includes('平均') || rawRoomStr.includes('合計') ||
            rawNameStr.includes('数') || rawNameStr.includes('計') || rawNameStr.includes('平均') || rawNameStr.includes('合計')) {
          continue;
        }

        // 部屋番号整形
        let roomNum = rawRoomStr.replace(/[^0-9]/g, '');
        if (!roomNum && rawRoomStr) roomNum = rawRoomStr;
        if (!roomNum) continue;

        const floor = roomNum.startsWith('2') ? 2 : (roomNum.startsWith('3') ? 3 : 1);

        const resObj = {
          id: `res_${roomNum}`,
          room: String(roomNum),
          floor: floor,
          name: rawNameStr,
          entryDate: colMap.entryDate !== undefined ? normalizeDateStr(row[colMap.entryDate]) : '',
          careLevel: colMap.careLevel !== undefined ? normalizeCareLevel(row[colMap.careLevel]) : null,
          birthday: colMap.birthday !== undefined ? normalizeDateStr(row[colMap.birthday]) : '',
          age: colMap.age !== undefined && row[colMap.age] !== '' ? parseInt(row[colMap.age], 10) : null,
          doctor: colMap.doctor !== undefined ? String(row[colMap.doctor] || '').trim() : '',
          dental: colMap.dental !== undefined ? String(row[colMap.dental] || '').trim() : '',
          equipment: colMap.equipment !== undefined ? String(row[colMap.equipment] || '').trim() : '',
          foodMain: colMap.foodMain !== undefined ? String(row[colMap.foodMain] || '').trim() : '',
          foodSide: colMap.foodSide !== undefined ? String(row[colMap.foodSide] || '').trim() : '',
          foodThick: colMap.foodThick !== undefined ? String(row[colMap.foodThick] || '').trim() : '',
          airConditioner: colMap.airConditioner !== undefined ? (String(row[colMap.airConditioner]).includes('×') ? '×' : '〇') : '〇',
          earlyFood: colMap.earlyFood !== undefined ? Boolean(row[colMap.earlyFood] && String(row[colMap.earlyFood]).trim() !== '') : false,
          status: rawNameStr ? '入居中' : '空室',
          note: ''
        };

        results.push(resObj);
      }

      return results;
    }

    /**
     * ヘッダー文字列配列から各キーの列インデックスをマッピング
     */
    mapHeaderColumns(headerRow) {
      const map = {};
      headerRow.forEach((cell, idx) => {
        const text = String(cell || '').trim();
        if (!text) return;

        for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
          if (aliases.some(alias => text.includes(alias))) {
            if (map[key] === undefined) {
              map[key] = idx;
            }
          }
        }
      });
      return map;
    }

    /**
     * 既存データとインポートデータの差分を生成
     */
    generateDiff(newResidents) {
      const currentResidents = window.DataStore.getAllResidents();
      const currentMap = new Map();
      currentResidents.forEach(r => currentMap.set(String(r.room), r));

      const diffList = [];
      let newCount = 0;
      let updateCount = 0;
      let sameCount = 0;
      let leaveCount = 0;

      newResidents.forEach(newRes => {
        const curr = currentMap.get(String(newRes.room));
        if (!curr || !curr.name) {
          if (newRes.name) {
            diffList.push({ type: 'NEW', current: curr, incoming: newRes });
            newCount++;
          } else {
            diffList.push({ type: 'SAME_EMPTY', current: curr, incoming: newRes });
            sameCount++;
          }
        } else {
          if (!newRes.name) {
            diffList.push({ type: 'LEAVE', current: curr, incoming: newRes });
            leaveCount++;
          } else {
            // 変更点があるか比較
            const changes = [];
            if (curr.name !== newRes.name) changes.push(`氏名: ${curr.name} → ${newRes.name}`);
            if (curr.careLevel !== newRes.careLevel) changes.push(`介護度: ${curr.careLevel || '-'} → ${newRes.careLevel || '-'}`);
            if (curr.doctor !== newRes.doctor) changes.push(`訪問医: ${curr.doctor || '-'} → ${newRes.doctor || '-'}`);
            if (curr.foodMain !== newRes.foodMain || curr.foodSide !== newRes.foodSide) changes.push(`食事: ${curr.foodMain}/${curr.foodSide} → ${newRes.foodMain}/${newRes.foodSide}`);
            if (curr.equipment !== newRes.equipment) changes.push(`用具: ${curr.equipment || '-'} → ${newRes.equipment || '-'}`);

            if (changes.length > 0) {
              diffList.push({ type: 'UPDATE', current: curr, incoming: newRes, changes });
              updateCount++;
            } else {
              diffList.push({ type: 'SAME', current: curr, incoming: newRes });
              sameCount++;
            }
          }
        }
      });

      this.diffSummary = { newCount, updateCount, sameCount, leaveCount };

      return {
        diffList,
        summary: this.diffSummary
      };
    }

    /**
     * 確定してDataStoreに反映
     */
    applyImport(mergeMode = 'merge') {
      if (this.currentParsedData && this.currentParsedData.length > 0) {
        window.DataStore.importFromExcel(this.currentParsedData, mergeMode);
        return true;
      }
      return false;
    }
  }

  window.ExcelImporter = new ExcelImporter();
})(window);
