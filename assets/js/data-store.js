/**
 * 株式会社アース 入居者管理システム
 * DataStore - データ管理 & LocalStorage永続化モジュール
 */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'earth_residents_management_data_v1';

  // デフォルト初期データ（Googleスプレッドシートより抽出）
  const DEFAULT_DATA = {
    residents: [
      { id: "res_201", room: "201", floor: 2, name: "熊木　勝", entryDate: "2026/07/14", careLevel: 4, birthday: "S24/06/08", age: 77, doctor: "井上Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_202", room: "202", floor: 2, name: "石垣　和子", entryDate: "2025/07/08", careLevel: 4, birthday: "S07/1/12", age: 93, doctor: "堀池Dr.　とやま", dental: "", equipment: "", foodMain: "軟飯", foodSide: "一口", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_203", room: "203", floor: 2, name: "長谷川　明代", entryDate: "2024/02/29", careLevel: 4, birthday: "S13/9/29", age: 87, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: true, status: "入居中", note: "" },
      { id: "res_204", room: "204", floor: 2, name: "瀬川　清江", entryDate: "2026/01/20", careLevel: 4, birthday: "S07/09/06", age: 94, doctor: "井上Dr.　城西", dental: "", equipment: "レ　リクライニング式車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "あり", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_205", room: "205", floor: 2, name: "南　君江", entryDate: "2019/11/01", careLevel: 1, birthday: "S1/12/25", age: 99, doctor: "野村Dr.　静岡ホーム", dental: "小嶋デンタル", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "普通", foodThick: "無し", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_206", room: "206", floor: 2, name: "内山　和司", entryDate: "2026/02/04", careLevel: 1, birthday: "S09/03/01", age: 92, doctor: "日野Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "パン", foodSide: "一口", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_207", room: "207", floor: 2, name: "佐野　益浩", entryDate: "2023/07/05", careLevel: 1, birthday: "S15/02/01", age: 85, doctor: "日野Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "無し", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_208", room: "208", floor: 2, name: "堀池　智恵子", entryDate: "2022/12/23", careLevel: 2, birthday: "S5/09/05", age: 95, doctor: "井上Dr.　城西", dental: "さくらばし歯科", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "普通", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_209", room: "209", floor: 2, name: "梅原　とし子", entryDate: "2023/05/10", careLevel: 3, birthday: "S9/11/03", age: 91, doctor: "堀池Dr.　とやま", dental: "さくらばし歯科", equipment: "購　歩行器, 施　車椅子", foodMain: "軟飯", foodSide: "普通", foodThick: "無し", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_210", room: "210", floor: 2, name: "鈴木　トヨ江", entryDate: "2023/03/13", careLevel: 4, birthday: "S8/12/13", age: 93, doctor: "日野Dr.　城西", dental: "", equipment: "レ　リクライニング式車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_211", room: "211", floor: 2, name: "飯塚　愛子", entryDate: "2024/12/06", careLevel: 2, birthday: "S16/01/01", age: 84, doctor: "内田Dr.　静岡ホーム", dental: "", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_212", room: "212", floor: 2, name: "吉崎　壽江", entryDate: "2024/09/13", careLevel: 5, birthday: "S9/08/21", age: 91, doctor: "日野Dr.　城西", dental: "小嶋デンタル", equipment: "施　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "無し", airConditioner: "〇", earlyFood: true, status: "入居中", note: "" },
      { id: "res_213", room: "213", floor: 2, name: "西澤　惠美子", entryDate: "2025/03/04", careLevel: 2, birthday: "S11/9/06", age: 89, doctor: "平野Dr　平野", dental: "さくらばし歯科", equipment: "施　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_214", room: "214", floor: 2, name: "大長　まさ", entryDate: "2021/03/23", careLevel: 2, birthday: "T11/04/20", age: 103, doctor: "日野Dr.　城西", dental: "小嶋デンタル", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "きざみ", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_215", room: "215", floor: 2, name: "堀井　義介", entryDate: "2025/04/04", careLevel: 1, birthday: "S07/01/18", age: 93, doctor: "堀池Dr.　とやま", dental: "", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_216", room: "216", floor: 2, name: "竹田　朝枝", entryDate: "2022/12/22", careLevel: 5, birthday: "S9/01/30", age: 92, doctor: "日野Dr.　城西", dental: "さくらばし歯科", equipment: "レ　リクライニング式車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "", airConditioner: "×", earlyFood: true, status: "入居中", note: "" },
      { id: "res_217", room: "217", floor: 2, name: "海老原　暁子", entryDate: "2025/08/29", careLevel: 2, birthday: "S16/12/16", age: 84, doctor: "堀池Dr.　とやま", dental: "", equipment: "", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_218", room: "218", floor: 2, name: "堀井　千沙", entryDate: "2026/05/13", careLevel: 1, birthday: "S15/10/02", age: 86, doctor: "堀池Dr.　とやま", dental: "", equipment: "", foodMain: "全粥", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_219", room: "219", floor: 2, name: "山田　はる江", entryDate: "2020/06/27", careLevel: 3, birthday: "S2/02/15", age: 98, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "レ　車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_220", room: "220", floor: 2, name: "西澤　惠美子", entryDate: "2025/03/04", careLevel: 2, birthday: "S11/9/06", age: 89, doctor: "平野Dr　平野", dental: "さくらばし歯科", equipment: "施　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_221", room: "221", floor: 2, name: "澤田　和男", entryDate: "2025/08/04", careLevel: 2, birthday: "S10/10/06", age: 89, doctor: "平野Dr　平野", dental: "", equipment: "レ　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_222", room: "222", floor: 2, name: "花村　喜平", entryDate: "2026/07/10", careLevel: 1, birthday: "S14/08/08", age: 87, doctor: "井上Dr.　城西", dental: "", equipment: "", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_223", room: "223", floor: 2, name: "八倉　昌弘", entryDate: "2023/02/15", careLevel: 3, birthday: "S13/10/1", age: 87, doctor: "堀池Dr.　とやま", dental: "さくらばし歯科", equipment: "施　車椅子", foodMain: "全粥", foodSide: "極キザミ", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_224", room: "224", floor: 2, name: "小田　芳江", entryDate: "2025/06/05", careLevel: 3, birthday: "S11/10/21", age: 89, doctor: "堀池Dr.　とやま", dental: "さくらばし歯科", equipment: "レ　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_225", room: "225", floor: 2, name: "松浦　睦子", entryDate: "2018/09/04", careLevel: 4, birthday: "S13/1/10", age: 88, doctor: "平野Dr　平野", dental: "小嶋デンタル", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "普通", foodThick: "無し", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      
      { id: "res_301", room: "301", floor: 3, name: "一杉　洋子", entryDate: "2025/06/18", careLevel: 2, birthday: "S24/05/08", age: 76, doctor: "日野Dr.　城西", dental: "", equipment: "購　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_302", room: "302", floor: 3, name: "田中　晨子", entryDate: "2017/09/24", careLevel: 3, birthday: "S13/03/5", age: 87, doctor: "梅内Dr.　静岡ホーム", dental: "小嶋デンタル", equipment: "購　歩行器", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_303", room: "303", floor: 3, name: "狩野　厚子", entryDate: "2025/09/09", careLevel: 2, birthday: "S28/7/19", age: 72, doctor: "堀池Dr.　とやま", dental: "", equipment: "レ　車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_304", room: "304", floor: 3, name: "藁科　玉江", entryDate: "2025/03/07", careLevel: 3, birthday: "S16/08/18", age: 84, doctor: "日野Dr.　城西", dental: "", equipment: "レ　車椅子", foodMain: "ミキサー", foodSide: "ミキサー", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_305", room: "305", floor: 3, name: "志田美智子", entryDate: "2023/06/27", careLevel: 2, birthday: "S8/04/02", age: 92, doctor: "井上Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "全粥", foodSide: "一口", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_306", room: "306", floor: 3, name: "小澤　増江", entryDate: "2026/03/17", careLevel: 2, birthday: "S20/03/05", age: 81, doctor: "堀池Dr.　とやま", dental: "", equipment: "レ　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_307", room: "307", floor: 3, name: "漆畑　彌千代", entryDate: "2021/02/05", careLevel: 1, birthday: "S14/8/08", age: 86, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_308", room: "308", floor: 3, name: "鈴木　登喜江", entryDate: "2024/12/18", careLevel: 5, birthday: "T15/5/12", age: 99, doctor: "堀池Dr.　とやま", dental: "", equipment: "施　車椅子, 施　歩行器", foodMain: "全粥", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_309", room: "309", floor: 3, name: "稲葉　恵美子", entryDate: "2025/03/13", careLevel: 2, birthday: "S09/11/27", age: 91, doctor: "平野Dr　平野", dental: "", equipment: "", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_310", room: "310", floor: 3, name: "安田　愛子", entryDate: "2025/04/07", careLevel: 1, birthday: "S02/04/03", age: 98, doctor: "野村Dr.　静岡ホーム", dental: "小嶋デンタル", equipment: "施　車椅子", foodMain: "全粥", foodSide: "極キザミ", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_311", room: "311", floor: 3, name: "池田　久雄", entryDate: "2024/02/16", careLevel: 2, birthday: "S7/08/02", age: 93, doctor: "日野Dr.　城西", dental: "さくらばし歯科", equipment: "歩行器", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_312", room: "312", floor: 3, name: "石川　トメ子", entryDate: "2025/11/01", careLevel: 3, birthday: "S06/11/01", age: 94, doctor: "堀池Dr.　とやま", dental: "", equipment: "レ　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_313", room: "313", floor: 3, name: "片平　美津江", entryDate: "2025/08/19", careLevel: 4, birthday: "S11/11/10", age: 89, doctor: "井上Dr.　城西", dental: "", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_314", room: "314", floor: 3, name: "三浦　一枝", entryDate: "2023/09/25", careLevel: 2, birthday: "S8/01/30", age: 93, doctor: "井上Dr.　城西", dental: "小嶋デンタル", equipment: "", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_315", room: "315", floor: 3, name: "海野　君江", entryDate: "2024/11/06", careLevel: 3, birthday: "S6/09/05", age: 94, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "歩行器", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_316", room: "316", floor: 3, name: "鈴木　ハマ", entryDate: "2021/02/04", careLevel: 2, birthday: "S4/09/18", age: 96, doctor: "堀池Dr.　とやま", dental: "", equipment: "購　歩行器", foodMain: "全粥", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_317", room: "317", floor: 3, name: "渡邉　津和代", entryDate: "2024/04/15", careLevel: 1, birthday: "S4/10/23", age: 97, doctor: "堀池Dr.　とやま", dental: "", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_318", room: "318", floor: 3, name: "藤田　絹代", entryDate: "2018/07/15", careLevel: 2, birthday: "S16/1/06", age: 85, doctor: "日野Dr.　城西", dental: "", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_319", room: "319", floor: 3, name: "佐伯　十三枝", entryDate: "2022/04/02", careLevel: 4, birthday: "S13/1/05", age: 87, doctor: "平野Dr　平野", dental: "小嶋デンタル", equipment: "多機能車椅子", foodMain: "全粥", foodSide: "きざみ", foodThick: "", airConditioner: "×", earlyFood: false, status: "入居中", note: "" },
      { id: "res_320", room: "320", floor: 3, name: "小倉　馨", entryDate: "2024/09/12", careLevel: 3, birthday: "S7/02/18", age: 93, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "施　車椅子", foodMain: "軟飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_321", room: "321", floor: 3, name: "", entryDate: "", careLevel: null, birthday: "", age: null, doctor: "", dental: "", equipment: "", foodMain: "", foodSide: "", foodThick: "", airConditioner: "〇", earlyFood: false, status: "空室", note: "" },
      { id: "res_322", room: "322", floor: 3, name: "青嶋　アツ子", entryDate: "2024/11/25", careLevel: 2, birthday: "S15/11/01", age: 85, doctor: "古谷Dr.　静岡ホーム, 内田Dr.　静岡ホーム", dental: "さくらばし歯科", equipment: "購　歩行器", foodMain: "軟飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_323", room: "323", floor: 3, name: "佐藤　みつ子", entryDate: "2018/12/02", careLevel: 5, birthday: "S5/10/04", age: 96, doctor: "堀池Dr.　とやま", dental: "小嶋デンタル", equipment: "多機能車椅子", foodMain: "米飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_324", room: "324", floor: 3, name: "野田　久子", entryDate: "2024/05/01", careLevel: 2, birthday: "S15/7/07", age: 85, doctor: "日野Dr.　城西", dental: "", equipment: "購　車椅子", foodMain: "米飯", foodSide: "一口", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" },
      { id: "res_325", room: "325", floor: 3, name: "石部　きみ子", entryDate: "2025/12/01", careLevel: 2, birthday: "S08/02/10", age: 92, doctor: "堀池Dr.　とやま", dental: "", equipment: "", foodMain: "軟飯", foodSide: "普通", foodThick: "", airConditioner: "〇", earlyFood: false, status: "入居中", note: "" }
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
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to load data from localStorage:', e);
      }
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
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

    getAllResidents() {
      return this.data.residents;
    }

    getResidentById(id) {
      return this.data.residents.find(r => r.id === id) || null;
    }

    getResidentByRoom(room) {
      return this.data.residents.find(r => String(r.room) === String(room)) || null;
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
      const careLevels = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, other: 0 };
      
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
        if (r.careLevel && !isNaN(r.careLevel)) {
          const cl = parseInt(r.careLevel, 10);
          totalCare += cl;
          careCount++;
          if (careLevels[cl] !== undefined) {
            careLevels[cl]++;
          } else {
            careLevels.other++;
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

    importFromExcel(parsedResidents, mergeMode = 'merge') {
      if (mergeMode === 'overwrite') {
        // 完全上書き
        this.data.residents = parsedResidents;
      } else {
        // 差分マージ（部屋番号をキーにする）
        parsedResidents.forEach(newRes => {
          const idx = this.data.residents.findIndex(r => String(r.room) === String(newRes.room));
          if (idx >= 0) {
            this.data.residents[idx] = { ...this.data.residents[idx], ...newRes };
          } else {
            this.data.residents.push(newRes);
          }
        });
      }

      this.data.residents.sort((a, b) => parseInt(a.room, 10) - parseInt(b.room, 10));
      this.saveData();
    }

    resetToDefault() {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      this.saveData();
    }
  }

  window.DataStore = new DataStore();
})(window);
