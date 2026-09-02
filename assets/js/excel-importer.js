/**
 * 株式会社アース 入居者管理システム
 * ExcelImporter - .xls / .xlsx / .csv ファイル解析 & 差分プレビューモジュール
 */

(function(window) {
  'use strict';

  // 列名の自動判別用エイリアスマップ（ワイズマンおよび各種介護ソフトに対応）
  const COLUMN_ALIASES = {
    room: ['居室コード', '居室名', '居室番号', '居室', '部屋番号', '部屋', '号室', '室番', 'Room', 'room'],
    floor: ['フロア', '階数', '階', '階層', 'Floor', 'floor', 'F'],
    name: ['利用者氏名', '利用者名', '入所者氏名', '入所者名', '入居者氏名', '入居者名', '患者名', '氏名', '名前', 'お客様名', 'Name', 'name'],
    entryDate: ['入所年月日', '入所日', '入居年月日', '入居日', '利用開始年月日', '利用開始日', '契約日', '契約開始日', 'EntryDate'],
    careLevel: ['要介護状態区分', '介護度区分', '介護度', '要介護度', '要介護', '認定結果', 'CareLevel'],
    birthday: ['生年月日', '生年月', '誕生日', 'Birthday'],
    age: ['満年齢', '実年齢', '年齢', 'Age', 'age'],
    doctor: ['主治医氏名', '主治医', '医療機関名', '医療機関', '訪問医', '往診医', 'クリニック', 'Doctor'],
    dental: ['歯科医療機関', '訪問歯科', '口腔衛生', '歯科', 'Dental'],
    equipment: ['貸与用具', '福祉用具', '用具', '車椅子', '歩行器', 'レンタル', 'Equipment'],
    foodMain: ['主食形態', '主食', 'ごはん', 'ご飯形態', 'ご飯', 'Rice'],
    foodSide: ['副食形態', '副食', 'おかず', '菜形態', 'SideDish'],
    foodThick: ['とろみ形態', 'とろみ', 'トロミ', '水分形態', 'Thickener'],
    airConditioner: ['エアコン', '冷暖房', '空調', 'AC'],
    earlyFood: ['早出し', '食事時間', '配膳時間', '早出', 'EarlyFood']
  };

  // 全角英数・記号を半角に変換
  function toHalfWidth(str) {
    if (!str) return '';
    return String(str)
      .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, ' ')
      .trim();
  }

  // 居室・フロアの自動判別（居室番号、フロア列、シート名から自動分類）
  function determineFloor(roomStr, rawFloorVal, sheetName) {
    // 1. フロア列の指定がある場合
    if (rawFloorVal) {
      const fStr = toHalfWidth(rawFloorVal);
      const m = fStr.match(/(\d+)/);
      if (m) return parseInt(m[1], 10);
    }

    // 2. 部屋番号文字列からのインテリジェント判定
    if (roomStr) {
      const cleanRoom = toHalfWidth(roomStr);

      // "2F-01", "2F01", "2階-1" などの形式
      const fMatch = cleanRoom.match(/(\d+)\s*(?:F|階)/i);
      if (fMatch) return parseInt(fMatch[1], 10);

      // "2-01", "3-15" などのハイフン形式
      const hyphenMatch = cleanRoom.match(/^(\d+)[-_]/);
      if (hyphenMatch) return parseInt(hyphenMatch[1], 10);

      // "201", "305", "412", "1002" などの3〜4桁の数字（百の位・千の位をフロアとする）
      const numOnly = cleanRoom.replace(/[^0-9]/g, '');
      if (numOnly.length >= 3) {
        const num = parseInt(numOnly, 10);
        return Math.floor(num / 100);
      } else if (numOnly.length > 0) {
        const num = parseInt(numOnly, 10);
        if (num >= 1 && num <= 20) return num;
      }
    }

    // 3. シート名からの判定（例: "2F", "2階管理表", "3F入居者"）
    if (sheetName) {
      const sMatch = sheetName.match(/(\d+)\s*(?:F|階)/i);
      if (sMatch) return parseInt(sMatch[1], 10);
    }

    // デフォルト: 2階
    return 2;
  }

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

  // 和暦（S24/06/08, 昭和24年6月8日, R08/03/01 等）や日付文字列の正規化
  function normalizeDateStr(val) {
    if (!val) return '';
    if (typeof val === 'number') return excelSerialToDateStr(val);
    let str = toHalfWidth(val);
    
    // 「昭和24年6月8日」等の漢字表記を「S24/06/08」形式または「1949/06/08」に整形
    str = str.replace(/明治/g, 'M').replace(/大正/g, 'T').replace(/昭和/g, 'S').replace(/平成/g, 'H').replace(/令和/g, 'R');
    str = str.replace(/年|\./g, '/').replace(/月/g, '/').replace(/日/g, '').replace(/\s+/g, '');
    return str;
  }

  // 介護度の正規化 (「介1」〜「介5」、要支援は「支1」「支2」、「自立」)
  function normalizeCareLevel(val) {
    if (val === null || val === undefined || val === '') return '';
    const str = toHalfWidth(val);
    if (str.includes('5')) return '介5';
    if (str.includes('4')) return '介4';
    if (str.includes('3')) return '介3';
    if (str.includes('2')) return '介2';
    if (str.includes('1')) return '介1';
    if (str.includes('支援2') || str.includes('支2')) return '支2';
    if (str.includes('支援1') || str.includes('支1')) return '支1';
    if (str.includes('自立') || str.includes('非該当')) return '自立';
    const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
    return !isNaN(num) && num >= 1 && num <= 5 ? `介${num}` : str;
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

            // 複数シート（2F, 3F 等）がある場合は全シートから抽出、単一シートならそのシートから抽出
            const parsedResidents = [];
            const sheetList = workbook.SheetNames;
            
            sheetList.forEach(sname => {
              const sheet = workbook.Sheets[sname];
              if (!sheet) return;
              const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
              if (rawJson && rawJson.length > 1) {
                const sheetRes = this.processSheetRows(rawJson, sname);
                parsedResidents.push(...sheetRes);
              }
            });

            // 部屋番号順にソート（同室重複は後勝ちまたはマージ）
            const resMap = new Map();
            parsedResidents.forEach(r => {
              resMap.set(String(r.room), r);
            });
            const uniqueResidents = Array.from(resMap.values()).sort((a, b) => {
              const numA = parseInt(String(a.room).replace(/[^0-9]/g, ''), 10) || 0;
              const numB = parseInt(String(b.room).replace(/[^0-9]/g, ''), 10) || 0;
              return numA - numB;
            });

            const diffResults = this.generateDiff(uniqueResidents);
            this.currentParsedData = uniqueResidents;

            resolve({
              sheetNames: workbook.SheetNames,
              activeSheet: targetSheetName,
              residents: uniqueResidents,
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
    processSheetRows(rows, sheetName = '') {
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
        const rawFloor = colMap.floor !== undefined ? row[colMap.floor] : '';

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

        // フロアの自動分類（部屋番号、フロア指定、シート名から自動判別）
        const floor = determineFloor(rawRoomStr, rawFloor, sheetName);

        const resObj = {
          id: `res_${roomNum}`,
          room: String(roomNum),
          floor: floor,
          name: rawNameStr,
          entryDate: colMap.entryDate !== undefined ? normalizeDateStr(row[colMap.entryDate]) : '',
          careLevel: colMap.careLevel !== undefined ? normalizeCareLevel(row[colMap.careLevel]) : '',
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
        window.DataStore.importFromExcel(this.currentParsedData, mergeMode, {
          fileName: this.currentFileName || 'ワイズマン帳票・Excel',
          summary: this.diffSummary
        });
        return true;
      }
      return false;
    }
  }

  window.ExcelImporter = new ExcelImporter();
})(window);
