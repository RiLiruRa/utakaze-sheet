console.log("ウタカゼ・ギルドへようこそ！");

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where,
  deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

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

signInAnonymously(auth).then((userCredential) => {
  currentUser = userCredential.user;
  loadCharacters();
});

// --- 一覧表示 ---
async function loadCharacters() {
  if (!currentUser) return;
  const q = query(collection(db, "characters"), where("userId", "==", currentUser.uid));
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
        <button onclick="editCharacter('${id}')" style="background: #5d4037; font-size: 0.8rem; padding: 5px 12px;">✏️ 編集</button>
        <button onclick="deleteCharacter('${id}')" style="background: #e57373; font-size: 0.8rem; padding: 5px 12px;">🗑️ 削除</button>
      </div>
    `;
    list.appendChild(div);
  });
}

// --- 編集（復元） ---
window.editCharacter = async function(id) {
  const q = query(collection(db, "characters"));
  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    if (docSnap.id === id) {
      const data = docSnap.data();
      const fields = ["name", "head", "cloth", "hair", "eye", "skin", "range", "melee", "instrument", "hp"];
      fields.forEach(f => {
        if(document.getElementById(f)) document.getElementById(f).value = data[f] || "";
      });

      document.getElementById("yuki").value = data.ability?.yuki || 0;
      document.getElementById("chie").value = data.ability?.chie || 0;
      document.getElementById("aijo").value = data.ability?.aijo || 0;
      document.getElementById("dragon").value = data.dragon || 1;

      if(data.skills) {
        Object.keys(data.skills).forEach(s => {
          if(document.getElementById(s)) document.getElementById(s).value = data.skills[s];
        });
      }

      // 持ち物の復元：新しいaddItem関数を呼び出して削除ボタンを付ける
      document.getElementById("items").innerHTML = "";
      if(data.items) {
        data.items.forEach(itemStr => {
          window.addItem(itemStr); 
        });
      }

      editingId = id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert(data.name + " を編集するよ！");
    }
  });
};

window.deleteCharacter = async function(id) {
  if (!confirm("この勇者の記録を消しちゃう？")) return;
  await deleteDoc(doc(db, "characters", id));
  loadCharacters();
};

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

// --- 持ち物追加（削除ボタン付き） ---
window.addItem = function (val = "") {
  const container = document.getElementById("items");
  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.gap = "5px";
  div.style.marginBottom = "5px";

  const input = document.createElement("input");
  input.placeholder = "持ち物";
  input.classList.add("item");
  input.value = val;
  input.style.flex = "1";

  const delBtn = document.createElement("button");
  delBtn.innerText = "×";
  delBtn.style.background = "#e57373";
  delBtn.style.padding = "5px 10px";
  delBtn.style.margin = "0";
  delBtn.onclick = function () {
    container.removeChild(div);
  };

  div.appendChild(input);
  div.appendChild(delBtn);
  container.appendChild(div);
};

// --- 保存 ---
window.saveCharacter = async function () {
  if (!currentUser) { alert("ログイン中..."); return; }

  let items = [];
  document.querySelectorAll(".item").forEach(i => { if (i.value) items.push(i.value); });

  let data = {
    name: document.getElementById("name").value,
    head: document.getElementById("head").value,
    cloth: document.getElementById("cloth").value,
    hair: document.getElementById("hair").value,
    eye: document.getElementById("eye").value,
    skin: document.getElementById("skin").value,
    range: document.getElementById("range").value,
    melee: document.getElementById("melee").value,
    instrument: document.getElementById("instrument").value,
    hp: +document.getElementById("hp").value,
    dragon: +document.getElementById("dragon").value,
    ability: {
      yuki: +document.getElementById("yuki").value,
      chie: +document.getElementById("chie").value,
      aijo: +document.getElementById("aijo").value,
    },
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
    items: items,
    userId: currentUser.uid,
    createdAt: new Date()
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "characters", editingId), data);
      alert("冒険の記録を更新したよ！");
      editingId = null;
    } else {
      await addDoc(collection(db, "characters"), data);
      alert("新しい勇者が誕生した！");
    }
    loadCharacters();
  } catch (e) { alert("保存に失敗したみたい…：" + e.message); }
};

// --- ココフォリア出力 ---
window.exportCCF = function () {
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

  const data = {
    kind: "character",
    data: {
      name: name,
      commands: commands,
      status: [{ label: "希望", value: hp, max: hp }],
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

  document.getElementById("ccfOutput").value = JSON.stringify(data, null, 2);
};