// Firebase読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ←ここに自分のfirebaseConfig貼る
const firebaseConfig = {
  apiKey: "AIzaSyCr0Aw3yX6INXqC15gyG52KtzbyA9sBk_o",
  authDomain: "utakaze-sheet.firebaseapp.com",
  projectId: "utakaze-sheet",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 保存処理
window.saveCharacter = async function () {

  if (!validate()) return;

  let items = [];
  document.querySelectorAll(".item").forEach(i => {
    if (i.value) items.push(i.value);
  });

  let data = {
    name: name.value,
    head: head.value,
    cloth: cloth.value,
    hair: hair.value,
    eye: eye.value,
    skin: skin.value,
    range: range.value,
    melee: melee.value,
    instrument: instrument.value,
    hp: +hp.value,

    ability: {
      yuki: +yuki.value,
      chie: +chie.value,
      aijo: +aijo.value,
    },

    skills: {
      tatakai: +tatakai.value || 0,
      bouken: +bouken.value || 0,
      kijou: +kijou.value || 0,
      kari: +kari.value || 0,
      kankaku: +kankaku.value || 0,
      gakumon: +gakumon.value || 0,
      uta: +uta.value || 0,
      settoku: +settoku.value || 0,
      shinwa: +shinwa.value || 0,
    },

    dragon: +dragon.value,
    items: items,
    createdAt: new Date()
  };

  try {
    await addDoc(collection(db, "characters"), data);
    alert("🔥 Firebaseに保存成功！");
  } catch (e) {
    console.error(e);
    alert("エラー：" + e.message);
  }
};