const TABS = document.querySelectorAll(".tab");
const inquiryTypeEl = document.getElementById("inquiryType");

const form = document.getElementById("contactForm");
const nameEl = document.getElementById("name");
const guardianEl = document.getElementById("guardian");
const contactEl = document.getElementById("contact");
const messageEl = document.getElementById("message");
const agreeEl = document.getElementById("agree");
const companyEl = document.getElementById("company"); // honeypot

const countEl = document.getElementById("count");
const resultEl = document.getElementById("result");
const clearBtn = document.getElementById("clearBtn");

const COOLDOWN_MS = 60 * 1000; // 連投防止: 60秒

// --- タブ切替 ---
TABS.forEach(btn => {
  btn.addEventListener("click", () => {
    TABS.forEach(b => {
      b.classList.remove("is-active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");

    const type = btn.dataset.type;
    inquiryTypeEl.value = type;

    resultEl.textContent = `種別：${type} を選択中`;
  });
});

// --- 文字数カウント ---
function updateCount(){
  countEl.textContent = `${messageEl.value.length} / 1200`;
}
messageEl.addEventListener("input", updateCount);
updateCount();

// --- エラー表示 ---
function setErr(id, msg){
  const el = document.querySelector(`[data-err-for="${id}"]`);
  if(el) el.textContent = msg || "";
}

// --- ゆるめ判定（メール or 電話） ---
function looksLikeEmailOrPhone(text){
  const t = (text || "").trim();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phone = /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/; // 日本の電話想定（ゆるめ）
  return email.test(t) || phone.test(t);
}

function cooldownOk(){
  const last = Number(localStorage.getItem("accio_contact_last") || 0);
  return Date.now() - last > COOLDOWN_MS;
}
function markSent(){
  localStorage.setItem("accio_contact_last", String(Date.now()));
}

// --- 送信（Formspree） ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultEl.textContent = "";

  // honeypot: 入ってたらbot扱いで無視
  if ((companyEl.value || "").trim() !== "") {
    resultEl.textContent = "送信できませんでした。";
    return;
  }

  // 連投防止
  if(!cooldownOk()){
    resultEl.textContent = "連続送信の場合は少しお待ちください（約1分）。";
    return;
  }

  // バリデーション
  let ok = true;
  setErr("name", "");
  setErr("contact", "");
  setErr("message", "");

  if(nameEl.value.trim().length < 1){
    setErr("name", "お名前を入力してください。");
    ok = false;
  }
  if(!looksLikeEmailOrPhone(contactEl.value)){
    setErr("contact", "メールアドレスか電話番号を入力してください。");
    ok = false;
  }
  if(messageEl.value.trim().length < 1){
    setErr("message", "メッセージを入力してください。");
    ok = false;
  }
  if(!agreeEl.checked){
    resultEl.textContent = "ルール同意にチェックを入れてください。";
    ok = false;
  }
  if(!ok) return;

  const endpoint = form.action; // index.htmlのactionが送信先

  // 送るデータ（Formspreeにそのまま届く）
  const payload = {
    inquiryType: inquiryTypeEl.value,
    name: nameEl.value.trim(),
    guardian: guardianEl.value.trim(),
    contact: contactEl.value.trim(),
    message: messageEl.value.trim(),
    page: location.href,
    userAgent: navigator.userAgent
  };

  try{
    resultEl.textContent = "送信中…";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if(res.ok){
      markSent();
      resultEl.textContent =
        "送信できました！3営業日以内にお返事いたします。返信がない場合は再送をお願いします（迷惑メール/ドメイン指定も確認してください）。";
      form.reset();
      inquiryTypeEl.value = document.querySelector(".tab.is-active")?.dataset.type || "質問箱";
      updateCount();
      setErr("name", "");
      setErr("contact", "");
      setErr("message", "");
    }else{
      const data = await res.json().catch(()=> ({}));
      resultEl.textContent = data?.error
        ? `送信エラー：${data.error}`
        : "送信に失敗しました…時間をおいてもう一度送信してください。";
    }
  }catch(err){
    resultEl.textContent = "通信エラー…ネット環境を確認して、もう一度送信してください。";
  }
});

// --- クリア ---
clearBtn.addEventListener("click", () => {
  form.reset();
  inquiryTypeEl.value = document.querySelector(".tab.is-active")?.dataset.type || "質問箱";
  updateCount();
  resultEl.textContent = "入力をクリアしました。";
  setErr("name", "");
  setErr("contact", "");
  setErr("message", "");
});

