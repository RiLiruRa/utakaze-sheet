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
      document.getElementById("hp").value = data.hp;
      document.getElementById("melee").value = data.melee;
      document.getElementById("range").value = data.range;

      document.getElementById("yuki").value = data.ability.yuki;
      document.getElementById("chie").value = data.ability.chie;
      document.getElementById("aijo").value = data.ability.aijo;

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

  if (!currentUser) return;

  let data = {
    name: document.getElementById("name").value,
    hp: +document.getElementById("hp").value,
    melee: document.getElementById("melee").value,
    range: document.getElementById("range").value,

    ability: {
      yuki: +document.getElementById("yuki").value,
      chie: +document.getElementById("chie").value,
      aijo: +document.getElementById("aijo").value,
    },

    userId: currentUser.uid
  };



  try {
    if (editingId) {
      // ✏️ 更新
      await updateDoc(doc(db, "characters", editingId), data);
      alert("更新した！");
      editingId = null;
    } else {
      // 🆕 新規
      await addDoc(collection(db, "characters"), data);
      alert("保存した！");
    }

    loadCharacters();

  } catch (e) {
    console.error(e);
  }
};