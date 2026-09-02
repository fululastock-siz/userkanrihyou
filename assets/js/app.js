/**
 * 株式会社アース 入居者管理システム
 * App - メインUIコントローラー & 描画ロジック
 */

(function() {
  'use strict';

  // アプリケーション状態
  const state = {
    activeTab: 'all', // 'all' | 'floor' | 'meal' | 'medical' | 'history' | 'import'
    searchQuery: '',
    filterFloor: 'all',
    filterCareLevel: 'all',
    filterDoctor: 'all',
    filterFood: 'all',
    sortField: 'room',
    sortAsc: true
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

    // フィルター
    searchInput: document.getElementById('search-input'),
    filterFloorSelect: document.getElementById('filter-floor'),
    filterCareSelect: document.getElementById('filter-care'),
    filterDoctorSelect: document.getElementById('filter-doctor'),
    filterFoodSelect: document.getElementById('filter-food'),

    // ビューコンテナ
    residentTableBody: document.getElementById('resident-table-body'),
    floor2Grid: document.getElementById('floor-2-grid'),
    floor3Grid: document.getElementById('floor-3-grid'),
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

    // 退去モーダル
    moveOutModal: document.getElementById('move-out-modal'),
    moveOutForm: document.getElementById('move-out-form'),
    moveOutTargetName: document.getElementById('move-out-target-name'),
    moveOutTargetRoom: document.getElementById('move-out-target-room'),

    // トースト
    toastContainer: document.getElementById('toast-container')
  };

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
   * 介護度バッジHTML生成
   */
  function getCareLevelBadge(level) {
    if (!level) return '<span class="badge badge-care badge-care-none">未設定</span>';
    const num = parseInt(level, 10);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return `<span class="badge badge-care badge-care-${num}">要介護 ${num}</span>`;
    }
    return `<span class="badge badge-care badge-care-none">${level}</span>`;
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
      list = list.filter(r => String(r.careLevel) === String(state.filterCareLevel));
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

      if (state.sortField === 'room' || state.sortField === 'age' || state.sortField === 'careLevel') {
        valA = valA ? parseInt(valA, 10) : 0;
        valB = valB ? parseInt(valB, 10) : 0;
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
    elements.statAvgCare.innerHTML = `${stats.avgCare}`;
    elements.statAvgAge.innerHTML = `${stats.avgAge} <span class="summary-card-unit">歳</span>`;
    elements.statThickCount.innerHTML = `${stats.thickCount} <span class="summary-card-unit">名</span>`;
    elements.statEarlyCount.innerHTML = `${stats.earlyCount} <span class="summary-card-unit">名</span>`;
  }

  // ドラッグ中の一時状態
  let draggedColKey = null;

  /**
   * 全体管理表のヘッダーおよびボディの描画（ドラッグ移動＆マスタ選択式対応）
   */
  function renderAllResidentsTable() {
    const thead = document.getElementById('resident-table-head');
    const tbody = elements.residentTableBody;
    if (!tbody || !thead) return;

    const columns = window.DataStore.getColumns();
    const masters = window.DataStore.getMasters();

    // 1. ヘッダーの描画（ドラッグ並び替え対応）
    thead.innerHTML = `
      <tr>
        ${columns.map((col, idx) => {
          const isSortable = col.sortable;
          const sortIndicator = isSortable ? (state.sortField === col.key ? (state.sortAsc ? ' 🔼' : ' 🔽') : ' ↕') : '';
          const removeBtn = !col.fixed 
            ? `<button class="btn-remove-col" onclick="event.stopPropagation(); window.EarthApp.removeColumn('${col.key}', '${col.label}')" title="この項目を削除">×</button>` 
            : '';

          return `
            <th class="${isSortable ? 'sortable' : ''}" data-col-key="${col.key}" data-sort="${col.key}" draggable="true" style="width: ${col.width || 'auto'}; cursor: move;" title="クリックで並び替え、長押し/ドラッグで列の移動">
              <div class="col-header-cell">
                <span class="drag-handle" title="ドラッグして列を移動">⠿</span>
                <span style="flex:1; margin: 0 4px;">${col.label}${sortIndicator}</span>
                ${removeBtn}
              </div>
            </th>
          `;
        }).join('')}
        <th class="action-col" style="text-align: right; width: 120px;">操作</th>
      </tr>
    `;

    // ヘッダーのドラッグ＆ドロップイベント設定
    const thList = thead.querySelectorAll('th[data-col-key]');
    thList.forEach(th => {
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
            <td>
              <input type="text" class="cell-input font-num" style="font-weight: 800; width: 65px;" value="${val}"
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="号室">
            </td>
          `;
        }

        // 氏名
        if (col.key === 'name') {
          return `
            <td>
              <input type="text" class="cell-input" style="font-weight: 700; color: ${val ? 'var(--earth-ink)' : '#9ca3af'};" value="${val}"
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="(空室)">
            </td>
          `;
        }

        // 介護度（選択式）
        if (col.key === 'careLevel') {
          return `
            <td>
              <select class="cell-select" onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)">
                <option value="" ${!val ? 'selected' : ''}>未設定</option>
                <option value="1" ${String(val) === '1' ? 'selected' : ''}>要介護 1</option>
                <option value="2" ${String(val) === '2' ? 'selected' : ''}>要介護 2</option>
                <option value="3" ${String(val) === '3' ? 'selected' : ''}>要介護 3</option>
                <option value="4" ${String(val) === '4' ? 'selected' : ''}>要介護 4</option>
                <option value="5" ${String(val) === '5' ? 'selected' : ''}>要介護 5</option>
              </select>
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

        // 訪問医・口腔衛生・福祉用具・主食・副食などのマスタ選択式項目
        const masterKey = col.masterKey || col.key;
        if (masters[masterKey] && Array.isArray(masters[masterKey])) {
          const masterOptions = [...masters[masterKey]];
          // 現在値がマスタに無ければ選択肢に含める
          if (val && !masterOptions.includes(val)) {
            masterOptions.unshift(val);
          }

          return `
            <td>
              <select class="cell-select" onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)">
                <option value="">-</option>
                ${masterOptions.map(opt => `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </td>
          `;
        }

        // カスタム選択式
        if (col.type === 'select' && Array.isArray(col.options)) {
          const optList = [...col.options];
          if (val && !optList.includes(val)) optList.unshift(val);
          return `
            <td>
              <select class="cell-select" onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)">
                <option value="">-</option>
                ${optList.map(opt => `<option value="${opt}" ${String(val) === String(opt) ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </td>
          `;
        }

        // カスタムチェックボックス
        if (col.type === 'checkbox') {
          return `
            <td style="text-align: center;">
              <input type="checkbox" class="cell-checkbox" ${val ? 'checked' : ''}
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.checked)">
            </td>
          `;
        }

        // 数値型
        if (col.type === 'number') {
          return `
            <td>
              <input type="number" class="cell-input font-num" value="${val}"
                onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="-">
            </td>
          `;
        }

        // 通常テキスト入力
        return `
          <td>
            <input type="text" class="cell-input" value="${val}"
              onchange="window.EarthApp.onCellChange('${r.id}', '${col.key}', this.value)" placeholder="-">
          </td>
        `;
      }).join('');

      return `
        <tr class="${isEmpty ? 'is-empty-room' : ''}">
          ${cellsHtml}
          <td class="action-col" style="text-align: right; white-space: nowrap;">
            <button class="btn btn-outline btn-sm" onclick="window.EarthApp.openEditModal('${r.id}')" title="ダイアログで詳細編集">詳細</button>
            ${!isEmpty ? `<button class="btn btn-danger btn-sm" onclick="window.EarthApp.openMoveOutModal('${r.id}')" title="退去・異動処理">退去</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * フロアマップ（居室見取り図）の描画
   */
  function renderFloorMap() {
    const residents = window.DataStore.getAllResidents();
    const floor2List = residents.filter(r => String(r.floor) === '2' || r.room.startsWith('2'));
    const floor3List = residents.filter(r => String(r.floor) === '3' || r.room.startsWith('3'));

    const renderGrid = (list) => {
      return list.map(r => {
        const isEmpty = !r.name || r.name.trim() === '';
        const foodBadges = [];
        if (r.foodMain) foodBadges.push(`<span class="tag-food">${r.foodMain}</span>`);
        if (r.foodSide) foodBadges.push(`<span class="tag-food">${r.foodSide}</span>`);
        if (r.foodThick && r.foodThick.includes('あり')) foodBadges.push(`<span class="tag-thick">とろみ</span>`);
        if (r.earlyFood) foodBadges.push(`<span class="tag-early">早出し</span>`);

        return `
          <div class="room-card ${isEmpty ? 'is-empty' : ''}" onclick="window.EarthApp.openEditModal('${r.id}')">
            <div>
              <div class="room-card-header">
                <span class="room-card-num">${r.room} 号室</span>
                ${getCareLevelBadge(r.careLevel)}
              </div>
              <div class="room-card-name">
                <span>${r.name || '空室'}</span>
                ${r.age ? `<small class="font-num" style="color:var(--earth-muted);">${r.age}歳</small>` : ''}
              </div>
            </div>
            ${!isEmpty ? `
              <div class="room-card-details">
                <div><strong>訪問医:</strong> ${r.doctor || '-'}</div>
                ${r.dental ? `<div><strong>歯科:</strong> ${r.dental}</div>` : ''}
                ${r.equipment ? `<div><strong>用具:</strong> ${r.equipment}</div>` : ''}
                <div class="room-card-tags">
                  ${foodBadges.join('')}
                </div>
              </div>
            ` : `
              <div style="font-size: 12px; color: #aaa; text-align: center; padding: 12px 0;">
                クリックして入居者を登録
              </div>
            `}
          </div>
        `;
      }).join('');
    };

    if (elements.floor2Grid) elements.floor2Grid.innerHTML = renderGrid(floor2List);
    if (elements.floor3Grid) elements.floor3Grid.innerHTML = renderGrid(floor3List);
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
              <li class="meal-stat-item">
                <span>${key}</span>
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
          <td style="font-weight: 700;">${r.name}</td>
          <td><span class="tag-food">${r.foodMain || '米飯'}</span></td>
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
          <div class="doctor-card">
            <div class="doctor-card-header">
              <span class="doctor-name">🏥 ${docName}</span>
              ${limitNotice}
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${group.map(res => `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 6px 8px; background: #fafbfc; border-radius: 8px;">
                  <div>
                    <span class="room-badge" style="font-size:11px; padding:2px 5px;">${res.room}</span>
                    <strong style="margin-left: 6px;">${res.name}</strong>
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
   * 全ビューの一括再描画
   */
  function renderAll() {
    renderStatistics();
    if (state.activeTab === 'all') renderAllResidentsTable();
    else if (state.activeTab === 'floor') renderFloorMap();
    else if (state.activeTab === 'meal') renderMealView();
    else if (state.activeTab === 'medical') renderMedicalView();
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
   * 項目マスタ管理モーダルの描画
   */
  function renderMasterManager() {
    const container = document.getElementById('master-sections-container');
    if (!container) return;

    const masters = window.DataStore.getMasters();
    const masterLabels = {
      doctor: '🏥 訪問医（クリニック名・医師名）',
      dental: '🦷 口腔衛生（歯科医院名）',
      equipment: '♿ 福祉用具（車椅子・歩行器等）',
      foodMain: '🍚 主食形態（米飯・全粥・パン等）',
      foodSide: '🥗 副食形態（普通・一口・刻み等）',
      foodThick: '🍵 とろみ（あり・無し等）',
      airConditioner: '❄️ エアコン（〇・×等）'
    };

    container.innerHTML = Object.entries(masters).map(([key, items]) => {
      const label = masterLabels[key] || `📋 ${key}`;
      return `
        <div class="master-section">
          <div class="master-title">
            <span>${label}</span>
            <small style="color: var(--earth-muted); font-weight: normal;">登録数: ${items.length} 件</small>
          </div>
          <div class="master-tag-list">
            ${items.map(item => `
              <span class="master-tag">
                ${item}
                <button type="button" class="master-tag-remove" onclick="window.EarthApp.removeMaster('${key}', '${item}')" title="削除">×</button>
              </span>
            `).join('')}
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
      renderAll();
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
          showToast('GAS ウェブアプリURLを保存しました');
        }
      });
    }

    const btnSyncPull = document.getElementById('btn-sync-pull');
    if (btnSyncPull) {
      btnSyncPull.addEventListener('click', async () => {
        try {
          showToast('スプレッドシートからデータを取得中...', 'info');
          const residents = await window.GoogleSheetSync.pullFromSpreadsheet();
          showToast(`スプレッドシートから ${residents.length} 件のデータを同期しました！`);
          renderAll();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    const btnSyncPush = document.getElementById('btn-sync-push');
    if (btnSyncPush) {
      btnSyncPush.addEventListener('click', async () => {
        try {
          showToast('スプレッドシートへデータを送信中...', 'info');
          const res = await window.GoogleSheetSync.pushToSpreadsheet();
          showToast(res.message || 'スプレッドシートを更新しました！');
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
        if (newColOptionsGroup) newColOptionsGroup.style.display = 'none';
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
        const key = addColForm.key.value.trim().replace(/\s+/g, '');
        const type = addColForm.type.value;
        const optionsRaw = addColForm.options ? addColForm.options.value : '';
        const options = optionsRaw ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        if (!label || !key) {
          showToast('項目名とキーを入力してください', 'warning');
          return;
        }

        try {
          window.DataStore.addColumn({
            key,
            label,
            type,
            options: type === 'select' ? options : undefined,
            sortable: true,
            width: '120px'
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

    // データストア購読
    window.DataStore.subscribe(() => {
      renderStatistics();
      renderAllResidentsTable();
      if (state.activeTab === 'floor') renderFloorMap();
      else if (state.activeTab === 'meal') renderMealView();
      else if (state.activeTab === 'medical') renderMedicalView();
      else if (state.activeTab === 'history') renderHistoryView();
    });
  }

  /**
   * テーブル内セル直接変更ハンドラー
   */
  function onCellChange(residentId, fieldKey, value) {
    window.DataStore.updateResidentField(residentId, fieldKey, value);
    showToast(`更新しました (${fieldKey}: ${value !== '' ? value : '空欄'})`);
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

  // アプリケーション初期化
  function init() {
    setupEventListeners();
    renderAll();

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
    onCellChange,
    removeColumn,
    addMaster,
    removeMaster,
    restoreSnapshot,
    openEditModal,
    openMoveOutModal,
    closeModal,
    showToast
  };

  // 起動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
