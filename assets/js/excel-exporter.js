/**
 * 株式会社アース 入居者管理システム
 * ExcelExporter - .xlsx / .csv エクスポートモジュール
 */

(function(window) {
  'use strict';

  class ExcelExporter {
    /**
     * 全シートを含んだExcelワークブック（.xlsx）を生成してダウンロード
     */
    exportAllToExcel() {
      const dataStore = window.DataStore;
      const residents = dataStore.getAllResidents();
      const moveOutLogs = dataStore.getAllMoveOutLogs();
      const stats = dataStore.getStatistics();

      const wb = XLSX.utils.book_new();

      // 1. 入居者管理表シート（動的カラム対応）
      const columns = dataStore.getColumns();
      const residentHeaders = columns.map(c => c.label);
      residentHeaders.push('状態');

      const residentRows = [residentHeaders];

      residents.forEach(r => {
        const row = columns.map(c => {
          const val = r[c.key];
          if (c.key === 'earlyFood') return val ? '早出し' : '';
          return val !== undefined && val !== null ? val : '';
        });
        row.push(r.status || '');
        residentRows.push(row);
      });

      // 集計行を追加
      residentRows.push([]);
      residentRows.push(['入居者数', stats.totalCount, '合計定員', stats.capacity, '平均介護度', stats.avgCare, '平均年齢', stats.avgAge]);

      const wsResidents = XLSX.utils.aoa_to_sheet(residentRows);
      XLSX.utils.book_append_sheet(wb, wsResidents, '入居者管理表');

      // 2. 食事・厨房指示シート
      const mealRows = [
        ['部屋番号', '名前', '主食形態', '副食形態', 'とろみ', '早出し指示', '特記事項']
      ];
      residents.filter(r => r.name).forEach(r => {
        mealRows.push([
          r.room,
          r.name,
          r.foodMain || '米飯',
          r.foodSide || '普通',
          r.foodThick || '無し',
          r.earlyFood ? '早出し' : '通常',
          r.note || ''
        ]);
      });
      const wsMeal = XLSX.utils.aoa_to_sheet(mealRows);
      XLSX.utils.book_append_sheet(wb, wsMeal, '食事指示一覧');

      // 3. 医療・福祉用具シート
      const medicalRows = [
        ['部屋番号', '名前', '介護度', '訪問診療クリニック', '口腔衛生・歯科', '福祉用具（車椅子・歩行器等）']
      ];
      residents.filter(r => r.name).forEach(r => {
        medicalRows.push([
          r.room,
          r.name,
          r.careLevel || '',
          r.doctor || '',
          r.dental || '',
          r.equipment || ''
        ]);
      });
      const wsMedical = XLSX.utils.aoa_to_sheet(medicalRows);
      XLSX.utils.book_append_sheet(wb, wsMedical, '医療・福祉用具');

      // 4. 異動・退去ログシート
      const logRows = [
        ['部屋番号', '名前', '入居年月日', '介護度', '生年月日', '年齢', '訪問医', '異動日', '異動種別', '備考']
      ];
      moveOutLogs.forEach(l => {
        logRows.push([
          l.room || '',
          l.name || '',
          l.entryDate || '',
          l.careLevel || '',
          l.birthday || '',
          l.age || '',
          l.doctor || '',
          l.eventDate || '',
          l.eventType || '',
          l.note || ''
        ]);
      });
      const wsLogs = XLSX.utils.aoa_to_sheet(logRows);
      XLSX.utils.book_append_sheet(wb, wsLogs, '異動・退去履歴');

      // ダウンロードファイル名の生成
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const fileName = `アース入居者管理表_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
    }

    /**
     * CSV形式でダウンロード
     */
    exportToCsv() {
      const dataStore = window.DataStore;
      const residents = dataStore.getAllResidents();
      const columns = dataStore.getColumns();

      const residentRows = [
        columns.map(c => c.label)
      ];

      residents.forEach(r => {
        residentRows.push(
          columns.map(c => {
            const val = r[c.key];
            if (c.key === 'earlyFood') return val ? '早出し' : '';
            return val !== undefined && val !== null ? val : '';
          })
        );
      });

      const ws = XLSX.utils.aoa_to_sheet(residentRows);
      const csv = XLSX.utils.sheet_to_csv(ws);

      // BOM付きUTF-8でBlob生成
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      link.href = URL.createObjectURL(blob);
      link.download = `アース入居者管理表_${dateStr}.csv`;
      link.click();
    }
  }

  window.ExcelExporter = new ExcelExporter();
})(window);
