console.log("JS読み込まれてる");

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where,
  deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ========================
// Firebase初期化
// ========================
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

// ========================
// ログイン
// ========================
let currentUser = null;
let editingId = null; // ←編集用

signInAnonymously(auth).then((userCredential) => {
  currentUser = userCredential.user;
  loadCharacters();
});

// ========================
// 一覧表示
// ========================
async function loadCharacters() {
  if (!currentUser) return;

  const q = query(
    collection(db, "characters"),
    where("userId", "==", currentUser.uid)
  );

  const querySnapshot = await getDocs(q);
  const list = document.getElementById("characterList");
  list.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h2>${data.name}</h2>
      ❤️ HP: ${data.hp}<br>
      ⚔ ${data.melee}<br>

      <button onclick="editCharacter('${id}')">✏️ 編集</button>
      <button onclick="deleteCharacter('${id}')">🗑️ 削除</button>
    `;

    list.appendChild(div);
  });
}

// ========================
// 編集（読み込み）
// ========================
window.editCharacter = async function(id) {

  const q = query(
    collection(db, "characters"),
    where("userId", "==", currentUser.uid)
  );

  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    if (docSnap.id === id) {
      const data = docSnap.data();

      // フォームにセット
      document.getElementById("name").value = data.name;
      document.getElementById("head").value = data.head;
      document.getElementById("cloth").value = data.cloth;
      document.getElementById("hair").value = data.hair;
      document.getElementById("eye").value = data.eye;
      document.getElementById("skin").value = data.skin;
      document.getElementById("range").value = data.range;
      document.getElementById("melee").value = data.melee;
      document.getElementById("instrument").value = data.instrument;

      document.getElementById("hp").value = data.hp;
      
      document.getElementById("yuki").value = data.ability.yuki;
      document.getElementById("chie").value = data.ability.chie;
      document.getElementById("aijo").value = data.ability.aijo;
      document.getElementById("dragon").value = data.dragon;

      document.getElementById("tatakai").value = data.skills.tatakai || 0 ;
      document.getElementById("bouken").value = data.skills.bouken || 0 ;
      document.getElementById("kijou").value = data.skills.kijou || 0 ;
      document.getElementById("kari").value = data.skills.kari || 0 ;
      document.getElementById("kankaku").value = data.skills.kankaku || 0 ;
      document.getElementById("gakumon").value = data.skills.gakumon || 0 ;
      document.getElementById("uta").value = data.skills.uta || 0 ;
      document.getElementById("settoku").value = data.skills.settoku || 0 ;
      document.getElementById("shinwa").value = data.skills.shinwa || 0 ;

      editingId = id;

      alert("編集モード！");
    }
  });
};

// ========================
// 削除
// ========================
window.deleteCharacter = async function(id) {

  if (!confirm("削除する？")) return;

  await deleteDoc(doc(db, "characters", id));
  loadCharacters();
};

// =====================
// (タブ切り替え)
// =====================

window.toggleSection = function(header) {

  const content = header.nextElementSibling;

  //開閉
  if(content.style.display === "block"){
    content.style.display = "none";
  }else{
    content.style.display = "block";
  }
};


document.querySelectorAll(".tabBtn").forEach(btn => {
  btn.addEventListener("click", () => {

    const tabId = btn.dataset.tab;

    // タブ中身切り替え
    document.querySelectorAll(".tab").forEach(tab => {
      tab.style.display = "none";
    });

    document.getElementById(tabId).style.display = "block";

    // 🔥 ボタンのアクティブ状態更新
    document.querySelectorAll(".tabBtn").forEach(b => {
      b.classList.remove("active");
    });

    btn.classList.add("active");
  });
});
// ========================
// UI生成
// ========================
window.onload = () => {

  for (let i = 0; i <= 6; i++) {
    ["yuki","chie","aijo"].forEach(id => {
      let opt = document.createElement("option");
      opt.value = i;
      opt.text = i;
      document.getElementById(id).appendChild(opt);
    });
  }

  for (let i = 1; i <= 6; i++) {
    let opt = document.createElement("option");
    opt.value = i;
    opt.text = i;
    document.getElementById("dragon").appendChild(opt);
  }
};

// ========================
// リュック追加
// ========================
window.addItem = function () {
  let input = document.createElement("input");
  input.placeholder = "持ち物";
  input.classList.add("item");
  document.getElementById("items").appendChild(input);
};

// ========================
// バリデーション
// ========================
function validate() {
  let y = +document.getElementById("yuki").value;
  let c = +document.getElementById("chie").value;
  let a = +document.getElementById("aijo").value;

  if (y + c + a > 10) {
    alert("能力値の合計は10以下！");
    return false;
  }

  let total = 0;
  document.querySelectorAll(".skill").forEach(s => total += +s.value || 0);

  if (total > 3) {
    alert("技能値は合計3まで！");
    return false;
  }

  return true;
}


// ========================
// 保存（新規 or 編集）
// ========================
window.saveCharacter = async function () {

  if (!currentUser) {
    alert("ログイン待機中！");
    return;
  }

  // ========================
  // 持ち物
  // ========================
  let items = [];
  document.querySelectorAll(".item").forEach(i => {
    if (i.value) items.push(i.value);
  });

  // ========================
  // データ作成
  // ========================
  let data = {
    // 基本
    name: document.getElementById("name").value,
    head: document.getElementById("head").value,
    cloth: document.getElementById("cloth").value,
    hair: document.getElementById("hair").value,
    eye: document.getElementById("eye").value,
    skin: document.getElementById("skin").value,
    range: document.getElementById("range").value,
    melee: document.getElementById("melee").value,
    instrument: document.getElementById("instrument").value,

    // ステータス
    hp: +document.getElementById("hp").value,
    dragon: +document.getElementById("dragon").value,

    // 能力
    ability: {
      yuki: +document.getElementById("yuki").value,
      chie: +document.getElementById("chie").value,
      aijo: +document.getElementById("aijo").value,
    },

    // 技能
    skills: {
      tatakai: +document.getElementById("tatakai").value || 0,
      bouken: +document.getElementById("bouken").value || 0,
      kijou: +document.getElementById("kijou").value || 0,
      kari: +document.getElementById("kari").value || 0,
      kankaku: +document.getElementById("kankaku").value || 0,
      gakumon: +document.getElementById("gakumon").value || 0,
      uta: +document.getElementById("uta").value || 0,
      settoku: +document.getElementById("settoku").value || 0,
      shinwa: +document.getElementById("shinwa").value || 0,
    },

    // 持ち物
    items: items,

    // 管理用
    userId: currentUser.uid,
    createdAt: new Date()
  };

  // ========================
  // 保存
  // ========================
  try {

    if (editingId) {
      await updateDoc(doc(db, "characters", editingId), data);
      alert("更新した！");
      editingId = null;
    } else {
      await addDoc(collection(db, "characters"), data);
      alert("保存した！");
    }

    loadCharacters();

  } catch (e) {
    console.error("保存エラー", e);
    alert("エラー：" + e.message);
  }
};

window.exportCCF = function () {

  // ========================
  // 入力取得
  // ========================
  const name = document.getElementById("name").value;
  const hp = +document.getElementById("hp").value;

  const yuki = +document.getElementById("yuki").value;
  const chie = +document.getElementById("chie").value;
  const aijo = +document.getElementById("aijo").value;

  const dragon = document.getElementById("dragon").value;

  const skills = {
    tatakai: +document.getElementById("tatakai").value || 0,
    bouken: +document.getElementById("bouken").value || 0,
    kijou: +document.getElementById("kijou").value || 0,
    kari: +document.getElementById("kari").value || 0,
    kankaku: +document.getElementById("kankaku").value || 0,
    gakumon: +document.getElementById("gakumon").value || 0,
    uta: +document.getElementById("uta").value || 0,
    shinwa: +document.getElementById("shinwa").value || 0,
  };

  // ========================
  // コマンド生成
  // ========================
  const commands = `
{＊勇気}UK 勇気
({＊勇気}+{戦い})UK 勇気+戦い
({＊勇気}+{冒険})UK 勇気+冒険
({＊勇気}+{騎乗})UK 勇気+騎乗
{＊知恵}UK 知恵
({＊知恵}+{狩り})UK 知恵+狩り
({＊知恵}+{感覚})UK 知恵+感覚
({＊知恵}+{学問})UK 知恵+学問
{＊愛情}UK 愛情
({＊愛情}+{歌})UK 愛情+歌
({＊愛情}+{心話})UK 愛情+心話
{希望}UK 希望
{＊勇気}UK@{龍のダイス} 勇気 クリティカルコール!
({＊勇気}+{戦い})UK@{龍のダイス} 勇気+戦い クリティカルコール!
({＊勇気}+{冒険})UK@{龍のダイス} 勇気+冒険 クリティカルコール!
({＊勇気}+{騎乗})UK@{龍のダイス} 勇気+騎乗 クリティカルコール!
{＊知恵}UK@{龍のダイス} 知恵 クリティカルコール!
({＊知恵}+{狩り})UK@{龍のダイス} 知恵+狩り クリティカルコール!
({＊知恵}+{感覚})UK@{龍のダイス} 知恵+感覚 クリティカルコール!
({＊知恵}+{学問})UK@{龍のダイス} 知恵+学問 クリティカルコール!
{＊愛情}UK@{龍のダイス} 愛情 クリティカルコール!
({＊愛情}+{歌})UK@{龍のダイス} 愛情+歌 クリティカルコール!
({＊愛情}+{心話})UK@{龍のダイス} 愛情+心話 クリティカルコール!
{希望}UK@{龍のダイス} 希望 クリティカルコール!
`.trim();

  // ========================
  // JSON構築
  // ========================
  const data = {
    kind: "character",
    data: {
      name: name,
      initiative: 0,
      externalUrl: "",
      iconUrl: "",
      commands: commands,

      status: [
        { label: "希望", value: hp, max: hp }
      ],

      params: [
        { label: "龍のダイス", value: String(dragon) },

        { label: "＊勇気", value: String(yuki) },
        { label: "戦い", value: String(skills.tatakai) },
        { label: "冒険", value: String(skills.bouken) },
        { label: "騎乗", value: String(skills.kijou) },

        { label: "＊知恵", value: String(chie) },
        { label: "狩り", value: String(skills.kari) },
        { label: "感覚", value: String(skills.kankaku) },
        { label: "学問", value: String(skills.gakumon) },

        { label: "＊愛情", value: String(aijo) },
        { label: "歌", value: String(skills.uta) },
        { label: "心話", value: String(skills.shinwa) },
      ]
    }
  };

  // ========================
  // 出力
  // ========================
  document.getElementById("ccfOutput").value =
    JSON.stringify(data, null, 2);
};

