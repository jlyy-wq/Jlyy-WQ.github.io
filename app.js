const TYPE_LABEL = {
  all: "全部",
  book: "书",
  movie: "电影",
  podcast: "播客",
  song: "歌曲"
};

let allItems = [];
let currentType = "all";
let currentStatus = "all";
let currentTag = "all";
let keyword = "";

const listEl = document.getElementById("list");
const countEl = document.getElementById("count");
const tagFilterEl = document.getElementById("tagFilter");
const statusFilterEl = document.getElementById("statusFilter");
const searchEl = document.getElementById("search");
const tagCloudEl = document.getElementById("tagCloud");
const quickStatsEl = document.getElementById("quickStats");
const resetBtn = document.getElementById("resetFilters");

document.getElementById("year").textContent = new Date().getFullYear();

function safeText(s) {
  return (s ?? "").toString();
}
function normalize(s) {
  return safeText(s).trim().toLowerCase();
}
function stars(n) {
  const x = Math.max(0, Math.min(5, Number(n) || 0));
  return "★".repeat(x) + "☆".repeat(5 - x);
}
function parseDate(s) {
  const t = safeText(s).trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildSelectOptions(el, label, values) {
  el.innerHTML =
    `<option value="all">${label}</option>` +
    values.map(v => `<option value="${encodeURIComponent(v)}">${v}</option>`).join("");
}

function buildTagOptions(items) {
  const set = new Set();
  items.forEach(it => (it.tags || []).forEach(t => set.add(safeText(t).trim())));
  const tags = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, "zh"));
  buildSelectOptions(tagFilterEl, "全部标签", tags);
  buildTagCloud(tags);
}

function buildStatusOptions(items) {
  const set = new Set();
  items.forEach(it => {
    const s = safeText(it.status).trim();
    if (s) set.add(s);
  });
  const statuses = Array.from(set).sort((a, b) => a.localeCompare(b, "zh"));
  buildSelectOptions(statusFilterEl, "全部状态", statuses);
}

function buildTagCloud(tags) {
  tagCloudEl.innerHTML = "";
  tags.forEach(t => {
    const b = document.createElement("button");
    b.className = "tag";
    b.type = "button";
    b.textContent = t;
    b.addEventListener("click", () => {
      // 点击侧栏标签：同步到下拉框
      const val = encodeURIComponent(t);
      currentTag = val;
      tagFilterEl.value = val;
      updateTagActive();
      update();
    });
    tagCloudEl.appendChild(b);
  });
  updateTagActive();
}

function updateTagActive() {
  const active = currentTag === "all" ? "" : decodeURIComponent(currentTag);
  Array.from(tagCloudEl.querySelectorAll(".tag")).forEach(btn => {
    btn.classList.toggle("active", btn.textContent === active);
  });
}

function match(it) {
  if (currentType !== "all" && it.type !== currentType) return false;

  if (currentStatus !== "all") {
    const s = decodeURIComponent(currentStatus);
    if (safeText(it.status).trim() !== s) return false;
  }

  if (currentTag !== "all") {
    const t = decodeURIComponent(currentTag);
    const tags = it.tags || [];
    if (!tags.includes(t)) return false;
  }

  if (!keyword) return true;

  const hay = [
    it.title,
    it.creator,
    it.note,
    it.status,
    (it.tags || []).join(" ")
  ].map(normalize).join(" | ");

  return hay.includes(keyword);
}

function render(items) {
  listEl.innerHTML = "";
  countEl.textContent = items.length;

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.style.gridTemplateColumns = "1fr";
    empty.textContent = "没有匹配的记录。试试换个分类/标签/状态或清空搜索词。";
    listEl.appendChild(empty);
    return;
  }

  items.forEach(it => {
    const card = document.createElement("article");
    card.className = "card";

    const cover = document.createElement("div");
    cover.className = "cover";
    if (it.cover) {
      const img = document.createElement("img");
      img.src = it.cover;
      img.alt = safeText(it.title);
      cover.appendChild(img);
    } else {
      cover.textContent = "NO COVER";
    }

    const right = document.createElement("div");

    const h3 = document.createElement("h3");
    h3.textContent = safeText(it.title) || "（未命名）";

    const meta = document.createElement("div");
    meta.className = "small";
    const status = safeText(it.status).trim() || "未标注";
    const date = safeText(it.date).trim();
    const type = TYPE_LABEL[it.type] || it.type;

    meta.innerHTML = `
      <span class="badge">${type}</span>
      <span class="badge">${status}</span>
      ${date ? `<span class="badge">${date}</span>` : ""}
      <div style="margin-top:6px;">${safeText(it.creator)} · ${safeText(it.year)} · ${stars(it.rating)}</div>
    `;

    const note = document.createElement("p");
    note.className = "note";
    note.textContent = safeText(it.note);

    const chips = document.createElement("div");
    chips.className = "chips";
    (it.tags || []).forEach(t => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = safeText(t);
      chips.appendChild(chip);
    });

    right.appendChild(h3);
    right.appendChild(meta);
    if (it.note) right.appendChild(note);
    if ((it.tags || []).length) right.appendChild(chips);

    if (it.link) {
      const a = document.createElement("a");
      a.className = "link";
      a.href = it.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "打开链接";
      right.appendChild(a);
    }

    card.appendChild(cover);
    card.appendChild(right);
    listEl.appendChild(card);
  });
}

function renderQuickStats() {
  const total = allItems.length;
  const done = allItems.filter(x => (safeText(x.status).includes("已")) && parseDate(x.date)).length;

  const byType = { book:0, movie:0, podcast:0, song:0 };
  allItems.forEach(x => { if (byType[x.type] !== undefined) byType[x.type]++; });

  const minutes = allItems.reduce((sum, x) => sum + (Number(x.duration_min) || 0), 0);

  quickStatsEl.innerHTML = `
    <div>总条目：<b>${total}</b></div>
    <div>已完成（有日期）：<b>${done}</b></div>
    <div>书/影/播/歌：<b>${byType.book}</b> / <b>${byType.movie}</b> / <b>${byType.podcast}</b> / <b>${byType.song}</b></div>
    <div>记录的投入时间：<b>${minutes ? minutes + " 分钟" : "（未填写）"}</b></div>
    <div style="margin-top:8px;"><a href="./report.html">→ 打开月报/年报</a></div>
  `;
}

function update() {
  updateTagActive();
  const filtered = allItems
    .filter(match)
    .sort((a, b) => {
      // 优先按 date（完成时间）倒序，其次按 year
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      if (da && db) return db - da;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return (Number(b.year) || 0) - (Number(a.year) || 0);
    });

  render(filtered);
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      currentType = btn.dataset.type;
      update();
    });
  });

  searchEl.addEventListener("input", (e) => {
    keyword = normalize(e.target.value);
    update();
  });

  statusFilterEl.addEventListener("change", (e) => {
    currentStatus = e.target.value;
    update();
  });

  tagFilterEl.addEventListener("change", (e) => {
    currentTag = e.target.value;
    update();
  });

  resetBtn.addEventListener("click", () => {
    currentType = "all";
    currentStatus = "all";
    currentTag = "all";
    keyword = "";
    searchEl.value = "";
    statusFilterEl.value = "all";
    tagFilterEl.value = "all";
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelector('.tab[data-type="all"]').classList.add("active");
    update();
  });
}

fetch("data.json", { cache: "no-store" })
  .then(r => r.json())
  .then(data => {
    allItems = Array.isArray(data) ? data : [];
    buildStatusOptions(allItems);
    buildTagOptions(allItems);
    renderQuickStats();
    bindEvents();
    update();
  })
  .catch(() => {
    listEl.innerHTML = `<div class="card" style="grid-template-columns:1fr;">data.json 读取失败：请确认 JSON 格式正确，并且和 index.html 在同一层级。</div>`;
  });
