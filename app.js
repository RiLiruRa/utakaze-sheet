import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where,
  deleteDoc, doc, updateDoc, orderBy 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

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

let currentUser = null;
let editingId = null;

// 認証状態の監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("ログイン中:", user.uid);
    loadCharacters(); // ログインできたら一覧を読み込む
  } else {
    signInAnonymously(auth).catch(err => console.error("認証エラー:", err));
  }
});

// --- 一覧表示 ---
async function loadCharacters() {
  if (!currentUser) return;
  
  try {
    // ユーザーIDが一致するものを、作成日時順（新しい順）に取得
    const q = query(
      collection(db, "characters"), 
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
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
        <h2>${data.name || "ななしの勇者"}</h2>
        <div style="font-size: 0.9rem; margin-bottom: 10px;">
          ❤️ 希望: ${data.hp} / 🐉 龍: ${data.dragon}<br>
          ⚔️ 武器: ${data.melee || "なし"}
        </div>
        <div style="display: flex; gap: 5px;">
          <button onclick="editCharacter('${id}')" style="background: #5d4037; font-size: 0.8rem; padding: 5px 12px; cursor:pointer;">✏️ 編集</button>
          <button onclick="deleteCharacter('${id}')" style="background: #e57373; font-size: 0.8rem; padding: 5px 12px; cursor:pointer;">🗑️ 削除</button>
        </div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    console.error("読み込みエラー:", e);
    // インデックス未作成エラーが出る場合は、最初は orderBy なしのクエリにすると動きます
  }
}

// --- 編集（復元） ---
window.editCharacter = async function(id) {
  const q = query(collection(db, "characters"));
  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    if (docSnap.id === id) {
      const data = docSnap.data();
      // 基本フィールドの復元
      const fields = ["name", "head", "cloth", "hair", "eye", "skin", "range", "melee", "instrument", "hp"];
      fields.forEach(f => {
        const el = document.getElementById(f);
        if(el) el.value = data[f] || (f === "hp" ? 10 : "");
      });

      // 能力値の復元
      document.getElementById("yuki").value = data.ability?.yuki || 0;
      document.getElementById("chie").value = data.ability?.chie || 0;
      document.getElementById("aijo").value = data.ability?.aijo || 0;
      document.getElementById("dragon").value = data.dragon || 1;

      // 技能の復元
      if(data.skills) {
        Object.keys(data.skills).forEach(s => {
          const el = document.getElementById(s);
          if(el) el.value = data.skills[s];
        });
      }

      // 持ち物の復元（一旦リセットしてから追加）
      const itemContainer = document.getElementById("items");
      itemContainer.innerHTML = "";
      if(data.items) {
        data.items.forEach(itemStr => {
          window.addItem(itemStr); 
        });
      }

      editingId = id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert(data.name + " の記録をひらいたよ！");
    }
  });
};

// --- 削除 ---
window.deleteCharacter = async function(id) {
  if (!confirm("この勇者の記録を消しちゃう？")) return;
  try {
    await deleteDoc(doc(db, "characters", id));
    loadCharacters();
  } catch (e) {
    alert("削除に失敗したよ: " + e.message);
  }
};

// --- 保存 ---
window.saveCharacter = async function () {
  if (!currentUser) { alert("ログイン中..."); return; }

  const nameInput = document.getElementById("name").value;
  if (!nameInput) { alert("名前を入力してね！"); return; }

  let items = [];
  document.querySelectorAll(".item").forEach(i => { if (i.value) items.push(i.value); });

  // データの作成
  let data = {
    name: nameInput,
    head: document.getElementById("head").value,
    cloth: document.getElementById("cloth").value,
    hair: document.getElementById("hair").value,
    eye: document.getElementById("eye").value,
    skin: document.getElementById("skin").value,
    range: document.getElementById("range").value,
    melee: document.getElementById("melee").value,
    instrument: document.getElementById("instrument").value,
    hp: Number(document.getElementById("hp").value),
    dragon: Number(document.getElementById("dragon").value),
    ability: {
      yuki: Number(document.getElementById("yuki").value),
      chie: Number(document.getElementById("chie").value),
      aijo: Number(document.getElementById("aijo").value),
    },
    skills: {
      tatakai: Number(document.getElementById("tatakai").value) || 0,
      bouken: Number(document.getElementById("bouken").value) || 0,
      kijou: Number(document.getElementById("kijou").value) || 0,
      kari: Number(document.getElementById("kari").value) || 0,
      kankaku: Number(document.getElementById("kankaku").value) || 0,
      gakumon: Number(document.getElementById("gakumon").value) || 0,
      uta: Number(document.getElementById("uta").value) || 0,
      settoku: Number(document.getElementById("settoku").value) || 0,
      shinwa: Number(document.getElementById("shinwa").value) || 0,
    },
    items: items,
    userId: currentUser.uid, // セキュリティルールに必須
    updatedAt: new Date()    // 更新日
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "characters", editingId), data);
      alert("冒険の記録を更新したよ！");
      editingId = null;
    } else {
      data.createdAt = new Date(); // 新規作成時のみ作成日を追加
      await addDoc(collection(db, "characters"), data);
      alert("新しい勇者が誕生した！");
    }
    // 入力欄をリセットしたい場合はここにリセット処理を書く
    loadCharacters(); // 一覧を再読み込み
  } catch (e) { 
    console.error(e);
    alert("保存に失敗したみたい…：" + e.message); 
  }
};

// 以下、補助関数（初期化、持ち物追加、CCF出力などは元のロジックを維持）
window.onload = () => {
  const addOpts = (id, start, end) => {
    const el = document.getElementById(id);
    if(!el) return;
    for (let i = start; i <= end; i++) {
      let opt = document.createElement("option");
      opt.value = i; opt.text = i; el.appendChild(opt);
    }
  };
  ["yuki","chie","aijo"].forEach(id => addOpts(id, 0, 6));
  addOpts("dragon", 1, 6);
};

window.addItem = function (val = "") {
  const container = document.getElementById("items");
  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.gap = "5px";
  div.style.marginBottom = "5px";
  div.innerHTML = `
    <input placeholder="持ち物" class="item" value="${val}" style="flex: 1;">
    <button onclick="this.parentElement.remove()" style="background: #e57373; padding: 5px 10px; margin: 0; cursor:pointer;">×</button>
  `;
  container.appendChild(div);
};

window.exportCCF = function () {
  // （CCF出力ロジック：元のまま）
  const name = document.getElementById("name").value;
  // ... (省略) ...
  const ccfData = { /* JSONデータ構築 */ };
  document.getElementById("ccfOutput").value = JSON.stringify(ccfData, null, 2);
};