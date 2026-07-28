// ============================================================
// KP ATELIER ADMIN — Orders page
// ============================================================

let allOrders = [];

const orderStatusPill = {
  inquiry: "pill-muted",
  negotiating: "pill-warning",
  payment_pending: "pill-warning",
  confirmed: "pill-gold",
  shipped: "pill-gold",
  delivered: "pill-success",
  cancelled: "pill-danger",
};

function renderStatusPill(status) {
  return `<span class="pill ${orderStatusPill[status] || 'pill-muted'}"><span class="pill-dot"></span>${status.replace('_', ' ')}</span>`;
}

async function loadOrders() {
  const tbody = document.getElementById("orders-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">Loading…</td></tr>`;

  try {
    const statusFilter = document.getElementById("filter-status").value;
    const query = statusFilter ? `?status=${statusFilter}` : "";
    const data = await apiRequest(`/orders/admin${query}`);
    allOrders = data.orders;
    renderOrders();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">Could not load orders: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderOrders() {
  const tbody = document.getElementById("orders-body");
  if (!allOrders.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">No orders yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = allOrders.map((o) => `
    <tr>
      <td class="mono">${escapeHtml(o.order_ref)}</td>
      <td>${escapeHtml(o.customer_name || "—")}<br/><span class="text-muted" style="font-size:11.5px;">${escapeHtml(o.customer_phone || "")}</span></td>
      <td>${renderStatusPill(o.status)}</td>
      <td>${formatMoney(o.final_price)}</td>
      <td class="mono">${o.tracking_id ? escapeHtml(o.tracking_id) : "—"}</td>
      <td class="text-muted">${timeAgo(o.created_at)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="openOrderModal('${o.id}')">Manage</button></td>
    </tr>
  `).join("");
}

// ---------- Order detail modal ----------

async function openOrderModal(id) {
  document.getElementById("order-modal").classList.remove("hidden");
  const content = document.getElementById("order-detail-content");
  content.innerHTML = "Loading…";

  try {
    const data = await apiRequest(`/orders/admin/${id}`);
    renderOrderDetail(data);
  } catch (err) {
    content.innerHTML = `<div class="text-muted">Could not load order: ${escapeHtml(err.message)}</div>`;
  }
}

function closeOrderModal() {
  document.getElementById("order-modal").classList.add("hidden");
}

function renderOrderDetail(data) {
  const { order, items, trackingEvents } = data;
  document.getElementById("order-modal-title").textContent = order.order_ref;

  const itemsHtml = items.map((i) => `
    <div class="flex-between" style="padding:8px 0; border-bottom:1px solid var(--border);">
      <div>
        <strong>${escapeHtml(i.name)}</strong> × ${i.quantity}
        <div class="mono text-muted" style="font-size:11px;">Internal ID: ${escapeHtml(i.internal_id)}</div>
      </div>
      <div>${formatMoney(i.price_at_order)}</div>
    </div>
  `).join("");

  const timelineHtml = (trackingEvents || []).map((e) => `
    <div style="padding:6px 0;">
      <span class="pill pill-gold">${e.status.replace('_', ' ')}</span>
      ${e.location ? `<span class="text-muted"> — ${escapeHtml(e.location)}</span>` : ""}
      <div class="text-muted" style="font-size:11px;">${formatDate(e.created_at)}</div>
    </div>
  `).join("") || `<div class="text-muted">No tracking events yet.</div>`;

  document.getElementById("order-detail-content").innerHTML = `
    <div class="flex-between mb-16">
      ${renderStatusPill(order.status)}
      <span class="text-muted">${formatDate(order.created_at)}</span>
    </div>

    <div class="mb-16">
      <strong>${escapeHtml(order.customer_name || "Customer")}</strong> · ${escapeHtml(order.customer_phone || "")}
      ${order.customer_email ? ` · ${escapeHtml(order.customer_email)}` : ""}
    </div>

    <div class="section-title" style="margin-top:8px;">Items</div>
    ${itemsHtml}

    <div class="section-title">Negotiate &amp; confirm</div>
    <div class="field-row">
      <div class="field">
        <label>Final agreed price (₦)</label>
        <input type="number" id="final-price-input" value="${order.final_price || ''}" placeholder="Enter negotiated price" />
      </div>
      <div class="field">
        <label>Status</label>
        <select id="status-select">
          ${["inquiry","negotiating","payment_pending","confirmed","shipped","delivered","cancelled"].map(s =>
            `<option value="${s}" ${s === order.status ? "selected" : ""}>${s.replace('_',' ')}</option>`
          ).join("")}
        </select>
      </div>
    </div>
    <div class="field">
      <label>Private admin notes</label>
      <textarea id="admin-notes-input">${escapeHtml(order.admin_notes || "")}</textarea>
    </div>
    <button class="btn btn-outline btn-block mb-16" onclick="saveOrderUpdate('${order.id}')">Save Changes</button>

    ${!order.tracking_id ? `
      <div class="card" style="border-color: var(--gold); margin-bottom:16px;">
        <div class="field">
          <label>Delivery estimate</label>
          <input type="text" id="delivery-estimate-input" placeholder="e.g. 3–5 working days" />
        </div>
        <button class="btn btn-gold btn-block" onclick="confirmOrder('${order.id}')">Confirm Order &amp; Generate Tracking ID</button>
      </div>
    ` : `
      <div class="card mb-16">
        <div class="flex-between">
          <div>
            <div class="text-muted" style="font-size:11px;">TRACKING ID</div>
            <div class="mono" style="font-size:15px; color:var(--gold);">${escapeHtml(order.tracking_id)}</div>
          </div>
          <div style="text-align:right;">
            <div class="text-muted" style="font-size:11px;">DELIVERY ESTIMATE</div>
            <div>${escapeHtml(order.delivery_estimate || "—")}</div>
          </div>
        </div>
      </div>

      <div class="section-title">Add tracking event</div>
      <div class="field-row">
        <div class="field">
          <select id="tracking-status-select">
            <option value="packed">Packed</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        <div class="field">
          <input type="text" id="tracking-location-input" placeholder="Location (optional)" />
        </div>
      </div>
      <button class="btn btn-outline btn-block mb-16" onclick="addTrackingEvent('${order.id}')">Add Event</button>

      <div class="section-title">Delivery timeline</div>
      ${timelineHtml}
    `}
  `;
}

async function saveOrderUpdate(orderId) {
  const final_price = document.getElementById("final-price-input").value;
  const status = document.getElementById("status-select").value;
  const admin_notes = document.getElementById("admin-notes-input").value;

  try {
    await apiRequest(`/orders/admin/${orderId}`, {
      method: "PUT",
      body: {
        final_price: final_price ? Number(final_price) : undefined,
        status,
        admin_notes,
      },
    });
    toast("Order updated");
    openOrderModal(orderId);
    loadOrders();
  } catch (err) {
    toast(err.message, true);
  }
}

async function confirmOrder(orderId) {
  const delivery_estimate = document.getElementById("delivery-estimate-input").value;
  if (!confirm("Confirm this order? This generates the tracking ID and notifies the customer's chat.")) return;

  try {
    await apiRequest(`/orders/admin/${orderId}/confirm`, { method: "POST", body: { delivery_estimate } });
    toast("Order confirmed — tracking ID generated");
    openOrderModal(orderId);
    loadOrders();
  } catch (err) {
    toast(err.message, true);
  }
}

async function addTrackingEvent(orderId) {
  const status = document.getElementById("tracking-status-select").value;
  const location = document.getElementById("tracking-location-input").value;

  try {
    await apiRequest(`/orders/admin/${orderId}/tracking-event`, { method: "POST", body: { status, location } });
    toast("Tracking event added");
    openOrderModal(orderId);
    loadOrders();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Init ----------

(async () => {
  await Layout.init("orders");
  await loadOrders();

  document.getElementById("filter-status").addEventListener("change", loadOrders);
  document.getElementById("close-order-modal").addEventListener("click", closeOrderModal);
  document.getElementById("cancel-order-modal").addEventListener("click", closeOrderModal);
})();
