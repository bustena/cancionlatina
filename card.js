const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";

const timelineEl = document.getElementById("timeline");
const cardPreview = document.getElementById("cardPreview");

let items = [];
let activeIndex = 0;

function normalizeHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeColor(value) {
  const raw = String(value || "").trim();

  if (!raw) return "#8b6a43";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;

  return "#8b6a43";
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, function (m) {
    return ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[m];
  });
}

function mapRow(row) {
  const normalized = {};

  for (const key in row) {
    normalized[normalizeHeader(key)] = String(row[key] || "").trim();
  }

  return {
    autor: normalized.autor || "",
    titulo: normalized.titulo || "",
    ano: normalized.ano || "",
    pais: normalized.pais || "",
    ritmo: normalized.ritmo || "",
    genero: normalized.genero || "",
    audio: normalized.audio || "",
    imagen: normalized.imagen || "",
    texto: normalized.texto || "",
    color: normalizeColor(normalized.color)
  };
}

function sortItems(data) {
  return data.sort((a, b) => {
    const yearA = parseInt((a.ano || "").match(/\d{3,4}/)?.[0] || "9999", 10);
    const yearB = parseInt((b.ano || "").match(/\d{3,4}/)?.[0] || "9999", 10);
    return yearA - yearB;
  });
}

function extractFlagEmoji(pais) {
  if (!pais) return "";
  return pais.trim().split(" ")[0];
}

function parseGenres(value) {
  return String(value || "")
    .split(";")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function renderTimeline() {
  timelineEl.innerHTML = `
    <div class="timeline-list">
      ${items.map((item, index) => `
        <div
          class="timeline-item ${index === activeIndex ? "active" : ""}"
          style="--item-color: ${item.color};"
        >
          <button
            type="button"
            class="timeline-button"
            data-index="${index}"
          >
            <span class="timeline-year">
              ${escapeHtml(item.ano || "s. f.")}
              <span>${escapeHtml(extractFlagEmoji(item.pais))}</span>
            </span>
            <span class="timeline-title">${escapeHtml(item.titulo || "Sin título")}</span>
            <span class="timeline-author">${escapeHtml(item.autor || "")}</span>
          </button>
        </div>
      `).join("")}
    </div>
  `;

  timelineEl.querySelectorAll("[data-index]").forEach(button => {
    button.onclick = () => {
      activeIndex = Number(button.dataset.index);
      renderTimeline();
      renderCurrentCard();
    };
  });
}

function renderTags(item) {
  const tags = [
    item.ano,
    item.pais,
    item.ritmo,
    ...parseGenres(item.genero)
  ].filter(Boolean);

  return tags.map(tag => `
    <span class="card-tag">${escapeHtml(tag)}</span>
  `).join("");
}

function renderCurrentCard() {
  renderVerticalCard(items[activeIndex]);
}

function renderVerticalCard(item) {
  if (!item) return;

  cardPreview.innerHTML = `
    <article class="vertical-card" style="--item-color: ${item.color};">
      ${
        item.imagen
          ? `<img src="${item.imagen}" alt="${escapeHtml(item.titulo || "Imagen")}">`
          : `<div class="no-image">Sin imagen</div>`
      }

      <h2 class="vertical-author">${escapeHtml(item.autor)}</h2>
      <p class="vertical-title">${escapeHtml(item.titulo)}</p>

      <div class="vertical-meta">
        ${renderTags(item)}
      </div>
    </article>
  `;
}

function loadCSV() {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete(results) {
      items = sortItems(
        results.data
          .map(mapRow)
          .filter(item => item.autor || item.titulo || item.imagen)
      );

      if (!items.length) {
        cardPreview.textContent = "No se han encontrado datos.";
        timelineEl.textContent = "";
        return;
      }

      activeIndex = 0;
      renderTimeline();
      renderCurrentCard();
    },

    error() {
      cardPreview.textContent = "Error cargando el CSV.";
    }
  });
}

loadCSV();
