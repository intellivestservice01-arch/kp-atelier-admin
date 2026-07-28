// ============================================================
// Injects the sidebar nav + wires up theme toggle & logout.
// Each page includes: <div id="sidebar-root"></div> and calls Layout.init("products")
// ============================================================

const Layout = {
  navItems: [
    { key: "dashboard", href: "dashboard.html", label: "Dashboard", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>` },
    { key: "products", href: "products.html", label: "Products", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.5 7.5l-8-4-8 4v9l8 4 8-4v-9z"/><path d="M4.5 7.5l8 4 8-4M12.5 21.5v-9"/></svg>` },
    { key: "orders", href: "orders.html", label: "Orders", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M14 2v5h5M9 13h6M9 17h6"/></svg>`, badgeKey: "pendingOrders" },
    { key: "chat", href: "chat.html", label: "Chat", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`, badgeKey: "pendingChats" },
    { key: "tracking", href: "tracking.html", label: "Deliveries", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
    { key: "videos", href: "videos.html", label: "Videos", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l6 3-6 3V9z" fill="currentColor" stroke="none"/></svg>` },
    { key: "reviews", href: "reviews.html", label: "Reviews", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8L6 21l1.6-7L2.2 9.2l7.1-.6L12 2z"/></svg>` },
  ],

  async init(activeKey) {
    Theme.init();
    Auth.requireAuth();
    const admin = Auth.getAdmin();

    const root = document.getElementById("sidebar-root");
    if (!root) return;

    root.innerHTML = `
      <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <button class="mobile-menu-close" id="mobile-menu-close" aria-label="Close menu">&times;</button>
        <div class="sidebar-brand">
          <img src="assets/kp-logo.jpeg" alt="KP Atelier" />
          <div class="sidebar-brand-text">
            <span class="name">KP Atelier</span>
            <span class="role">Admin Panel</span>
          </div>
        </div>
        <nav class="sidebar-nav" id="nav-list"></nav>
        <div class="sidebar-footer">
          <button class="theme-toggle" id="theme-toggle-btn">
            <svg id="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            <span id="theme-label">Dark</span>
          </button>
          <button class="logout-btn" id="logout-btn">Log out</button>
        </div>
      </aside>
    `;

    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const openMenu = () => { sidebar.classList.add("open"); backdrop.classList.add("open"); };
    const closeMenu = () => { sidebar.classList.remove("open"); backdrop.classList.remove("open"); };

    document.getElementById("mobile-menu-btn").addEventListener("click", openMenu);
    document.getElementById("mobile-menu-close").addEventListener("click", closeMenu);
    backdrop.addEventListener("click", closeMenu);
    // Tapping a nav link on mobile should close the drawer too (page navigates anyway, but feels right)
    sidebar.addEventListener("click", (e) => { if (e.target.closest(".nav-item")) closeMenu(); });

    const navList = document.getElementById("nav-list");
    this.navItems.forEach((item) => {
      const el = document.createElement("a");
      el.href = item.href;
      el.className = "nav-item" + (item.key === activeKey ? " active" : "");
      el.innerHTML = `${item.icon}<span>${item.label}</span><span class="badge" id="badge-${item.key}" style="display:none"></span>`;
      navList.appendChild(el);
    });

    document.getElementById("logout-btn").addEventListener("click", () => Auth.logout());

    const themeBtn = document.getElementById("theme-toggle-btn");
    const themeLabel = document.getElementById("theme-label");
    themeLabel.textContent = Theme.current() === "dark" ? "Dark" : "Light";
    themeBtn.addEventListener("click", () => {
      const next = Theme.toggle();
      themeLabel.textContent = next === "dark" ? "Dark" : "Light";
    });

    // Populate badges (pending chats / pending reviews) from live data
    try {
      const stats = await apiRequest("/admin/dashboard");
      const chatBadge = document.getElementById("badge-chat");
      if (stats.pendingChats > 0) {
        chatBadge.textContent = stats.pendingChats;
        chatBadge.style.display = "inline-block";
      }
    } catch (e) {
      // silent — badges are a nice-to-have, not critical path
    }

    try {
      const reviewData = await apiRequest("/reviews/admin?status=pending");
      const reviewBadge = document.getElementById("badge-reviews");
      if (reviewData.reviews && reviewData.reviews.length > 0) {
        reviewBadge.textContent = reviewData.reviews.length;
        reviewBadge.style.display = "inline-block";
      }
    } catch (e) {
      // silent
    }
  },
};
