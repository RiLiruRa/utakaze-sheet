// プルダウン生成
for (let i = 0; i <= 6; i++) {
  ["yuki","chie","aijo"].forEach(id => {
    let opt = document.createElement("option");
    opt.value = i;
    opt.text = i;
    document.getElementById(id).appendChild(opt);
  });
}

// 龍ダイス
for (let i = 1; i <= 6; i++) {
  let opt = document.createElement("option");
  opt.value = i;
  opt.text = i;
  document.getElementById("dragon").appendChild(opt);
}

// リュック追加
function addItem() {
  let input = document.createElement("input");
  input.placeholder = "持ち物";
  input.classList.add("item");
  document.getElementById("items").appendChild(input);
}

// バリデーション
function validate() {
  let y = +yuki.value;
  let c = +chie.value;
  let a = +aijo.value;

  if (y + c + a > 10) {
    alert("能力値の合計は10以下！");
    return false;
  }

  // 技能チェック
  let skills = document.querySelectorAll(".skill");
  let total = 0;

  skills.forEach(s => {
    total += +s.value || 0;
  });

  if (total > 3) {
    alert("技能値は合計3まで！");
    return false;
  }

  return true;
}

// 保存処理（Firebaseは後で合体）
async function saveCharacter() {

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
    items: items
  };

  console.log(data);
  alert("保存OK（まだFirestore未接続）");
}