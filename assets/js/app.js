/**
 * 株式会社アース 入居者管理システム
 * App - メインUIコントローラー & 描画ロジック
 */

(function() {
  'use strict';

  // アプリケーション状態
  const state = {
    activeTab: 'all', // 'all' | 'floor' | 'meal' | 'medical' | 'stats' | 'incidents' | 'history' | 'import'
    searchQuery: '',
    filterFloor: 'all',
    filterCareLevel: 'all',
    filterDoctor: 'all',
    filterFood: 'all',
    sortField: 'room',
    sortAsc: true,
    currentFloorView: 'all', // 'all', '2', '3', etc.
    careManagerAlertFilter: 'all' // 'all', 'expired', 'urgent', 'warning', 'ok'
  };

  // DOM参照
  const elements = {
    splashScreen: document.getElementById('earth-splash-screen'),
    navTabs: document.querySelectorAll('.nav-tab-btn'),
    tabContents: document.querySelectorAll('.tab-content-pane'),
    
    // サマリー
    statResidentCount: document.getElementById('stat-resident-count'),
    statOccupancyRate: document.getElementById('stat-occupancy-rate'),
    statAvgCare: document.getElementById('stat-avg-care'),
    statAvgAge: document.getElementById('stat-avg-age'),
    statThickCount: document.getElementById('stat-thick-count'),
    statEarlyCount: document.getElementById('stat-early-count'),

    // ケアマネ・相談員モード用
    tabPaneCaremanager: document.getElementById('tab-pane-caremanager'),
    caremanagerTableBody: document.getElementById('caremanager-table-body'),
    cmStatExpired: document.getElementById('cm-stat-expired'),
    cmStatUrgent: document.getElementById('cm-stat-urgent'),
    cmStatWarning: document.getElementById('cm-stat-warning'),
    cmStatOk: document.getElementById('cm-stat-ok'),
    cmCurrentFilterBadge: document.getElementById('cm-current-filter-badge'),

    // フィルター
    searchInput: document.getElementById('search-input'),
    filterFloorSelect: document.getElementById('filter-floor'),
    filterCareSelect: document.getElementById('filter-care'),
    filterDoctorSelect: document.getElementById('filter-doctor'),
    filterFoodSelect: document.getElementById('filter-food'),

    // ビューコンテナ
    residentTableBody: document.getElementById('resident-table-body'),
    floorMapTabs: document.getElementById('floor-map-tabs'),
    floorMapsContainer: document.getElementById('floor-maps-container'),
    floorMapStat: document.getElementById('floor-map-stat'),
    mealSummaryGrid: document.getElementById('meal-summary-grid'),
    mealTableBody: document.getElementById('meal-table-body'),
    doctorGrid: document.getElementById('doctor-grid'),
    historyTableBody: document.getElementById('history-table-body'),

    // アクションボタン
    btnNewResident: document.getElementById('btn-new-resident'),
    btnExportExcel: document.getElementById('btn-export-excel'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnPrint: document.getElementById('btn-print'),
    btnResetData: document.getElementById('btn-reset-data'),

    // インポート関連
    dropzone: document.getElementById('excel-dropzone'),
    excelFileInput: document.getElementById('excel-file-input'),
    diffPreviewModal: document.getElementById('diff-preview-modal'),
    diffModalBody: document.getElementById('diff-modal-body'),
    btnApplyImport: document.getElementById('btn-apply-import'),

    // 編集モーダル
    residentEditModal: document.getElementById('resident-edit-modal'),
    residentForm: document.getElementById('resident-form'),
    editModalTitle: document.getElementById('edit-modal-title'),

    // フロアマップ専用メモ・予定
    floorBoardModal: document.getElementById('floor-board-modal'),
    floorBoardForm: document.getElementById('floor-board-form'),
    floorBoardTitle: document.getElementById('floor-board-title'),
    floorBoardResident: document.getElementById('floor-board-resident'),
    floorRoomMemo: document.getElementById('floor-room-memo'),
    floorEventDate: document.getElementById('floor-event-date'),
    floorEventTitle: document.getElementById('floor-event-title'),
    floorEventList: document.getElementById('floor-event-list'),
    btnAddFloorEvent: document.getElementById('btn-add-floor-event'),
    floorCleaningStatus: document.getElementById('floor-cleaning-status'),
    plannedResidentName: document.getElementById('planned-resident-name'),
    plannedEntryDate: document.getElementById('planned-entry-date'),
    plannedResidentNote: document.getElementById('planned-resident-note'),
    floorPurchaseRequest: document.getElementById('floor-purchase-request'),
    purchaseComposerFields: document.getElementById('purchase-composer-fields'),
    purchaseItem: document.getElementById('purchase-item'),
    purchaseQuantity: document.getElementById('purchase-quantity'),
    purchaseDesiredDate: document.getElementById('purchase-desired-date'),
    purchaseNote: document.getElementById('purchase-note'),
    btnGeneratePurchaseEmail: document.getElementById('btn-generate-purchase-email'),
    btnGeneratePurchasePhone: document.getElementById('btn-generate-purchase-phone'),
    purchaseMessageOutputWrap: document.getElementById('purchase-message-output-wrap'),
    purchaseMessageTitle: document.getElementById('purchase-message-title'),
    purchaseMessageOutput: document.getElementById('purchase-message-output'),
    btnCopyPurchaseMessage: document.getElementById('btn-copy-purchase-message'),

    // 退去モーダル
    moveOutModal: document.getElementById('move-out-modal'),
    moveOutForm: document.getElementById('move-out-form'),
    moveOutTargetName: document.getElementById('move-out-target-name'),
    moveOutTargetRoom: document.getElementById('move-out-target-room'),

    // トースト
    toastContainer: document.getElementById('toast-container')
  };
  const COLOR_ENABLED_MASTER_KEYS = new Set(['doctor', 'dental', 'equipment', 'foodMain']);

  let renderFramePending = false;
  function scheduleRenderAll() {
    if (renderFramePending) return;
    renderFramePending = true;
    const schedule = window.requestAnimationFrame || (callback => setTimeout(callback, 0));
    schedule(() => {
      renderFramePending = false;
      renderAll();
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[char]);
  }

  function readableTextColor(background) {
    const hex = background.replace('#', '');
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return ((red * 299 + green * 587 + blue * 114) / 1000) >= 150 ? '#172033' : '#FFFFFF';
  }

  function masterColorStyle(masterKey, item) {
    const background = window.DataStore.getMasterItemColor(masterKey, item);
    const customText = window.DataStore.getMasterItemTextColor(masterKey, item);
    const text = customText || readableTextColor(background);
    return `background-color:${background};color:${text};border-color:${text === '#FFFFFF' ? 'rgba(255,255,255,.6)' : 'rgba(23,32,51,.2)'};`;
  }

  function formatFloorEventDate(dateValue) {
    if (!dateValue) return '日付未設定';
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
  }

  /**
   * トースト通知表示
   */
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.borderLeftColor = 'var(--earth-danger)';
    } else if (type === 'warning') {
      toast.style.borderLeftColor = 'var(--earth-warning)';
    }
    toast.innerHTML = `
      <span>${message}</span>
    `;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /**
   * 介護度バッジHTML生成（「介1」〜「介5」省略表示）
   */
  function getCareLevelBadge(level) {
    if (!level) return '<span class="badge badge-care badge-care-none">-</span>';
    const str = String(level).trim();
    if (str === '介1' || str === '1' || str === '要介護1') return '<span class="badge badge-care badge-care-1">介1</span>';
    if (str === '介2' || str === '2' || str === '要介護2') return '<span class="badge badge-care badge-care-2">介2</span>';
    if (str === '介3' || str === '3' || str === '要介護3') return '<span class="badge badge-care badge-care-3">介3</span>';
    if (str === '介4' || str === '4' || str === '要介護4') return '<span class="badge badge-care badge-care-4">介4</span>';
    if (str === '介5' || str === '5' || str === '要介護5') return '<span class="badge badge-care badge-care-5">介5</span>';
    return `<span class="badge badge-care badge-care-none">${str}</span>`;
  }

  /**
   * データのフィルタリングとソート
   */
  function getFilteredResidents() {
    let list = window.DataStore.getAllResidents();

    // フリーワード検索
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(r => 
        (r.room && r.room.toLowerCase().includes(q)) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.doctor && r.doctor.toLowerCase().includes(q)) ||
        (r.dental && r.dental.toLowerCase().includes(q)) ||
        (r.equipment && r.equipment.toLowerCase().includes(q)) ||
        (r.foodMain && r.foodMain.toLowerCase().includes(q)) ||
        (r.foodSide && r.foodSide.toLowerCase().includes(q))
      );
    }

    // フロアフィルター
    if (state.filterFloor !== 'all') {
      list = list.filter(r => String(r.floor) === String(state.filterFloor));
    }

    // 介護度フィルター
    if (state.filterCareLevel !== 'all') {
      list = list.filter(r => {
        const c = String(r.careLevel || '');
        return c === state.filterCareLevel || c === `介${state.filterCareLevel}` || c.includes(state.filterCareLevel);
      });
    }

    // 訪問医フィルター
    if (state.filterDoctor !== 'all') {
      list = list.filter(r => r.doctor && r.doctor.includes(state.filterDoctor));
    }

    // 食事フィルター
    if (state.filterFood !== 'all') {
      if (state.filterFood === 'thick') {
        list = list.filter(r => r.foodThick && r.foodThick.includes('あり'));
      } else if (state.filterFood === 'early') {
        list = list.filter(r => r.earlyFood);
      } else {
        list = list.filter(r => (r.foodMain && r.foodMain.includes(state.filterFood)) || (r.foodSide && r.foodSide.includes(state.filterFood)));
      }
    }

    // ソート
    list.sort((a, b) => {
      let valA = a[state.sortField];
      let valB = b[state.sortField];

      if (state.sortField === 'room' || state.sortField === 'age') {
        valA = valA ? parseInt(valA, 10) : 0;
        valB = valB ? parseInt(valB, 10) : 0;
      } else if (state.sortField === 'careLevel') {
        const numA = valA ? parseInt(String(valA).replace(/[^0-9]/g, ''), 10) : 0;
        const numB = valB ? parseInt(String(valB).replace(/[^0-9]/g, ''), 10) : 0;
        valA = isNaN(numA) ? 0 : numA;
        valB = isNaN(numB) ? 0 : numB;
      } else {
        valA = String(valA || '');
        valB = String(valB || '');
      }

      if (valA < valB) return state.sortAsc ? -1 : 1;
      if (valA > valB) return state.sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }

  /**
   * サマリー統計の描画
   */
  function renderStatistics() {
    const stats = window.DataStore.getStatistics();
    elements.statResidentCount.innerHTML = `${stats.totalCount} <span class="summary-card-unit">/ ${stats.capacity} 名</span>`;
    elements.statOccupancyRate.innerHTML = `${stats.occupancyRate} <span class="summary-card-unit">%</span>`;
    elements.statAvgCare.innerHTML = `${stats.avgCare} <small style="font-size:12px; font-weight:normal; color:var(--earth-muted);">(介${Math.round(stats.avgCare)})</small>`;
    elements.statAvgAge.innerHTML = `${stats.avgAge} <span class="summary-card-unit">歳</span>`;
    elements.statThickCount.innerHTML = `${stats.thickCount} <span class="summary-card-unit">名</span>`;
    elements.statEarlyCount.innerHTML = `${stats.earlyCount} <span class="summary-card-unit">名</span>`;
  }

  // ドラッグ中の一時状態
  let draggedColKey = null;

  /**
   * 全体管理表のヘッダーおよびボディの描画（ドラッグ移動＆全項目マスタ選択式対応）
   */
  function renderAllResidentsTable() {
    const thead = document.getElementById('resident-table-head');
    const tbody = elements.residentTableBody;
    if (!tbody || !thead) return;

    const columns = window.DataStore.getVisibleColumns();
    const masters = window.DataStore.getMasters();

    // 1. ヘッダーの描画（部屋・名前は固定＆移動不可、他列はドラッグ並び替え対応）
    thead.innerHTML = `
      <tr>
        ${columns.map((col, idx) => {
          const isSortable = col.sortable;
          const sortIndicator = isSortable ? (state.sortField === col.key ? (state.sortAsc ? ' 🔼' : ' 🔽') : ' ↕') : '';
          const removeBtn = !col.fixed 
            ? `<button class="btn-remove-col" onclick="event.stopPropagation(); window.EarthApp.removeColumn('${col.key}', '${col.label}')" title="この項目を削除">×</button>` 
            : '';
          const isFixedCol = col.key === 'room' || col.key === 'name';
          const stickyClass = col.key === 'room' ? 'sticky-col-room' : (col.key === 'name' ? 'sticky-col-name' : '');
          const dragAttr = isFixedCol ? 'draggable="false"' : 'draggable="true"';
          const cursorStyle = isFixedCol ? 'cursor: pointer;' : 'cursor: move;';
          const handleHtml = !isFixedCol ? '<span class="drag-handle" title="ドラッグして列を移動">⠿</span>' : '';

          return `
            <th class="${isSortable ? 'sortable' : ''} ${stickyClass}" data-col-key="${col.key}" data-sort="${col.key}" ${dragAttr} style="width: ${col.width || 'auto'}; ${cursorStyle}" title="${isFixedCol ? '固定列（クリックで並び替え）' : 'クリックで並び替え、ドラッグで列の移動'}">
              <div class="col-header-cell" style="justify-content: center; gap: 1px;">
                <span style="margin: 0; text-align: center; font-size: 11.5px; white-space: nowrap;">${col.label}${sortIndicator}</span>
              </div>
            </th>
          `;
        }).join('')}
        <th class="action-col" style="text-align: center; width: 68px;">操作</th>
      </tr>
    `;

    // ヘッダーのドラッグ＆ドロップイベント設定
    const thList = thead.querySelectorAll('th[data-col-key]');
    thList.forEach(th => {
      const colKey = th.dataset.colKey;
      const isFixedCol = colKey === 'room' || colKey === 'name';

      // ソートクリック
      th.addEventListener('click', (e) => {
        if (e.target.closest('.drag-handle') || e.target.closest('.btn-remove-col')) return;
        const field = th.dataset.sort;
        if (state.sortField === field) {
          state.sortAsc = !state.sortAsc;
        } else {
          state.sortField = field;
          state.sortAsc = true;
        }
        renderAllResidentsTable();
      });

      // 固定列（部屋・名前）はドラッグ＆ドロップ処理をスキップ
      if (isFixedCol) return;

      // ドラッグ開始
      th.addEventListener('dragstart', (e) => {
        draggedColKey = th.dataset.colKey;
        th.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedColKey);
      });

      // ドラッグ中
      th.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = th.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        if (e.clientX < midpoint) {
          th.classList.add('drag-over-left');
          th.classList.remove('drag-over-right');
        } else {
          th.classList.add('drag-over-right');
          th.classList.remove('drag-over-left');
        }
      });

      th.addEventListener('dragleave', () => {
        th.classList.remove('drag-over-left', 'drag-over-right');
      });

      // ドロップ（列の並び替え確定）
      th.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetKey = th.dataset.colKey;
        th.classList.remove('drag-over-left', 'drag-over-right', 'is-dragging');

        // 固定列へのドロップや固定列からのドラッグを防止
        if (targetKey === 'room' || targetKey === 'name' || draggedColKey === 'room' || draggedColKey === 'name') {
          draggedColKey = null;
          return;
        }

        if (draggedColKey && targetKey && draggedColKey !== targetKey) {
          window.DataStore.reorderColumns(draggedColKey, targetKey);
          showToast(`列の並び順を更新しました`);
          renderAllResidentsTable();
        }
        draggedColKey = null;
      });

      th.addEventListener('dragend', () => {
        thList.forEach(t => t.classList.remove('is-dragging', 'drag-over-left', 'drag-over-right'));
        draggedColKey = null;
      });
    });

    // 2. ボディの描画
    const list = getFilteredResidents();

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.length + 1}" style="text-align: center; padding: 36px; color: var(--earth-muted);">
            該当する入居者データが見つかりませんでした。
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(r => {
      const isEmpty = !r.name || r.name.trim() === '';

      const cellsHtml = columns.map(col => {
        const val = r[col.key] !== undefined && r[col.key] !== null ? r[col.key] : '';

        // 部屋番号
        if (col.key === 'room') {
          return `
            <td class="sticky-col-room">
              <input type="text" class="cell-input font-num" style="font-weight: 800; width: 100%; text-align: center;" value="${val}"
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="号室">
            </td>
          `;
        }

        // 名前（フルネーム）
        if (col.key === 'name') {
          return `
            <td class="sticky-col-name">
              <input type="text" class="cell-input" style="font-weight: 700; color: ${val ? 'var(--earth-ink)' : '#9ca3af'}; width: 100%; font-size: 12.5px;" value="${val}"
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="(空室)">
            </td>
          `;
        }

        // 介護度（「介1」〜「介5」等の選択式）
        if (col.key === 'careLevel') {
          const careList = masters.careLevel || ['介1', '介2', '介3', '介4', '介5', '自立', '支1', '支2'];
          const currentCareStr = String(val || '').trim();
          return `
            <td>
              <select class="cell-select" style="font-weight: bold;" onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)">
                <option value="" ${!currentCareStr ? 'selected' : ''}>-</option>
                ${careList.map(opt => {
                  const isSel = currentCareStr === opt || currentCareStr === opt.replace('介', '') || currentCareStr === `要介護${opt.replace('介', '')}`;
                  return `<option value="${opt}" ${isSel ? 'selected' : ''}>${opt}</option>`;
                }).join('')}
              </select>
            </td>
          `;
        }

        // 年齢（ジャストフィット）
        if (col.key === 'age') {
          return `
            <td style="text-align: center; padding: 2px;">
              <input type="number" class="cell-input font-num" value="${val}" style="width: 100%; text-align: center; font-size: 12px; padding: 2px 0;"
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="-">
            </td>
          `;
        }

        // 生年月日（和暦表示 ＋ 干支アイコン付き）
        if (col.key === 'birthday') {
          const warekiStr = window.DataStore.toWarekiDisplay(val);
          const zodiac = window.DataStore.getZodiac(val);
          const zodiacHtml = zodiac 
            ? `<span class="zodiac-badge" title="干支: ${zodiac.name}年 (${zodiac.read})">${zodiac.icon}</span>` 
            : '';
          return `
            <td style="text-align: center; padding: 2px; white-space: nowrap;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 3px; width: 100%;">
                ${zodiacHtml}
                <input type="text" class="cell-input font-num" value="${warekiStr}" style="width: 62px; text-align: center; font-size: 11px; padding: 2px 0; font-family: inherit;"
                  onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="-">
              </div>
            </td>
          `;
        }

        // 入居日（ジャストフィット）
        if (col.key === 'entryDate') {
          return `
            <td style="text-align: center; padding: 2px;">
              <input type="text" class="cell-input font-num" value="${val}" style="width: 100%; text-align: center; font-size: 11px; padding: 2px 0; font-family: inherit;"
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="-">
            </td>
          `;
        }

        // エアコン（選択式）
        if (col.key === 'airConditioner') {
          return `
            <td style="text-align: center;">
              <select class="cell-select" style="text-align: center; font-weight: bold;" onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)">
                <option value="〇" ${val === '〇' ? 'selected' : ''}>〇</option>
                <option value="×" ${val === '×' ? 'selected' : ''}>×</option>
                <option value="" ${!val ? 'selected' : ''}>-</option>
              </select>
            </td>
          `;
        }

        // 早出し（チェックボックス）
        if (col.key === 'earlyFood') {
          return `
            <td style="text-align: center;">
              <input type="checkbox" class="cell-checkbox" ${val ? 'checked' : ''}
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.checked)">
            </td>
          `;
        }

        // とろみ（選択式）
        if (col.key === 'foodThick') {
          const thickOptions = masters.foodThick || ['無し', 'あり'];
          return `
            <td>
              <select class="cell-select" onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)">
                <option value="" ${!val ? 'selected' : ''}>-</option>
                ${thickOptions.map(opt => `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </td>
          `;
        }

        // 訪問医・口腔衛生・福祉用具・主食・副食、およびその他の項目（マスタ連動ドロップダウン選択式）
        const masterKey = col.masterKey || col.key;
        const masterOptions = masters[masterKey] ? [...masters[masterKey]] : (Array.isArray(col.options) ? [...col.options] : []);
        
        // 現在値がマスタに存在しない場合は一時的に選択肢に追加
        if (val && !masterOptions.includes(String(val))) {
          masterOptions.unshift(String(val));
        }

        // 短縮表示ラベルの生成（画面幅最大節約）
        const formatOptionLabel = (key, text) => {
          if (!text) return '-';
          const s = String(text).trim();
          if (key === 'doctor') {
            // 訪問医：最初のDr名部分（例: 堀池Dr.）または最初の5文字
            const parts = s.split(/[\s　]+/);
            return parts[0] || s.substring(0, 5);
          }
          if (key === 'equipment') {
            return s.length > 6 ? s.substring(0, 6) + '…' : s;
          }
          if (key === 'dental') {
            return s.length > 6 ? s.substring(0, 6) + '…' : s;
          }
          return s;
        };

        // リスト選択式セルのレンダリング
        const isColorEnabled = COLOR_ENABLED_MASTER_KEYS.has(col.key);
        const itemColorStyle = isColorEnabled ? masterColorStyle(col.key, val) : '';
        return `
          <td class="${isColorEnabled ? 'master-color-cell' : ''}" style="${itemColorStyle}" title="${escapeHtml(val || '-')}">
            <select class="cell-select ${isColorEnabled ? 'master-color-select' : ''}" style="${itemColorStyle}" onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" title="${escapeHtml(val || '-')}">
              <option value="">-</option>
              ${masterOptions.map(opt => `<option value="${escapeHtml(opt)}" ${String(val) === String(opt) ? 'selected' : ''}>${escapeHtml(formatOptionLabel(col.key, opt))}</option>`).join('')}
            </select>
          </td>
        `;
      }).join('');

      return `
        <tr class="${isEmpty ? 'is-empty-room' : ''}">
          ${cellsHtml}
          <td class="action-col" style="text-align: center; white-space: nowrap; padding: 2px 3px;">
            <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 11px; border-radius: 4px;" onclick="window.EarthApp.openEditModal('${r.id}')" title="詳細確認・編集">詳細</button>
            ${!isEmpty ? `<button class="btn btn-danger btn-sm" style="padding: 2px 6px; font-size: 11px; border-radius: 4px;" onclick="window.EarthApp.openMoveOutModal('${r.id}')" title="退去・異動処理">退去</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * フロア切り替え
   */
  function switchFloorView(floor) {
    state.currentFloorView = String(floor);
    renderFloorMap();
  }

  /**
   * フロアマップ（居室見取り図）の描画（フロア別＆全フロア一括表示両対応）
   */
  function renderFloorMap() {
    const tabsContainer = elements.floorMapTabs;
    const mapsContainer = elements.floorMapsContainer;
    const statContainer = elements.floorMapStat;
    if (!mapsContainer) return;

    const floors = window.DataStore.getFloors();
    const allResidents = window.DataStore.getAllResidents();

    // 1. フロア切り替えタブの描画
    if (tabsContainer) {
      const isAllActive = state.currentFloorView === 'all';
      let tabsHtml = `
        <button class="floor-tab-btn ${isAllActive ? 'active' : ''}" onclick="window.EarthApp.switchFloorView('all')">
          🏢 全フロア表示 (全部)
        </button>
      `;

      floors.forEach(f => {
        const isActive = state.currentFloorView === String(f);
        const fResidents = window.DataStore.getResidentsByFloor(f);
        const occupiedCount = fResidents.filter(r => r.name && r.name.trim() !== '').length;
        tabsHtml += `
          <button class="floor-tab-btn ${isActive ? 'active' : ''}" onclick="window.EarthApp.switchFloorView('${f}')">
            🏢 ${f}階 (${f}F) <small style="font-weight:normal; opacity:0.85;">(${occupiedCount}/${fResidents.length}名)</small>
          </button>
        `;
      });

      tabsContainer.innerHTML = tabsHtml;
    }

    // クイック統計
    if (statContainer) {
      const totalOccupied = allResidents.filter(r => r.name && r.name.trim() !== '').length;
      const plannedCount = allResidents.filter(r => !String(r.name || '').trim() && String(r.plannedResidentName || '').trim()).length;
      statContainer.innerHTML = `
        <span>総定員: <strong>${allResidents.length}</strong> 室</span>
        <span>在室: <strong style="color:var(--earth-green-dark);">${totalOccupied}</strong> 名</span>
        <span>空室: <strong style="color:var(--earth-muted);">${allResidents.length - totalOccupied}</strong> 室</span>
        <span>入居予定: <strong style="color:#1d4ed8;">${plannedCount}</strong> 名</span>
      `;
    }

    // 2. 表示対象のフロア一覧
    const targetFloors = state.currentFloorView === 'all' 
      ? floors 
      : [parseInt(state.currentFloorView, 10) || state.currentFloorView];

    // 3. 各フロアの描画
    mapsContainer.innerHTML = targetFloors.map(f => {
      const fResidents = window.DataStore.getResidentsByFloor(f);
      const occupied = fResidents.filter(r => r.name && r.name.trim() !== '');
      const occupiedCount = occupied.length;
      const totalCount = fResidents.length;
      const emptyCount = totalCount - occupiedCount;

      // フロア平均介護度
      let careSum = 0;
      let careCount = 0;
      occupied.forEach(r => {
        if (r.careLevel) {
          const num = parseInt(String(r.careLevel).replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num >= 1 && num <= 5) {
            careSum += num;
            careCount++;
          }
        }
      });
      const avgCare = careCount > 0 ? (careSum / careCount).toFixed(1) : '-';

      // 居室範囲
      const firstRoom = fResidents[0] ? fResidents[0].room : '';
      const lastRoom = fResidents[fResidents.length - 1] ? fResidents[fResidents.length - 1].room : '';
      const roomRangeText = (firstRoom && lastRoom) ? `(${firstRoom} 〜 ${lastRoom}号室)` : '';

      // 居室カード一覧
      const cardsHtml = fResidents.map(r => {
        const isEmpty = !r.name || r.name.trim() === '';
        const memo = String(r.floorMemo || '').trim();
        const events = Array.isArray(r.floorEvents)
          ? [...r.floorEvents].filter(event => event && event.date && event.title).sort((a, b) => String(a.date).localeCompare(String(b.date)))
          : [];
        const today = new Date().toISOString().slice(0, 10);
        const nextEvent = events.find(event => String(event.date) >= today) || events[0];
        const hasPurchaseRequest = Boolean(r.purchaseRequest);
        const cleaningStatus = String(r.cleaningStatus || '');
        const plannedResidentName = String(r.plannedResidentName || '').trim();
        const plannedEntryDate = String(r.plannedEntryDate || '');
        const plannedResidentNote = String(r.plannedResidentNote || '').trim();
        const hasPlannedResident = Boolean(plannedResidentName || plannedEntryDate);
        const cleaningClass = cleaningStatus === '清掃済' ? 'is-clean' : (cleaningStatus === '清掃中' ? 'is-cleaning' : 'is-unclean');

        return `
          <div class="room-card floor-board-card ${isEmpty ? 'is-empty' : ''} ${hasPlannedResident && isEmpty ? 'has-planned-resident' : ''} ${hasPurchaseRequest ? 'has-purchase-request' : ''}"
               role="button" tabindex="0"
               onclick="window.EarthApp.openFloorBoardModal('${r.id}')"
               onkeydown="if(event.key === 'Enter' || event.key === ' '){event.preventDefault(); window.EarthApp.openFloorBoardModal('${r.id}');}">
            <div class="room-card-header">
              <span class="room-card-num">${escapeHtml(r.room)} 号室</span>
              <span class="room-status-badges">
                ${isEmpty ? '<span class="vacancy-badge">空室</span>' : ''}
                ${hasPurchaseRequest ? `<span class="purchase-request-alert" title="${escapeHtml(r.purchaseItem || '品名未入力')}">🛒 購入依頼あり${r.purchaseItem ? `：${escapeHtml(r.purchaseItem)}` : ''}</span>` : ''}
              </span>
            </div>
            <div class="room-card-name floor-board-card-name">
              <span>${escapeHtml(r.name || '空室')}</span>
            </div>

            <div class="floor-card-content">
              ${isEmpty ? `
                <div class="vacancy-management">
                  <span class="cleaning-status-badge ${cleaningClass}">🧹 ${escapeHtml(cleaningStatus || '清掃未設定')}</span>
                  ${hasPlannedResident ? `
                    <div class="planned-resident-summary">
                      <strong>🏠 入居予定：${escapeHtml(plannedResidentName || '氏名未登録')}</strong>
                      ${plannedEntryDate ? `<span>${escapeHtml(formatFloorEventDate(plannedEntryDate))} 入居予定</span>` : ''}
                      ${plannedResidentNote ? `<small>${escapeHtml(plannedResidentNote)}</small>` : ''}
                    </div>
                  ` : '<div class="planned-resident-empty">入居予定者なし</div>'}
                </div>
              ` : ''}
              <div class="floor-card-memo ${memo ? '' : 'is-empty-value'}">
                <span class="floor-card-label">📝 メモ</span>
                <span>${memo ? escapeHtml(memo) : 'メモはありません'}</span>
              </div>
              <div class="floor-card-event ${nextEvent ? '' : 'is-empty-value'}">
                <span class="floor-card-label">📅 予定</span>
                <span>${nextEvent ? `${escapeHtml(formatFloorEventDate(nextEvent.date))}　${escapeHtml(nextEvent.title)}` : '予定はありません'}</span>
              </div>
              ${events.length > 1 ? `<span class="floor-event-count">ほか ${events.length - 1}件</span>` : ''}
            </div>

            <button type="button"
                    class="purchase-request-toggle ${hasPurchaseRequest ? 'is-on' : ''}"
                    onclick="event.stopPropagation(); window.EarthApp.togglePurchaseRequest('${r.id}')">
              ${hasPurchaseRequest ? '🛒 物品購入依頼 ON' : '🛒 物品購入依頼 OFF'}
            </button>
          </div>
        `;
      }).join('');

      return `
        <div class="floor-section">
          <div class="floor-title-container">
            <h2 class="floor-title">
              🏢 ${f}階 居室配置図 <span style="font-size: 14px; font-weight: normal; color: var(--earth-muted);">${roomRangeText}</span>
            </h2>
            <div class="floor-badges">
              <span class="floor-badge floor-badge-primary">在室: ${occupiedCount} / ${totalCount} 室</span>
              ${emptyCount > 0 ? `<span class="floor-badge" style="background:#fef3c7; color:#92400e;">空室: ${emptyCount} 室</span>` : ''}
              <span class="floor-badge">平均介護度: 介${avgCare}</span>
            </div>
          </div>
          <div class="floor-grid">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 食事指示ビューの描画
   */
  function renderMealView() {
    const stats = window.DataStore.getStatistics();
    const residents = window.DataStore.getAllResidents().filter(r => r.name);

    if (elements.mealSummaryGrid) {
      elements.mealSummaryGrid.innerHTML = `
        <div class="meal-stat-card">
          <div class="meal-stat-title">🍚 主食形態内訳</div>
          <ul class="meal-stat-list">
            ${Object.entries(stats.foodMainCounts).map(([key, count]) => `
              <li class="meal-stat-item" style="${masterColorStyle('foodMain', key)}">
                <span>${escapeHtml(key)}</span>
                <strong class="font-num">${count} 名</strong>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="meal-stat-card">
          <div class="meal-stat-title">🥗 副食形態内訳</div>
          <ul class="meal-stat-list">
            ${Object.entries(stats.foodSideCounts).map(([key, count]) => `
              <li class="meal-stat-item">
                <span>${key}</span>
                <strong class="font-num">${count} 名</strong>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="meal-stat-card">
          <div class="meal-stat-title">⚡ 特別指示・配膳オプション</div>
          <ul class="meal-stat-list">
            <li class="meal-stat-item">
              <span class="tag-thick" style="font-size:12px;">とろみあり</span>
              <strong class="font-num">${stats.thickCount} 名</strong>
            </li>
            <li class="meal-stat-item">
              <span class="tag-early" style="font-size:12px;">早出し対象</span>
              <strong class="font-num">${stats.earlyCount} 名</strong>
            </li>
          </ul>
        </div>
      `;
    }

    if (elements.mealTableBody) {
      elements.mealTableBody.innerHTML = residents.map(r => `
        <tr>
          <td><span class="room-badge">${r.room}</span></td>
          <td style="font-weight: 700;">${escapeHtml(r.name)}</td>
          <td><span class="tag-food" style="${masterColorStyle('foodMain', r.foodMain || '米飯')}">${escapeHtml(r.foodMain || '米飯')}</span></td>
          <td><span class="tag-food">${r.foodSide || '普通'}</span></td>
          <td>${r.foodThick && r.foodThick.includes('あり') ? '<span class="tag-thick">あり</span>' : 'なし'}</td>
          <td>${r.earlyFood ? '<span class="tag-early">早出し</span>' : '通常'}</td>
          <td>${r.note || '-'}</td>
        </tr>
      `).join('');
    }
  }

  /**
   * 医療・福祉用具ビューの描画
   */
  function renderMedicalView() {
    const residents = window.DataStore.getAllResidents().filter(r => r.name);
    
    // クリニック別グループ化
    const doctorGroups = {};
    residents.forEach(r => {
      let doc = r.doctor || '未定・未設定';
      if (!doctorGroups[doc]) doctorGroups[doc] = [];
      doctorGroups[doc].push(r);
    });

    if (elements.doctorGrid) {
      elements.doctorGrid.innerHTML = Object.entries(doctorGroups).map(([docName, group]) => {
        const isJosai = docName.includes('城西');
        const limitNotice = isJosai 
          ? `<span class="doctor-limit-badge ${group.length >= 19 ? 'warning' : 'normal'}">枠上限: 19名 (現在 ${group.length}名)</span>`
          : `<span class="doctor-limit-badge normal">受診: ${group.length}名</span>`;

        return `
          <div class="doctor-card" style="${masterColorStyle('doctor', docName)}">
            <div class="doctor-card-header" style="border-bottom-color: currentColor;">
              <span class="doctor-name" style="color: inherit;">🏥 ${escapeHtml(docName)}</span>
              ${limitNotice}
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${group.map(res => `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 6px 8px; background: #fafbfc; color: var(--earth-ink); border-radius: 8px;">
                  <div>
                    <span class="room-badge" style="font-size:11px; padding:2px 5px;">${res.room}</span>
                    <strong style="margin-left: 6px;">${escapeHtml(res.name)}</strong>
                  </div>
                  <div>
                    ${getCareLevelBadge(res.careLevel)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /**
   * 異動・退去履歴の描画
   */
  function renderHistoryView() {
    const logs = window.DataStore.getAllMoveOutLogs();
    if (!elements.historyTableBody) return;

    if (logs.length === 0) {
      elements.historyTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: var(--earth-muted);">
            異動・退去の記録はありません。
          </td>
        </tr>
      `;
      return;
    }

    elements.historyTableBody.innerHTML = logs.map(l => `
      <tr>
        <td><span class="room-badge">${l.room || '-'}</span></td>
        <td style="font-weight: 700;">${l.name || '-'}</td>
        <td><span class="badge" style="background:#ef4444; color:#fff;">${l.eventType || '退去'}</span></td>
        <td class="font-num">${l.eventDate || '-'}</td>
        <td>${getCareLevelBadge(l.careLevel)}</td>
        <td class="font-num">${l.birthday || '-'}</td>
        <td class="font-num">${l.age ? `${l.age}歳` : '-'}</td>
        <td>${l.doctor || '-'}</td>
        <td>${l.note || '-'}</td>
      </tr>
    `).join('');
  }

  /**
   * ケアマネ・生活相談員モードの描画（認定期限アラート＆専用テーブル）
   */
  function renderCareManagerView() {
    const tbody = elements.caremanagerTableBody;
    if (!tbody) return;

    // 1. サマリーの集計と更新
    const cmSummary = window.DataStore.getCareManagerSummary();
    if (elements.cmStatExpired) elements.cmStatExpired.innerHTML = `${cmSummary.expiredCount} <span class="care-alert-unit">名</span>`;
    if (elements.cmStatUrgent) elements.cmStatUrgent.innerHTML = `${cmSummary.urgentCount} <span class="care-alert-unit">名</span>`;
    if (elements.cmStatWarning) elements.cmStatWarning.innerHTML = `${cmSummary.warningCount} <span class="care-alert-unit">名</span>`;
    if (elements.cmStatOk) elements.cmStatOk.innerHTML = `${cmSummary.okCount} <span class="care-alert-unit">名</span>`;

    // 2. フィルター状態バッジの更新
    if (elements.cmCurrentFilterBadge) {
      if (state.careManagerAlertFilter === 'expired') {
        elements.cmCurrentFilterBadge.innerHTML = '🔴 認定期限切れのみ表示中';
        elements.cmCurrentFilterBadge.style.color = '#b91c1c';
      } else if (state.careManagerAlertFilter === 'urgent') {
        elements.cmCurrentFilterBadge.innerHTML = '🟠 30日以内(要申請)のみ表示中';
        elements.cmCurrentFilterBadge.style.color = '#c2410c';
      } else if (state.careManagerAlertFilter === 'warning') {
        elements.cmCurrentFilterBadge.innerHTML = '🟡 60日以内(申請準備)のみ表示中';
        elements.cmCurrentFilterBadge.style.color = '#854d0e';
      } else if (state.careManagerAlertFilter === 'ok') {
        elements.cmCurrentFilterBadge.innerHTML = '🟢 認定有効内のみ表示中';
        elements.cmCurrentFilterBadge.style.color = '#15803d';
      } else {
        elements.cmCurrentFilterBadge.innerHTML = '全件表示中';
        elements.cmCurrentFilterBadge.style.color = '#1e40af';
      }
    }

    // 3. 入居者リストのフィルタリング
    let list = getFilteredResidents();

    // ケアマネ用アラートフィルターの適用
    if (state.careManagerAlertFilter !== 'all') {
      list = list.filter(r => {
        if (!r.name) return false;
        const alertInfo = window.DataStore.getCertificationAlertInfo(r.certEndDate);
        return alertInfo.level === state.careManagerAlertFilter;
      });
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align: center; padding: 36px; color: var(--earth-muted);">
            該当する入居者データが見つかりませんでした。
          </td>
        </tr>
      `;
      return;
    }

    const masters = window.DataStore.getMasters();
    const copayList = masters.copay || ['1割', '2割', '3割'];
    const certStatusList = masters.certStatus || ['有効', '更新申請中', '認定調査済', '結果待ち', '意見書作成中', '区分変更申請中'];
    const careList = masters.careLevel || ['介1', '介2', '介3', '介4', '介5', '自立', '支1', '支2'];

    tbody.innerHTML = list.map(r => {
      const isEmpty = !r.name || r.name.trim() === '';
      const alertInfo = window.DataStore.getCertificationAlertInfo(r.certEndDate);
      const rowClass = !isEmpty ? alertInfo.rowClass : '';

      return `
        <tr class="${isEmpty ? 'is-empty-room' : ''} ${rowClass}">
          <!-- 部屋番号（左端固定） -->
          <td class="sticky-col-room">
            <span class="room-badge" style="font-size:13px; font-weight:800;">${r.room || '-'}</span>
          </td>

          <!-- 名前（左端固定） -->
          <td class="sticky-col-name" style="font-weight: 700; color: ${r.name ? 'var(--earth-ink)' : '#9ca3af'};">
            ${r.name || '(空室)'}
          </td>

          <!-- 介護度（選択式） -->
          <td>
            ${!isEmpty ? `
              <select class="cell-select" style="font-weight: bold;" onchange="window.EarthApp.onCellChange('${r.id}', 'careLevel', this.value)">
                <option value="">-</option>
                ${careList.map(opt => `<option value="${opt}" ${r.careLevel === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            ` : '-'}
          </td>

          <!-- 負担割合（1割/2割/3割 選択式） -->
          <td>
            ${!isEmpty ? `
              <select class="cell-select" style="font-weight: bold; color: ${r.copay === '3割' ? '#dc2626' : (r.copay === '2割' ? '#d97706' : '#2563eb')};"
                onchange="window.EarthApp.onCellChange('${r.id}', 'copay', this.value)">
                ${copayList.map(opt => `<option value="${opt}" ${(r.copay || '1割') === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            ` : '-'}
          </td>

          <!-- 被保険者番号（入力式） -->
          <td>
            ${!isEmpty ? `
              <input type="text" class="cell-input font-num" style="font-size: 12px; font-weight: 600;" value="${r.insNumber || ''}" placeholder="0000000000"
                onchange="window.EarthApp.onCellChange('${r.id}', 'insNumber', this.value)">
            ` : '-'}
          </td>

          <!-- 保険者（自治体名） -->
          <td>
            ${!isEmpty ? `
              <input type="text" class="cell-input" style="font-size: 12.5px;" value="${r.insurerName || '静岡市'}" placeholder="自治体名"
                onchange="window.EarthApp.onCellChange('${r.id}', 'insurerName', this.value)">
            ` : '-'}
          </td>

          <!-- 認定開始日 -->
          <td>
            ${!isEmpty ? `
              <input type="text" class="cell-input font-num" style="font-size: 12px;" value="${r.certStartDate || ''}" placeholder="YYYY/MM/DD"
                onchange="window.EarthApp.onCellChange('${r.id}', 'certStartDate', this.value)">
            ` : '-'}
          </td>

          <!-- 認定満了日（有効期限） -->
          <td>
            ${!isEmpty ? `
              <input type="text" class="cell-input font-num" style="font-size: 12px; font-weight: 700;" value="${r.certEndDate || ''}" placeholder="YYYY/MM/DD"
                onchange="window.EarthApp.onCellChange('${r.id}', 'certEndDate', this.value)">
            ` : '-'}
          </td>

          <!-- ⚠️ 認定期限アラートバッジ -->
          <td style="white-space: nowrap;">
            ${!isEmpty ? `
              <span class="${alertInfo.badgeClass}">
                ${alertInfo.label}
              </span>
            ` : '-'}
          </td>

          <!-- 更新申請状況（選択式） -->
          <td>
            ${!isEmpty ? `
              <select class="cell-select" onchange="window.EarthApp.onCellChange('${r.id}', 'certStatus', this.value)">
                <option value="">-</option>
                ${certStatusList.map(opt => `<option value="${opt}" ${r.certStatus === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            ` : '-'}
          </td>

          <!-- 主治医（意見書依頼先） -->
          <td style="font-size: 12.5px; color: var(--earth-muted);">
            ${r.doctor || '-'}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * ケアマネ相談員のアラートフィルター切り替え
   */
  function filterCareManagerAlert(filterType) {
    state.careManagerAlertFilter = filterType;
    renderCareManagerView();
  }

  /**
   * 統計・データ分析ビューの描画（多角的な集計・グラフ分析）
   */
  function renderAnalyticsView() {
    renderStatistics();
    const residents = window.DataStore.getAllResidents().filter(r => r.name && r.name.trim() !== '');
    const total = residents.length;
    if (total === 0) return;

    // 1. 要介護度別分布の集計
    const careOrder = ['自立', '要支援1', '要支援2', '要介護1', '要介護2', '要介護3', '要介護4', '要介護5'];
    const careCounts = {};
    careOrder.forEach(c => careCounts[c] = 0);
    residents.forEach(r => {
      const c = String(r.careLevel || '自立');
      if (careCounts[c] !== undefined) {
        careCounts[c]++;
      } else {
        const normalized = c.replace('介', '要介護').replace('支', '要支援');
        if (careCounts[normalized] !== undefined) careCounts[normalized]++;
        else careCounts[c] = (careCounts[c] || 0) + 1;
      }
    });

    const careColors = {
      '自立': '#0ea5e9',
      '要支援1': '#10b981',
      '要支援2': '#14b8a6',
      '要介護1': '#22c55e',
      '要介護2': '#84cc16',
      '要介護3': '#eab308',
      '要介護4': '#f97316',
      '要介護5': '#ef4444'
    };

    const careLevelContainer = document.getElementById('analytics-care-level');
    if (careLevelContainer) {
      careLevelContainer.innerHTML = Object.entries(careCounts).map(([label, count]) => {
        const pct = Math.round((count / total) * 100);
        const color = careColors[label] || 'var(--earth-green)';
        return `
          <div class="analytics-bar-row">
            <span class="analytics-bar-label">${label}</span>
            <div class="analytics-bar-track">
              <div class="analytics-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
            </div>
            <span class="analytics-bar-val">${count}名<small>(${pct}%)</small></span>
          </div>
        `;
      }).join('');
    }

    // 2. 訪問医・クリニック別シェア
    const doctorCounts = {};
    residents.forEach(r => {
      const doc = (r.doctor || '未定・その他').trim();
      doctorCounts[doc] = (doctorCounts[doc] || 0) + 1;
    });
    const sortedDoctors = Object.entries(doctorCounts).sort((a, b) => b[1] - a[1]);

    const doctorContainer = document.getElementById('analytics-doctor');
    if (doctorContainer) {
      doctorContainer.innerHTML = sortedDoctors.map(([docName, count]) => {
        const pct = Math.round((count / total) * 100);
        const isJosai = docName.includes('城西');
        const color = isJosai ? 'var(--earth-green)' : '#3b82f6';
        return `
          <div class="analytics-bar-row">
            <span class="analytics-bar-label" title="${docName}" style="overflow:hidden; text-overflow:ellipsis;">${docName}</span>
            <div class="analytics-bar-track">
              <div class="analytics-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
            </div>
            <span class="analytics-bar-val">${count}名<small>(${pct}%)</small></span>
          </div>
        `;
      }).join('');
    }

    // 3. 食事形態・ケア区分
    const riceCounts = {};
    const dishCounts = {};

    residents.forEach(r => {
      const rice = r.foodMain || '未設定';
      riceCounts[rice] = (riceCounts[rice] || 0) + 1;

      const dish = r.foodSide || '未設定';
      dishCounts[dish] = (dishCounts[dish] || 0) + 1;
    });

    const mealsContainer = document.getElementById('analytics-meals');
    if (mealsContainer) {
      mealsContainer.innerHTML = `
        <div class="analytics-subgroup">
          <div class="analytics-subgroup-title">🍚 主食形態の内訳</div>
          ${Object.entries(riceCounts).map(([label, count]) => {
            const pct = Math.round((count / total) * 100);
            return `
              <div class="analytics-bar-row">
                <span class="analytics-bar-label">${label}</span>
                <div class="analytics-bar-track">
                  <div class="analytics-bar-fill" style="width: ${pct}%; background-color: var(--earth-green);"></div>
                </div>
                <span class="analytics-bar-val">${count}名<small>(${pct}%)</small></span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="analytics-subgroup" style="margin-top: 14px;">
          <div class="analytics-subgroup-title">🥗 副食形態の内訳</div>
          ${Object.entries(dishCounts).map(([label, count]) => {
            const pct = Math.round((count / total) * 100);
            return `
              <div class="analytics-bar-row">
                <span class="analytics-bar-label">${label}</span>
                <div class="analytics-bar-track">
                  <div class="analytics-bar-fill" style="width: ${pct}%; background-color: #f59e0b;"></div>
                </div>
                <span class="analytics-bar-val">${count}名<small>(${pct}%)</small></span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // 4. フロア別比較 ＆ 負担割合
    const f2 = residents.filter(r => String(r.room || '').startsWith('2'));
    const f3 = residents.filter(r => String(r.room || '').startsWith('3'));

    const calcFloorAvgCare = (list) => {
      if (list.length === 0) return 0;
      const valid = list.map(r => {
        const num = parseInt(String(r.careLevel || '').replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
      });
      return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2);
    };

    const calcFloorAvgAge = (list) => {
      const valid = list.map(r => parseInt(r.age, 10)).filter(a => !isNaN(a));
      if (valid.length === 0) return 0;
      return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
    };

    const copayCounts = { '1割': 0, '2割': 0, '3割': 0, '未設定': 0 };
    residents.forEach(r => {
      const cp = r.copay || '未設定';
      if (copayCounts[cp] !== undefined) copayCounts[cp]++;
      else copayCounts['未設定']++;
    });

    const floorCopayContainer = document.getElementById('analytics-floor-copay');
    if (floorCopayContainer) {
      floorCopayContainer.innerHTML = `
        <div class="floor-compare-grid">
          <div class="floor-stat-box">
            <h4>🏢 2F フロア</h4>
            <div class="floor-stat-num">${f2.length} <small style="font-size:12px; color:var(--earth-muted);">/ 25室</small></div>
            <div class="floor-stat-desc">平均介護度: <strong>${calcFloorAvgCare(f2)}</strong></div>
            <div class="floor-stat-desc">平均年齢: <strong>${calcFloorAvgAge(f2)}歳</strong></div>
          </div>
          <div class="floor-stat-box">
            <h4>🏢 3F フロア</h4>
            <div class="floor-stat-num">${f3.length} <small style="font-size:12px; color:var(--earth-muted);">/ 25室</small></div>
            <div class="floor-stat-desc">平均介護度: <strong>${calcFloorAvgCare(f3)}</strong></div>
            <div class="floor-stat-desc">平均年齢: <strong>${calcFloorAvgAge(f3)}歳</strong></div>
          </div>
        </div>

        <div class="analytics-subgroup" style="margin-top: 14px;">
          <div class="analytics-subgroup-title">💳 介護保険 負担割合の構成</div>
          ${Object.entries(copayCounts).filter(([_, count]) => count > 0).map(([label, count]) => {
            const pct = Math.round((count / total) * 100);
            const color = label === '1割' ? '#10b981' : (label === '2割' ? '#f59e0b' : '#ef4444');
            return `
              <div class="analytics-bar-row">
                <span class="analytics-bar-label">${label}負担</span>
                <div class="analytics-bar-track">
                  <div class="analytics-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
                </div>
                <span class="analytics-bar-val">${count}名<small>(${pct}%)</small></span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  /**
   * 全ビューの一括再描画
   */
  function renderAll() {
    renderStatistics();
    if (state.activeTab === 'all') renderAllResidentsTable();
    else if (state.activeTab === 'caremanager') renderCareManagerView();
    else if (state.activeTab === 'floor') renderFloorMap();
    else if (state.activeTab === 'meal') renderMealView();
    else if (state.activeTab === 'medical') renderMedicalView();
    else if (state.activeTab === 'stats') renderAnalyticsView();
    else if (state.activeTab === 'incidents' && window.IncidentReports) window.IncidentReports.render();
    else if (state.activeTab === 'history') renderHistoryView();
  }

  /**
   * タブ切り替え
   */
  function switchTab(tabKey) {
    state.activeTab = tabKey;
    elements.navTabs.forEach(tab => {
      if (tab.dataset.tab === tabKey) tab.classList.add('active');
      else tab.classList.remove('active');
    });

    elements.tabContents.forEach(pane => {
      if (pane.id === `tab-pane-${tabKey}`) pane.style.display = 'block';
      else pane.style.display = 'none';
    });

    renderAll();
  }

  /**
   * 差分プレビューモーダルの表示
   */
  function openDiffModal(parseResult) {
    const { diff } = parseResult;
    const { diffList, summary } = diff;

    elements.diffModalBody.innerHTML = `
      <div style="background: #f8faf9; padding: 14px 18px; border-radius: 12px; border: 1px solid var(--earth-border); margin-bottom: 16px;">
        <h3 style="font-size: 15px; font-weight: 800; margin-bottom: 6px; color: var(--earth-ink);">📊 解析結果サマリー</h3>
        <div style="display: flex; gap: 16px; font-size: 13px;">
          <span>🟢 新規入居: <strong>${summary.newCount}</strong> 名</span>
          <span>🟡 変更・更新: <strong>${summary.updateCount}</strong> 名</span>
          <span>⚪ 変更なし: <strong>${summary.sameCount}</strong> 名</span>
          <span>🔴 退去・空室化: <strong>${summary.leaveCount}</strong> 名</span>
        </div>
      </div>

      <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
        <table class="diff-table">
          <thead>
            <tr>
              <th>状態</th>
              <th>部屋</th>
              <th>氏名</th>
              <th>介護度</th>
              <th>変更内容・検出詳細</th>
            </tr>
          </thead>
          <tbody>
            ${diffList.map(item => {
              let badge = '';
              let rowClass = '';
              let desc = '';

              if (item.type === 'NEW') {
                badge = '<span class="badge" style="background:#10b981; color:#fff;">新規</span>';
                rowClass = 'diff-row-new';
                desc = `新規登録 (${item.incoming.doctor || '訪問医未定'}, ${item.incoming.foodMain || '食事形態'})`;
              } else if (item.type === 'UPDATE') {
                badge = '<span class="badge" style="background:#f59e0b; color:#fff;">更新</span>';
                rowClass = 'diff-row-update';
                desc = (item.changes || []).join('<br>');
              } else if (item.type === 'LEAVE') {
                badge = '<span class="badge" style="background:#ef4444; color:#fff;">退去</span>';
                rowClass = 'diff-row-leave';
                desc = `元入居者: ${item.current.name} (空室化)`;
              } else {
                badge = '<span class="badge" style="background:#9ca3af; color:#fff;">同一</span>';
                desc = '変更なし';
              }

              return `
                <tr class="${rowClass}">
                  <td>${badge}</td>
                  <td><strong>${item.incoming.room}</strong></td>
                  <td>${item.incoming.name || '(空室)'}</td>
                  <td>${item.incoming.careLevel ? `要介護${item.incoming.careLevel}` : '-'}</td>
                  <td style="font-size: 12px;">${desc}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    elements.diffPreviewModal.classList.add('active');
  }

  /**
   * モーダルクローズ
   */
  function closeModal(modalElem) {
    if (modalElem) modalElem.classList.remove('active');
  }

  /**
   * 表示項目（ワイズマンヘッダ）選択モーダルの描画
   */
  function renderColumnVisibilityManager() {
    const container = document.getElementById('column-visibility-list');
    if (!container) return;

    const allColumns = window.DataStore.getColumns();

    container.innerHTML = allColumns.map(col => {
      const isFixed = col.fixed === true;
      const isVisible = col.visible !== false && col.hidden !== true;

      return `
        <label class="col-vis-item ${isFixed ? 'fixed-item' : ''}" title="${isFixed ? '必須項目のため固定されています' : 'クリックして表示/非表示を切り替え'}">
          <input type="checkbox" class="col-vis-checkbox" 
            ${isVisible ? 'checked' : ''} 
            ${isFixed ? 'disabled' : ''}
            onchange="window.EarthApp.toggleColumnVisibility('${col.key}', this.checked)">
          <span class="col-vis-label">${col.label}</span>
          ${isFixed ? '<span style="font-size:11px; color:var(--earth-muted); font-weight:normal;">(固定)</span>' : ''}
        </label>
      `;
    }).join('');
  }

  /**
   * 項目マスタ管理モーダルの描画
   */
  function renderMasterManager() {
    const container = document.getElementById('master-sections-container');
    if (!container) return;

    const masters = window.DataStore.getMasters();
    const columns = window.DataStore.getColumns();
    const colMap = {};
    columns.forEach(c => { colMap[c.key] = c.label; });

    const masterLabels = {
      careLevel: '🩺 介護度（介1〜介5等）',
      doctor: '🏥 訪問医（クリニック名・医師名）',
      dental: '🦷 口腔衛生（歯科医院名）',
      equipment: '♿ 福祉用具（車椅子・歩行器等）',
      foodMain: '🍚 主食形態（米飯・全粥・パン等）',
      foodSide: '🥗 副食形態（普通・一口・刻み等）',
      foodThick: '🍵 とろみ（あり・無し等）',
      airConditioner: '❄️ エアコン（〇・×等）'
    };

    container.innerHTML = Object.entries(masters).map(([key, items]) => {
      const customColLabel = colMap[key];
      const label = masterLabels[key] || (customColLabel ? `📋 ${customColLabel}` : `📋 ${key}`);
      return `
        <div class="master-section">
          <div class="master-title">
            <span>${label}</span>
            <small style="color: var(--earth-muted); font-weight: normal;">登録数: ${items.length} 件</small>
          </div>
          <div class="master-tag-list">
            ${items.map(item => {
              const encodedItem = encodeURIComponent(item);
              const isColorEnabled = COLOR_ENABLED_MASTER_KEYS.has(key);
              const currentColor = isColorEnabled ? window.DataStore.getMasterItemColor(key, item) : '';
              const isCustomColor = isColorEnabled && window.DataStore.hasMasterItemColor(key, item);
              const hasTextColor = key === 'foodMain' && window.DataStore.hasMasterItemTextColor(key, item);
              const currentTextColor = key === 'foodMain'
                ? (window.DataStore.getMasterItemTextColor(key, item) || readableTextColor(currentColor))
                : '';
              return `
                <span class="master-tag ${isColorEnabled ? 'colored-master-tag' : ''}" style="${isColorEnabled ? masterColorStyle(key, item) : ''}">
                  ${escapeHtml(item)}
                  ${isColorEnabled ? `
                    <label class="master-color-control" title="${escapeHtml(item)}の背景色を選ぶ">
                      <span>色</span>
                      <input type="color" value="${currentColor}" data-master-key="${escapeHtml(key)}" data-master-item="${encodedItem}" onchange="window.EarthApp.setMasterColor(this.dataset.masterKey, decodeURIComponent(this.dataset.masterItem), this.value)">
                    </label>
                    <button type="button" class="master-color-reset" data-master-key="${escapeHtml(key)}" data-master-item="${encodedItem}" onclick="window.EarthApp.resetMasterColor(this.dataset.masterKey, decodeURIComponent(this.dataset.masterItem))" ${isCustomColor ? '' : 'disabled'} title="自動色に戻す">↺</button>
                    ${key === 'foodMain' ? `
                      <label class="master-color-control" title="${escapeHtml(item)}の文字色を選ぶ">
                        <span>文字</span>
                        <input type="color" value="${currentTextColor}" data-text-master-key="${escapeHtml(key)}" data-master-item="${encodedItem}" onchange="window.EarthApp.setMasterTextColor(this.dataset.textMasterKey, decodeURIComponent(this.dataset.masterItem), this.value)">
                      </label>
                      <button type="button" class="master-color-reset" data-text-master-key="${escapeHtml(key)}" data-master-item="${encodedItem}" onclick="window.EarthApp.resetMasterTextColor(this.dataset.textMasterKey, decodeURIComponent(this.dataset.masterItem))" ${hasTextColor ? '' : 'disabled'} title="文字色を自動に戻す">↺</button>
                    ` : ''}
                  ` : ''}
                  <button type="button" class="master-tag-remove" data-master-key="${escapeHtml(key)}" data-master-item="${encodedItem}" onclick="window.EarthApp.removeMaster(this.dataset.masterKey, decodeURIComponent(this.dataset.masterItem))" title="削除">×</button>
                </span>
              `;
            }).join('')}
          </div>
          <form class="master-add-form" onsubmit="event.preventDefault(); window.EarthApp.addMaster('${key}', this.itemValue.value); this.reset();">
            <input type="text" name="itemValue" class="form-input" style="padding: 6px 12px; font-size: 13px;" required placeholder="新しい選択肢を入力...">
            <button type="submit" class="btn btn-outline btn-sm" style="white-space: nowrap;">➕ 追加</button>
          </form>
        </div>
      `;
    }).join('');
  }

  /**
   * 取り込み履歴（スナップショット）モーダルの描画
   */
  function renderSnapshotHistory() {
    const container = document.getElementById('snapshot-list-container');
    if (!container) return;

    const snapshots = window.DataStore.getSnapshots();

    if (snapshots.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 36px 20px; color: var(--earth-muted); background: #fafbfc; border-radius: 12px; border: 1px dashed var(--earth-border);">
          <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
          <strong>過去の取り込み履歴はありません</strong>
          <p style="font-size: 12px; margin-top: 4px;">ワイズマン等のExcelを取り込むと、取り込み前の状態が自動的にここに保存されます。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = snapshots.map(snap => {
      const timeStr = new Date(snap.timestamp).toLocaleString('ja-JP');
      const diffText = snap.diffSummary 
        ? `新規: ${snap.diffSummary.newCount}件 / 更新: ${snap.diffSummary.updateCount}件 / 退去: ${snap.diffSummary.leaveCount}件` 
        : `バックアップ件数: ${snap.previousResidentCount}名`;

      return `
        <div class="snapshot-card">
          <div class="snapshot-info">
            <div class="snapshot-time">🕒 ${timeStr}</div>
            <div class="snapshot-file">📁 取り込み元: <strong>${snap.sourceFileName}</strong> (${snap.mergeMode === 'overwrite' ? '完全上書き' : '差分マージ'})</div>
            <div style="font-size: 11.5px; color: var(--earth-green-dark); font-weight: 700; margin-top: 2px;">
              📊 ${diffText}
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="window.EarthApp.restoreSnapshot('${snap.id}')" title="この取り込み直前のデータ状態に戻します">
            🔄 この状態に復元
          </button>
        </div>
      `;
    }).join('');
  }

  /**
   * イベントリスナーのセットアップ
   */
  function setupEventListeners() {
    // タブ切替
    elements.navTabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // 検索・フィルター
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      scheduleRenderAll();
    });

    elements.filterFloorSelect.addEventListener('change', (e) => {
      state.filterFloor = e.target.value;
      renderAll();
    });

    elements.filterCareSelect.addEventListener('change', (e) => {
      state.filterCareLevel = e.target.value;
      renderAll();
    });

    elements.filterDoctorSelect.addEventListener('change', (e) => {
      state.filterDoctor = e.target.value;
      renderAll();
    });

    elements.filterFoodSelect.addEventListener('change', (e) => {
      state.filterFood = e.target.value;
      renderAll();
    });

    // 表示項目（ワイズマンヘッダ）選択モーダル開閉
    const btnOpenVisModal = document.getElementById('btn-open-visibility-modal');
    const visModal = document.getElementById('column-visibility-modal');
    if (btnOpenVisModal && visModal) {
      btnOpenVisModal.addEventListener('click', () => {
        renderColumnVisibilityManager();
        visModal.classList.add('active');
      });
    }

    // 項目マスタ管理モーダル開閉
    const btnOpenMasterModal = document.getElementById('btn-open-master-modal');
    const masterModal = document.getElementById('master-manager-modal');
    if (btnOpenMasterModal && masterModal) {
      btnOpenMasterModal.addEventListener('click', () => {
        renderMasterManager();
        masterModal.classList.add('active');
      });
    }

    // 取り込み履歴モーダル開閉
    const btnOpenSnapshotModal = document.getElementById('btn-open-snapshot-modal');
    const snapshotModal = document.getElementById('snapshot-history-modal');
    if (btnOpenSnapshotModal && snapshotModal) {
      btnOpenSnapshotModal.addEventListener('click', () => {
        renderSnapshotHistory();
        snapshotModal.classList.add('active');
      });
    }

    // スプレッドシート連携モーダル開閉
    const sheetSyncModal = document.getElementById('sheet-sync-modal');
    const btnSheetSyncModal = document.getElementById('btn-sheet-sync-modal');
    if (btnSheetSyncModal && sheetSyncModal) {
      btnSheetSyncModal.addEventListener('click', () => {
        const gasInput = document.getElementById('gas-web-app-url');
        if (gasInput) {
          gasInput.value = window.GoogleSheetSync.settings.gasWebAppUrl || '';
        }
        sheetSyncModal.classList.add('active');
      });
    }

    const btnSaveGasUrl = document.getElementById('btn-save-gas-url');
    if (btnSaveGasUrl) {
      btnSaveGasUrl.addEventListener('click', () => {
        const gasInput = document.getElementById('gas-web-app-url');
        if (gasInput) {
          const url = gasInput.value.trim();
          window.GoogleSheetSync.saveSettings({ gasWebAppUrl: url });
          window.GoogleSheetSync.initAutoSync();
          showToast('GAS クラウド自動共有URLを保存し、同期を開始しました！', 'success');
        }
      });
    }

    const btnSyncPull = document.getElementById('btn-sync-pull');
    if (btnSyncPull) {
      btnSyncPull.addEventListener('click', async () => {
        try {
          showToast('クラウドから最新データを取得中...', 'info');
          const syncedData = await window.GoogleSheetSync.pullFromSpreadsheet();
          const residentCount = Array.isArray(syncedData)
            ? syncedData.length
            : (syncedData && Array.isArray(syncedData.residents) ? syncedData.residents.length : 0);
          showToast(`クラウドから ${residentCount} 件の最新データを同期しました！`, 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    const btnSyncPush = document.getElementById('btn-sync-push');
    if (btnSyncPush) {
      btnSyncPush.addEventListener('click', async () => {
        try {
          showToast('クラウドへデータを送信中...', 'info');
          const res = await window.GoogleSheetSync.pushToSpreadsheet();
          showToast(res.message || 'クラウドへの保存が完了しました！', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    const btnCopyTsv = document.getElementById('btn-copy-tsv');
    if (btnCopyTsv) {
      btnCopyTsv.addEventListener('click', async () => {
        try {
          await window.GoogleSheetSync.copyTsvToClipboard();
          showToast('スプレッドシート貼り付け用データ(TSV)をクリップボードにコピーしました！');
        } catch (err) {
          showToast('クリップボードへのコピーに失敗しました', 'error');
        }
      });
    }

    // エクスポートボタン
    elements.btnExportExcel.addEventListener('click', () => {
      window.ExcelExporter.exportAllToExcel();
      showToast('Excelファイル (.xlsx) をダウンロードしました');
    });

    elements.btnExportCsv.addEventListener('click', () => {
      window.ExcelExporter.exportToCsv();
      showToast('CSVファイルをダウンロードしました');
    });

    elements.btnPrint.addEventListener('click', () => {
      window.print();
    });

    elements.btnResetData.addEventListener('click', () => {
      if (confirm('初期サンプルデータにリセットしますか？ 現在の編集内容は上書きされます。')) {
        window.DataStore.resetToDefault();
        showToast('データを初期化しました');
      }
    });

    // ドラッグ＆ドロップ（ワイズマン帳票取り込み）
    const dropzone = elements.dropzone;
    if (dropzone) {
      dropzone.addEventListener('click', () => elements.excelFileInput.click());
      
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          handleFile(e.dataTransfer.files[0]);
        }
      });

      elements.excelFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleFile(e.target.files[0]);
        }
      });
    }

    // ファイル処理
    async function handleFile(file) {
      try {
        showToast(`${file.name} を読み込み中...`, 'info');
        const parseResult = await window.ExcelImporter.parseFile(file);
        openDiffModal(parseResult);
      } catch (err) {
        console.error('File parse error:', err);
        showToast('ファイルの解析に失敗しました。対応形式 (.xls, .xlsx, .csv) をご確認ください。', 'error');
      }
    }

    // インポート適用
    elements.btnApplyImport.addEventListener('click', () => {
      const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'merge';
      const success = window.ExcelImporter.applyImport(mode);
      if (success) {
        closeModal(elements.diffPreviewModal);
        showToast('データのインポートと更新が完了しました！');
        switchTab('all');
      }
    });

    // 管理項目（列）追加モーダル開閉
    const addColModal = document.getElementById('add-column-modal');
    const btnOpenAddCol = document.getElementById('btn-open-add-col-modal');
    const addColForm = document.getElementById('add-column-form');
    const newColTypeSelect = document.getElementById('new-col-type');
    const newColOptionsGroup = document.getElementById('new-col-options-group');

    if (btnOpenAddCol && addColModal) {
      btnOpenAddCol.addEventListener('click', () => {
        if (addColForm) addColForm.reset();
        if (newColOptionsGroup) newColOptionsGroup.style.display = 'block';
        addColModal.classList.add('active');
      });
    }

    if (newColTypeSelect && newColOptionsGroup) {
      newColTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'select') {
          newColOptionsGroup.style.display = 'block';
        } else {
          newColOptionsGroup.style.display = 'none';
        }
      });
    }

    if (addColForm) {
      addColForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const label = addColForm.label.value.trim();
        const type = addColForm.type ? addColForm.type.value : 'select';
        const optionsRaw = addColForm.options ? addColForm.options.value : '';
        const options = optionsRaw ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        if (!label) {
          showToast('項目名を入力してください', 'warning');
          return;
        }

        // 項目キーは自動で作成
        const autoKey = 'col_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

        try {
          window.DataStore.addColumn({
            key: autoKey,
            label,
            type,
            options: options.length > 0 ? options : undefined,
            sortable: true,
            width: '130px'
          });
          closeModal(addColModal);
          showToast(`新しい管理項目「${label}」を追加しました！`);
          renderAll();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // 編集フォーム送信
    elements.residentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(elements.residentForm);
      const roomNum = formData.get('room');
      const floor = roomNum.startsWith('2') ? 2 : (roomNum.startsWith('3') ? 3 : 1);

      const residentObj = {
        id: formData.get('id') || `res_${roomNum}`,
        room: roomNum,
        floor: floor,
        name: formData.get('name').trim(),
        careLevel: formData.get('careLevel') ? parseInt(formData.get('careLevel'), 10) : null,
        birthday: formData.get('birthday').trim(),
        age: formData.get('age') ? parseInt(formData.get('age'), 10) : null,
        entryDate: formData.get('entryDate').trim(),
        doctor: formData.get('doctor').trim(),
        dental: formData.get('dental').trim(),
        equipment: formData.get('equipment').trim(),
        foodMain: formData.get('foodMain').trim(),
        foodSide: formData.get('foodSide').trim(),
        foodThick: formData.get('foodThick').trim(),
        airConditioner: formData.get('airConditioner'),
        earlyFood: formData.get('earlyFood') === 'on',
        status: formData.get('name').trim() ? '入居中' : '空室',
        note: formData.get('note').trim()
      };

      window.DataStore.saveResident(residentObj);
      closeModal(elements.residentEditModal);
      showToast(`${roomNum}号室 (${residentObj.name || '空室'}) の情報を更新しました`);
    });

    // フロアマップ専用メモ・カレンダー
    if (elements.floorBoardForm) {
      elements.floorBoardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveFloorBoardMemo();
      });
    }
    if (elements.btnAddFloorEvent) {
      elements.btnAddFloorEvent.addEventListener('click', addFloorEvent);
    }
    if (elements.floorPurchaseRequest) {
      elements.floorPurchaseRequest.addEventListener('change', updatePurchaseComposerVisibility);
    }
    if (elements.btnGeneratePurchaseEmail) {
      elements.btnGeneratePurchaseEmail.addEventListener('click', () => generatePurchaseMessage('email'));
    }
    if (elements.btnGeneratePurchasePhone) {
      elements.btnGeneratePurchasePhone.addEventListener('click', () => generatePurchaseMessage('phone'));
    }
    if (elements.btnCopyPurchaseMessage) {
      elements.btnCopyPurchaseMessage.addEventListener('click', copyPurchaseMessage);
    }

    // 退去フォーム送信
    elements.moveOutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const resId = elements.moveOutForm.dataset.targetId;
      const eventType = elements.moveOutForm.eventType.value;
      const eventDate = elements.moveOutForm.eventDate.value;
      const note = elements.moveOutForm.note.value;

      window.DataStore.moveOutResident(resId, { eventType, eventDate, note });
      closeModal(elements.moveOutModal);
      showToast('退去・異動処理を記録し、居室を空室に更新しました');
    });

    // モーダル外枠クリックで閉じる
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });
    });

    // 連続更新は次の描画タイミングで1回にまとめ、同じ画面の二重描画を防ぐ
    window.DataStore.subscribe((_data, meta = {}) => {
      const hint = meta.renderHint;
      const hasActiveFilter = state.searchQuery || state.filterFloor !== 'all' ||
        state.filterCareLevel !== 'all' || state.filterDoctor !== 'all' || state.filterFood !== 'all';
      const canKeepCurrentTable = state.activeTab === 'all' && hint && hint.type === 'resident-field' &&
        !hasActiveFilter && state.sortField !== hint.fieldKey && !['room', 'name', 'birthday', 'doctor', 'dental', 'equipment', 'foodMain'].includes(hint.fieldKey);
      if (canKeepCurrentTable) {
        renderStatistics();
        return;
      }
      scheduleRenderAll();
    });
  }

  /**
   * テーブル内セル直接変更ハンドラー
   */
  function onCellChange(residentId, fieldKey, value) {
    let finalValue = value;
    if (fieldKey === 'birthday' && value) {
      finalValue = window.DataStore.toWarekiDisplay(value);
      // 生年月日に基づく年齢の自動計算
      const parsed = window.DataStore.parseDateToSeireki(value);
      if (parsed) {
        const today = new Date();
        let age = today.getFullYear() - parsed.year;
        const mDiff = (today.getMonth() + 1) - parsed.month;
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < parsed.day)) {
          age--;
        }
        if (age >= 0 && age <= 130) {
          window.DataStore.updateResidentField(residentId, 'age', age, { deferSave: true });
        }
      }
    }
    window.DataStore.updateResidentField(residentId, fieldKey, finalValue);
    showToast(`更新しました (${fieldKey}: ${finalValue !== '' ? finalValue : '空欄'})`);
  }

  /**
   * カラム削除
   */
  function removeColumn(columnKey, label) {
    if (confirm(`管理項目「${label}」を削除しますか？`)) {
      try {
        window.DataStore.removeColumn(columnKey);
        showToast(`項目「${label}」を削除しました`);
        renderAllResidentsTable();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }

  /**
   * マスタ項目追加
   */
  function addMaster(key, value) {
    if (value && value.trim()) {
      window.DataStore.addMasterItem(key, value.trim());
      showToast(`マスタに「${value.trim()}」を追加しました`);
      renderMasterManager();
      renderAllResidentsTable();
    }
  }

  /**
   * マスタ項目削除
   */
  function removeMaster(key, value) {
    if (confirm(`マスタから「${value}」を削除しますか？`)) {
      window.DataStore.removeMasterItem(key, value);
      showToast(`マスタから「${value}」を削除しました`);
      renderMasterManager();
      renderAllResidentsTable();
    }
  }

  /**
   * 過去スナップショットの復元
   */
  function restoreSnapshot(snapshotId) {
    if (confirm('指定された過去の取り込み直前のデータ状態に復元しますか？（現在の状態もバックアップとして記録されます）')) {
      try {
        window.DataStore.restoreSnapshot(snapshotId);
        closeModal(document.getElementById('snapshot-history-modal'));
        showToast('過去データを正常に復元しました！');
        renderAll();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }

  function renderFloorEventList(residentId) {
    if (!elements.floorEventList) return;
    const resident = window.DataStore.getResidentById(residentId);
    const events = resident && Array.isArray(resident.floorEvents)
      ? [...resident.floorEvents].filter(event => event && event.date && event.title).sort((a, b) => String(a.date).localeCompare(String(b.date)))
      : [];

    if (events.length === 0) {
      elements.floorEventList.innerHTML = '<div class="floor-event-empty">登録されている予定はありません</div>';
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    elements.floorEventList.innerHTML = events.map(event => `
      <div class="floor-event-item ${String(event.date) < today ? 'is-past' : ''}">
        <div class="floor-event-date-badge">${escapeHtml(formatFloorEventDate(event.date))}</div>
        <div class="floor-event-item-title">${escapeHtml(event.title)}</div>
        <button type="button" class="floor-event-delete"
                data-resident-id="${escapeHtml(residentId)}"
                data-event-id="${escapeHtml(event.id)}"
                onclick="window.EarthApp.removeFloorEvent(this.dataset.residentId, this.dataset.eventId)"
                title="この予定を削除">削除</button>
      </div>
    `).join('');
  }

  function setMasterColor(masterKey, item, color) {
    if (!window.DataStore.setMasterItemColor(masterKey, item, color)) {
      showToast('色を設定できませんでした', 'error');
      return;
    }
    showToast(`「${item}」の背景色を更新しました`);
    renderMasterManager();
  }

  function resetMasterColor(masterKey, item) {
    window.DataStore.setMasterItemColor(masterKey, item, '');
    showToast(`「${item}」を自動色に戻しました`);
    renderMasterManager();
  }

  function setMasterTextColor(masterKey, item, color) {
    if (!window.DataStore.setMasterItemTextColor(masterKey, item, color)) {
      showToast('文字色を設定できませんでした', 'error');
      return;
    }
    showToast(`「${item}」の文字色を更新しました`);
    renderMasterManager();
  }

  function resetMasterTextColor(masterKey, item) {
    window.DataStore.setMasterItemTextColor(masterKey, item, '');
    showToast(`「${item}」の文字色を自動に戻しました`);
    renderMasterManager();
  }

  function openFloorBoardModal(residentId) {
    const resident = window.DataStore.getResidentById(residentId);
    if (!resident || !elements.floorBoardModal || !elements.floorBoardForm) return;

    elements.floorBoardForm.dataset.residentId = resident.id;
    elements.floorBoardTitle.textContent = `🏠 ${resident.room}号室 居室管理`;
    elements.floorBoardResident.textContent = resident.name ? `入居者：${resident.name}` : '現在は空室です';
    elements.floorRoomMemo.value = resident.floorMemo || '';
    elements.floorCleaningStatus.value = resident.cleaningStatus || '';
    elements.plannedResidentName.value = resident.plannedResidentName || '';
    elements.plannedEntryDate.value = resident.plannedEntryDate || '';
    elements.plannedResidentNote.value = resident.plannedResidentNote || '';
    elements.floorPurchaseRequest.checked = Boolean(resident.purchaseRequest);
    elements.purchaseItem.value = resident.purchaseItem || '';
    elements.purchaseQuantity.value = resident.purchaseQuantity || '';
    elements.purchaseDesiredDate.value = resident.purchaseDesiredDate || '';
    elements.purchaseNote.value = resident.purchaseNote || '';
    elements.purchaseMessageOutput.value = '';
    elements.purchaseMessageOutputWrap.hidden = true;
    updatePurchaseComposerVisibility();
    elements.floorEventDate.value = new Date().toISOString().slice(0, 10);
    elements.floorEventTitle.value = '';
    renderFloorEventList(resident.id);
    elements.floorBoardModal.classList.add('active');
  }

  function getFloorBoardFormValues() {
    return {
      floorMemo: elements.floorRoomMemo.value.trim(),
      cleaningStatus: elements.floorCleaningStatus.value,
      plannedResidentName: elements.plannedResidentName.value.trim(),
      plannedEntryDate: elements.plannedEntryDate.value,
      plannedResidentNote: elements.plannedResidentNote.value.trim(),
      purchaseRequest: elements.floorPurchaseRequest.checked,
      purchaseItem: elements.purchaseItem.value.trim(),
      purchaseQuantity: elements.purchaseQuantity.value.trim(),
      purchaseDesiredDate: elements.purchaseDesiredDate.value,
      purchaseNote: elements.purchaseNote.value.trim()
    };
  }

  function saveFloorBoardMemo() {
    const residentId = elements.floorBoardForm && elements.floorBoardForm.dataset.residentId;
    if (!residentId) return;
    window.DataStore.updateFloorBoard(residentId, getFloorBoardFormValues());
    showToast('居室管理情報を保存しました');
  }

  function addFloorEvent() {
    const residentId = elements.floorBoardForm && elements.floorBoardForm.dataset.residentId;
    const resident = residentId ? window.DataStore.getResidentById(residentId) : null;
    const date = elements.floorEventDate.value;
    const title = elements.floorEventTitle.value.trim();
    if (!resident || !date || !title) {
      showToast('予定の日付と内容を入力してください', 'warning');
      return;
    }

    const events = Array.isArray(resident.floorEvents) ? [...resident.floorEvents] : [];
    events.push({
      id: `floor_event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date,
      title
    });
    window.DataStore.updateFloorBoard(residentId, {
      ...getFloorBoardFormValues(),
      floorEvents: events
    });
    elements.floorEventTitle.value = '';
    renderFloorEventList(residentId);
    showToast('カレンダー予定を追加しました');
  }

  function removeFloorEvent(residentId, eventId) {
    const resident = window.DataStore.getResidentById(residentId);
    if (!resident) return;
    const events = Array.isArray(resident.floorEvents)
      ? resident.floorEvents.filter(event => String(event.id) !== String(eventId))
      : [];
    window.DataStore.updateFloorBoard(residentId, { floorEvents: events });
    renderFloorEventList(residentId);
    showToast('予定を削除しました');
  }

  function togglePurchaseRequest(residentId) {
    const resident = window.DataStore.getResidentById(residentId);
    if (!resident) return;
    const nextValue = !resident.purchaseRequest;
    window.DataStore.updateFloorBoard(residentId, { purchaseRequest: nextValue });
    showToast(nextValue ? `${resident.room}号室を物品購入依頼ありにしました` : `${resident.room}号室の物品購入依頼を解除しました`, nextValue ? 'warning' : 'success');
  }

  function updatePurchaseComposerVisibility() {
    if (!elements.floorPurchaseRequest || !elements.purchaseComposerFields) return;
    const enabled = elements.floorPurchaseRequest.checked;
    elements.purchaseComposerFields.classList.toggle('is-disabled', !enabled);
    elements.purchaseComposerFields.querySelectorAll('input, button').forEach(control => {
      control.disabled = !enabled;
    });
    if (!enabled && elements.purchaseMessageOutputWrap) {
      elements.purchaseMessageOutputWrap.hidden = true;
    }
  }

  function buildPurchaseMessage(type, resident, values) {
    const residentLabel = resident.name ? `${resident.name}様` : '入居者未定';
    const target = `${resident.room}号室 ${residentLabel}`;
    const quantity = values.purchaseQuantity || '未指定';
    const desiredDate = values.purchaseDesiredDate ? formatFloorEventDate(values.purchaseDesiredDate) : '指定なし';
    const note = values.purchaseNote || '特になし';

    if (type === 'phone') {
      return [
        'お世話になっております。',
        '入居施設の［担当者名］です。',
        `${residentLabel}にお使いいただく物品の購入について、お電話いたしました。`,
        '',
        `お品物は「${values.purchaseItem}」、数量は「${quantity}」です。`,
        `希望日は「${desiredDate}」、補足は「${note}」です。`,
        '',
        'ご家族様にてご用意いただくことは可能でしょうか。',
        'ご確認のうえ、ご連絡をお願いいたします。'
      ].join('\n');
    }

    return [
      'お世話になっております。',
      '入居施設の［担当者名］です。',
      `${residentLabel}にお使いいただく下記物品につきまして、ご家族様にご購入をお願いしたく、ご連絡いたしました。`,
      '',
      `対象：${target}`,
      `品名：${values.purchaseItem}`,
      `数量：${quantity}`,
      `希望日：${desiredDate}`,
      `補足：${note}`,
      '',
      'お手数をおかけしますが、ご用意いただけるかご返信いただけますと幸いです。',
      'よろしくお願いいたします。'
    ].join('\n');
  }

  function generatePurchaseMessage(type) {
    const residentId = elements.floorBoardForm && elements.floorBoardForm.dataset.residentId;
    const resident = residentId ? window.DataStore.getResidentById(residentId) : null;
    if (!resident || !elements.floorPurchaseRequest.checked) {
      showToast('購入依頼をONにしてください', 'warning');
      return;
    }

    const values = getFloorBoardFormValues();
    if (!values.purchaseItem) {
      showToast('品名を入力してください', 'warning');
      elements.purchaseItem.focus();
      return;
    }

    window.DataStore.updateFloorBoard(residentId, values);
    elements.purchaseMessageTitle.textContent = type === 'phone' ? '📞 ご家族への電話スクリプト' : '✉️ ご家族へのメール文';
    elements.purchaseMessageOutput.value = buildPurchaseMessage(type, resident, values);
    elements.purchaseMessageOutputWrap.hidden = false;
    showToast(type === 'phone' ? '電話用スクリプトを作成しました' : 'メール文を作成しました');
  }

  async function copyPurchaseMessage() {
    const text = elements.purchaseMessageOutput && elements.purchaseMessageOutput.value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_err) {
      elements.purchaseMessageOutput.select();
      document.execCommand('copy');
      elements.purchaseMessageOutput.setSelectionRange(0, 0);
    }
    showToast('文章をコピーしました');
  }

  /**
   * 編集モーダルを開く
   */
  function openEditModal(residentId) {
    const res = window.DataStore.getResidentById(residentId);
    if (!res) return;

    elements.editModalTitle.textContent = `${res.room}号室 入居者情報詳細`;
    const form = elements.residentForm;
    form.id.value = res.id;
    form.room.value = res.room;
    form.name.value = res.name || '';
    form.careLevel.value = res.careLevel || '';
    form.copay.value = res.copay || '1割';
    form.insNumber.value = res.insNumber || '';
    form.insurerName.value = res.insurerName || '静岡市';
    form.certStartDate.value = res.certStartDate || '';
    form.certEndDate.value = res.certEndDate || '';
    form.certStatus.value = res.certStatus || '有効';
    form.birthday.value = res.birthday || '';
    form.age.value = res.age || '';
    form.entryDate.value = res.entryDate || '';
    form.doctor.value = res.doctor || '';
    form.dental.value = res.dental || '';
    form.equipment.value = res.equipment || '';
    form.foodMain.value = res.foodMain || '米飯';
    form.foodSide.value = res.foodSide || '普通';
    form.foodThick.value = res.foodThick || '';
    form.airConditioner.value = res.airConditioner || '〇';
    form.earlyFood.checked = Boolean(res.earlyFood);
    form.note.value = res.note || '';

    elements.residentEditModal.classList.add('active');
  }

  /**
   * 退去モーダルを開く
   */
  function openMoveOutModal(residentId) {
    const res = window.DataStore.getResidentById(residentId);
    if (!res) return;

    elements.moveOutTargetName.textContent = res.name;
    elements.moveOutTargetRoom.textContent = `${res.room}号室`;
    elements.moveOutForm.dataset.targetId = res.id;
    elements.moveOutForm.eventDate.value = new Date().toISOString().split('T')[0];
    elements.moveOutForm.note.value = '';

    elements.moveOutModal.classList.add('active');
  }

  // --- 表示列（ワイズマンヘッダ）選択制御アクション ---
  function toggleColumnVisibility(key, visible) {
    window.DataStore.setColumnVisibility(key, visible);
    renderAllResidentsTable();
    renderColumnVisibilityManager();
  }

  function selectAllColumns(visible = true) {
    const cols = window.DataStore.getColumns();
    const map = {};
    cols.forEach(c => { map[c.key] = visible; });
    window.DataStore.setColumnsVisibility(map);
    renderAllResidentsTable();
    renderColumnVisibilityManager();
    showToast(visible ? 'すべての項目を表示に設定しました' : '必須項目以外を非表示にしました');
  }

  function selectStandardColumns() {
    const standardKeys = ['room', 'name', 'careLevel', 'age', 'entryDate', 'doctor', 'foodMain', 'foodSide'];
    const cols = window.DataStore.getColumns();
    const map = {};
    cols.forEach(c => { map[c.key] = standardKeys.includes(c.key); });
    window.DataStore.setColumnsVisibility(map);
    renderAllResidentsTable();
    renderColumnVisibilityManager();
    showToast('基本項目（部屋・名前・介護度・年齢・入居日・訪問医・食事）のみを表示しました');
  }

  function selectMealColumns() {
    const mealKeys = ['room', 'name', 'careLevel', 'foodMain', 'foodSide', 'foodThick', 'earlyFood'];
    const cols = window.DataStore.getColumns();
    const map = {};
    cols.forEach(c => { map[c.key] = mealKeys.includes(c.key); });
    window.DataStore.setColumnsVisibility(map);
    renderAllResidentsTable();
    renderColumnVisibilityManager();
    showToast('食事関連項目のみを表示しました');
  }

  function resetColumnsVisibility() {
    window.DataStore.resetColumnsVisibility();
    renderAllResidentsTable();
    renderColumnVisibilityManager();
    showToast('表示項目を初期状態に戻しました');
  }

  // ヘッダー「その他」ドロップダウンの開閉
  function toggleHeaderMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('header-more-menu');
    if (menu) {
      menu.classList.toggle('show');
    }
  }

  function openSheetSyncModal() {
    const sheetSyncModal = document.getElementById('sheet-sync-modal');
    if (sheetSyncModal) {
      const gasInput = document.getElementById('gas-web-app-url');
      if (gasInput) {
        gasInput.value = window.GoogleSheetSync.settings.gasWebAppUrl || '';
      }
      sheetSyncModal.classList.add('active');
    }
    const menu = document.getElementById('header-more-menu');
    if (menu) menu.classList.remove('show');
  }

  function updateSyncBadge(statusInfo) {
    const badge = document.getElementById('header-sync-badge');
    if (!badge) return;
    badge.className = `header-sync-badge ${statusInfo.class || ''}`;
    badge.innerHTML = statusInfo.label;
    badge.title = statusInfo.tooltip;
  }

  // アプリケーション初期化
  function init() {
    if (window.IncidentReports) window.IncidentReports.init();
    setupEventListeners();
    renderAll();

    // Googleスプレッドシート完全自動共有エンジンの初期化
    if (window.GoogleSheetSync) {
      window.GoogleSheetSync.onStatusChange(updateSyncBadge);
      window.GoogleSheetSync.initAutoSync();
    }

    // ドロップダウンメニュー外クリックで閉じる
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('header-more-menu');
      if (menu && menu.classList.contains('show') && !e.target.closest('#header-more-dropdown')) {
        menu.classList.remove('show');
      }
    });

    // スプラッシュ画面のフェードアウト
    setTimeout(() => {
      if (elements.splashScreen) {
        elements.splashScreen.classList.add('fade-out');
        setTimeout(() => elements.splashScreen.remove(), 600);
      }
    }, 800);
  }

  // グローバル公開
  window.EarthApp = {
    switchTab,
    switchFloorView,
    onCellChange,
    removeColumn,
    addMaster,
    removeMaster,
    setMasterColor,
    resetMasterColor,
    setMasterTextColor,
    resetMasterTextColor,
    restoreSnapshot,
    openEditModal,
    openFloorBoardModal,
    removeFloorEvent,
    togglePurchaseRequest,
    openMoveOutModal,
    closeModal,
    showToast,
    toggleColumnVisibility,
    selectAllColumns,
    selectStandardColumns,
    selectMealColumns,
    resetColumnsVisibility,
    filterCareManagerAlert,
    toggleHeaderMenu,
    openSheetSyncModal
  };

  // 起動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
