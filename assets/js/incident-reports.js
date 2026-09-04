/**
 * 事故・ヒヤリハット報告書
 * 添付Excelの5帳票を、入力・共有・A4印刷できる画面として再構成する。
 */
(function(window) {
  'use strict';

  const TYPE_LABELS = {
    property: '物損事故報告書',
    resident: '介護事故報告書',
    staff: '職員事故報告書（兼労災報告）',
    traffic: '交通事故報告書',
    nearMiss: 'ヒヤリ・ハット報告書'
  };

  const STATUS_LABELS = {
    draft: '下書き',
    submitted: '提出済み',
    reviewed: '確認済み',
    closed: '完了'
  };

  const REPORT_SCHEMAS = {
    property: [
      section('事故の概要', [
        select('accidentType', '事故の種別', ['物品破損', '対物破損', 'その他']),
        text('damagedObject', '破損した物品・対象', '例：居室扉、手すり'),
        textarea('chronology', '事故の経緯・破損状況', 6, true),
        textarea('situationDiagram', '状況図・位置関係の説明', 4, true)
      ]),
      section('事故時の対応', [
        textarea('immediateResponse', '対処の仕方', 4, true),
        textarea('relatedAgencies', '連絡した関係機関', 3, true)
      ]),
      section('事故後の対応', [
        textarea('familyReport', '家族への報告・説明（誰に・いつ・内容）', 4, true),
        textarea('compensation', '損害賠償等の状況', 3, true),
        textarea('prevention', '再発防止に向けての今後の対応', 5, true)
      ])
    ],
    resident: [
      section('事故の概要', [
        select('accidentType', '事故の種別', ['利用者の死亡', '利用者のケガ', 'その他']),
        textarea('chronology', '事故の経緯', 7, true)
      ]),
      section('事故時の対応', [
        textarea('immediateResponse', '対処の仕方', 4, true),
        text('medicalInstitution', '治療した医療機関名'),
        textarea('treatment', '治療の概要', 3, true),
        textarea('relatedAgencies', '連絡した関係機関', 3, true)
      ]),
      section('事故後の対応', [
        textarea('currentCondition', '利用者の状況（病状・入院の有無等）', 4, true),
        textarea('familyReport', '家族への報告・説明（誰に・いつ・内容）', 4, true),
        textarea('compensation', '損害賠償等の状況', 3, true),
        textarea('prevention', '再発防止に向けての今後の対応', 5, true)
      ])
    ],
    staff: [
      section('職員情報', [
        text('staffKana', 'ふりがな'),
        text('staffName', '氏名'),
        date('staffBirthday', '生年月日'),
        select('staffGender', '性別', ['男', '女', 'その他・回答しない']),
        text('staffAddress', '現住所', '', true),
        text('occupation', '職種'),
        date('hireDate', '入社年月日')
      ]),
      section('事故の概要', [
        select('accidentType', '事故の種別', ['職員の死亡', '職員のケガ', 'その他']),
        textarea('chronology', '事故の経緯（場所・作業・原因・負傷部位・状態）', 8, true),
        textarea('situationDiagram', '発生現場の略図・位置関係の説明', 4, true)
      ]),
      section('傷害について', [
        select('hospitalVisit', '病院受診', ['行った', '行かない']),
        date('hospitalVisitDate', '受診日'),
        textarea('hospitalVisitReason', '受診まで時間が空いた理由／受診しない理由', 3, true),
        textarea('injuryStatus', '傷病名・状態・通院頻度', 4, true),
        text('injuredArea', '傷害部位'),
        text('leaveExpected', '休業の見込み'),
        textarea('medicalInstitution', '対処医療機関（名称・住所・電話）', 3, true),
        textarea('medication', '薬の処方・薬局情報', 3, true),
        select('insurance', '保険適用', ['健保', '国保', '労災', '自由診療', 'その他']),
        text('witness', '事故の現認者（職種・氏名）', '', true)
      ])
    ],
    traffic: [
      section('事故区分・車両', [
        select('vehicleOwnership', '公私の別', ['社用車', '自家用車']),
        select('accidentType', '事故の内容', ['人身事故', '物損事故']),
        select('policeReport', '警察への届出', ['届出済み', '未届出']),
        text('vehicleName', '車名'),
        text('vehicleType', '車種'),
        text('vehicleNumber', '車両ナンバー'),
        text('licenseType', '免許証の種類'),
        text('licenseNumber', '免許証の番号'),
        text('passengers', '同乗者名・人数'),
        textarea('passengerInjury', '同乗者のけがの有無・詳細', 3, true),
        textarea('purpose', '用務の内容（行き先・用件等）', 3, true)
      ]),
      section('事故の内容', [
        textarea('chronology', '発生の原因および事故の内容', 7, true),
        textarea('situationDiagram', '事故の状況図（地図・道路名・位置関係）', 6, true)
      ]),
      section('相手方', [
        text('counterpartName', '氏名'),
        text('counterpartAgeGender', '年齢・性別'),
        text('counterpartAddress', '住所', '', true),
        text('counterpartContact', '連絡先'),
        text('counterpartVehicle', '車名・車種・番号・容量等', '', true),
        textarea('counterpartDamage', 'けがまたは損害の程度', 3, true)
      ]),
      section('傷害・保険', [
        textarea('injuryStatus', '傷病名・状態・入院／通院', 3, true),
        text('injuredArea', '傷害部位'),
        textarea('medicalInstitution', '病院名・住所・電話', 3, true),
        select('insurance', '保険適用', ['健保', '国保', '労災', '自由診療', 'その他']),
        textarea('medication', '薬の処方・薬局情報', 3, true)
      ])
    ],
    nearMiss: [
      section('ヒヤリ・ハットの内容', [
        textarea('summary', 'ヒヤリ・ハットの概要', 7, true)
      ]),
      section('発生の原因（問題と思われる点）', [
        textarea('causeEnvironment', '環境', 3, true),
        textarea('causeEquipment', '器具', 3, true),
        textarea('causeWork', '作業', 3, true),
        textarea('causeHuman', '自分自身', 3, true),
        checkboxes('causeCodes', '該当する要因', [
          'よく見えなかった・聞こえなかった', '確認を怠っていた', '忘れていた', '知らなかった',
          '深く考えなかった', '慌てていた', '疲れていた', '無意識に行った', '困難だった', 'その他'
        ])
      ]),
      section('対策と確認', [
        textarea('measures', '今後の対策', 5, true),
        textarea('followup1week', '改善後の状況（1週間後）', 3, true),
        textarea('followup1month', '改善後の状況（1ヶ月後）', 3, true),
        textarea('followup2months', '改善後の状況（2ヶ月後）', 3, true)
      ])
    ]
  };

  let initialized = false;

  function section(title, fields) { return { title, fields }; }
  function text(name, label, placeholder = '', full = false) { return { name, label, type: 'text', placeholder, full }; }
  function date(name, label) { return { name, label, type: 'date' }; }
  function textarea(name, label, rows = 4, full = false) { return { name, label, type: 'textarea', rows, full }; }
  function select(name, label, options) { return { name, label, type: 'select', options }; }
  function checkboxes(name, label, options) { return { name, label, type: 'checkboxes', options, full: true }; }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function localDateTime() {
    const date = new Date();
    return `${today()}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return `incident_${window.crypto.randomUUID()}`;
    return `incident_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function formatDate(value) {
    if (!value) return '未入力';
    const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('ja-JP', String(value).length === 10
      ? { year: 'numeric', month: 'numeric', day: 'numeric' }
      : { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function render() {
    const list = document.getElementById('incident-report-list');
    if (!list || !window.DataStore) return;
    const reports = window.DataStore.getIncidentReports();
    const search = String(document.getElementById('incident-search')?.value || '').trim().toLowerCase();
    const type = document.getElementById('incident-type-filter')?.value || 'all';
    const status = document.getElementById('incident-status-filter')?.value || 'all';
    const filtered = reports.filter(report => {
      if (type !== 'all' && report.type !== type) return false;
      if (status !== 'all' && (report.status || 'draft') !== status) return false;
      if (!search) return true;
      return [report.residentName, report.reporterName, report.location, TYPE_LABELS[report.type]]
        .some(value => String(value || '').toLowerCase().includes(search));
    });

    renderSummary(reports);
    if (!filtered.length) {
      list.innerHTML = '<div class="incident-empty">該当する報告書はありません。<br><small>「新しい報告書」から作成できます。</small></div>';
      return;
    }

    list.innerHTML = filtered.map(report => {
      const statusKey = report.status || 'draft';
      const subject = report.residentName || report.data?.staffName || report.data?.counterpartName || '対象者未設定';
      return `
        <article class="incident-report-card">
          <div class="incident-report-main">
            <div class="incident-report-heading">
              <span class="incident-type-badge type-${escapeHtml(report.type)}">${escapeHtml(TYPE_LABELS[report.type] || report.type)}</span>
              <span class="incident-status-badge status-${escapeHtml(statusKey)}">${escapeHtml(STATUS_LABELS[statusKey] || statusKey)}</span>
            </div>
            <h3>${escapeHtml(subject)}</h3>
            <div class="incident-report-meta">
              <span>発生：${escapeHtml(formatDate(report.occurredAt))}</span>
              <span>場所：${escapeHtml(report.location || '未入力')}</span>
              <span>報告者：${escapeHtml(report.reporterName || '未入力')}</span>
              <span>更新：${escapeHtml(formatDate(report.updatedAt))}</span>
            </div>
          </div>
          <div class="incident-card-actions">
            <button type="button" class="btn btn-outline btn-sm" data-incident-action="edit" data-id="${escapeHtml(report.id)}">編集</button>
            <button type="button" class="btn btn-outline btn-sm" data-incident-action="print" data-id="${escapeHtml(report.id)}">🖨️ 印刷</button>
            ${statusKey === 'draft' ? `<button type="button" class="btn btn-outline btn-sm text-danger" data-incident-action="delete" data-id="${escapeHtml(report.id)}">削除</button>` : ''}
          </div>
        </article>`;
    }).join('');
  }

  function renderSummary(reports) {
    const container = document.getElementById('incident-summary-grid');
    if (!container) return;
    const counts = {
      all: reports.length,
      draft: reports.filter(item => (item.status || 'draft') === 'draft').length,
      submitted: reports.filter(item => item.status === 'submitted').length,
      reviewed: reports.filter(item => ['reviewed', 'closed'].includes(item.status)).length
    };
    container.innerHTML = [
      ['保存済み', counts.all, 'all'],
      ['下書き', counts.draft, 'draft'],
      ['提出済み', counts.submitted, 'submitted'],
      ['確認・完了', counts.reviewed, 'reviewed']
    ].map(([label, count, key]) => `<div class="incident-summary-card summary-${key}"><span>${label}</span><strong>${count}</strong><small>件</small></div>`).join('');
  }

  function renderResidentOptions(selectedId = '') {
    const selectEl = document.getElementById('incident-resident');
    if (!selectEl) return;
    const residents = window.DataStore.getAllResidents().filter(resident => resident.name);
    selectEl.innerHTML = '<option value="">対象者を選択</option>' + residents.map(resident =>
      `<option value="${escapeHtml(resident.id)}" ${resident.id === selectedId ? 'selected' : ''}>${escapeHtml(resident.room)}号室　${escapeHtml(resident.name)}</option>`
    ).join('');
  }

  function renderDynamicFields(type, values = {}) {
    const container = document.getElementById('incident-dynamic-fields');
    if (!container) return;
    const schema = REPORT_SCHEMAS[type] || REPORT_SCHEMAS.resident;
    container.innerHTML = schema.map(group => `
      <section class="incident-form-section">
        <h3>${escapeHtml(group.title)}</h3>
        <div class="incident-form-grid">
          ${group.fields.map(field => renderField(field, values[field.name])).join('')}
        </div>
      </section>`).join('');
  }

  function renderField(field, value) {
    const classes = `form-group${field.full ? ' full-width' : ''}`;
    const safeValue = escapeHtml(value || '');
    if (field.type === 'textarea') {
      return `<div class="${classes}"><label class="form-label">${escapeHtml(field.label)}</label><textarea name="${escapeHtml(field.name)}" class="form-input" rows="${field.rows || 4}">${safeValue}</textarea></div>`;
    }
    if (field.type === 'select') {
      return `<div class="${classes}"><label class="form-label">${escapeHtml(field.label)}</label><select name="${escapeHtml(field.name)}" class="form-input"><option value="">選択してください</option>${field.options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></div>`;
    }
    if (field.type === 'checkboxes') {
      const selected = Array.isArray(value) ? value : [];
      return `<fieldset class="${classes} incident-checkbox-field"><legend class="form-label">${escapeHtml(field.label)}</legend><div class="incident-checkbox-grid">${field.options.map(option => `<label><input type="checkbox" name="${escapeHtml(field.name)}" value="${escapeHtml(option)}" ${selected.includes(option) ? 'checked' : ''}> ${escapeHtml(option)}</label>`).join('')}</div></fieldset>`;
    }
    return `<div class="${classes}"><label class="form-label">${escapeHtml(field.label)}</label><input type="${field.type}" name="${escapeHtml(field.name)}" class="form-input" value="${safeValue}" placeholder="${escapeHtml(field.placeholder || '')}"></div>`;
  }

  function updateResidentVisibility() {
    const type = document.getElementById('incident-type')?.value || 'resident';
    const field = document.getElementById('incident-resident-field');
    const usesResident = ['property', 'resident', 'nearMiss'].includes(type);
    if (field) field.hidden = !usesResident;
    if (!usesResident) {
      const selectEl = document.getElementById('incident-resident');
      if (selectEl) selectEl.value = '';
    }
    updateResidentSummary();
  }

  function updateResidentSummary() {
    const selectEl = document.getElementById('incident-resident');
    const summary = document.getElementById('incident-resident-summary');
    if (!summary) return;
    const resident = selectEl?.value ? window.DataStore.getResidentById(selectEl.value) : null;
    if (!resident) {
      summary.innerHTML = '<span>対象入居者を選択すると、氏名・年齢・生年月日・介護度・居室を帳票へ自動入力します。</span>';
      return;
    }
    summary.innerHTML = `
      <strong>${escapeHtml(resident.room)}号室　${escapeHtml(resident.name)}</strong>
      <span>年齢：${escapeHtml(resident.age || '-')}歳</span>
      <span>生年月日：${escapeHtml(resident.birthday || '-')}</span>
      <span>介護度：${escapeHtml(resident.careLevel || '-')}</span>`;
    const location = document.getElementById('incident-location');
    if (location && !location.value) location.value = `${resident.room}号室`;
  }

  function openEditor(reportId = '') {
    const form = document.getElementById('incident-editor-form');
    const modal = document.getElementById('incident-editor-modal');
    if (!form || !modal) return;
    const report = reportId ? window.DataStore.getIncidentReportById(reportId) : null;
    const profile = window.DataStore.getFacilityProfile();
    form.reset();
    form.elements.id.value = report?.id || '';
    form.elements.type.value = report?.type || 'resident';
    form.elements.status.value = report?.status || 'draft';
    form.elements.reportDate.value = report?.reportDate || today();
    form.elements.reporterName.value = report?.reporterName || profile.defaultReporter || '';
    form.elements.reporterRole.value = report?.reporterRole || profile.defaultReporterRole || '';
    form.elements.occurredAt.value = report?.occurredAt || localDateTime();
    form.elements.location.value = report?.location || '';
    renderResidentOptions(report?.residentId || '');
    renderDynamicFields(form.elements.type.value, report?.data || {});
    updateResidentVisibility();
    document.getElementById('incident-editor-title').textContent = report ? '事故報告書を編集' : '事故報告書を作成';
    document.getElementById('incident-editor-subtitle').textContent = TYPE_LABELS[form.elements.type.value];
    modal.classList.add('active');
  }

  function closeEditor() {
    document.getElementById('incident-editor-modal')?.classList.remove('active');
  }

  function collectDynamicData(type, formData) {
    const data = {};
    (REPORT_SCHEMAS[type] || []).forEach(group => group.fields.forEach(field => {
      data[field.name] = field.type === 'checkboxes'
        ? formData.getAll(field.name)
        : String(formData.get(field.name) || '').trim();
    }));
    return data;
  }

  function saveFromEditor(forceDraft = false) {
    const form = document.getElementById('incident-editor-form');
    if (!form) return;
    if (!forceDraft && !form.reportValidity()) return;
    const formData = new FormData(form);
    const type = String(formData.get('type') || 'resident');
    const residentId = String(formData.get('residentId') || '');
    const resident = residentId ? window.DataStore.getResidentById(residentId) : null;
    const report = {
      id: String(formData.get('id') || '') || createId(),
      type,
      status: forceDraft ? 'draft' : String(formData.get('status') || 'draft'),
      residentId,
      residentName: resident?.name || '',
      residentSnapshot: resident ? {
        name: resident.name || '', room: resident.room || '', age: resident.age || '',
        birthday: resident.birthday || '', careLevel: resident.careLevel || '', doctor: resident.doctor || ''
      } : {},
      reportDate: String(formData.get('reportDate') || ''),
      reporterName: String(formData.get('reporterName') || '').trim(),
      reporterRole: String(formData.get('reporterRole') || '').trim(),
      occurredAt: String(formData.get('occurredAt') || ''),
      location: String(formData.get('location') || '').trim(),
      data: collectDynamicData(type, formData)
    };
    try {
      const saved = window.DataStore.saveIncidentReport(report);
      form.elements.id.value = saved.id;
      closeEditor();
      render();
      window.EarthApp?.showToast(forceDraft ? '事故報告書を下書き保存しました' : '事故報告書を保存しました');
    } catch (error) {
      window.EarthApp?.showToast(error.message || '事故報告書を保存できませんでした', 'error');
    }
  }

  function openSettings() {
    const modal = document.getElementById('incident-settings-modal');
    const form = document.getElementById('incident-settings-form');
    if (!modal || !form) return;
    const profile = window.DataStore.getFacilityProfile();
    Object.entries(profile).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value || '';
    });
    modal.classList.add('active');
  }

  function saveSettings() {
    const form = document.getElementById('incident-settings-form');
    const data = new FormData(form);
    window.DataStore.saveFacilityProfile({
      facilityName: String(data.get('facilityName') || '').trim(),
      serviceType: String(data.get('serviceType') || '').trim(),
      fax: String(data.get('fax') || '').trim(),
      defaultReporter: String(data.get('defaultReporter') || '').trim(),
      defaultReporterRole: String(data.get('defaultReporterRole') || '').trim()
    });
    document.getElementById('incident-settings-modal')?.classList.remove('active');
    window.EarthApp?.showToast('事故報告書の共通設定を保存しました');
  }

  function printReport(reportId) {
    const report = window.DataStore.getIncidentReportById(reportId);
    const root = document.getElementById('incident-print-root');
    if (!report || !root) return;
    const profile = window.DataStore.getFacilityProfile();
    const resident = report.residentSnapshot || {};
    const schema = REPORT_SCHEMAS[report.type] || [];
    const detailRows = schema.map(group => `
      <tr class="print-section-row"><th colspan="2">${escapeHtml(group.title)}</th></tr>
      ${group.fields.map(field => {
        const rowClass = field.type === 'textarea' ? (field.rows >= 5 ? 'print-long-row' : 'print-medium-row') : '';
        return `<tr class="${rowClass}"><th>${escapeHtml(field.label)}</th><td>${formatPrintValue(report.data?.[field.name])}</td></tr>`;
      }).join('')}`
    ).join('');
    root.innerHTML = `
      <article class="incident-print-sheet ${report.type === 'traffic' ? 'incident-print-landscape' : ''}">
        <header class="incident-print-header">
          <h1>${escapeHtml(TYPE_LABELS[report.type] || '事故報告書')}</h1>
          <div>報告日：${escapeHtml(formatDate(report.reportDate))}</div>
        </header>
        <div class="incident-print-facility">FAX：${escapeHtml(profile.fax || '')}</div>
        <table class="incident-print-table">
          <tbody>
            <tr><th>記載者職氏名</th><td>${escapeHtml([report.reporterRole, report.reporterName].filter(Boolean).join('　'))}</td></tr>
            <tr><th>部署名・サービス種別</th><td>${escapeHtml([profile.serviceType, profile.facilityName].filter(Boolean).join('　'))}</td></tr>
            ${report.residentId ? `
              <tr><th>対象者</th><td>${escapeHtml(resident.name || report.residentName || '')} 様　（${escapeHtml(resident.room || '')}号室）</td></tr>
              <tr><th>年齢・生年月日・認定区分</th><td>${escapeHtml(resident.age || '-')}歳　${escapeHtml(resident.birthday || '-')}　${escapeHtml(resident.careLevel || '-')}</td></tr>` : ''}
            <tr><th>発生日時</th><td>${escapeHtml(formatDate(report.occurredAt))}</td></tr>
            <tr><th>発生場所</th><td>${escapeHtml(report.location || '')}</td></tr>
            ${detailRows}
          </tbody>
        </table>
        <footer class="incident-print-approval">
          <div>経営管理部長</div><div>担当部長</div><div>管理者</div>
        </footer>
      </article>`;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('printing-incident');
    const cleanup = () => {
      document.body.classList.remove('printing-incident');
      root.setAttribute('aria-hidden', 'true');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 80);
  }

  function formatPrintValue(value) {
    const textValue = Array.isArray(value) ? value.join('、') : String(value || '');
    return textValue ? escapeHtml(textValue).replace(/\n/g, '<br>') : '&nbsp;';
  }

  function handleListClick(event) {
    const button = event.target.closest('[data-incident-action]');
    if (!button) return;
    const action = button.dataset.incidentAction;
    const id = button.dataset.id || '';
    if (action === 'edit') openEditor(id);
    if (action === 'print') printReport(id);
    if (action === 'delete') {
      const report = window.DataStore.getIncidentReportById(id);
      if (report && window.confirm(`${TYPE_LABELS[report.type]}の下書きを削除しますか？`)) {
        try {
          window.DataStore.deleteIncidentReport(id);
          render();
          window.EarthApp?.showToast('下書きを削除しました');
        } catch (error) {
          window.EarthApp?.showToast(error.message, 'error');
        }
      }
    }
  }

  function init() {
    if (initialized || !document.getElementById('tab-pane-incidents')) return;
    initialized = true;
    document.getElementById('btn-new-incident')?.addEventListener('click', () => openEditor());
    document.getElementById('btn-incident-settings')?.addEventListener('click', openSettings);
    document.getElementById('incident-report-list')?.addEventListener('click', handleListClick);
    document.getElementById('incident-search')?.addEventListener('input', render);
    document.getElementById('incident-type-filter')?.addEventListener('change', render);
    document.getElementById('incident-status-filter')?.addEventListener('change', render);
    document.getElementById('incident-type')?.addEventListener('change', event => {
      renderDynamicFields(event.target.value, {});
      updateResidentVisibility();
      document.getElementById('incident-editor-subtitle').textContent = TYPE_LABELS[event.target.value];
    });
    document.getElementById('incident-resident')?.addEventListener('change', updateResidentSummary);
    document.getElementById('btn-save-incident-draft')?.addEventListener('click', () => saveFromEditor(true));
    document.getElementById('incident-editor-form')?.addEventListener('submit', event => {
      event.preventDefault();
      saveFromEditor(false);
    });
    document.getElementById('incident-settings-form')?.addEventListener('submit', event => {
      event.preventDefault();
      saveSettings();
    });
    document.querySelectorAll('[data-incident-action="close-editor"]').forEach(button => button.addEventListener('click', closeEditor));
    document.querySelectorAll('[data-incident-action="close-settings"]').forEach(button => button.addEventListener('click', () => document.getElementById('incident-settings-modal')?.classList.remove('active')));
    render();
  }

  window.IncidentReports = { init, render, openEditor, printReport };
})(window);
