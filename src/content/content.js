// Content script - 桥接页面和 background script
console.log("🌉 WebSocket Proxy content script loaded");

// 使用外部文件注入，避免 CSP 内联脚本限制
function injectWebSocketProxy() {
  console.log("💉 Injecting WebSocket proxy from external file...");

  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("src/content/injected.js");
    script.onload = function () {
      console.log("✅ External script loaded and executed");
      this.remove(); // 清理script标签
    };
    script.onerror = function () {
      console.error("❌ Failed to load external script");
      console.error("Script src:", this.src);
    };

    // 尽可能早地注入
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error("❌ Error injecting script:", error);
  }
}

// 立即执行注入
if (document.readyState === "loading") {
  injectWebSocketProxy();
} else {
  injectWebSocketProxy();
}

console.log("📍 Content script injection attempt completed");

// 监听来自注入脚本的消息
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.source === "websocket-proxy-injected") {
    console.log(
      "📨 Content script received message from injected script:",
      event.data
    );

    chrome.runtime
      .sendMessage({
        type: "websocket-event",
        data: event.data.payload,
      })
      .then((response) => {
        console.log(
          "✅ Message sent to background script, response:",
          response
        );
      })
      .catch((error) => {
        console.error("❌ Failed to send message to background script:", error);
      });
  }
});

// 监听来自 background script 的控制消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📥 Content script received message from background:", message);

  // 转发控制命令到注入脚本
  switch (message.type) {
    case "stop-monitoring":
      console.log("⏹️ Forwarding stop monitoring to injected script");
      window.postMessage(
        {
          source: "websocket-proxy-content",
          type: "stop-monitoring",
        },
        "*"
      );
      break;

    case "pause-connections":
      console.log("⏸️ Forwarding pause connections to injected script");
      window.postMessage(
        {
          source: "websocket-proxy-content",
          type: "pause-connections",
        },
        "*"
      );
      break;

    case "resume-connections":
      console.log("▶️ Forwarding resume connections to injected script");
      window.postMessage(
        {
          source: "websocket-proxy-content",
          type: "resume-connections",
        },
        "*"
      );
      break;

    case "block-outgoing":
      console.log(
        "🚫 Forwarding block outgoing to injected script:",
        message.enabled
      );
      window.postMessage(
        {
          source: "websocket-proxy-content",
          type: "block-outgoing",
          enabled: message.enabled,
        },
        "*"
      );
      break;

    case "block-incoming":
      console.log(
        "🚫 Forwarding block incoming to injected script:",
        message.enabled
      );
      window.postMessage(
        {
          source: "websocket-proxy-content",
          type: "block-incoming",
          enabled: message.enabled,
        },
        "*"
      );
      break;

    case "get-proxy-state":
      console.log("📊 Forwarding get proxy state to injected script");
      window.postMessage(
        {
          source: "websocket-proxy-content",
          type: "get-proxy-state",
        },
        "*"
      );
      break;

    case "simulate-message":
      console.log(
        "🎭 Forwarding simulate message to injected script:",
        message
      );
      window.postMessage(
        {
          source: "websocket-proxy-content",
          type: "simulate-message",
          connectionId: message.connectionId,
          message: message.message,
          direction: message.direction,
        },
        "*"
      );
      break;

    default:
      console.log("❓ Unknown control message type:", message.type);
      break;
  }

  sendResponse({ received: true });
});

console.log("✅ Content script initialization complete");
