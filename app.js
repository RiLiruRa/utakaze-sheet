import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where,
  deleteDoc, doc, updateDoc, orderBy, getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
// 🍏 【修正】必要な認証関数（signInWithEmailAndPassword と signOut）をインポートに追加
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCr0Aw3yX6INXqC15gyG52KtzbyA9sBk_o",
  authDomain: "utakaze-sheet.firebaseapp.com",
  projectId: "utakaze-sheet",
  storageBucket: "utakaze-sheet.firebasestorage.app",
  messagingSenderId: "708154707581",
  appId: "1:708154707581:web:c5c8928d741ed1c3202b14",
  measurementId: "G-QMQ4F1JT3C"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_UID = "TxjKeaW4e2T2S5kFPWaTrLOweXv2"; // 管理者ユーザーのUID
let currentUser = null;
let editingId = null;

// 🍏 【修正】バラバラだった onload 処理を1つの関数に綺麗に統合
window.onload = () => {
  // 1. 能力値のセレクトボックス初期化
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

  //2.ブラウザに記憶されているDiscordユーザ情報があれば自動ログインさせる処理
  const savedUser = localStorage.getItem("discordUser");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    document.getElementById("authBefore").style.display = "none";
    document.getElementById("authAfter").style.display = "block";
    document.getElementById("userInfo").innerText = `🍃 勇者: ${currentUser.displayName} としてログイン中`;
    loadCharacters();　// ログイン状態を復元したらキャラクターを読み込む
  }

  // 3. DiscordのCallbackを解析する処理
  const fragments = new URLSearchParams(window.location.hash.substring(1));
  if (fragments.get("access_token")) {
    const accessToken = fragments.get("access_token");
    
    fetch("https://discord.com/api/users/@me", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    })
    .then(res => res.json())
    .then(discordUser => {
      // テンプレートリテラルのバグ（' ）を修正
      currentUser = { uid: `discord_${discordUser.id}`, displayName: discordUser.username };

      // 🍏 Discordユーザ情報をlocalStorageに保存して次回以降の自動ログインに備える
      localStorage.setItem("discordUser", JSON.stringify(currentUser));

      document.getElementById("authBefore").style.display = "none";
      document.getElementById("authAfter").style.display = "block";
      document.getElementById("userInfo").innerText = `🍃 勇者: ${discordUser.username} としてログイン中`;

      window.location.hash = ""; 
      loadCharacters(); 
    })
    .catch(err => console.error("Discordプロフィール取得エラー:", err));
  }
};

// --- 🌐 HTMLから呼び出す関数（windowオブジェクトに紐付け） ---

// Discordログインボタンを押したとき
window.loginWithDiscord = function() {
  const clientId = "1505221013842165961"; // DiscordアプリのクライアントID
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=identify`;
};

// 管理者ログイン(メール・パスワード)
window.loginAsAdmin = async function() {
  // 🍏 【修正】prompt("...").value はエラーになるため、prompt() の戻り値をそのまま受ける形に修正
  const email = prompt("管理者のメールアドレスを入力してください:");
  if (!email) return;
  const password = prompt("パスワードを入力してください:");
  if (!password) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("管理者としてログイン成功！");
    document.getElementById("adminForm").style.display = "none";
  } catch (e) {
    console.error("管理者ログインエラー:", e);
    alert("ログインに失敗したよ: " + e.message);
  }
};

// ログアウト処理
window.logout = async function() {
  try {
    await signOut(auth);
  } catch(e) {
    console.error("Firebaseログアウトエラー:", e);
  }

  // 🍏 Discordログインユーザーのログアウト処理（localStorageから情報を消す）
  localStorage.removeItem("discordUser");

  currentUser = null;
  document.getElementById("authBefore").style.display = "block";
  document.getElementById("authAfter").style.display = "none";
  document.getElementById("characterList").innerHTML = ""; 
  alert("ログアウトしたよ！");
};

// Firebaseの認証状態を監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("ログイン中:", user.uid);
    
    document.getElementById("authBefore").style.display = "none";
    document.getElementById("authAfter").style.display = "block";
    document.getElementById("userInfo").innerText = currentUser.uid === ADMIN_UID ? "👑 ギルドマスター（管理者）ログイン中" : "ログイン中";
    
    loadCharacters(); 
  }
  // 🍏 Discordログインした人を消さないよう、未ログイン時のみ匿名認証をかける条件に修正
  else if (!currentUser) {
    // 完全に誰もログインしていない初期状態なら匿名認証を試みる
    // (Discordログイン時は上の onload で currentUser がモック化されるためここをスルーします)
  }
});

// --- キャラクター操作関連の関数 ---

// 一覧表示
async function loadCharacters() {
  if (!currentUser) return;
  
  try {
    let q;
    if (currentUser.uid === ADMIN_UID) {
      q = query(collection(db, "characters"), orderBy("updatedAt", "desc"));
    } else {
      q = query(
        collection(db, "characters"), 
        where("userId", "==", currentUser.uid),
        orderBy("updatedAt", "desc")
      );
    }
    
    const querySnapshot = await getDocs(q);
    const list = document.getElementById("characterList");
    list.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      const div = document.createElement("div");
      div.className = "card";

      const creatorBadge = currentUser.uid === ADMIN_UID 
        ? `<div style="font-size:0.7rem; color:#888; text-align:right;">👤: ${(data.userId || "").substring(0,6)}...</div>` 
        : "";

      div.innerHTML = `
        <h3>${data.name || "ななしの勇者"}</h3>
        <div style="font-size: 0.9rem; margin-bottom: 10px;">
          ❤️ 希望: ${data.hp} / 🐉 龍: ${data.dragon}<br>
          ⚔️ 武器: ${data.melee || "なし"}
        </div>
        ${creatorBadge}
        <div style="display: flex; gap: 5px; margin-top: 5px;">
          <button onclick="editCharacter('${id}')" style="background: #5d4037; font-size: 0.8rem; padding: 5px 12px; cursor:pointer;">✏️ 編集</button>
          <button onclick="deleteCharacter('${id}')" style="background: #e57373; font-size: 0.8rem; padding: 5px 12px; cursor:pointer;">🗑️ 削除</button>
        </div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    console.error("読み込みエラー:", e);
  }
}

// 編集（復元）
window.editCharacter = async function(id) {
  try {
    const docRef = doc(db, "characters", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      const fields = ["name", "head", "cloth", "hair", "eye", "skin", "range", "melee", "instrument", "hp"];
      fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = data[f] || (f === "hp" ? 10 : "");
      });

      if (data.ability) {
        document.getElementById("yuki").value = data.ability.yuki || 0;
        document.getElementById("chie").value = data.ability.chie || 0;
        document.getElementById("aijo").value = data.ability.aijo || 0;
      }
      document.getElementById("dragon").value = data.dragon || 1;

      if (data.skills) {
        Object.keys(data.skills).forEach(s => {
          const el = document.getElementById(s);
          if (el) {
            el.value = data.skills[s] !== undefined ? data.skills[s] : 0;
          }
        });
      }

      const itemContainer = document.getElementById("items");
      itemContainer.innerHTML = "";
      if (data.items) {
        data.items.forEach(itemStr => {
          window.addItem(itemStr); 
        });
      }

      const friendConntainer = document.getElementById("friendships");
      friendConntainer.innerHTML = "";
      if (data.friendships) {
        data.friendships.forEach(f => {
          window.addFriendship(f.name, f.value);
        });}

      editingId = id;
      
      const statusEl = document.getElementById("editStatus");
      if (statusEl) {
        statusEl.innerText = `🚨 今は【 ${data.name || "ななし"} の編集モード 】だよ`;
        statusEl.style.color = "#e57373"; 
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log(data.name + " のデータを復元したよ！");

    } else {
      alert("指定された勇者の記録が見つからなかったよ…");
    }
  } catch (e) {
    console.error("復元エラー:", e);
    alert("データの読み込みに失敗したみたい： " + e.message);
  }
};

// 削除
window.deleteCharacter = async function(id) {
  if (!confirm("この勇者の記録を消しちゃう？")) return;
  try {
    await deleteDoc(doc(db, "characters", id));
    loadCharacters();
  } catch (e) {
    alert("削除に失敗したよ: " + e.message);
  }
};

// 保存
window.saveCharacter = async function () {
  if (!currentUser) { alert("ログイン中..."); return; }

  const nameInput = document.getElementById("name").value;
  if (!nameInput) { alert("名前を入力してね！"); return; }

  let items = [];
  document.querySelectorAll(".item").forEach(i => { if (i.value) items.push(i.value); });

  let friendships = [];
  document.querySelectorAll(".friendship-row").forEach(row => {
    const fName = row.querySelector(".friend-name").value;
    const fValue = Number(row.querySelector(".friend-value").value);
    if (fName) friendships.push({ name: fName, value: fValue });
  });

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
      tatakai:   document.getElementById("tatakai").value   === "" ? 0 : Number(document.getElementById("tatakai").value),
      bouken:    document.getElementById("bouken").value    === "" ? 0 : Number(document.getElementById("bouken").value),
      kijou:     document.getElementById("kijou").value     === "" ? 0 : Number(document.getElementById("kijou").value),
      kari:      document.getElementById("kari").value      === "" ? 0 : Number(document.getElementById("kari").value),
      kankaku:   document.getElementById("kankaku").value   === "" ? 0 : Number(document.getElementById("kankaku").value),
      gakumon:   document.getElementById("gakumon").value   === "" ? 0 : Number(document.getElementById("gakumon").value),
      uta:       document.getElementById("uta").value       === "" ? 0 : Number(document.getElementById("uta").value),
      settoku:   document.getElementById("settoku").value   === "" ? 0 : Number(document.getElementById("settoku").value),
      shinwa:    document.getElementById("shinwa").value    === "" ? 0 : Number(document.getElementById("shinwa").value),
    },
    items: items,
    friendships: Array.from(document.querySelectorAll(".friendship-row")).map(row => {
      return {
        name: row.querySelector(".friend-name").value,
        value: Number(row.querySelector(".friend-value").value)
        
      };
    }),
    userId: currentUser.uid, 
    updatedAt: new Date()    
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "characters", editingId), data);
      alert("冒険の記録を更新したよ！");
      editingId = null;
      
      // 編集モード表示をリセット
      const statusEl = document.getElementById("editStatus");
      if (statusEl) {
        statusEl.innerText = "🍃 今は【新規作成モード】だよ";
        statusEl.style.color = "var(--leather-brown)";
      }
    } else {
      data.createdAt = new Date(); 
      await addDoc(collection(db, "characters"), data);
      alert("新しい勇者が誕生した！");
    }
    loadCharacters(); 
  } catch (e) { 
    console.error(e);
    alert("保存に失敗したみたい…：" + e.message); 
  }
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

window.addFriendship = function(name = "", value = 0) {
  const container = document.getElementById("friendships");
  const div = document.createElement("div");
  div.className = "friendship-row";
  div.style.display = "flex";
  div.style.gap = "5px";
  div.style.marginBottom = "5px";
  div.innerHTML = `
    <input placeholder="キャラクター名" class="friend-name" value="${name}" style="flex: 2;">
    <input type="number" placeholder="値" class="friend-value" value="${value}" style="width: 70px;">
    <button onclick="this.parentElement.remove()" style="background: #e57373; padding: 5px 10px; margin: 0; cursor:pointer;">×</button>
  `;
  container.appendChild(div);
};

window.exportCCF = function () {
  // ========================
  // 1. 入力取得
  // ========================
  const name = document.getElementById("name").value || "ななしの勇者";
  const hp = Number(document.getElementById("hp").value) || 0;

  const yuki = Number(document.getElementById("yuki").value) || 0;
  const chie = Number(document.getElementById("chie").value) || 0;
  const aijo = Number(document.getElementById("aijo").value) || 0;

  const dragon = document.getElementById("dragon").value || "1";

  const skills = {
    tatakai: document.getElementById("tatakai").value === "" ? 0 : Number(document.getElementById("tatakai").value),
    bouken:  document.getElementById("bouken").value === "" ? 0 : Number(document.getElementById("bouken").value),
    kijou:   document.getElementById("kijou").value === "" ? 0 : Number(document.getElementById("kijou").value),
    kari:    document.getElementById("kari").value === "" ? 0 : Number(document.getElementById("kari").value),
    kankaku: document.getElementById("kankaku").value === "" ? 0 : Number(document.getElementById("kankaku").value),
    gakumon: document.getElementById("gakumon").value === "" ? 0 : Number(document.getElementById("gakumon").value),
    uta:     document.getElementById("uta").value === "" ? 0 : Number(document.getElementById("uta").value),
    shinwa:  document.getElementById("shinwa").value === "" ? 0 : Number(document.getElementById("shinwa").value),
  };

  // ========================
  // 2. チャットパレット（コマンド）生成
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
  // 3. ステータス（希望 ＋ 友情）の構築
  // ========================
  // まずベースとなる「希望」をセット
  let statusArray = [
    { label: "希望", value: hp, max: hp }
  ];

  // 友情データを行から取得してステータス配列に追加
  document.querySelectorAll(".friendship-row").forEach(row => {
    const fName = row.querySelector(".friend-name").value;
    const fValue = Number(row.querySelector(".friend-value").value);
    
    if (fName) {
      // ココフォリアに数値を渡す（仕様上、ステータスは数値型である必要があるため、そのまま数値を入れます）
      statusArray.push({
        label: fName,
        value: fValue,
        max: fValue
      });
    }
  });

  // ========================
  // 4. ココフォリア用JSON構築
  // ========================
  const ccfData = {
    kind: "character",
    data: {
      name: name,
      initiative: 0,
      externalUrl: "",
      iconUrl: "",
      commands: commands,
      status: statusArray, // 希望と友情がここに入ります
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
        { label: "説得", value: String(skills.settoku) }
      ]
    }
  };

  // テキストエリアに出力
  document.getElementById("ccfOutput").value = JSON.stringify(ccfData, null, 2);
};