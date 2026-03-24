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

function escapeAttribute(text) {
  return String(text).replace(/"/g, "&quot;");
}

function hexToRgba(hex, alpha) {
  const clean = (hex || "").replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `rgba(201, 183, 156, ${alpha})`;
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderTimeline() {
  timelineEl.innerHTML = "";

  items.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = `timeline-item${index === activeIndex ? " active" : ""}`;

    const button = document.createElement("button");
    button.className = "timeline-button";
    button.type = "button";
    button.setAttribute("aria-label", `${item.ano} ${item.titulo} ${item.autor}`);

    button.innerHTML = `
      <span class="timeline-year">${escapeHtml(item.ano || "s. f.")}</span>
      <span class="timeline-title">${escapeHtml(item.titulo || "Sin título")}</span>
      <span class="timeline-author">${escapeHtml(item.autor || "")}</span>
    `;

    button.addEventListener("click", () => {
      activeIndex = index;
      renderTimeline();
      renderDetail(items[index]);
    });

    wrapper.appendChild(button);
    timelineEl.appendChild(wrapper);
  });
}

function renderDetail(item) {
  const color = item.color || "#c9b79c";
  const hasImage = Boolean(item.imagen);
  const hasAudio = Boolean(item.audio);

  detailEl.classList.remove("empty");
  detailEl.innerHTML = `
    <article class="card" style="border-top-color: ${escapeHtml(color)};">
      <div class="card-inner">
        <div class="media-column" style="background: ${escapeHtml(hexToRgba(color, 0.20))};">
          ${
            hasImage
              ? `<img src="${escapeAttribute(item.imagen)}" alt="${escapeHtml(item.titulo)}">`
              : `<div class="no-image">Sin imagen</div>`
          }

          ${
            hasAudio
              ? `<div class="audio-wrap">
                   <audio controls preload="none" src="${escapeAttribute(item.audio)}"></audio>
                 </div>`
              : ``
          }
        </div>

        <div class="content-column">
          <div class="meta-top">
            ${item.pais ? `<span class="tag">${escapeHtml(item.pais)}</span>` : ""}
            ${item.genero ? `<span class="tag">${escapeHtml(item.genero)}</span>` : ""}
          </div>

          <h2 class="work-title">${escapeHtml(item.titulo || "Sin título")}</h2>
          <p class="author">${escapeHtml(item.autor || "")}</p>
          <div class="text">${escapeHtml(item.texto || "")}</div>
        </div>
      </div>
    </article>
  `;
}

function showLoading() {
  detailEl.classList.remove("empty");
  detailEl.innerHTML = `<div class="loading">Cargando datos…</div>`;
}

function showError(message) {
  detailEl.classList.remove("empty");
  detailEl.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function loadCSV() {
  showLoading();

  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      if (!results.data || !results.data.length) {
        showError("No se han encontrado datos en la hoja.");
        return;
      }

      items = sortItems(
        results.data
          .map(mapRow)
          .filter(item => item.titulo || item.autor || item.texto)
      );

      if (!items.length) {
        showError("Los datos existen, pero no hay filas válidas para mostrar.");
        return;
      }

      activeIndex = 0;
      renderTimeline();
      renderDetail(items[0]);
    },
    error: function () {
      showError("No se ha podido leer el CSV de Google Sheets.");
    }
  });
}

function lockPageScroll() {
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  const leftScroll = document.getElementById("leftScroll");

  if (!leftScroll) return;

  window.addEventListener(
    "wheel",
    function (e) {
      const isInsideLeft = e.target.closest("#leftScroll");

      if (!isInsideLeft) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener(
    "touchmove",
    function (e) {
      const isInsideLeft = e.target.closest("#leftScroll");

      if (!isInsideLeft) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

loadCSV();
lockPageScroll();
