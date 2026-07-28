// ============================================================
// KP ATELIER ADMIN — Products page
// ============================================================

let allCategories = [];
let allProducts = [];
let selectedFiles = [];
let editingProductId = null;

async function loadCategories() {
  const data = await apiRequest("/products/categories");
  allCategories = data.categories;

  const filterSel = document.getElementById("filter-category");
  const formSel = document.getElementById("p-category");
  allCategories.forEach((c) => {
    filterSel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
    formSel.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
  });
}

function categoryName(id) {
  const c = allCategories.find((c) => c.id === id);
  return c ? c.name : "—";
}

const statusPill = {
  available: `<span class="pill pill-success"><span class="pill-dot"></span>Available</span>`,
  reserved: `<span class="pill pill-warning"><span class="pill-dot"></span>Reserved</span>`,
  sold_out: `<span class="pill pill-danger"><span class="pill-dot"></span>Sold Out</span>`,
};

async function loadProducts() {
  const tbody = document.getElementById("products-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">Loading…</td></tr>`;

  try {
    const data = await apiRequest("/products/admin/all");
    allProducts = data.products;
    renderProducts();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">Could not load products: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderProducts() {
  const catFilter = document.getElementById("filter-category").value;
  const statusFilter = document.getElementById("filter-status").value;
  const tbody = document.getElementById("products-body");

  let filtered = allProducts;
  if (catFilter) filtered = filtered.filter((p) => p.category_id === catFilter);
  if (statusFilter) filtered = filtered.filter((p) => p.status === statusFilter);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">No products match. Try clearing filters, or add your first product.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p) => {
    const primaryImg = (p.images || [])[0];
    return `
      <tr>
        <td>${primaryImg ? `<img class="thumb" src="${fullImageUrl(primaryImg.image_url)}" />` : `<div class="thumb" style="background:var(--surface-2);"></div>`}</td>
        <td><strong>${escapeHtml(p.name)}</strong>${p.is_new_arrival ? ' <span class="pill pill-gold">New</span>' : ''}</td>
        <td class="mono">${escapeHtml(p.internal_id)}</td>
        <td>${escapeHtml(categoryName(p.category_id))}</td>
        <td>${formatMoney(p.price)}</td>
        <td>${statusPill[p.status] || p.status}</td>
        <td>
          <div class="flex gap-8">
            <button class="btn btn-outline btn-sm" onclick="openEditModal('${p.id}')">Edit</button>
            ${p.status === 'reserved'
              ? `<button class="btn btn-outline btn-sm" onclick="releaseProduct('${p.id}')">Release</button>`
              : `<button class="btn btn-outline btn-sm" onclick="quickReserve('${p.id}')">Reserve</button>`}
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}', '${escapeHtml(p.name).replace(/'/g, "\\'")}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function quickReserve(id) {
  const minutes = prompt("Reserve this item for how many minutes while you negotiate? (default 60)", "60");
  if (minutes === null) return;
  try {
    await apiRequest(`/products/admin/${id}/reserve`, { method: "POST", body: { reserved_minutes: Number(minutes) || 60 } });
    toast("Item reserved");
    loadProducts();
  } catch (err) {
    toast(err.message, true);
  }
}

async function releaseProduct(id) {
  try {
    await apiRequest(`/products/admin/${id}/release`, { method: "POST" });
    toast("Item released back to available");
    loadProducts();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
  try {
    await apiRequest(`/products/admin/${id}`, { method: "DELETE" });
    toast("Product deleted");
    loadProducts();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Modal handling ----------

function resetForm() {
  editingProductId = null;
  selectedFiles = [];
  document.getElementById("product-form").reset();
  document.getElementById("image-preview").innerHTML = "";
  document.getElementById("admin-notes-field").style.display = "none";
  document.getElementById("modal-title").textContent = "New Product";
}

function openModal() {
  document.getElementById("product-modal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("product-modal").classList.add("hidden");
  resetForm();
}

function openEditModal(id) {
  const p = allProducts.find((p) => p.id === id);
  if (!p) return;
  resetForm();
  editingProductId = id;
  document.getElementById("modal-title").textContent = "Edit Product";
  document.getElementById("p-name").value = p.name;
  document.getElementById("p-description").value = p.description;
  document.getElementById("p-price").value = p.price;
  document.getElementById("p-category").value = p.category_id || "";
  document.getElementById("p-size-guide").value = p.size_guide || "";
  document.getElementById("p-new-arrival").checked = !!p.is_new_arrival;
  document.getElementById("p-admin-notes").value = p.admin_notes || "";
  document.getElementById("admin-notes-field").style.display = "block";

  const preview = document.getElementById("image-preview");
  (p.images || []).forEach((img) => {
    const el = document.createElement("img");
    el.src = fullImageUrl(img.image_url);
    preview.appendChild(el);
  });

  openModal();
}

function renderFilePreviews() {
  const preview = document.getElementById("image-preview");
  preview.innerHTML = "";
  selectedFiles.forEach((file) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.src = url;
    preview.appendChild(img);
  });
}

async function saveProduct() {
  const name = document.getElementById("p-name").value.trim();
  const description = document.getElementById("p-description").value.trim();
  const price = document.getElementById("p-price").value;

  if (!name || !description || !price) {
    toast("Name, description and price are required", true);
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", description);
  formData.append("price", price);
  formData.append("category_id", document.getElementById("p-category").value);
  formData.append("size_guide", document.getElementById("p-size-guide").value);
  formData.append("is_new_arrival", document.getElementById("p-new-arrival").checked ? "1" : "0");

  if (editingProductId) {
    formData.append("admin_notes", document.getElementById("p-admin-notes").value);
  }

  selectedFiles.forEach((file) => formData.append("images", file));

  const btn = document.getElementById("save-product-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    if (editingProductId) {
      await apiRequest(`/products/admin/${editingProductId}`, { method: "PUT", body: formData, isForm: true });
      toast("Product updated");
    } else {
      await apiRequest("/products/admin", { method: "POST", body: formData, isForm: true });
      toast("Product created");
    }
    closeModal();
    loadProducts();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Product";
  }
}

// ---------- Init ----------

(async () => {
  await Layout.init("products");
  await loadCategories();
  await loadProducts();

  document.getElementById("new-product-btn").addEventListener("click", () => { resetForm(); openModal(); });
  document.getElementById("close-modal").addEventListener("click", closeModal);
  document.getElementById("cancel-modal").addEventListener("click", closeModal);
  document.getElementById("save-product-btn").addEventListener("click", saveProduct);

  document.getElementById("filter-category").addEventListener("change", renderProducts);
  document.getElementById("filter-status").addEventListener("change", renderProducts);

  const fileDrop = document.getElementById("file-drop");
  const fileInput = document.getElementById("p-images");
  fileDrop.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    selectedFiles = Array.from(e.target.files);
    renderFilePreviews();
  });
  fileDrop.addEventListener("dragover", (e) => { e.preventDefault(); fileDrop.style.borderColor = "var(--gold)"; });
  fileDrop.addEventListener("dragleave", () => { fileDrop.style.borderColor = ""; });
  fileDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDrop.style.borderColor = "";
    selectedFiles = Array.from(e.dataTransfer.files);
    renderFilePreviews();
  });
})();
