// ============================================================
// KP ATELIER ADMIN — Videos page
// ============================================================

let allVideos = [];
let selectedVideoFile = null;
let editingVideoId = null;

const typeLabel = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", file: "Uploaded file" };
const typePill = { youtube: "pill-danger", instagram: "pill-warning", tiktok: "pill-muted", file: "pill-gold" };

async function loadVideos() {
  const tbody = document.getElementById("videos-body");
  tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">Loading…</td></tr>`;

  try {
    const data = await apiRequest("/videos/admin");
    allVideos = data.videos;
    renderVideos();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">Could not load videos: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderVideos() {
  const tbody = document.getElementById("videos-body");
  if (!allVideos.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px;">No videos yet. Add one to show it on the site.</td></tr>`;
    return;
  }

  tbody.innerHTML = allVideos.map((v) => `
    <tr>
      <td>${v.video_type === 'file'
        ? `<video class="thumb" src="${escapeHtml(v.video_url)}" muted style="object-fit:cover;"></video>`
        : `<div class="thumb" style="background:var(--surface-2); display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--text-muted);">${typeLabel[v.video_type]}</div>`}
      </td>
      <td>${escapeHtml(v.title || "Untitled")}</td>
      <td><span class="pill ${typePill[v.video_type] || 'pill-muted'}">${typeLabel[v.video_type] || v.video_type}</span></td>
      <td>${v.placement}</td>
      <td>${v.sort_order}</td>
      <td>${v.is_active
        ? `<span class="pill pill-success"><span class="pill-dot"></span>Active</span>`
        : `<span class="pill pill-muted"><span class="pill-dot"></span>Hidden</span>`}
      </td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-outline btn-sm" onclick="toggleActive('${v.id}', ${v.is_active ? 0 : 1})">${v.is_active ? "Hide" : "Show"}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteVideo('${v.id}', '${escapeHtml(v.title || 'this video').replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function toggleActive(id, isActive) {
  try {
    await apiRequest(`/videos/admin/${id}`, { method: "PUT", body: { is_active: isActive } });
    toast(isActive ? "Video is now live on the site" : "Video hidden from the site");
    loadVideos();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteVideo(id, title) {
  if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
  try {
    await apiRequest(`/videos/admin/${id}`, { method: "DELETE" });
    toast("Video deleted");
    loadVideos();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Modal ----------

function resetVideoForm() {
  editingVideoId = null;
  selectedVideoFile = null;
  document.getElementById("video-form").reset();
  document.getElementById("video-file-label").textContent = "Click to upload a video, or drag it here";
  document.getElementById("link-field").style.display = "block";
  document.getElementById("file-field").style.display = "none";
  document.querySelector('input[name="v-source"][value="link"]').checked = true;
  document.getElementById("video-modal-title").textContent = "Add Video";
}

function openVideoModal() {
  document.getElementById("video-modal").classList.remove("hidden");
}
function closeVideoModal() {
  document.getElementById("video-modal").classList.add("hidden");
  resetVideoForm();
}

async function saveVideo() {
  const title = document.getElementById("v-title").value.trim();
  const source = document.querySelector('input[name="v-source"]:checked').value;
  const link = document.getElementById("v-link").value.trim();
  const placement = document.getElementById("v-placement").value;
  const sort_order = document.getElementById("v-sort-order").value;

  if (source === "link" && !link) {
    toast("Paste a video link, or switch to file upload", true);
    return;
  }
  if (source === "file" && !selectedVideoFile) {
    toast("Choose a video file to upload", true);
    return;
  }

  const formData = new FormData();
  if (title) formData.append("title", title);
  formData.append("placement", placement);
  formData.append("sort_order", sort_order);
  if (source === "link") {
    formData.append("video_link", link);
  } else {
    formData.append("video", selectedVideoFile);
  }

  const btn = document.getElementById("save-video-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    await apiRequest("/videos/admin", { method: "POST", body: formData, isForm: true });
    toast("Video added");
    closeVideoModal();
    loadVideos();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Video";
  }
}

// ---------- Init ----------

(async () => {
  await Layout.init("videos");
  await loadVideos();

  document.getElementById("new-video-btn").addEventListener("click", () => { resetVideoForm(); openVideoModal(); });
  document.getElementById("close-video-modal").addEventListener("click", closeVideoModal);
  document.getElementById("cancel-video-modal").addEventListener("click", closeVideoModal);
  document.getElementById("save-video-btn").addEventListener("click", saveVideo);

  document.querySelectorAll('input[name="v-source"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const isLink = e.target.value === "link";
      document.getElementById("link-field").style.display = isLink ? "block" : "none";
      document.getElementById("file-field").style.display = isLink ? "none" : "block";
    });
  });

  const fileDrop = document.getElementById("video-file-drop");
  const fileInput = document.getElementById("v-file");
  fileDrop.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    selectedVideoFile = e.target.files[0] || null;
    if (selectedVideoFile) {
      document.getElementById("video-file-label").textContent = selectedVideoFile.name;
    }
  });
  fileDrop.addEventListener("dragover", (e) => { e.preventDefault(); fileDrop.style.borderColor = "var(--gold)"; });
  fileDrop.addEventListener("dragleave", () => { fileDrop.style.borderColor = ""; });
  fileDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDrop.style.borderColor = "";
    selectedVideoFile = e.dataTransfer.files[0] || null;
    if (selectedVideoFile) {
      document.getElementById("video-file-label").textContent = selectedVideoFile.name;
    }
  });
})();
