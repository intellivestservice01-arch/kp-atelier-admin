// ============================================================
// KP ATELIER ADMIN — shared API client
// Change API_BASE if your backend runs somewhere other than localhost:5000
// ============================================================

const API_BASE = "http://localhost:5000/api";

const Auth = {
  getToken() {
    return localStorage.getItem("kp_admin_token");
  },
  setToken(token) {
    localStorage.setItem("kp_admin_token", token);
  },
  getAdmin() {
    const raw = localStorage.getItem("kp_admin_info");
    return raw ? JSON.parse(raw) : null;
  },
  setAdmin(admin) {
    localStorage.setItem("kp_admin_info", JSON.stringify(admin));
  },
  logout() {
    localStorage.removeItem("kp_admin_token");
    localStorage.removeItem("kp_admin_info");
    window.location.href = "index.html";
  },
  // Call at the top of every protected page — kicks back to login if no token
  requireAuth() {
    if (!this.getToken()) {
      window.location.href = "index.html";
    }
  },
};

const Theme = {
  KEY: "kp_admin_theme",
  init() {
    const saved = localStorage.getItem(this.KEY) || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  },
  toggle() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(this.KEY, next);
    return next;
  },
  current() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  },
};

// Core request helper. Adds Bearer token automatically.
// For JSON bodies pass a plain object; for file uploads pass a FormData instance directly.
async function apiRequest(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isForm && body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (res.status === 401) {
    Auth.logout();
    throw new Error("Session expired — please log in again");
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

function toast(message, isError = false) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function fullImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `http://localhost:5000${path}`;
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return "—";
  return "₦" + Number(amount).toLocaleString();
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T"));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
