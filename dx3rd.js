import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where,
  deleteDoc, doc, updateDoc, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ご自身のFirebase設定に書き換えてください
const firebaseConfig = {
  apiKey: "AIzaSyCr0Aw3yX6INXqC15gyG52KtzbyA9sBk_o",
  authDomain: "utakaze-sheet.firebaseapp.com",
  projectId: "utakaze-sheet",
  storageBucket: "utakaze-sheet.firebasestorage.app",
  messagingSenderId: "708154707581",
  appId: "1:708154707581:web:c5c8928d741ed1c3202b14",
  measurementId: "G-QMQ4F1JT3C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_UID = "TxjKeaW4e2T2S5kFPWaTrLOweXv2"; 
let currentUser = null;
let editingId = null;
const targetCollection = "dx3rd_characters";

// --- 📊 固定データ定義 ---
const listWorksCover = [
  "小学生","中学生","高校生","不良学生","大学生","フリーター","教師","主婦・主夫",
  "UGNチルドレンA","UGNチルドレンB","UGNチルドレンC","UGNエージェントA","UGNエージェントB","UGNエージェントC","UGNエージェントD",
  "UGN支部長A","UGN支部長B","UGN支部長C","UGN支部長D","刑事","鑑識","弁護士","防衛隊員","傭兵",
  "研究者","教授","看護師","医者","政治家","ビジネスマン","エグゼクティブ","水商売","商店主",
  "宗教家","探偵","ボディーガード","ドライバー","ヤクザ","マフィア","泥棒","ネゴシエーター",
  "暗殺者","占い師","アーティスト","歌手","俳優","奇術師","アスリート","格闘家","記者",
  "アナウンサー","プログラマー","ハッカー","なんでも屋","情報屋","工作員"
];

const listShutsuji = ["天涯孤独", "父親(母親)不在", "義理の両親", "結社の一員", "政治権力", "権力者の血統", "資産家", "有名人", "兄弟", "姉妹", "名家の生まれ", "親の理解", "貧乏", "疎まれた子", "待ち望まれた子", "安定した家庭", "親戚と疎遠", "複数の兄弟姉妹がいる", "双子", "犯罪者の子"];
const listKaikou = ["自身", "師匠", "保護者", "恩人", "主人", "借り", "いいひと", "家族", "友人", "同志", "ビジネス", "同行者", "忘却", "慕情", "貸し", "幼子", "腐れ縁", "好敵手", "殺意", "任意(テキスト入力)"];

const dataKakusei = { "死":18, "憤怒":17, "素体":16, "感染":14, "渇望":17, "無知":15, "犠牲":16, "命令":15, "忘却":17, "探求":14, "償い":18, "生誕":17 };
const dataShoudou = { "解放":18, "吸血":17, "飢餓":14, "殺戮":18, "破壊":16, "加虐":15, "嫌悪":15, "闘争":16, "妄想":14, "自傷":16, "恐怖":17, "憎悪":18 };

// 💡 基本ルールブックの全経験表データ（11〜66）
const dataKeikenTable = {
  "学生用": [
    "平凡", "永劫の別れ", "長期入院", "大事故", "死と再生", "喪失", "殺傷", "ニュース", "海外生活", "大成功",
    "トラウマ", "逃走", "初恋", "転校", "大きな転機", "小さな名誉", "大失敗", "親友", "約束", "記憶喪失"
  ],
  "一般社会用": [
    "平凡", "永劫の別れ", "長期入院", "結婚", "死と再生", "喪失", "被害者", "ニュース", "海外生活", "大成功",
    "子宝", "出世", "失恋", "多忙", "空白期間", "大転落", "屈辱", "盟友", "禁断の愛", "記憶喪失"
  ],
  "裏社会用": [
    "無為", "永劫の別れ", "長期入院", "大事故", "死と再生", "喪失", "犯罪", "三面記事", "裏切り", "成り上がり",
    "伝説", "無限回廊", "大恋愛", "危険な仕事", "闘いの日々", "消せない傷", "敗北", "絶縁", "一匹狼", "記憶喪失"
  ],
  "UGN用": [
    "UGNへの忠誠", "力の暴走", "実験体", "心の壁", "仲間の死", "秘密", "裏切った", "裏切られた", "平凡への憧れ", "平凡への反発",
    "記憶喪失", "脱走", "古強者", "技術畑", "敵性組織", "純粋培養", "大勝利", "汚れ仕事", "大失態", "UGNへの畏怖"
  ]
};

const initialStats = {
  "エンジェルハイロゥ": { nikutai: 0, kankaku: 3, seishin: 1, shakai: 0 },
  "バロール":           { nikutai: 0, kankaku: 1, seishin: 2, shakai: 1 },
  "ブラックドッグ":     { nikutai: 2, kankaku: 1, seishin: 1, shakai: 0 },
  "ブラム=ストーカー":   { nikutai: 1, kankaku: 2, seishin: 1, shakai: 0 },
  "キュマイラ":         { nikutai: 3, kankaku: 0, seishin: 0, shakai: 1 },
  "エグザイル":         { nikutai: 2, kankaku: 1, seishin: 0, shakai: 1 },
  "ハヌマーン":         { nikutai: 1, kankaku: 1, seishin: 1, shakai: 1 },
  "モルフェウス":       { nikutai: 1, kankaku: 2, seishin: 0, shakai: 1 },
  "ノイマン":           { nikutai: 0, kankaku: 0, seishin: 3, shakai: 1 },
  "オルクス":           { nikutai: 0, kankaku: 1, seishin: 1, shakai: 2 },
  "サラマンダー":       { nikutai: 2, kankaku: 0, seishin: 1, shakai: 1 },
  "ソラリス":           { nikutai: 0, kankaku: 0, seishin: 1, shakai: 3 }
};

const worksBonusData = {
    "小学生": { stat: "kankaku", skills: [{id: "sk_chikaku", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_rc", v: 1}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "中学生": { stat: "kankaku", skills: [{id: "sk_chikaku", v: 1}, {id: "sk_ishi", v: 1}, {id: "sk_rc", v: 2}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "高校生": { stat: "nikutai", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_rc", v: 2}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "不良学生": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_chikaku", v: 1}, {id: "sk_ishi", v: 1}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "大学生": { stat: "seishin", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_jouhou1", v: 1, txt: "学問"}] },
    "フリーター": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "教師": { stat: "seishin", skills: [{id: "sk_unten1", v: 2}, {id: "sk_chishiki1", v: 2}, {id: "sk_koushou", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "学問"}] },
    "主婦・主夫": { stat: "shakai", skills: [{id: "sk_geijutsu1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_koushou", v: 2}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "UGNチルドレンA": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 2}, {id: "sk_kaihi", v: 1}, {id: "sk_rc", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGNチルドレンB": { stat: "kankaku", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_shageki", v: 2}, {id: "sk_rc", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGNチルドレンC": { stat: "seishin", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_ishi", v: 1}, {id: "sk_rc", v: 2}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGNエージェントA": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_kaihi", v: 1}, {id: "sk_rc", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGNエージェントB": { stat: "kankaku", skills: [{id: "sk_shageki", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_rc", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGNエージェントC": { stat: "seishin", skills: [{id: "sk_ishi", v: 1}, {id: "sk_rc", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGNエージェントD": { stat: "shakai", skills: [{id: "sk_chikaku", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_rc", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGN支部長A": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_kaihi", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGN支部長B": { stat: "kankaku", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_shageki", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGN支部長C": { stat: "seishin", skills: [{id: "sk_rc", v: 1}, {id: "sk_ishi", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "UGN支部長D": { stat: "shakai", skills: [{id: "sk_ishi", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_choutatsu", v: 2}, {id: "sk_jouhou1", v: 1, txt: "UGN"}] },
    "刑事": { stat: "kankaku", skills: [{id: "sk_unten1", v: 2}, {id: "sk_shageki", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "鑑識": { stat: "seishin", skills: [{id: "sk_unten1", v: 2}, {id: "sk_chikaku", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "弁護士": { stat: "shakai", skills: [{id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "防衛隊員": { stat: "kankaku", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_kaihi", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_shageki", v: 1}, {id: "sk_jouhou1", v: 1, txt: "軍事"}] },
    "傭兵": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_shageki", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_jouhou1", v: 1, txt: "軍事"}] },
    "研究者": { stat: "seishin", skills: [{id: "sk_chikaku", v: 1}, {id: "sk_chishiki1", v: 4}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "学問"}] },
    "教授": { stat: "shakai", skills: [{id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "学問"}] },
    "看護師": { stat: "nikutai", skills: [{id: "sk_chikaku", v: 1}, {id: "sk_ishi", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "学問"}] },
    "医者": { stat: "shakai", skills: [{id: "sk_rc", v: 1}, {id: "sk_ishi", v: 1}, {id: "sk_chishiki1", v: 4}, {id: "sk_jouhou1", v: 1, txt: "学問"}] },
    "政治家": { stat: "shakai", skills: [{id: "sk_ishi", v: 1}, {id: "sk_koushou", v: 2}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "ビジネスマン": { stat: "seishin", skills: [{id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "エグゼクティブ": { stat: "shakai", skills: [{id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_choutatsu", v: 2}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "水商売": { stat: "seishin", skills: [{id: "sk_ishi", v: 2}, {id: "sk_chikaku", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "商店主": { stat: "shakai", skills: [{id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 2}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "宗教家": { stat: "shakai", skills: [{id: "sk_ishi", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_koushou", v: 2}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "探偵": { stat: "seishin", skills: [{id: "sk_unten1", v: 2}, {id: "sk_chikaku", v: 1}, {id: "sk_ishi", v: 1}, {id: "sk_jouhou1", v: 3}] },
    "ボディーガード": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_kaihi", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_chikaku", v: 1}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "ドライバー": { stat: "nikutai", skills: [{id: "sk_unten1", v: 4}, {id: "sk_ishi", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "ヤクザ": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "マフィア": { stat: "kankaku", skills: [{id: "sk_unten1", v: 2}, {id: "sk_shageki", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "泥棒": { stat: "kankaku", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_chikaku", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "ネゴシエーター": { stat: "shakai", skills: [{id: "sk_ishi", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 3}] },
    "暗殺者": { stat: "kankaku", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_shageki", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_jouhou1", v: 1, txt: "裏社会"}] },
    "占い師": { stat: "seishin", skills: [{id: "sk_chikaku", v: 1}, {id: "sk_geijutsu1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "アーティスト": { stat: "seishin", skills: [{id: "sk_chikaku", v: 1}, {id: "sk_geijutsu1", v: 2}, {id: "sk_ishi", v: 2}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "歌手": { stat: "kankaku", skills: [{id: "sk_geijutsu1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "俳優": { stat: "shakai", skills: [{id: "sk_geijutsu1", v: 2}, {id: "sk_kaihi", v: 1}, {id: "sk_unten1", v: 2}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "奇術師": { stat: "kankaku", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_geijutsu1", v: 2}, {id: "sk_chishiki1", v: 2}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "アスリート": { stat: "nikutai", skills: [{id: "sk_kaihi", v: 2}, {id: "sk_chikaku", v: 1}, {id: "sk_ishi", v: 1}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "格闘家": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 2}, {id: "sk_kaihi", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "記者": { stat: "seishin", skills: [{id: "sk_unten1", v: 2}, {id: "sk_chikaku", v: 1}, {id: "sk_chishiki1", v: 2}, {id: "sk_koushou", v: 1}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "アナウンサー": { stat: "shakai", skills: [{id: "sk_geijutsu1", v: 2}, {id: "sk_ishi", v: 1}, {id: "sk_koushou", v: 2}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "プログラマー": { stat: "shakai", skills: [{id: "sk_unten1", v: 2}, {id: "sk_ishi", v: 2}, {id: "sk_chishiki1", v: 2}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}] },
    "ハッカー": { stat: "seishin", skills: [{id: "sk_chishiki1", v: 2}, {id: "sk_koushou", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "ウェブ"}, {id: "sk_jouhou2", v: 1, txt: "裏社会"}] },
    "なんでも屋": { stat: "nikutai", skills: [{id: "sk_hakuhai", v: 1}, {id: "sk_kaihi", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "噂話"}] },
    "情報屋": { stat: "shakai", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_jouhou1", v: 5}] },
    "工作員": { stat: "kankaku", skills: [{id: "sk_kaihi", v: 1}, {id: "sk_chikaku", v: 1}, {id: "sk_koushou", v: 1}, {id: "sk_choutatsu", v: 1}, {id: "sk_jouhou1", v: 1, txt: "軍事"}] }
};

// --- 🚀 初期化処理 ---
window.onload = () => {
  const initSelect = (id, list) => {
    const el = document.getElementById(id);
    list.forEach(item => {
      let opt = document.createElement("option");
      opt.value = item; opt.text = item; el.appendChild(opt);
    });
  };
  
  initSelect("works", listWorksCover);
  initSelect("cover", listWorksCover);
  initSelect("lifepath_shutsuji", listShutsuji);
  initSelect("lifepath_kaikou", listKaikou);
  initSelect("lifepath_kakusei", Object.keys(dataKakusei));
  initSelect("lifepath_shoudou", Object.keys(dataShoudou));

  const syns = Object.keys(initialStats);
  ["syndrome1", "syndrome2", "syndrome3"].forEach((id, idx) => {
    const el = document.getElementById(id);
    syns.forEach((syn, sIdx) => {
      let opt = document.createElement("option");
      opt.value = syn; opt.text = syn;
      if(idx === sIdx) opt.selected = true;
      el.appendChild(opt);
    });
    el.addEventListener("change", handleSyndromeChange);
  });

  document.getElementById("breed").addEventListener("change", handleBreedChange);
  document.getElementById("works").addEventListener("change", handleWorksChange);
  
  // 💡 新規：経験表の種類が変更されたとき・個別経験が選ばれたときのイベント監視
  document.getElementById("lifepath_keiken_type").addEventListener("change", handleKeikenTypeChange);
  document.getElementById("lifepath_keiken_select").addEventListener("change", (e) => {
    document.getElementById("lifepath_keiken_txt").value = e.target.value;
  });

  document.getElementById("sk_choutatsu").addEventListener("input", calculateCombatStats);
  document.getElementById("lifepath_kakusei").addEventListener("change", calculateBaseEncroachment);
  document.getElementById("lifepath_shoudou").addEventListener("change", calculateBaseEncroachment);
  document.getElementById("val_encroach_bonus").addEventListener("input", calculateBaseEncroachment);
  document.getElementById("val_kodochi_bonus").addEventListener("input", calculateCombatStats);

  handleWorksChange(); 
  calculateBaseEncroachment();

  const savedUser = localStorage.getItem("discordUser");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    document.getElementById("authBefore").style.display = "none";
    document.getElementById("authAfter").style.display = "block";
    document.getElementById("userInfo").innerText = `🧬 覚醒者: ${currentUser.displayName} としてログイン中`;
    loadCharacters();
  }

  const fragments = new URLSearchParams(window.location.hash.substring(1));
  if (fragments.get("access_token")) {
    const accessToken = fragments.get("access_token");
    fetch("https://discord.com/api/users/@me", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(res => res.json())
    .then(discordUser => {
      currentUser = { uid: `discord_${discordUser.id}`, displayName: discordUser.username };
      localStorage.setItem("discordUser", JSON.stringify(currentUser));
      document.getElementById("authBefore").style.display = "none";
      document.getElementById("authAfter").style.display = "block";
      document.getElementById("userInfo").innerText = `🧬 覚醒者: ${discordUser.username} としてログイン中`;
      window.location.hash = ""; 
      loadCharacters(); 
    })
    .catch(err => console.error("Discordプロフィール取得エラー:", err));
  }
};

// --- 🛠️ 選択制御・自動計算ロジック ---

// 💡 新規：経験表の種類に応じて選択肢を切り替える
function handleKeikenTypeChange() {
  const type = document.getElementById("lifepath_keiken_type").value;
  const selectEl = document.getElementById("lifepath_keiken_select");
  
  selectEl.innerHTML = ""; // いったんリセット
  
  if (!type || !dataKeikenTable[type]) {
    let opt = document.createElement("option");
    opt.value = ""; opt.text = "表を選択してください";
    selectEl.appendChild(opt);
    return;
  }

  let defaultOpt = document.createElement("option");
  defaultOpt.value = ""; defaultOpt.text = "経験を選択してください";
  selectEl.appendChild(defaultOpt);

// 💡 配列から20個の項目をそのまま選択肢として生成します
  dataKeikenTable[type].forEach(value => {
    let opt = document.createElement("option");
    opt.value = value;
    opt.text = value;
    selectEl.appendChild(opt);
  });
}

function handleBreedChange() {
  const breed = document.getElementById("breed").value;
  const s2Area = document.getElementById("syndrome2-area");
  const s3Area = document.getElementById("syndrome3-area");

  if (breed === "ピュアブリード") { s2Area.style.display = "none"; s3Area.style.display = "none"; }
  else if (breed === "クロスブリード") { s2Area.style.display = "block"; s3Area.style.display = "none"; }
  else if (breed === "トライブリード") { s2Area.style.display = "block"; s3Area.style.display = "block"; }
  calculateInitialStats();
}

function handleSyndromeChange(e) {
  const breed = document.getElementById("breed").value;
  const s1 = document.getElementById("syndrome1").value;
  const s2 = document.getElementById("syndrome2").value;
  const s3 = document.getElementById("syndrome3").value;

  const getAlternative = () => Object.keys(initialStats).find(k => k !== s1 && k !== s2 && k !== s3);
  if (breed === "クロスブリード" && s1 === s2) { alert("同じシンドロームは設定できません"); e.target.value = getAlternative(); }
  else if (breed === "トライブリード" && (s1 === s2 || s1 === s3 || s2 === s3)) { alert("同じシンドロームは設定できません"); e.target.value = getAlternative(); }
  calculateInitialStats();
}

function calculateInitialStats() {
  const breed = document.getElementById("breed").value;
  const s1 = document.getElementById("syndrome1").value;
  const s2 = document.getElementById("syndrome2").value;

  let finalStats = { nikutai: 0, kankaku: 0, seishin: 0, shakai: 0 };

  if (breed === "ピュアブリード") {
    const base = initialStats[s1];
    finalStats.nikutai = base.nikutai * 2; finalStats.kankaku = base.kankaku * 2;
    finalStats.seishin = base.seishin * 2; finalStats.shakai  = base.shakai * 2;
  } else {
    const base1 = initialStats[s1]; const base2 = initialStats[s2];
    finalStats.nikutai = base1.nikutai + base2.nikutai; finalStats.kankaku = base1.kankaku + base2.kankaku;
    finalStats.seishin = base1.seishin + base2.seishin; finalStats.shakai  = base1.shakai + base2.shakai;
  }

  const works = document.getElementById("works").value;
  if (worksBonusData[works]) { finalStats[worksBonusData[works].stat] += 1; }

  document.getElementById("stat_nikutai").value  = finalStats.nikutai;
  document.getElementById("stat_kankaku").value  = finalStats.kankaku;
  document.getElementById("stat_seishin").value  = finalStats.seishin;
  document.getElementById("stat_shakai").value   = finalStats.shakai;

  calculateCombatStats();
}

function handleWorksChange() {
    calculateInitialStats();
    const skillIds = ["sk_hakuhai", "sk_kaihi", "sk_unten1", "sk_unten2", "sk_shageki", "sk_chikaku", "sk_geijutsu1", "sk_geijutsu2", "sk_rc", "sk_ishi", "sk_chishiki1", "sk_chishiki2", "sk_koushou", "sk_choutatsu", "sk_jouhou1", "sk_jouhou2"];
    const textIds = ["sk_unten1_txt", "sk_unten2_txt", "sk_geijutsu1_txt", "sk_geijutsu2_txt", "sk_chishiki1_txt", "sk_chishiki2_txt", "sk_jouhou1_txt", "sk_jouhou2_txt"];
    skillIds.forEach(id => document.getElementById(id).value = 0);
    textIds.forEach(id => document.getElementById(id).value = "");

    const works = document.getElementById("works").value;
    if (worksBonusData[works] && worksBonusData[works].skills) {
        worksBonusData[works].skills.forEach(skill => {
            document.getElementById(skill.id).value = skill.v;
            if (skill.txt) {
                const txtEl = document.getElementById(skill.id + "_txt");
                if (txtEl) txtEl.value = skill.txt;
            }
        });
    }
    calculateCombatStats();
}

function calculateBaseEncroachment() {
  const kakusei = document.getElementById("lifepath_kakusei").value;
  const shoudou = document.getElementById("lifepath_shoudou").value;

  const valKakusei = dataKakusei[kakusei] || 0;
  const valShoudou = dataShoudou[shoudou] || 0;
  const valBonus = Number(document.getElementById("val_encroach_bonus").value) || 0;

  document.getElementById("val_kakusei").value = valKakusei;
  document.getElementById("val_shoudou").value = valShoudou;
  document.getElementById("val_encroach_base").value = valKakusei + valShoudou + valBonus;
}

function calculateCombatStats() {
  const nikutai = Number(document.getElementById("stat_nikutai").value) || 0;
  const kankaku = Number(document.getElementById("stat_kankaku").value) || 0;
  const seishin = Number(document.getElementById("stat_seishin").value) || 0;
  const shakai  = Number(document.getElementById("stat_shakai").value) || 0;
  const choutatsu = Number(document.getElementById("sk_choutatsu").value) || 0;
  const kodochiBonus = Number(document.getElementById("val_kodochi_bonus").value) || 0;

  const maxHp = (nikutai * 2) + seishin + 20;
  document.getElementById("val_max_hp").value = maxHp;

  const joubika = (shakai * 2) + (choutatsu * 2);
  document.getElementById("val_joubika").value = joubika;

  const kodochi = (kankaku * 2) + seishin + kodochiBonus;
  document.getElementById("val_kodochi").value = kodochi;

  const sentouIdou = kodochi + 5;
  document.getElementById("val_sentou_idou").value = sentouIdou;

  const zenryokuIdou = sentouIdou * 2;
  document.getElementById("val_zenryoku_idou").value = zenryokuIdou;
}

// --- 💾 保存・編集処理 ---

window.saveCharacter = async function () {
  if (!currentUser) { alert("ログイン中..."); return; }
  const nameInput = document.getElementById("name").value;
  if (!nameInput) { alert("キャラクター名を入力してね！"); return; }

  let data = {
    name: nameInput,
    codename: document.getElementById("codename").value,
    age: Number(document.getElementById("age").value) || 0,
    gender: document.getElementById("gender").value,
    constellation: document.getElementById("constellation").value,
    bloodtype: document.getElementById("bloodtype").value,
    height: document.getElementById("height").value,
    weight: document.getElementById("weight").value,
    works: document.getElementById("works").value,
    cover: document.getElementById("cover").value,
    breed: document.getElementById("breed").value,
    syndrome1: document.getElementById("syndrome1").value,
    syndrome2: document.getElementById("syndrome2").value,
    syndrome3: document.getElementById("syndrome3").value,
    stats: {
      nikutai: Number(document.getElementById("stat_nikutai").value),
      kankaku: Number(document.getElementById("stat_kankaku").value),
      seishin: Number(document.getElementById("stat_seishin").value),
      shakai: Number(document.getElementById("stat_shakai").value),
    },
    skills: {
      hakuhai: Number(document.getElementById("sk_hakuhai").value),
      kaihi: Number(document.getElementById("sk_kaihi").value),
      unten1: { val: Number(document.getElementById("sk_unten1").value), txt: document.getElementById("sk_unten1_txt").value },
      unten2: { val: Number(document.getElementById("sk_unten2").value), txt: document.getElementById("sk_unten2_txt").value },
      shageki: Number(document.getElementById("sk_shageki").value),
      chikaku: Number(document.getElementById("sk_chikaku").value),
      geijutsu1: { val: Number(document.getElementById("sk_geijutsu1").value), txt: document.getElementById("sk_geijutsu1_txt").value },
      geijutsu2: { val: Number(document.getElementById("sk_geijutsu2").value), txt: document.getElementById("sk_geijutsu2_txt").value },
      rc: Number(document.getElementById("sk_rc").value),
      ishi: Number(document.getElementById("sk_ishi").value),
      chishiki1: { val: Number(document.getElementById("sk_chishiki1").value), txt: document.getElementById("sk_chishiki1_txt").value },
      chishiki2: { val: Number(document.getElementById("sk_chishiki2").value), txt: document.getElementById("sk_chishiki2_txt").value },
      koushou: Number(document.getElementById("sk_koushou").value),
      choutatsu: Number(document.getElementById("sk_choutatsu").value),
      jouhou1: { val: Number(document.getElementById("sk_jouhou1").value), txt: document.getElementById("sk_jouhou1_txt").value },
      jouhou2: { val: Number(document.getElementById("sk_jouhou2").value), txt: document.getElementById("sk_jouhou2_txt").value }
    },
    lifepath: {
      shutsuji: document.getElementById("lifepath_shutsuji").value,
      keiken_type: document.getElementById("lifepath_keiken_type").value,
      keiken_txt: document.getElementById("lifepath_keiken_txt").value,
      kaikou: document.getElementById("lifepath_kaikou").value,
      kaikou_txt: document.getElementById("lifepath_kaikou_txt").value,
      kakusei: document.getElementById("lifepath_kakusei").value,
      shoudou: document.getElementById("lifepath_shoudou").value,
    },
    encroachment_bonus: Number(document.getElementById("val_encroach_bonus").value) || 0,
    zaisan_point: Number(document.getElementById("val_zaisan").value) || 0,
    kodochi_bonus: Number(document.getElementById("val_kodochi_bonus").value) || 0,
    userId: currentUser.uid, 
    updatedAt: new Date()    
  };
  effects: Array.from(document.querySelectorAll(".effect-row")).map(row => ({
    return {
      category: row.querySelector(".effect-category").value,
      name: row.querySelector(".eff-name").value,
      lavel: Number(row.querySelector(".eff-lavel").value) || 1,
    }
  }).filter(eff => eff.name !== ""));

  try {
    if (editingId) {
      await updateDoc(doc(db, targetCollection, editingId), data);
      alert("オーヴァードの記録を更新したよ！");
      editingId = null;
      document.getElementById("editStatus").innerText = "🧬 今は【新規作成モード】だよ";
    } else {
      data.createdAt = new Date(); 
      await addDoc(collection(db, targetCollection), data);
      alert("新しいオーヴァードが覚醒した！");
    }
    loadCharacters(); 
  } catch (e) { alert("保存に失敗したみたい…：" + e.message); }
};

window.editCharacter = async function(id) {
  try {
    const docSnap = await getDoc(doc(db, targetCollection, id));
    if (docSnap.exists()) {
      const data = docSnap.data();
      const fields = ["name", "codename", "age", "gender", "constellation", "bloodtype", "height", "weight", "works", "cover", "breed", "syndrome1", "syndrome2", "syndrome3"];
      fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = data[f] || ""; });
      
      handleBreedChange();

      if (data.stats) {
        document.getElementById("stat_nikutai").value = data.stats.nikutai;
        document.getElementById("stat_kankaku").value = data.stats.kankaku;
        document.getElementById("stat_seishin").value = data.stats.seishin;
        document.getElementById("stat_shakai").value = data.stats.shakai;
      }
      
      if (data.skills) {
        const s = data.skills;
        document.getElementById("sk_hakuhai").value = s.hakuhai || 0;
        document.getElementById("sk_kaihi").value = s.kaihi || 0;
        document.getElementById("sk_shageki").value = s.shageki || 0;
        document.getElementById("sk_chikaku").value = s.chikaku || 0;
        document.getElementById("sk_rc").value = s.rc || 0;
        document.getElementById("sk_ishi").value = s.ishi || 0;
        document.getElementById("sk_koushou").value = s.koushou || 0;
        document.getElementById("sk_choutatsu").value = s.choutatsu || 0;

        const complexSkills = ["unten1", "unten2", "geijutsu1", "geijutsu2", "chishiki1", "chishiki2", "jouhou1", "jouhou2"];
        complexSkills.forEach(key => {
            if (s[key]) {
                document.getElementById(`sk_${key}`).value = s[key].val || 0;
                document.getElementById(`sk_${key}_txt`).value = s[key].txt || "";
            }
        });
      }

      if (data.lifepath) {
        const lp = data.lifepath;
        document.getElementById("lifepath_shutsuji").value = lp.shutsuji || "";
        document.getElementById("lifepath_keiken_type").value = lp.keiken_type || "";
        
        // 💡 編集モード読込時、表の種類に合わせて選択肢を再生成
        handleKeikenTypeChange();
        
        document.getElementById("lifepath_keiken_txt").value = lp.keiken_txt || "";
        // セレクトボックス側も選んだ内容と一致すれば選択状態にする
        document.getElementById("lifepath_keiken_select").value = lp.keiken_txt || "";

        document.getElementById("lifepath_kaikou").value = lp.kaikou || "";
        document.getElementById("lifepath_kaikou_txt").value = lp.kaikou_txt || "";
        document.getElementById("lifepath_kakusei").value = lp.kakusei || "";
        document.getElementById("lifepath_shoudou").value = lp.shoudou || "";
      }
      document.getElementById("val_encroach_bonus").value = data.encroachment_bonus || 0;
      document.getElementById("val_zaisan").value = data.zaisan_point || 0;
      document.getElementById("val_kodochi_bonus").value = data.kodochi_bonus || 0;
      
      calculateBaseEncroachment();
      calculateCombatStats();

      editingId = id;
      document.getElementById("editStatus").innerText = `🚨 今は【 ${data.name || "ななし"} の編集モード 】だよ`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (e) { alert("復元エラー: " + e.message); }
};