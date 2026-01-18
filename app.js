const TYPE_LABEL = {
  all: "全部",
  book: "书",
  movie: "电影",
  podcast: "播客",
  song: "歌曲"
};

let allItems = [];
let currentType = "all";
let currentTag = "all";
let keyword = "";

const listEl = document.getElementById("list");
const countEl = document.getElementById("count");
const tagFilterEl = document.getElementById("tagFilter");
const searchEl = document.getElementById("search");

document.getElementById("year").textContent = new Date().getFullYear();

function safeText(s) {
  return (s ?? "").toString();
}

function stars(n) {
  const x = Math.max(0, Math.min(5, Number(n) || 0));
  return "★".repeat(x) + "☆".repeat(5 - x);
}

function normalize(s) {
  return safeText(s).trim().toLowerCase();
}

function buildTagOptions(items) {
  const set = new Set();
  items.forEach(it => (it.tags || []).forEach(t => set.add(safeText(t))));
  const tags = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, "zh"));
  // reset
  tagFilterEl.innerHTML = `<option value="all">全部标签</option>` +
    tags.map(t => `<option value="${encodeURIComponent(t)}">${t}</option>`).join("");
}

function match(it) {
  if (currentType !== "all" && it.type !== currentType) return false;
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
    empty.textContent = "没有匹配的记录。试试换个分类/标签或清空搜索词。";
    listEl.appendChild(empty);
    return;
  }

  items.forEach(it => {
    const card = document.createElement("article");
    card.className = "card";

    const h3 = document.createElement("h3");
    h3.textContent = safeText(it.title) || "（未命名）";

    const meta = document.createElement("div");
    meta.className = "small";
    meta.textContent = `${TYPE_LABEL[it.type] || it.type} · ${safeText(it.creator)} · ${safeText(it.year)} · ${stars(it.rating)}`;

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

    card.appendChild(h3);
    card.appendChild(meta);
    if (it.note) card.appendChild(note);
    if ((it.tags || []).length) card.appendChild(chips);

    if (it.link) {
      const a = document.createElement("a");
      a.className = "link";
      a.href = it.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "打开链接";
      card.appendChild(a);
    }

    listEl.appendChild(card);
  });
}

function update() {
  const filtered = allItems.filter(match)
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
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

  tagFilterEl.addEventListener("change", (e) => {
    currentTag = e.target.value;
    update();
  });
}

fetch("data.json", { cache: "no-store" })
  .then(r => r.json())
  .then(data => {
    allItems = Array.isArray(data) ? data : [];
    buildTagOptions(allItems);
    bindEvents();
    update();
  })
  .catch(() => {
    listEl.innerHTML = `<div class="card">data.json 读取失败。请确认文件名、JSON 格式是否正确，并且和 index.html 在同一层级。</div>`;
  });
