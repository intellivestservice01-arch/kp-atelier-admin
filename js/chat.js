// ============================================================
// KP ATELIER ADMIN — Chat page
// Real-time via Socket.io: admin joins "admin_room" to get pinged on every
// new customer message, and joins the open chat's room for live replies.
// ============================================================

let socket = null;
let activeChatId = null;
let allChats = [];
let pendingImageFile = null;

function initSocket() {
  socket = io("https://kp-atelier-backend.onrender.com");
  socket.emit("join_admin");

  socket.on("customer_message", ({ chatId }) => {
    loadChatList(); // refresh inbox order/unread counts
    if (chatId === activeChatId) {
      loadChatDetail(activeChatId); // live-append if this thread is open
    } else {
      toast("New message from a customer");
    }
  });

  socket.on("new_message", (message) => {
    if (message.chat_id === activeChatId) {
      appendMessage(message);
    }
  });
}

async function loadChatList() {
  const listEl = document.getElementById("chat-list");
  try {
    const data = await apiRequest("/chat/admin");
    allChats = data.chats;
    renderChatList();
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state">Could not load chats: ${escapeHtml(err.message)}</div>`;
  }
}

function renderChatList() {
  const listEl = document.getElementById("chat-list");
  if (!allChats.length) {
    listEl.innerHTML = `<div class="empty-state">No conversations yet. They'll appear here as soon as a customer places an order or messages you.</div>`;
    return;
  }

  listEl.innerHTML = allChats.map((c) => `
    <div class="chat-list-item ${c.id === activeChatId ? 'active' : ''}" onclick="openChat('${c.id}')">
      <div class="top-row">
        <span class="name">${c.is_pinned ? '<span class="pin-icon">&#9733;</span> ' : ''}${escapeHtml(c.customer_name || 'Customer')}</span>
        ${c.unread_count > 0 ? `<span class="badge">${c.unread_count}</span>` : `<span class="text-muted" style="font-size:11px;">${timeAgo(c.last_message_at)}</span>`}
      </div>
      <div class="preview">${escapeHtml(c.last_message || 'No messages yet')}</div>
    </div>
  `).join("");
}

async function openChat(chatId) {
  activeChatId = chatId;
  if (socket) socket.emit("join_chat", chatId);
  renderChatList(); // update active highlight
  await loadChatDetail(chatId);
  loadChatList(); // refresh unread counts after marking read
}

async function loadChatDetail(chatId) {
  const panel = document.getElementById("chat-panel");
  try {
    const data = await apiRequest(`/chat/admin/${chatId}`);
    renderChatPanel(data);
  } catch (err) {
    panel.innerHTML = `<div class="empty-state">Could not load conversation: ${escapeHtml(err.message)}</div>`;
  }
}

function renderChatPanel(data) {
  const { chat, messages, order } = data;
  const panel = document.getElementById("chat-panel");
  const chatMeta = allChats.find((c) => c.id === chat.id) || {};

  panel.innerHTML = `
    <div class="chat-panel-header">
      <div>
        <strong>${escapeHtml(chatMeta.customer_name || "Customer")}</strong>
        <div class="text-muted" style="font-size:12px;">${escapeHtml(chatMeta.customer_phone || "")}</div>
      </div>
      <div class="flex gap-8">
        ${order ? `<span class="pill ${orderStatusPillClass(order.status)}">${order.status.replace('_',' ')}</span>` : ""}
        <button class="btn btn-outline btn-sm" onclick="togglePin('${chat.id}', ${chat.is_pinned ? 0 : 1})">${chat.is_pinned ? "Unpin" : "Pin"}</button>
        ${order ? `<button class="btn btn-outline btn-sm" onclick="window.location.href='orders.html'">View Order</button>` : ""}
      </div>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${messages.map(messageHtml).join("") || `<div class="empty-state">No messages yet — say hello.</div>`}
    </div>
    <div class="chat-composer">
      <button class="icon-btn" id="attach-btn" title="Attach image">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.4 11.1l-8.9 8.9a5 5 0 01-7.1-7.1l8.9-8.9a3.5 3.5 0 014.9 4.9l-8.9 8.9a2 2 0 01-2.8-2.8l8.1-8.1"/></svg>
      </button>
      <input type="file" id="chat-image-input" accept="image/*" style="display:none;" />
      <input type="text" id="chat-text-input" placeholder="Type a message…" />
      <button class="icon-btn send-btn" id="send-msg-btn" title="Send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
    <div id="attached-preview" style="padding: 0 16px 10px; display:none;">
      <img id="attached-preview-img" style="max-height:60px; border-radius:6px;" />
      <button class="btn btn-sm btn-outline" onclick="clearAttachment()" style="margin-left:8px;">Remove</button>
    </div>
  `;

  scrollMessagesToBottom();

  document.getElementById("attach-btn").addEventListener("click", () => document.getElementById("chat-image-input").click());
  document.getElementById("chat-image-input").addEventListener("change", (e) => {
    pendingImageFile = e.target.files[0] || null;
    if (pendingImageFile) {
      document.getElementById("attached-preview").style.display = "block";
      document.getElementById("attached-preview-img").src = URL.createObjectURL(pendingImageFile);
    }
  });

  document.getElementById("send-msg-btn").addEventListener("click", sendMessage);
  document.getElementById("chat-text-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
}

function orderStatusPillClass(status) {
  const map = { inquiry: "pill-muted", negotiating: "pill-warning", payment_pending: "pill-warning", confirmed: "pill-gold", shipped: "pill-gold", delivered: "pill-success", cancelled: "pill-danger" };
  return map[status] || "pill-muted";
}

function messageHtml(m) {
  const isAdmin = m.sender_type === "admin";
  return `
    <div class="msg ${isAdmin ? 'msg-admin' : 'msg-customer'}">
      ${m.body ? escapeHtml(m.body) : ""}
      ${m.image_url ? `<img src="${fullImageUrl(m.image_url)}" />` : ""}
      <div class="msg-time">${timeAgo(m.created_at)}</div>
    </div>
  `;
}

function appendMessage(m) {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  container.insertAdjacentHTML("beforeend", messageHtml(m));
  scrollMessagesToBottom();
}

function scrollMessagesToBottom() {
  const container = document.getElementById("chat-messages");
  if (container) container.scrollTop = container.scrollHeight;
}

function clearAttachment() {
  pendingImageFile = null;
  document.getElementById("attached-preview").style.display = "none";
  document.getElementById("chat-image-input").value = "";
}

async function sendMessage() {
  const input = document.getElementById("chat-text-input");
  const body = input.value.trim();
  if (!body && !pendingImageFile) return;

  const formData = new FormData();
  if (body) formData.append("body", body);
  if (pendingImageFile) formData.append("image", pendingImageFile);

  try {
    await apiRequest(`/chat/admin/${activeChatId}/message`, { method: "POST", body: formData, isForm: true });
    input.value = "";
    clearAttachment();
    loadChatDetail(activeChatId);
    loadChatList();
  } catch (err) {
    toast(err.message, true);
  }
}

async function togglePin(chatId, pinned) {
  try {
    await apiRequest(`/chat/admin/${chatId}/pin`, { method: "PUT", body: { pinned: !!pinned } });
    loadChatList();
    loadChatDetail(chatId);
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Init ----------

(async () => {
  await Layout.init("chat");
  await loadChatList();
  initSocket();
})();
