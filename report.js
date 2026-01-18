document.getElementById("year").textContent = new Date().getFullYear();

const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const rangeText = document.getElementById("rangeText");
const summaryCards = document.getElementById("summaryCards");
const topTagsEl = document.getElementById("topTags");
const doneListEl = document.getElementById("doneList");
const printBtn = document.getElementById("printBtn");

function safeText(s){ return (s ?? "").toString(); }
function parseDate(s){
  const t = safeText(s).trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}
function pad2(n){ return n.toString().padStart(2,"0"); }

function stars(n){
  const x = Math.max(0, Math.min(5, Number(n) || 0));
  return "★".repeat(x) + "☆".repeat(5 - x);
}

function renderCard(title, value, sub=""){
  return `
    <article class="card" style="grid-template-columns:1fr;">
      <h3 style="margin:0 0 6px;">${title}</h3>
      <div style="font-size:28px;font-weight:800;letter-spacing:0.02em;">${value}</div>
      ${sub ? `<div class="small">${sub}</div>` : ``}
    </article>
  `;
}

function compute(items, year, month){
  // 只统计有 date 的条目（完成事件）
  const withDate = items
    .map(x => ({...x, _d: parseDate(x.date)}))
    .filter(x => x._d);

  const filtered = withDate.filter(x => {
    const y = x._d.getFullYear();
    const m = pad2(x._d.getMonth() + 1);
    if (y !== year) return false;
    if (month === "all") return true;
    return m === month;
  }).sort((a,b)=> b._d - a._d);

  const countByType = { book:0, movie:0, podcast:0, song:0 };
  const ratingSumByType = { book:0, movie:0, podcast:0, song:0 };
  const ratingCntByType = { book:0, movie:0, podcast:0, song:0 };
  let minutes = 0;

  const tagCount = new Map();

  filtered.forEach(x => {
    if (countByType[x.type] !== undefined) countByType[x.type]++;

    const r = Number(x.rating);
    if (!Number.isNaN(r) && ratingCntByType[x.type] !== undefined){
      ratingSumByType[x.type] += r;
      ratingCntByType[x.type] += 1;
    }

    minutes += (Number(x.duration_min) || 0);

    (x.tags || []).forEach(t=>{
      const k = safeText(t).trim();
      if (!k) return;
      tagCount.set(k, (tagCount.get(k) || 0) + 1);
    });
  });

  const total = filtered.length;
  const avgRating = (() => {
    const s = Object.values(ratingSumByType).reduce((a,b)=>a+b,0);
    const c = Object.values(ratingCntByType).reduce((a,b)=>a+b,0);
    return c ? (s/c).toFixed(2) : "—";
  })();

  const topTags = Array.from(tagCount.entries())
    .sort((a,b)=> b[1]-a[1])
    .slice(0, 18);

  return { filtered, total, countByType, avgRating, minutes, topTags };
}

function renderDoneList(items){
  doneListEl.innerHTML = "";
  if (!items.length){
    doneListEl.innerHTML = `<div class="card" style="grid-template-columns:1fr;">本期没有带 date 的记录。</div>`;
    return;
  }
  items.forEach(it=>{
    const card = document.createElement("article");
    card.className = "card";
    const cover = document.createElement("div");
    cover.className = "cover";
    if (it.cover){
      const img = document.createElement("img");
      img.src = it.cover;
      img.alt = safeText(it.title);
      cover.appendChild(img);
    }else{
      cover.textContent = "NO COVER";
    }

    const right = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = safeText(it.title);

    const meta = document.createElement("div");
    meta.className = "small";
    meta.textContent = `${safeText(it.date)} · ${safeText(it.creator)} · ${safeText(it.year)} · ${safeText(it.status)} · ${stars(it.rating)}`;

    const note = document.createElement("p");
    note.className = "note";
    note.textContent = safeText(it.note);

    right.appendChild(h3);
    right.appendChild(meta);
    if (it.note) right.appendChild(note);

    if (it.link){
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
    doneListEl.appendChild(card);
  });
}

function renderTopTags(topTags){
  topTagsEl.innerHTML = "";
  if (!topTags.length){
    topTagsEl.innerHTML = `<span class="chip">（暂无）</span>`;
    return;
  }
  topTags.forEach(([t,c])=>{
    const b = document.createElement("span");
    b.className = "tag";
    b.textContent = `${t} · ${c}`;
    topTagsEl.appendChild(b);
  });
}

function renderSummary(res){
  const { total, countByType, avgRating, minutes } = res;

  summaryCards.innerHTML =
    renderCard("本期完成总数", total, "统计口径：有 date 的条目") +
    renderCard("Books / Movies", `${countByType.book} / ${countByType.movie}`) +
    renderCard("Podcasts / Songs", `${countByType.podcast} / ${countByType.song}`) +
    renderCard("平均评分", avgRating) +
    renderCard("投入时间（分钟）", minutes ? minutes : "—", minutes ? "来自 duration_min 字段" : "未填写 duration_min");
}

function setRangeText(year, month){
  rangeText.textContent = (month === "all") ? `${year} 年（年报）` : `${year}-${month}（月报）`;
}

function init(items){
  // 生成 year 选项：取所有 date 的年份
  const years = Array.from(new Set(
    items.map(x=>parseDate(x.date)).filter(Boolean).map(d=>d.getFullYear())
  )).sort((a,b)=>b-a);

  const currentYear = (new Date()).getFullYear();
  const useYears = years.length ? years : [currentYear];

  yearSelect.innerHTML = useYears.map(y=>`<option value="${y}">${y} 年</option>`).join("");
  yearSelect.value = useYears[0].toString();
  monthSelect.value = "all";

  function rerender(){
    const year = Number(yearSelect.value);
    const month = monthSelect.value;
    setRangeText(year, month);
    const res = compute(items, year, month);
    renderSummary(res);
    renderTopTags(res.topTags);
    renderDoneList(res.filtered);
  }

  yearSelect.addEventListener("change", rerender);
  monthSelect.addEventListener("change", rerender);

  printBtn.addEventListener("click", ()=> window.print());

  rerender();
}

fetch("data.json", { cache: "no-store" })
  .then(r => r.json())
  .then(data => init(Array.isArray(data) ? data : []))
  .catch(() => {
    summaryCards.innerHTML = `<div class="card" style="grid-template-columns:1fr;">data.json 读取失败：请检查 JSON 格式。</div>`;
  });
