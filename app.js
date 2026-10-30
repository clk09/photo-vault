
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, CREATOR_UID } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);

let currentUser = null;
let isCreator = false;
let memories = [];
let selectedFile = null;
let editingImagePath = null;

const BUCKET_NAME = "Photo-vault";

let settings = {
  siteName: "Photo Vault",
  siteHeading: "Our Memories ♡",
  siteSubtitle: "Every photo has a story. Open an envelope to read it.",
  accentColor: "#805b3e",
  paperTheme: "warm"
};

const views = ["galleryView", "editorView", "settingsView"];

function showView(id) {
  views.forEach(v => $(v).classList.toggle("hidden", v !== id));
  $("logoutBtn").classList.toggle("hidden", !isCreator);
  $("creatorLoginBtn").classList.toggle("hidden", isCreator);
  document.querySelectorAll(".creator-only").forEach(e =>
    e.classList.toggle("hidden", !isCreator)
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.style.display = "none", 3500);
}

function safe(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function applySettings() {
  document.title = settings.siteName || "Photo Vault";
  $("brand").textContent = "✿ " + (settings.siteName || "Photo Vault");
  $("galleryTitle").textContent = settings.siteHeading || "Our Memories ♡";
  $("gallerySubtitle").textContent = settings.siteSubtitle || "";

  document.documentElement.style.setProperty(
    "--accent",
    settings.accentColor || "#805b3e"
  );

  document.body.classList.remove(
    "theme-rose",
    "theme-sage",
    "theme-night"
  );

  if (settings.paperTheme && settings.paperTheme !== "warm") {
    document.body.classList.add("theme-" + settings.paperTheme);
  }
}

async function loadSettings() {
  const { data, error } = await supabase
    .from("vault_settings")
    .select("id,settings")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;

  if (data?.settings) {
    settings = { ...settings, ...data.settings };
  }

  applySettings();
}

async function photoUrl(path) {
  if (!path) return "";

  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600);

  if (error) throw error;

  return data.signedUrl;
}

async function loadMemories() {
  const { data, error } = await supabase
    .from("memories")
    .select("id,title,memory_date,description,letter,photo_path,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  memories = await Promise.all(
    (data || []).map(async m => ({
      ...m,
      photoURL: await photoUrl(m.photo_path)
    }))
  );

  renderGallery();
}

function renderGallery() {
  $("gallery").innerHTML = "";

  $("memoryCount").textContent =
    `${memories.length} ${memories.length === 1 ? "memory" : "memories"}`;

  $("emptyState").classList.toggle("hidden", memories.length > 0);

  memories.forEach((m, i) => {
    const card = document.createElement("article");
    card.className = "memory-card";

    card.style.setProperty(
      "--tilt",
      `${[-1.1, .7, -.4, 1.2][i % 4]}deg`
    );

    card.innerHTML = `
      <button class="envelope-button"
        data-open="${safe(m.id)}"
        aria-label="Open letter for ${safe(m.title)}">
        <img class="memory-photo"
          src="${safe(m.photoURL)}"
          alt="${safe(m.title)}"
          loading="lazy">
        <span class="envelope">
          <span class="envelope-heart">♥</span>
        </span>
      </button>

      <h3 class="memory-title">${safe(m.title)}</h3>

      <div class="memory-date">
        ${safe(m.memory_date || "A treasured moment")}
      </div>

      ${isCreator ? `
        <div class="creator-tools">
          <button class="small-btn" data-edit="${safe(m.id)}">Edit</button>
          <button class="small-btn danger" data-delete="${safe(m.id)}">Delete</button>
        </div>
      ` : ""}
    `;

    $("gallery").append(card);
  });
}

function openLetter(id) {
  const m = memories.find(x => String(x.id) === String(id));
  if (!m) return;

  $("letterPhoto").src = m.photoURL;
  $("letterPhoto").alt = m.title || "Memory";
  $("letterDate").textContent = m.memory_date || "";
  $("letterTitle").textContent = m.title || "";
  $("letterDescription").textContent = m.description || "";
  $("letterBody").textContent = m.letter || "";

  $("letterModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLetter() {
  $("letterModal").classList.add("hidden");
  document.body.style.overflow = "";
}

function clearEditor() {
  $("memoryForm").reset();
  $("memoryId").value = "";
  selectedFile = null;
  editingImagePath = null;

  $("photoPreview").classList.add("hidden");
  $("photoPreview").removeAttribute("src");
  $("editorHeading").textContent = "Add a memory ✿";
  $("saveMemoryBtn").textContent = "Save memory ✉";
  $("editorStatus").textContent = "";
}

function editMemory(id) {
  const m = memories.find(x => String(x.id) === String(id));
  if (!m) return;

  clearEditor();

  $("memoryId").value = m.id;
  $("photoTitle").value = m.title || "";
  $("photoDate").value = m.memory_date || "";
  $("photoDescription").value = m.description || "";
  $("letterMessage").value = m.letter || "";

  $("photoPreview").src = m.photoURL;
  $("photoPreview").classList.remove("hidden");

  editingImagePath = m.photo_path || null;

  $("editorHeading").textContent = "Edit this memory ✿";
  $("saveMemoryBtn").textContent = "Save changes";

  showView("editorView");
}

async function refreshSession() {
  const { data } = await supabase.auth.getSession();

  currentUser = data.session?.user || null;
  isCreator = !!currentUser && currentUser.id === CREATOR_UID;

  try {
    await loadSettings();
    await loadMemories();
    showView("galleryView");
  } catch (e) {
    console.error(e);
    showView("galleryView");
    toast("Could not load memories. Check your database columns and Storage permissions.");
  }
}

$("creatorLoginBtn").addEventListener("click", async () => {
  const email = prompt("Creator email address:");
  if (!email) return;

  const password = prompt("Creator password:");
  if (!password) return;

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });

  if (error) {
    toast("Creator sign-in failed. Check the creator email and password.");
    console.error(error);
    return;
  }

  const { data } = await supabase.auth.getUser();

  if (data.user?.id !== CREATOR_UID) {
    await supabase.auth.signOut();
    currentUser = null;
    isCreator = false;

    toast("This account is not the configured creator account.");
    showView("galleryView");
    return;
  }

  await refreshSession();
  toast("Creator mode enabled.");
});

$("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();

  currentUser = null;
  isCreator = false;

  showView("galleryView");
  toast("Creator signed out.");
});

$("galleryNav").addEventListener("click", () =>
  showView("galleryView")
);

function newMemory() {
  if (!isCreator) {
    toast("Creator sign-in required.");
    return;
  }

  clearEditor();
  showView("editorView");
}

$("addNav").addEventListener("click", newMemory);
$("addFirstBtn").addEventListener("click", newMemory);

$("settingsNav").addEventListener("click", () => {
  $("siteName").value = settings.siteName || "";
  $("siteHeading").value = settings.siteHeading || "";
  $("siteSubtitle").value = settings.siteSubtitle || "";
  $("accentColor").value = settings.accentColor || "#805b3e";
  $("paperTheme").value = settings.paperTheme || "warm";

  showView("settingsView");
});

$("cancelEdit").addEventListener("click", () =>
  showView("galleryView")
);

$("photoFile").addEventListener("change", e => {
  selectedFile = e.target.files[0] || null;

  if (selectedFile) {
    $("photoPreview").src = URL.createObjectURL(selectedFile);
    $("photoPreview").classList.remove("hidden");
  }
});

$("memoryForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!isCreator) {
    toast("Only the creator can edit memories.");
    return;
  }

  const id = $("memoryId").value;
  const title = $("photoTitle").value.trim();
  const memory_date = $("photoDate").value || null;
  const description = $("photoDescription").value.trim();
  const letter = $("letterMessage").value.trim();

  if (!id && !selectedFile) {
    $("editorStatus").textContent = "Please choose a photo first.";
    return;
  }

  const btn = $("saveMemoryBtn");
  btn.disabled = true;
  $("editorStatus").textContent = "Saving your memory…";

  try {
    let photo_path = editingImagePath;

    if (selectedFile) {
      photo_path =
        `memories/${crypto.randomUUID()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(photo_path, selectedFile, {
          contentType: selectedFile.type,
          upsert: false
        });

      if (uploadError) throw uploadError;
    }

    const payload = {
      title,
      memory_date,
      description,
      letter,
      photo_path
    };

    const result = id
      ? await supabase.from("memories").update(payload).eq("id", id)
      : await supabase.from("memories").insert(payload);

    if (result.error) throw result.error;

    if (id && selectedFile && editingImagePath) {
      const { error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .remove([editingImagePath]);

      if (error) console.error("Old photo cleanup failed:", error);
    }

    clearEditor();
    await loadMemories();
    showView("galleryView");

    toast(id ? "Memory updated." : "Memory added to your scrapbook!");
  } catch (err) {
  console.error("SAVE ERROR:", err);

  $("editorStatus").textContent =
    "Error: " + (err.message || JSON.stringify(err));

  toast(err.message || "Something went wrong.");
}
});

$("gallery").addEventListener("click", async e => {
  const open = e.target.closest("[data-open]");
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-delete]");

  if (open) openLetter(open.dataset.open);

  if (edit && isCreator) {
    editMemory(edit.dataset.edit);
  }

  if (del && isCreator) {
    const m = memories.find(
      x => String(x.id) === String(del.dataset.delete)
    );

    if (!m || !confirm(
      `Delete “${m.title}” and its photo? This cannot be undone.`
    )) return;

    try {
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("id", m.id);

      if (error) throw error;

      if (m.photo_path) {
        const { error: storageError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .remove([m.photo_path]);

        if (storageError) {
          console.error("Photo cleanup failed:", storageError);
        }
      }

      await loadMemories();
      toast("Memory deleted.");
    } catch (err) {
      toast("Delete failed. Check creator permissions.");
      console.error(err);
    }
  }
});

$("settingsForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!isCreator) return;

  const next = {
    siteName: $("siteName").value.trim(),
    siteHeading: $("siteHeading").value.trim(),
    siteSubtitle: $("siteSubtitle").value.trim(),
    accentColor: $("accentColor").value,
    paperTheme: $("paperTheme").value
  };

  try {
    const { error } = await supabase
      .from("vault_settings")
      .upsert({ id: 1, settings: next });

    if (error) throw error;

    settings = { ...settings, ...next };
    applySettings();

    $("settingsStatus").textContent =
      "Saved! Your scrapbook has been customized.";

    toast("Settings saved.");
  } catch (err) {
    $("settingsStatus").textContent =
      "Could not save settings. Check vault_settings table and permissions.";

    console.error(err);
  }
});

$("closeLetter").addEventListener("click", closeLetter);
$("closeLetterBackdrop").addEventListener("click", closeLetter);

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeLetter();
});

supabase.auth.onAuthStateChange(() => {
  setTimeout(refreshSession, 0);
});

refreshSession();
