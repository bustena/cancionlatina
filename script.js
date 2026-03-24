const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";

const timelineEl = document.getElementById("timeline");
const detailEl = document.getElementById("detail");

let items = [];
let activeIndex = 0;

function normalizeHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapRow(row) {
  const normalized = {};
  for (const key in row) {
    normalized[normalizeHeader(key)] = (row[key] || "").trim();
  }

  return {
    autor: normalized.autor || "",
    titulo: normalized.titulo || "",
    ano: normalized.ano || "",
    pais: normalized.pais || "",
    genero: normalized.genero || "",
    audio: normalized.audio || "",
    imagen: normalized.imagen || "",
    texto: normalized.texto || "",
    color: normalized.color || "#c9b79c"
  };
}

function sortItems(data) {
  return data.sort((a, b) => {
    const yearA = parseInt((a.ano || "").match(/\d{3,4}/)?.[0] || "9999", 10);
    const yearB = parseInt((b.ano || "").match(/\d{3,4}/)?.[0] || "9999", 10);
    return yearA - yearB;
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function (m) {
    return ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[m];
  });
}

function renderTimeline() {
  timelineEl.innerHTML = "";

  items.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `timeline-item${index === activeIndex ? " active" : ""}`;

    const button = document.createElement("button");
    button.className = "timeline-button";

    button.innerHTML = `
      <span class="timeline-year">${escapeHtml(item.ano)}</span>
      <span class="timeline-title">${escapeHtml(item.titulo)}</span>
      <span class="timeline-author">${escapeHtml(item.autor)}</span>
    `;

    button.onclick = () => {
      activeIndex = index;
      renderTimeline();
      renderDetail(items[index]);
    };

    wrapper.appendChild(button);
    timelineEl.appendChild(wrapper);
  });
}

function renderDetail(item) {
  detailEl.classList.remove("empty");
  detailEl.innerHTML = `
    <div class="card">
      <h2>${escapeHtml(item.titulo)}</h2>
      <p>${escapeHtml(item.autor)}</p>
      <p>${escapeHtml(item.texto)}</p>
    </div>
  `;
}

function loadCSV() {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      items = sortItems(results.data.map(mapRow));
      renderTimeline();
      renderDetail(items[0]);
    }
  });
}

loadCSV();
