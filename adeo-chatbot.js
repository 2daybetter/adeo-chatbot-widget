/*!
 * adeo.co.kr 홈페이지 AI 상담 챗봇 위젯
 * 우측 하단 "맨위로" 버튼(.totop, right:32px/bottom:32px, 44x44) 바로 위에
 * 떠 있는 플로팅 버튼으로 동작하며, 클릭 시 채팅 패널이 열린다.
 *
 * 사용법:
 *   <script src="https://<host>/adeo-chatbot.js"
 *           data-api-url="https://<backend-host>/api/chat"
 *           defer></script>
 *
 * 페이지 CSS와 충돌하지 않도록 전체 UI를 Shadow DOM 안에서 렌더링한다.
 */
(function () {
  "use strict";

  var scriptEl = document.currentScript;
  var config = {
    apiUrl: (scriptEl && scriptEl.getAttribute("data-api-url")) || "",
    greeting:
      (scriptEl && scriptEl.getAttribute("data-greeting")) ||
      "안녕하세요! 아데오 AI 상담봇입니다.\n홈페이지 서비스·솔루션·문의 방법에 대해 무엇이든 물어보세요.",
  };

  if (!config.apiUrl) {
    console.warn(
      "[adeo-chatbot] data-api-url이 설정되지 않았습니다. 챗봇이 동작하지 않습니다."
    );
    return;
  }

  var SUGGESTIONS = [
    "아데오는 어떤 회사인가요?",
    "Solnect 솔루션이 궁금해요",
    "프로젝트 문의는 어떻게 하나요?",
  ];

  // ---------- Shadow root & host ----------
  var host = document.createElement("div");
  host.id = "adeo-chatbot-widget-root";
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent =
    ":host{all:initial;}\n" +
    "*{box-sizing:border-box;font-family:'Pretendard GOV','Pretendard',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',Roboto,sans-serif;}\n" +
    ".fab{position:fixed;right:32px;bottom:88px;width:52px;height:52px;border-radius:50%;background:#4458B0;box-shadow:0 4px 16px rgba(0,0,0,0.05),0 12px 32px rgba(0,0,0,0.10);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483000;border:none;color:#fff;transition:transform .15s ease,background .15s ease;}\n" +
    ".fab:hover{background:#2A3F96;transform:translateY(-2px);}\n" +
    ".fab:active{transform:translateY(0);}\n" +
    ".fab svg{width:24px;height:24px;}\n" +
    "@media (max-width:1023px){.fab{right:20px;bottom:72px;width:46px;height:46px;}}\n" +
    ".panel{position:fixed;right:32px;bottom:152px;width:380px;max-width:calc(100vw - 40px);height:min(560px,calc(100vh - 180px));background:#fff;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,0.05),0 12px 32px rgba(0,0,0,0.14);display:flex;flex-direction:column;overflow:hidden;z-index:2147483000;opacity:0;pointer-events:none;transform:translateY(12px) scale(.98);transition:opacity .18s ease,transform .18s ease;}\n" +
    ".panel.open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1);}\n" +
    "@media (max-width:1023px){.panel{right:20px;bottom:126px;width:calc(100vw - 40px);}}\n" +
    "@media (max-width:480px){.panel{right:8px;left:8px;width:auto;bottom:118px;height:min(70vh,560px);}}\n" +
    ".header{background:#4458B0;color:#fff;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}\n" +
    ".header-title{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;}\n" +
    ".header-sub{font-size:12px;font-weight:400;opacity:.85;margin-top:2px;}\n" +
    ".close-btn{background:transparent;border:none;color:#fff;cursor:pointer;padding:4px;display:flex;opacity:.9;}\n" +
    ".close-btn:hover{opacity:1;}\n" +
    ".messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#FAFAFB;}\n" +
    ".msg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word;}\n" +
    ".msg.bot{align-self:flex-start;background:#fff;color:#131517;border:1px solid rgba(19,21,23,0.10);border-bottom-left-radius:4px;}\n" +
    ".msg.user{align-self:flex-end;background:#4458B0;color:#fff;border-bottom-right-radius:4px;}\n" +
    ".msg.error{align-self:flex-start;background:#FFDAD6;color:#8c1d1a;}\n" +
    ".suggestions{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 12px;background:#FAFAFB;}\n" +
    ".chip{border:1px solid rgba(19,21,23,0.15);background:#fff;color:#232527;font-size:12.5px;padding:7px 11px;border-radius:999px;cursor:pointer;transition:background .12s;}\n" +
    ".chip:hover{background:#F3F2FF;border-color:#94A6FF;}\n" +
    ".inputbar{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(19,21,23,0.08);flex-shrink:0;background:#fff;}\n" +
    ".inputbar textarea{flex:1;resize:none;border:1px solid rgba(19,21,23,0.15);border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.4;max-height:88px;outline:none;}\n" +
    ".inputbar textarea:focus{border-color:#4458B0;}\n" +
    ".send-btn{width:40px;height:40px;flex-shrink:0;border-radius:10px;border:none;background:#4458B0;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;}\n" +
    ".send-btn:disabled{background:#BFBFBF;cursor:not-allowed;}\n" +
    ".send-btn svg{width:18px;height:18px;}\n" +
    ".typing{display:inline-flex;gap:3px;align-items:center;padding:2px 0;}\n" +
    ".typing span{width:5px;height:5px;border-radius:50%;background:#A0A0A0;animation:blink 1.2s infinite ease-in-out;}\n" +
    ".typing span:nth-child(2){animation-delay:.2s;} .typing span:nth-child(3){animation-delay:.4s;}\n" +
    "@keyframes blink{0%,80%,100%{opacity:.25;}40%{opacity:1;}}\n" +
    ".footer-note{font-size:10.5px;color:#A0A0A0;text-align:center;padding:6px 0 10px;background:#fff;}";
  shadow.appendChild(style);

  // ---------- FAB ----------
  var fab = document.createElement("button");
  fab.className = "fab";
  fab.setAttribute("aria-label", "아데오 AI 상담 챗봇 열기");
  fab.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8c-1.06 0-2.07-.207-2.995-.583L4 20l1.086-4.353A7.96 7.96 0 0 1 4 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="15.5" cy="12" r="1" fill="currentColor"/></svg>';
  shadow.appendChild(fab);

  // ---------- Panel ----------
  var panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML =
    '<div class="header">' +
    '<div><div class="header-title">아데오 AI 상담</div><div class="header-sub">홈페이지 콘텐츠 기반으로 답변해요</div></div>' +
    '<button class="close-btn" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
    "</div>" +
    '<div class="messages" role="log" aria-live="polite"></div>' +
    '<div class="suggestions"></div>' +
    '<div class="inputbar">' +
    '<textarea rows="1" placeholder="궁금한 점을 입력해 주세요" aria-label="메시지 입력"></textarea>' +
    '<button class="send-btn" aria-label="전송"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12l16-7-4 16-5-6-7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg></button>' +
    "</div>" +
    '<div class="footer-note">AI 답변은 부정확할 수 있어요 · 정확한 안내는 문의하기(/contact)</div>';
  shadow.appendChild(panel);

  var messagesEl = panel.querySelector(".messages");
  var suggestionsEl = panel.querySelector(".suggestions");
  var textarea = panel.querySelector("textarea");
  var sendBtn = panel.querySelector(".send-btn");
  var closeBtn = panel.querySelector(".close-btn");

  var history = []; // {role, content}
  var isOpen = false;
  var isStreaming = false;

  function appendMessage(role, text) {
    var el = document.createElement("div");
    el.className = "msg " + role;
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function renderSuggestions() {
    suggestionsEl.innerHTML = "";
    SUGGESTIONS.forEach(function (q) {
      var chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = q;
      chip.addEventListener("click", function () {
        sendMessage(q);
      });
      suggestionsEl.appendChild(chip);
    });
  }

  function clearSuggestions() {
    suggestionsEl.innerHTML = "";
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add("open");
    fab.setAttribute("aria-label", "아데오 AI 상담 챗봇 닫기");
    if (messagesEl.children.length === 0) {
      appendMessage("bot", config.greeting);
      renderSuggestions();
    }
    setTimeout(function () {
      textarea.focus();
    }, 50);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
    fab.setAttribute("aria-label", "아데오 AI 상담 챗봇 열기");
  }

  fab.addEventListener("click", function () {
    isOpen ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  textarea.addEventListener("input", function () {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 88) + "px";
  });
  textarea.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textarea.value);
    }
  });
  sendBtn.addEventListener("click", function () {
    sendMessage(textarea.value);
  });

  function setSending(sending) {
    isStreaming = sending;
    sendBtn.disabled = sending;
    textarea.disabled = sending;
  }

  function sendMessage(rawText) {
    var text = (rawText || "").trim();
    if (!text || isStreaming) return;

    clearSuggestions();
    appendMessage("user", text);
    history.push({ role: "user", content: text });
    textarea.value = "";
    textarea.style.height = "auto";

    var typingEl = document.createElement("div");
    typingEl.className = "msg bot";
    typingEl.innerHTML =
      '<span class="typing"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    setSending(true);

    fetch(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: history.slice(0, -1),
      }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) {
          throw new Error("HTTP " + res.status);
        }
        var reader = res.body.getReader();
        var decoder = new TextDecoder("utf-8");
        var full = "";
        typingEl.textContent = "";
        typingEl.classList.remove("bot");
        typingEl.classList.add("bot");

        function pump() {
          return reader.read().then(function (result) {
            if (result.done) {
              history.push({ role: "assistant", content: full });
              setSending(false);
              return;
            }
            full += decoder.decode(result.value, { stream: true });
            typingEl.textContent = full;
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) {
        console.error("[adeo-chatbot]", err);
        typingEl.classList.add("error");
        typingEl.textContent =
          "답변을 불러오지 못했습니다. 잠시 후 다시 시도하거나 /contact 로 문의해 주세요.";
        setSending(false);
      });
  }
})();
