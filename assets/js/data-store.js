/**
 * 株式会社アース 入居者管理システム
 * DataStore - データ管理 & LocalStorage永続化モジュール
 */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'earth_residents_management_data_v1';

  // 項目マスタの初期デフォルト定義
  const DEFAULT_MASTERS = {
    careLevel: [
      '介1',
      '介2',
      '介3',
      '介4',
      '介5',
      '自立',
      '支1',
      '支2'
    ],
    doctor: [
      '井上Dr.　城西',
      '堀池Dr.　とやま',
      '日野Dr.　城西',
      '平野Dr　平野',
      '内田Dr.　静岡ホーム',
      '野村Dr.　静岡ホーム',
      '古谷Dr.　静岡ホーム',
      '梅内Dr.　静岡ホーム',
      '安部Dr.　とやま',
      '外山Dr.　とやま',
      '東静岡クリニック'
    ],
    dental: [
      '小嶋デンタル',
      'さくらばし歯科',
      'なし'
    ],
    equipment: [
      '施　車椅子',
      '購　歩行器',
      'レ　リクライニング式車椅子',
      'レ　車椅子',
      '施　歩行器',
      '多機能車椅子',
      '購　車椅子',
      '歩行器'
    ],
    foodMain: [
      '米飯',
      '軟飯',
      '全粥',
      'パン',
      'ミキサー'
    ],
    foodSide: [
      '普通',
      '一口',
      'きざみ',
      '極キザミ',
      'ミキサー'
    ],
    foodThick: [
      '無し',
      'あり'
    ],
    airConditioner: [
      '〇',
      '×'
    ],
    copay: [
      '1割',
      '2割',
      '3割'
    ],
    certStatus: [
      '有効',
      '更新申請中',
      '認定調査済',
      '結果待ち',
      '意見書作成中',
      '区分変更申請中'
    ]
  };

  // 十二支（干支）定義
  const ZODIAC_LIST = [
    { icon: '🐭', name: '子', read: 'ね' },
    { icon: '🐮', name: '丑', read: 'うし' },
    { icon: '🐯', name: '寅', read: 'とら' },
    { icon: '🐰', name: '卯', read: 'う' },
    { icon: '🐲', name: '辰', read: 'たつ' },
    { icon: '🐍', name: '巳', read: 'み' },
    { icon: '🐴', name: '午', read: 'うま' },
    { icon: '🐑', name: '未', read: 'ひつじ' },
    { icon: '🐵', name: '申', read: 'さる' },
    { icon: '🐔', name: '酉', read: 'とり' },
    { icon: '🐶', name: '戌', read: 'いぬ' },
    { icon: '🐗', name: '亥', read: 'い' }
  ];

  /**
   * 日付文字列を解析して西暦 { year, month, day } を返す
   */
  function parseDateToSeireki(dateStr) {
    if (!dateStr) return null;
    let str = String(dateStr).trim();

    // 1. 西暦形式 YYYY/MM/DD, YYYY-MM-DD, YYYY年MM月DD日
    const sMatch = str.match(/^(\d{4})[\/\-\.年](\d{1,2})[\/\-\.月](\d{1,2})日?$/);
    if (sMatch) {
      return {
        year: parseInt(sMatch[1], 10),
        month: parseInt(sMatch[2], 10),
        day: parseInt(sMatch[3], 10)
      };
    }

    // 2. 和暦形式 (S24/06/08, 昭和24年6月8日, T11/04/20, M45/1/1, H1/2/3, R2/3/4 等)
    str = str.replace(/元年/g, '1年').replace(/元[\/\.\-]/g, '1/');
    str = str.replace(/明治/g, 'M').replace(/大正/g, 'T').replace(/昭和/g, 'S').replace(/平成/g, 'H').replace(/令和/g, 'R');
    str = str.replace(/年|\./g, '/').replace(/月/g, '/').replace(/日/g, '').replace(/\s+/g, '');

    const wMatch = str.match(/^([MTSHR])(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{1,2})$/i);
    if (wMatch) {
      const g = wMatch[1].toUpperCase();
      const gy = parseInt(wMatch[2], 10);
      const m = parseInt(wMatch[3], 10);
      const d = parseInt(wMatch[4], 10);

      let seirekiYear = 1925 + gy; // default 昭和
      if (g === 'R') seirekiYear = 2018 + gy;
      else if (g === 'H') seirekiYear = 1988 + gy;
      else if (g === 'S') seirekiYear = 1925 + gy;
      else if (g === 'T') seirekiYear = 1911 + gy;
      else if (g === 'M') seirekiYear = 1867 + gy;

      return { year: seirekiYear, month: m, day: d };
    }

    return null;
  }

  /**
   * 生年月日の文字列から干支情報を取得
   */
  function getZodiac(dateStrOrYear) {
    if (!dateStrOrYear) return null;
    let year = null;
    if (typeof dateStrOrYear === 'number') {
      year = dateStrOrYear;
    } else {
      const parsed = parseDateToSeireki(dateStrOrYear);
      if (parsed) year = parsed.year;
    }
    if (!year || isNaN(year)) return null;
    const index = (year - 4) % 12;
    const normalizedIdx = (index + 12) % 12;
    return ZODIAC_LIST[normalizedIdx];
  }

  /**
   * 生年月日の文字列を「和暦（例: S07/01/12）」に正規化
   */
  function toWarekiDisplay(dateStr) {
    if (!dateStr) return '';
    const parsed = parseDateToSeireki(dateStr);
    if (!parsed) return String(dateStr);
    const { year, month, day } = parsed;

    const dNum = year * 10000 + month * 100 + day;
    let g = 'S', gy = year - 1925;
    if (dNum >= 20190501) { g = 'R'; gy = year - 2018; }
    else if (dNum >= 19890108) { g = 'H'; gy = year - 1988; }
    else if (dNum >= 19261225) { g = 'S'; gy = year - 1925; }
    else if (dNum >= 19120730) { g = 'T'; gy = year - 1911; }
    else if (dNum >= 18680125) { g = 'M'; gy = year - 1867; }

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${g}${String(gy).padStart(2, '0')}/${mStr}/${dStr}`;
  }

  // カラムの初期デフォルト定義（ジャストフィット極小幅化）
  const DEFAULT_COLUMNS = [
    { key: 'room', label: '部屋', type: 'text', fixed: true, sortable: true, width: '50px' },
    { key: 'name', label: '名前', type: 'text', fixed: true, sortable: true, width: '100px' },
    { key: 'careLevel', label: '介護度', type: 'select', masterKey: 'careLevel', options: ['', '介1', '介2', '介3', '介4', '介5', '自立', '支1', '支2'], sortable: true, width: '50px' },
    { key: 'age', label: '年齢', type: 'number', sortable: true, width: '38px' },
    { key: 'birthday', label: '生年月日', type: 'text', sortable: false, width: '84px' },
    { key: 'entryDate', label: '入居日', type: 'text', sortable: true, width: '78px' },
    { key: 'doctor', label: '訪問医', type: 'select', masterKey: 'doctor', sortable: false, width: '125px' },
    { key: 'dental', label: '口腔衛生', type: 'select', masterKey: 'dental', sortable: false, width: '110px' },
    { key: 'equipment', label: '福祉用具', type: 'select', masterKey: 'equipment', sortable: false, width: '130px' },
    { key: 'foodMain', label: 'ごはん', type: 'select', masterKey: 'foodMain', sortable: false, width: '70px' },
    { key: 'foodSide', label: 'おかず', type: 'select', masterKey: 'foodSide', sortable: false, width: '70px' },
    { key: 'foodThick', label: 'とろみ', type: 'select', masterKey: 'foodThick', sortable: false, width: '60px' },
    { key: 'airConditioner', label: 'エアコン', type: 'select', masterKey: 'airConditioner', sortable: false, width: '50px' },
    { key: 'earlyFood', label: '早出し', type: 'checkbox', sortable: false, width: '50px' }
  ];

  // デフォルト初期データ（Googleスプレッドシートより抽出）
  const DEFAULT_DATA = {
    columns: DEFAULT_COLUMNS,
    masters: DEFAULT_MASTERS,
    snapshots: [], // ワイズマンインポート前のデータスナップショット履歴
    residents: [
      { id: "res_201", room: "201", floor: 2, name: "熊木　勝", entryDate: "2026/07/14", careLevel: "介4", birthday: "S24/06/08", age: 77, doctor: "井上Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_202", room: "202", floor: 2, name: "石垣　和子", entryDate: "2025/07/08", careLevel: "介4", birthday: "S07/1/12", age: 93, doctor: "堀池Dr.　とやま", dental: "", equipment: "", foodMain: "軟飯", foodSide: "一口", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_203", room: "203", floor: 2, name: "長谷川　明代", entryDate: "2024/02/29", careLevel: "介4", birthday: "S13/9/29", age: 87, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: true, status: "入居中", note: "" },
      { id: "res_204", room: "204", floor: 2, name: "瀬川　清江", entryDate: "2026/01/20", careLevel: "介4", birthday: "S07/09/06", age: 94, doctor: "井上Dr.　城西", dental: "", equipment: "レ　リクライニング式車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "あり", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_205", room: "205", floor: 2, name: "南　君江", entryDate: "2019/11/01", careLevel: "介1", birthday: "S1/12/25", age: 99, doctor: "野村Dr.　静岡ホーム", dental: "小嶋デンタル", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "普通", foodThick: "無し", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_206", room: "206", floor: 2, name: "内山　和司", entryDate: "2026/02/04", careLevel: "介1", birthday: "S09/03/01", age: 92, doctor: "日野Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "パン", foodSide: "一口", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_207", room: "207", floor: 2, name: "佐野　益浩", entryDate: "2023/07/05", careLevel: "介1", birthday: "S15/02/01", age: 85, doctor: "日野Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "無し", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_208", room: "208", floor: 2, name: "堀池　智恵子", entryDate: "2022/12/23", careLevel: "介2", birthday: "S5/09/05", age: 95, doctor: "井上Dr.　城西", dental: "さくらばし歯科", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "普通", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_209", room: "209", floor: 2, name: "梅原　とし子", entryDate: "2023/05/10", careLevel: "介3", birthday: "S9/11/03", age: 91, doctor: "堀池Dr.　とやま", dental: "さくらばし歯科", equipment: "購　歩行器, 施　車椅子", foodMain: "軟飯", foodSide: "普通", foodThick: "無し", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_210", room: "210", floor: 2, name: "鈴木　トヨ江", entryDate: "2023/03/13", careLevel: "介4", birthday: "S8/12/13", age: 93, doctor: "日野Dr.　城西", dental: "", equipment: "レ　リクライニング式車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_211", room: "211", floor: 2, name: "飯塚　愛子", entryDate: "2024/12/06", careLevel: "介2", birthday: "S16/01/01", age: 84, doctor: "内田Dr.　静岡ホーム", dental: "", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_212", room: "212", floor: 2, name: "吉崎　壽江", entryDate: "2024/09/13", careLevel: "介5", birthday: "S9/08/21", age: 91, doctor: "日野Dr.　城西", dental: "小嶋デンタル", equipment: "施　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "無し", airConditioner: "〇", earlyFood: true, status: "入居中", note: "" },
      { id: "res_213", room: "213", floor: 2, name: "西澤　惠美子", entryDate: "2025/03/04", careLevel: "介2", birthday: "S11/9/06", age: 89, doctor: "平野Dr　平野", dental: "さくらばし歯科", equipment: "施　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_214", room: "214", floor: 2, name: "大長　まさ", entryDate: "2021/03/23", careLevel: "介2", birthday: "T11/04/20", age: 103, doctor: "日野Dr.　城西", dental: "小嶋デンタル", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "きざみ", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_215", room: "215", floor: 2, name: "堀井　義介", entryDate: "2025/04/04", careLevel: "介1", birthday: "S07/01/18", age: 93, doctor: "堀池Dr.　とやま", dental: "", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_216", room: "216", floor: 2, name: "竹田　朝枝", entryDate: "2022/12/22", careLevel: "介5", birthday: "S9/01/30", age: 92, doctor: "日野Dr.　城西", dental: "さくらばし歯科", equipment: "レ　リクライニング式車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "", airConditioner: "×", earlyFood: true, status: "入居中", note: "" },
      { id: "res_217", room: "217", floor: 2, name: "海老原　暁子", entryDate: "2025/08/29", careLevel: "介2", birthday: "S16/12/16", age: 84, doctor: "堀池Dr.　とやま", dental: "", equipment: "", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_218", room: "218", floor: 2, name: "堀井　千沙", entryDate: "2026/05/13", careLevel: "介1", birthday: "S15/10/02", age: 86, doctor: "堀池Dr.　とやま", dental: "", equipment: "", foodMain: "全粥", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_219", room: "219", floor: 2, name: "山田　はる江", entryDate: "2020/06/27", careLevel: "介3", birthday: "S2/02/15", age: 98, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "レ　車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_220", room: "220", floor: 2, name: "西澤　惠美子", entryDate: "2025/03/04", careLevel: "介2", birthday: "S11/9/06", age: 89, doctor: "平野Dr　平野", dental: "さくらばし歯科", equipment: "施　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_221", room: "221", floor: 2, name: "澤田　和男", entryDate: "2025/08/04", careLevel: "介2", birthday: "S10/10/06", age: 89, doctor: "平野Dr　平野", dental: "", equipment: "レ　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_222", room: "222", floor: 2, name: "花村　喜平", entryDate: "2026/07/10", careLevel: "介1", birthday: "S14/08/08", age: 87, doctor: "井上Dr.　城西", dental: "", equipment: "", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_223", room: "223", floor: 2, name: "八倉　昌弘", entryDate: "2023/02/15", careLevel: "介3", birthday: "S13/10/1", age: 87, doctor: "堀池Dr.　とやま", dental: "さくらばし歯科", equipment: "施　車椅子", foodMain: "全粥", foodSide: "極キザミ", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_224", room: "224", floor: 2, name: "小田　芳江", entryDate: "2025/06/05", careLevel: "介3", birthday: "S11/10/21", age: 89, doctor: "堀池Dr.　とやま", dental: "さくらばし歯科", equipment: "レ　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_225", room: "225", floor: 2, name: "松浦　睦子", entryDate: "2018/09/04", careLevel: "介4", birthday: "S13/1/10", age: 88, doctor: "平野Dr　平野", dental: "小嶋デンタル", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "普通", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      
      { id: "res_301", room: "301", floor: 3, name: "一杉　洋子", entryDate: "2025/06/18", careLevel: "介2", birthday: "S24/05/08", age: 76, doctor: "日野Dr.　城西", dental: "", equipment: "購　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_302", room: "302", floor: 3, name: "田中　晨子", entryDate: "2017/09/24", careLevel: "介3", birthday: "S13/03/5", age: 87, doctor: "梅内Dr.　静岡ホーム", dental: "小嶋デンタル", equipment: "購　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_303", room: "303", floor: 3, name: "狩野　厚子", entryDate: "2025/09/09", careLevel: "介2", birthday: "S28/7/19", age: 72, doctor: "堀池Dr.　とやま", dental: "", equipment: "レ　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_304", room: "304", floor: 3, name: "藁科　玉江", entryDate: "2025/03/07", careLevel: "介3", birthday: "S16/08/18", age: 84, doctor: "日野Dr.　城西", dental: "", equipment: "レ　車椅子", foodMain: "ミキサー", foodSide: "ミキサー", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_305", room: "305", floor: 3, name: "志田美智子", entryDate: "2023/06/27", careLevel: "介2", birthday: "S8/04/02", age: 92, doctor: "井上Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "全粥", foodSide: "一口", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_306", room: "306", floor: 3, name: "小澤　増江", entryDate: "2026/03/17", careLevel: "介2", birthday: "S20/03/05", age: 81, doctor: "堀池Dr.　とやま", dental: "", equipment: "レ　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_307", room: "307", floor: 3, name: "漆畑　彌千代", entryDate: "2021/02/05", careLevel: "介1", birthday: "S14/8/08", age: 86, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_308", room: "308", floor: 3, name: "鈴木　登喜江", entryDate: "2024/12/18", careLevel: "介5", birthday: "T15/5/12", age: 99, doctor: "堀池Dr.　とやま", dental: "", equipment: "施　車椅子, 施　歩行器", foodMain: "全粥", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_309", room: "309", floor: 3, name: "稲葉　恵美子", entryDate: "2025/03/13", careLevel: "介2", birthday: "S09/11/27", age: 91, doctor: "平野Dr　平野", dental: "", equipment: "", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_310", room: "310", floor: 3, name: "安田　愛子", entryDate: "2025/04/07", careLevel: "介1", birthday: "S02/04/03", age: 98, doctor: "野村Dr.　静岡ホーム", dental: "小嶋デンタル", equipment: "施　車椅子", foodMain: "全粥", foodSide: "極キザミ", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_311", room: "311", floor: 3, name: "池田　久雄", entryDate: "2024/02/16", careLevel: "介2", birthday: "S7/08/02", age: 93, doctor: "日野Dr.　城西", dental: "さくらばし歯科", equipment: "歩行器", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_312", room: "312", floor: 3, name: "石川　トメ子", entryDate: "2025/11/01", careLevel: "介3", birthday: "S06/11/01", age: 94, doctor: "堀池Dr.　とやま", dental: "", equipment: "レ　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_313", room: "313", floor: 3, name: "片平　美津江", entryDate: "2025/08/19", careLevel: "介4", birthday: "S11/11/10", age: 89, doctor: "井上Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_314", room: "314", floor: 3, name: "三浦　一枝", entryDate: "2023/09/25", careLevel: "介2", birthday: "S8/01/30", age: 93, doctor: "井上Dr.　城西", dental: "小嶋デンタル", equipment: "", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_315", room: "315", floor: 3, name: "海野　君江", entryDate: "2024/11/06", careLevel: "介3", birthday: "S6/09/05", age: 94, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "歩行器", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_316", room: "316", floor: 3, name: "鈴木　ハマ", entryDate: "2021/02/04", careLevel: "介2", birthday: "S4/09/18", age: 96, doctor: "堀池Dr.　とやま", dental: "", equipment: "購　歩行器", foodMain: "全粥", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_317", room: "317", floor: 3, name: "渡邉　津和代", entryDate: "2024/04/15", careLevel: "介1", birthday: "S4/10/23", age: 97, doctor: "堀池Dr.　とやま", dental: "", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_318", room: "318", floor: 3, name: "藤田　絹代", entryDate: "2018/07/15", careLevel: "介2", birthday: "S16/1/06", age: 85, doctor: "日野Dr.　城西", dental: "", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_319", room: "319", floor: 3, name: "佐伯　十三枝", entryDate: "2022/04/02", careLevel: "介4", birthday: "S13/1/05", age: 87, doctor: "平野Dr　平野", dental: "小嶋デンタル", equipment: "多機能車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_320", room: "320", floor: 3, name: "小倉　馨", entryDate: "2024/09/12", careLevel: "介3", birthday: "S7/02/18", age: 93, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_321", room: "321", floor: 3, name: "", entryDate: "", careLevel: "", birthday: "", age: null, doctor: "", dental: "", equipment: "", foodMain: "", foodSide: "", foodThick: "", airConditioner: "〇", earlyFood: false, status: "空室", note: "" },
      { id: "res_322", room: "322", floor: 3, name: "青嶋　アツ子", entryDate: "2024/11/25", careLevel: "介2", birthday: "S15/11/01", age: 85, doctor: "古谷Dr.　静岡ホーム, 内田Dr.　静岡ホーム", dental: "さくらばし歯科", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_323", room: "323", floor: 3, name: "佐藤　みつ子", entryDate: "2018/12/02", careLevel: "介5", birthday: "S5/10/04", age: 96, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "多機能車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_324", room: "324", floor: 3, name: "野田　久子", entryDate: "2024/05/01", careLevel: "介2", birthday: "S15/7/07", age: 85, doctor: "日野Dr.　城西", dental: "", equipment: "購　車椅子", foodMain: "米飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_325", room: "325", floor: 3, name: "石部　きみ子", entryDate: "2025/12/01", careLevel: "介2", birthday: "S08/02/10", age: 92, doctor: "堀池Dr.　とやま", dental: "", equipment: "", foodMain: "軟飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" }
    ],
    moveOutLogs: [
      { room: "201", name: "小澤　よし子", entryDate: "2024/10/01", careLevel: 4, birthday: "T15/3/21", age: 99, doctor: "堀池Dr.　とやま", eventDate: "4/26", eventType: "逝去", note: "" },
      { room: "202", name: "天野とし子", entryDate: "2024/05/07", careLevel: 2, birthday: "S2/11/27", age: 98, doctor: "外山Dr.　とやま", eventDate: "3/18", eventType: "逝去", note: "" },
      { room: "204", name: "鈴木勝代", entryDate: "2019/01/09", careLevel: 5, birthday: "S17/2/20", age: 83, doctor: "堀池Dr.　とやま", eventDate: "12/3", eventType: "逝去", note: "" },
      { room: "213", name: "鈴木勢津子", entryDate: "2024/11/26", careLevel: 1, birthday: "S8/04/18", age: 92, doctor: "外山Dr.　とやま", eventDate: "2025/4/22", eventType: "入院", note: "" },
      { room: "215", name: "石井令三", entryDate: "", careLevel: null, birthday: "", age: null, doctor: "", eventDate: "3/3", eventType: "在宅", note: "" },
      { room: "217", name: "服部　豊", entryDate: "2025/01/06", careLevel: 1, birthday: "S16/08/10", age: 84, doctor: "堀池Dr.　とやま", eventDate: "5/28", eventType: "入院", note: "" },
      { room: "217", name: "深澤紀久子", entryDate: "2025/06/19", careLevel: 2, birthday: "S14/02/11", age: 86, doctor: "堀池Dr.　とやま", eventDate: "11/9", eventType: "逝去", note: "" },
      { room: "218", name: "望月清子", entryDate: "2024/05/02", careLevel: 5, birthday: "S20/06/25", age: 80, doctor: "日野Dr.　城西", eventDate: "3/18", eventType: "逝去", note: "" },
      { room: "221", name: "中村政子", entryDate: "2018/03/23", careLevel: 5, birthday: "S5/09/21", age: 95, doctor: "堀池Dr.　とやま", eventDate: "6/16", eventType: "逝去", note: "" },
      { room: "225", name: "高橋和代", entryDate: "2022/01/19", careLevel: 4, birthday: "S2/02/16", age: 98, doctor: "東静岡", eventDate: "10/29", eventType: "ＧＨ", note: "" },
      { room: "301", name: "篠宮芳子", entryDate: "2024/1/19", careLevel: 1, birthday: "S8/03/27", age: 92, doctor: "安部Dr.　とやま", eventDate: "3/13", eventType: "逝去", note: "" },
      { room: "301", name: "鈴木かな子", entryDate: "2025/5/13", careLevel: 2, birthday: "S08/10/17", age: 92, doctor: "堀池Dr.　とやま", eventDate: "5/24", eventType: "逝去", note: "" },
      { room: "303", name: "沼本英雄", entryDate: "2025/01/08", careLevel: 3, birthday: "S11/8/15", age: 89, doctor: "堀池Dr.　とやま", eventDate: "8/19", eventType: "逝去", note: "" },
      { room: "304", name: "犬塚まつゑ", entryDate: "2023/8/16", careLevel: 4, birthday: "S05/3/2", age: 97, doctor: "", eventDate: "2025/2/10", eventType: "逝去", note: "" },
      { room: "306", name: "片又勝美", entryDate: "2024/11/21", careLevel: 3, birthday: "S11/12/06", age: 89, doctor: "堀池Dr.　とやま", eventDate: "3/14", eventType: "特養", note: "" },
      { room: "310", name: "市川澄子", entryDate: "2023/11/07", careLevel: 4, birthday: "S9/08/27", age: 91, doctor: "稲葉Dr.　城西", eventDate: "3/19", eventType: "特養", note: "" },
      { room: "313", name: "青島すみ", entryDate: "2023/5/31", careLevel: 3, birthday: "S15/02/21", age: 85, doctor: "堀池Dr.　とやま", eventDate: "6/14", eventType: "GH", note: "" },
      { room: "314", name: "岡田芳子", entryDate: "2024/05/28", careLevel: 3, birthday: "S6/11/01", age: 94, doctor: "堀池Dr.　とやま", eventDate: "5/15", eventType: "入院", note: "" },
      { room: "321", name: "矢和田禎士", entryDate: "2023/08/07", careLevel: 3, birthday: "S11/08/11", age: 89, doctor: "井上Dr.　城西", eventDate: "8/3", eventType: "逝去", note: "" },
      { room: "325", name: "服部やす", entryDate: "2025/08/22", careLevel: 2, birthday: "S06/12/08", age: 94, doctor: "堀池Dr.　とやま", eventDate: "11/17", eventType: "逝去", note: "" },
      { room: "325", name: "原　洋子", entryDate: "2013/2/20", careLevel: 4, birthday: "S5/11/11", age: 95, doctor: "東静岡", eventDate: "7/14", eventType: "逝去", note: "" }
    ],
    lastUpdated: new Date().toISOString()
  };

  class DataStore {
    constructor() {
      this.listeners = [];
      this.data = this.loadData();
    }

    loadData() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.residents)) {
            // カラム定義が存在しない古いデータの場合はDEFAULT_COLUMNSを適用
            if (!parsed.columns || !Array.isArray(parsed.columns)) {
              parsed.columns = DEFAULT_COLUMNS;
            } else {
              // 既存カラム定義の幅やラベル（「名前」）を最新のコンパクト定義で同期
              parsed.columns.forEach(c => {
                const def = DEFAULT_COLUMNS.find(d => d.key === c.key);
                if (def) {
                  c.label = def.label;
                  c.width = def.width;
                  c.fixed = def.fixed;
                }
              });
            }
            // マスタが存在しない場合は初期マスタをセット
            if (!parsed.masters || typeof parsed.masters !== 'object') {
              parsed.masters = JSON.parse(JSON.stringify(DEFAULT_MASTERS));
            }
            // スナップショット履歴の初期化
            if (!parsed.snapshots || !Array.isArray(parsed.snapshots)) {
              parsed.snapshots = [];
            }
            // ケアマネ・相談員用フィールド（負担割合、被保番、保険者、有効期間）の補完
            parsed.residents.forEach((r, idx) => {
              if (r.name) {
                if (!r.copay) r.copay = (idx % 8 === 0) ? '2割' : (idx % 15 === 0 ? '3割' : '1割');
                if (!r.insNumber) r.insNumber = `00${String(12345678 + parseInt(r.room || '0', 10)).padStart(8, '0')}`;
                if (!r.insurerName) r.insurerName = '静岡市';
                if (!r.certStartDate) r.certStartDate = '2024/04/01';
                if (!r.certEndDate) {
                  if (idx === 0) r.certEndDate = '2026/08/31'; // 期限切れサンプル
                  else if (idx === 1) r.certEndDate = '2026/09/15'; // 30日以内サンプル
                  else if (idx === 2) r.certEndDate = '2026/09/28'; // 30日以内サンプル
                  else if (idx === 3) r.certEndDate = '2026/10/20'; // 60日以内サンプル
                  else if (idx === 4) r.certEndDate = '2026/10/31'; // 60日以内サンプル
                  else r.certEndDate = '2027/03/31'; // 有効
                }
                if (!r.certStatus) {
                  if (idx === 0) r.certStatus = '更新申請中';
                  else if (idx === 1) r.certStatus = '認定調査済';
                  else if (idx === 2) r.certStatus = '申請準備';
                  else r.certStatus = '有効';
                }
              }
            });
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to load data from localStorage:', e);
      }
      
      const defaultObj = JSON.parse(JSON.stringify(DEFAULT_DATA));
      defaultObj.residents.forEach((r, idx) => {
        if (r.name) {
          if (!r.copay) r.copay = (idx % 8 === 0) ? '2割' : (idx % 15 === 0 ? '3割' : '1割');
          if (!r.insNumber) r.insNumber = `00${String(12345678 + parseInt(r.room || '0', 10)).padStart(8, '0')}`;
          if (!r.insurerName) r.insurerName = '静岡市';
          if (!r.certStartDate) r.certStartDate = '2024/04/01';
          if (!r.certEndDate) {
            if (idx === 0) r.certEndDate = '2026/08/31';
            else if (idx === 1) r.certEndDate = '2026/09/15';
            else if (idx === 2) r.certEndDate = '2026/09/28';
            else if (idx === 3) r.certEndDate = '2026/10/20';
            else if (idx === 4) r.certEndDate = '2026/10/31';
            else r.certEndDate = '2027/03/31';
          }
          if (!r.certStatus) {
            if (idx === 0) r.certStatus = '更新申請中';
            else if (idx === 1) r.certStatus = '認定調査済';
            else if (idx === 2) r.certStatus = '申請準備';
            else r.certStatus = '有効';
          }
        }
      });
      return defaultObj;
    }

    saveData() {
      try {
        this.data.lastUpdated = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.notify();
      } catch (e) {
        console.error('Failed to save data to localStorage:', e);
      }
    }

    subscribe(fn) {
      this.listeners.push(fn);
    }

    notify() {
      this.listeners.forEach(fn => fn(this.data));
    }

    // --- 項目マスタ管理 ---
    getMasters() {
      return this.data.masters || DEFAULT_MASTERS;
    }

    getMaster(key) {
      const masters = this.getMasters();
      return masters[key] || [];
    }

    saveMasters(newMasters) {
      this.data.masters = { ...this.getMasters(), ...newMasters };
      this.saveData();
    }

    addMasterItem(key, item) {
      if (!this.data.masters) this.data.masters = JSON.parse(JSON.stringify(DEFAULT_MASTERS));
      if (!this.data.masters[key]) this.data.masters[key] = [];
      const trimmed = String(item).trim();
      if (trimmed && !this.data.masters[key].includes(trimmed)) {
        this.data.masters[key].push(trimmed);
        this.saveData();
      }
    }

    removeMasterItem(key, item) {
      if (!this.data.masters || !this.data.masters[key]) return;
      this.data.masters[key] = this.data.masters[key].filter(i => i !== item);
      this.saveData();
    }

    // --- 列（カラム）管理＆表示切り替え＆並び替え ---
    getColumns() {
      return this.data.columns || DEFAULT_COLUMNS;
    }

    // 表示が有効なカラムのみを取得
    getVisibleColumns() {
      const cols = this.getColumns();
      return cols.filter(c => c.visible !== false && c.hidden !== true);
    }

    // 列の表示/非表示切り替え
    setColumnVisibility(key, isVisible) {
      if (!this.data.columns) this.data.columns = [...DEFAULT_COLUMNS];
      const col = this.data.columns.find(c => c.key === key);
      if (col) {
        col.visible = Boolean(isVisible);
        col.hidden = !isVisible;
        this.saveData();
      }
    }

    // 複数列の表示/非表示を一括更新
    setColumnsVisibility(visibilityMap) {
      if (!this.data.columns) this.data.columns = [...DEFAULT_COLUMNS];
      this.data.columns.forEach(c => {
        if (visibilityMap[c.key] !== undefined) {
          c.visible = Boolean(visibilityMap[c.key]);
          c.hidden = !c.visible;
        }
      });
      this.saveData();
    }

    // 初期表示（全列表示）にリセット
    resetColumnsVisibility() {
      if (!this.data.columns) this.data.columns = [...DEFAULT_COLUMNS];
      this.data.columns.forEach(c => {
        c.visible = true;
        c.hidden = false;
      });
      this.saveData();
    }

    reorderColumns(fromKey, toKey) {
      if (!this.data.columns) return;
      // 部屋と名前は左端固定列のため、移動および割り込みを完全に禁止
      if (fromKey === 'room' || fromKey === 'name' || toKey === 'room' || toKey === 'name') {
        return;
      }
      const cols = [...this.data.columns];
      const fromIdx = cols.findIndex(c => c.key === fromKey);
      const toIdx = cols.findIndex(c => c.key === toKey);
      if (fromIdx >= 2 && toIdx >= 2 && fromIdx !== toIdx) {
        const [moved] = cols.splice(fromIdx, 1);
        cols.splice(toIdx, 0, moved);
        this.data.columns = cols;
        this.saveData();
      }
    }

    addColumn(columnDef) {
      if (!this.data.columns) {
        this.data.columns = [...DEFAULT_COLUMNS];
      }
      
      // 項目キーが指定されていない場合は自動生成
      if (!columnDef.key || String(columnDef.key).trim() === '') {
        columnDef.key = 'col_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      }

      // 重複チェック
      const existing = this.data.columns.find(c => c.key === columnDef.key);
      if (existing) {
        columnDef.key = columnDef.key + '_' + Date.now();
      }
      this.data.columns.push(columnDef);

      // 選択肢がある場合はマスタにも登録
      if (columnDef.options && Array.isArray(columnDef.options) && columnDef.options.length > 0) {
        this.addMasterList(columnDef.key, columnDef.options);
      } else {
        // 空のマスタを準備してリスト選択可能にする
        if (!this.data.masters) this.data.masters = JSON.parse(JSON.stringify(DEFAULT_MASTERS));
        if (!this.data.masters[columnDef.key]) {
          this.data.masters[columnDef.key] = [];
        }
      }

      this.saveData();
    }

    addMasterList(key, list) {
      if (!this.data.masters) this.data.masters = JSON.parse(JSON.stringify(DEFAULT_MASTERS));
      this.data.masters[key] = list;
    }

    removeColumn(columnKey) {
      if (!this.data.columns) return;
      const col = this.data.columns.find(c => c.key === columnKey);
      if (col && col.fixed) {
        throw new Error(`「${col.label}」は必須の固定項目のため削除できません`);
      }
      this.data.columns = this.data.columns.filter(c => c.key !== columnKey);
      this.saveData();
    }

    getAllResidents() {
      return this.data.residents;
    }

    getResidentById(id) {
      return this.data.residents.find(r => r.id === id) || null;
    }

    getResidentByRoom(room) {
      return this.data.residents.find(r => String(r.room) === String(room)) || null;
    }

    // --- フロア・居室管理 ---
    getFloors() {
      const residents = this.getAllResidents();
      const floorSet = new Set();
      residents.forEach(r => {
        let f = r.floor;
        if (!f && r.room) {
          const numOnly = String(r.room).replace(/[^0-9]/g, '');
          if (numOnly.length >= 3) f = Math.floor(parseInt(numOnly, 10) / 100);
          else if (numOnly.length > 0) f = parseInt(numOnly[0], 10);
        }
        if (f) floorSet.add(Number(f));
      });
      const floors = Array.from(floorSet).sort((a, b) => a - b);
      return floors.length > 0 ? floors : [2, 3];
    }

    getResidentsByFloor(floor) {
      const residents = this.getAllResidents();
      return residents.filter(r => {
        if (String(r.floor) === String(floor)) return true;
        // 部屋番号からの予備判定
        const numOnly = String(r.room).replace(/[^0-9]/g, '');
        if (numOnly.length >= 3 && Math.floor(parseInt(numOnly, 10) / 100) === Number(floor)) return true;
        if (numOnly.length > 0 && numOnly.startsWith(String(floor))) return true;
        return false;
      });
    }

    // 居室情報のセル直接更新
    updateResidentField(residentId, fieldKey, value) {
      const res = this.getResidentById(residentId);
      if (res) {
        if (fieldKey === 'age') {
          res[fieldKey] = value !== '' && !isNaN(value) ? parseInt(value, 10) : null;
        } else if (fieldKey === 'room') {
          res[fieldKey] = String(value).trim();
          // 部屋番号が変更されたらフロアも自動再計算
          const numOnly = res.room.replace(/[^0-9]/g, '');
          if (numOnly.length >= 3) {
            res.floor = Math.floor(parseInt(numOnly, 10) / 100);
          } else if (numOnly.length > 0) {
            res.floor = parseInt(numOnly[0], 10);
          }
        } else if (fieldKey === 'careLevel') {
          if (!value) {
            res[fieldKey] = '';
          } else {
            const str = String(value).trim();
            if (str === '1' || str === '要介護1' || str === '介1') res[fieldKey] = '介1';
            else if (str === '2' || str === '要介護2' || str === '介2') res[fieldKey] = '介2';
            else if (str === '3' || str === '要介護3' || str === '介3') res[fieldKey] = '介3';
            else if (str === '4' || str === '要介護4' || str === '介4') res[fieldKey] = '介4';
            else if (str === '5' || str === '要介護5' || str === '介5') res[fieldKey] = '介5';
            else res[fieldKey] = str;
          }
        } else if (fieldKey === 'earlyFood') {
          res[fieldKey] = Boolean(value);
        } else {
          res[fieldKey] = value;
        }

        // 氏名が変更されて空になった場合のステータス調整
        if (fieldKey === 'name') {
          res.status = (value && String(value).trim() !== '') ? '入居中' : '空室';
        }

        // 新しい値が入力された場合、マスタにも自動で候補登録（リスト選択を便利にする）
        if (value && typeof value === 'string' && value.trim() !== '' && fieldKey !== 'name' && fieldKey !== 'room' && fieldKey !== 'birthday' && fieldKey !== 'entryDate') {
          this.addMasterItem(fieldKey, value.trim());
        }

        this.saveData();
      }
    }

    saveResident(residentData) {
      const idx = this.data.residents.findIndex(r => r.id === residentData.id || String(r.room) === String(residentData.room));
      if (idx >= 0) {
        this.data.residents[idx] = { ...this.data.residents[idx], ...residentData };
      } else {
        if (!residentData.id) {
          residentData.id = 'res_' + residentData.room + '_' + (residentData.name || Date.now());
        }
        this.data.residents.push(residentData);
      }
      // 部屋番号順にソート
      this.data.residents.sort((a, b) => {
        return parseInt(a.room, 10) - parseInt(b.room, 10);
      });
      this.saveData();
    }

    emptyRoom(roomId) {
      const res = this.getResidentById(roomId);
      if (res) {
        res.name = "";
        res.careLevel = null;
        res.birthday = "";
        res.age = null;
        res.entryDate = "";
        res.doctor = "";
        res.dental = "";
        res.equipment = "";
        res.foodMain = "";
        res.foodSide = "";
        res.foodThick = "";
        res.earlyFood = false;
        res.status = "空室";
        res.note = "";
        this.saveData();
      }
    }

    moveOutResident(residentId, moveOutInfo) {
      const res = this.getResidentById(residentId);
      if (res) {
        // ログを追加
        this.data.moveOutLogs.unshift({
          room: res.room,
          name: res.name,
          entryDate: res.entryDate,
          careLevel: res.careLevel,
          birthday: res.birthday,
          age: res.age,
          doctor: res.doctor,
          eventDate: moveOutInfo.eventDate || new Date().toISOString().split('T')[0],
          eventType: moveOutInfo.eventType || '退去',
          note: moveOutInfo.note || ''
        });

        // 部屋を空室化
        this.emptyRoom(residentId);
      }
    }

    getAllMoveOutLogs() {
      return this.data.moveOutLogs || [];
    }

    getStatistics() {
      const residents = this.data.residents;
      const occupied = residents.filter(r => r.name && r.name.trim() !== "");
      const emptyCount = residents.filter(r => !r.name || r.name.trim() === "").length;
      
      const totalCount = occupied.length;
      const capacity = residents.length;
      const occupancyRate = capacity > 0 ? Math.round((totalCount / capacity) * 100) : 0;

      // 介護度集計
      let totalCare = 0;
      let careCount = 0;
      const careLevels = { '介1': 0, '介2': 0, '介3': 0, '介4': 0, '介5': 0, 'other': 0 };
      
      // 年齢集計
      let totalAge = 0;
      let ageCount = 0;

      // 訪問医集計
      const doctorCounts = {};

      // 食事集計
      const foodMainCounts = {};
      const foodSideCounts = {};
      let thickCount = 0;
      let earlyCount = 0;

      occupied.forEach(r => {
        // 介護度
        if (r.careLevel) {
          const str = String(r.careLevel).trim();
          let numVal = null;
          if (str === '介1' || str === '1' || str.includes('1')) { careLevels['介1']++; numVal = 1; }
          else if (str === '介2' || str === '2' || str.includes('2')) { careLevels['介2']++; numVal = 2; }
          else if (str === '介3' || str === '3' || str.includes('3')) { careLevels['介3']++; numVal = 3; }
          else if (str === '介4' || str === '4' || str.includes('4')) { careLevels['介4']++; numVal = 4; }
          else if (str === '介5' || str === '5' || str.includes('5')) { careLevels['介5']++; numVal = 5; }
          else { careLevels['other']++; }

          if (numVal !== null) {
            totalCare += numVal;
            careCount++;
          }
        }
        // 年齢
        if (r.age && !isNaN(r.age)) {
          totalAge += parseInt(r.age, 10);
          ageCount++;
        }
        // 訪問医（正規化）
        let doc = r.doctor ? r.doctor.trim() : '未定・未設定';
        // クリニック名抽出
        if (doc.includes('とやま')) doc = 'とやまクリニック';
        else if (doc.includes('平野')) doc = '平野医院';
        else if (doc.includes('城西')) doc = '城西クリニック';
        else if (doc.includes('静岡ホーム')) doc = '静岡ホームクリニック';
        else if (doc.includes('東静岡')) doc = '東静岡クリニック';
        
        doctorCounts[doc] = (doctorCounts[doc] || 0) + 1;

        // 主食
        const fm = r.foodMain || '未設定';
        foodMainCounts[fm] = (foodMainCounts[fm] || 0) + 1;

        // 副食
        const fs = r.foodSide || '未設定';
        foodSideCounts[fs] = (foodSideCounts[fs] || 0) + 1;

        // とろみ
        if (r.foodThick && r.foodThick.includes('あり')) {
          thickCount++;
        }
        // 早出し
        if (r.earlyFood) {
          earlyCount++;
        }
      });

      const avgCare = careCount > 0 ? (totalCare / careCount).toFixed(2) : '0.00';
      const avgAge = ageCount > 0 ? (totalAge / ageCount).toFixed(1) : '0.0';

      return {
        totalCount,
        capacity,
        emptyCount,
        occupancyRate,
        avgCare,
        avgAge,
        careLevels,
        doctorCounts,
        foodMainCounts,
        foodSideCounts,
        thickCount,
        earlyCount
      };
    }

    // --- ケアマネ・相談員用：認定有効期限アラート計算 ---
    getCertificationAlertInfo(certEndDateStr) {
      if (!certEndDateStr) {
        return { level: 'none', daysLeft: null, label: '未設定', badgeClass: 'badge-muted', rowClass: '' };
      }

      const cleanStr = String(certEndDateStr).replace(/-/g, '/').trim();
      const targetDate = new Date(cleanStr);
      if (isNaN(targetDate.getTime())) {
        return { level: 'none', daysLeft: null, label: '未設定', badgeClass: 'badge-muted', rowClass: '' };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      const diffMs = targetDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        return { 
          level: 'expired', 
          daysLeft, 
          label: `🔴 期限切れ (${Math.abs(daysLeft)}日超過)`, 
          badgeClass: 'badge-cert-expired', 
          rowClass: 'row-cert-expired' 
        };
      } else if (daysLeft <= 30) {
        return { 
          level: 'urgent', 
          daysLeft, 
          label: `🟠 残り${daysLeft}日 (要申請)`, 
          badgeClass: 'badge-cert-urgent', 
          rowClass: 'row-cert-urgent' 
        };
      } else if (daysLeft <= 60) {
        return { 
          level: 'warning', 
          daysLeft, 
          label: `🟡 残り${daysLeft}日 (申請準備)`, 
          badgeClass: 'badge-cert-warning', 
          rowClass: 'row-cert-warning' 
        };
      } else {
        return { 
          level: 'ok', 
          daysLeft, 
          label: `🟢 有効 (${daysLeft}日)`, 
          badgeClass: 'badge-cert-ok', 
          rowClass: '' 
        };
      }
    }

    // --- ケアマネ・相談員用サマリー集計 ---
    getCareManagerSummary() {
      const residents = this.getAllResidents().filter(r => r.name && r.name.trim() !== '');
      let expiredCount = 0;
      let urgentCount = 0;
      let warningCount = 0;
      let okCount = 0;
      let noDateCount = 0;

      const copayCounts = { '1割': 0, '2割': 0, '3割': 0 };

      residents.forEach(r => {
        const alert = this.getCertificationAlertInfo(r.certEndDate);
        if (alert.level === 'expired') expiredCount++;
        else if (alert.level === 'urgent') urgentCount++;
        else if (alert.level === 'warning') warningCount++;
        else if (alert.level === 'ok') okCount++;
        else noDateCount++;

        const cp = r.copay || '1割';
        if (copayCounts[cp] !== undefined) copayCounts[cp]++;
        else copayCounts['1割']++;
      });

      return {
        totalResidents: residents.length,
        expiredCount,
        urgentCount,
        warningCount,
        okCount,
        noDateCount,
        copayCounts
      };
    }

    // --- インポート処理と過去スナップショット履歴の自動保存 ---
    importFromExcel(parsedResidents, mergeMode = 'merge', metadata = {}) {
      // 1. インポート実行前の状態をスナップショットとして内部記録
      if (!this.data.snapshots) this.data.snapshots = [];

      const currentSnapshot = {
        id: 'snap_' + Date.now(),
        timestamp: new Date().toISOString(),
        sourceFileName: metadata.fileName || 'ワイズマン帳票・Excel',
        mergeMode: mergeMode,
        previousResidentCount: this.data.residents.length,
        incomingResidentCount: parsedResidents.length,
        residentsBackup: JSON.parse(JSON.stringify(this.data.residents)),
        diffSummary: metadata.summary || null
      };

      // 最大50件まで履歴を保持
      this.data.snapshots.unshift(currentSnapshot);
      if (this.data.snapshots.length > 50) {
        this.data.snapshots.pop();
      }

      // 2. 画面・現在のデータへの反映（マージまたは上書き）
      if (mergeMode === 'overwrite') {
        this.data.residents = parsedResidents;
      } else {
        parsedResidents.forEach(newRes => {
          const idx = this.data.residents.findIndex(r => String(r.room) === String(newRes.room));
          if (idx >= 0) {
            // 各入居者内にも過去履歴を内部保存（循環参照防止）
            const { _history: oldHist, ...cleanCurrent } = this.data.residents[idx];
            const updatedHist = Array.isArray(oldHist) ? [...oldHist] : [];
            updatedHist.unshift({
              updatedAt: new Date().toISOString(),
              source: metadata.fileName || 'Wiseman Import',
              previousState: cleanCurrent
            });
            if (updatedHist.length > 20) updatedHist.pop();

            this.data.residents[idx] = { ...this.data.residents[idx], ...newRes, _history: updatedHist };
          } else {
            this.data.residents.push(newRes);
          }
        });
      }

      // 3. マスタの自動補完（新しく取り込まれた訪問医や用具をマスタに追加）
      parsedResidents.forEach(r => {
        if (r.doctor) this.addMasterItem('doctor', r.doctor);
        if (r.dental) this.addMasterItem('dental', r.dental);
        if (r.equipment) this.addMasterItem('equipment', r.equipment);
        if (r.foodMain) this.addMasterItem('foodMain', r.foodMain);
        if (r.foodSide) this.addMasterItem('foodSide', r.foodSide);
      });

      this.data.residents.sort((a, b) => parseInt(a.room, 10) - parseInt(b.room, 10));
      this.saveData();
    }

    getSnapshots() {
      return this.data.snapshots || [];
    }

    restoreSnapshot(snapshotId) {
      const snap = (this.data.snapshots || []).find(s => s.id === snapshotId);
      if (!snap || !snap.residentsBackup) {
        throw new Error('指定された過去スナップショットが見つかりません');
      }

      // 現在の状態も直前バックアップとして退避
      this.data.snapshots.unshift({
        id: 'snap_' + Date.now(),
        timestamp: new Date().toISOString(),
        sourceFileName: `復元直前の状態 (復元元: ${snap.sourceFileName})`,
        mergeMode: 'restore_backup',
        previousResidentCount: this.data.residents.length,
        incomingResidentCount: snap.residentsBackup.length,
        residentsBackup: JSON.parse(JSON.stringify(this.data.residents))
      });

      this.data.residents = JSON.parse(JSON.stringify(snap.residentsBackup));
      this.saveData();
    }

    resetToDefault() {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      this.saveData();
    }

    getZodiac(dateStrOrYear) {
      return getZodiac(dateStrOrYear);
    }

    toWarekiDisplay(dateStr) {
      return toWarekiDisplay(dateStr);
    }

    parseDateToSeireki(dateStr) {
      return parseDateToSeireki(dateStr);
    }
  }

  window.DataStore = new DataStore();
  window.DataStore.getZodiac = getZodiac;
  window.DataStore.toWarekiDisplay = toWarekiDisplay;
  window.DataStore.parseDateToSeireki = parseDateToSeireki;
})(window);
