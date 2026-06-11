const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";

const itemSelect = document.getElementById("itemSelect");
const cardPreview = document.getElementById("cardPreview");

let items = [];

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

function renderSelect() {
  itemSelect.innerHTML = items.map((item, index) => `
    <option value="${index}">
      ${escapeHtml(item.autor)} — ${escapeHtml(item.titulo)}
    </option>
  `).join("");

  itemSelect.onchange = () => {
    const item = items[Number(itemSelect.value)];
    renderVerticalCard(item);
  };
}

function renderTags(item) {
  const tags = [
    item.ano,
    item.pais,
    item.ritmo,
    item.genero
  ].filter(Boolean);

  return tags.map(tag => `
    <span class="vertical-tag">${escapeHtml(tag)}</span>
  `).join("");
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
      items = results.data
        .map(mapRow)
        .filter(item => item.autor || item.titulo || item.imagen);

      if (!items.length) {
        cardPreview.textContent = "No se han encontrado datos.";
        itemSelect.innerHTML = `<option>Sin datos</option>`;
        return;
      }

      renderSelect();
      renderVerticalCard(items[0]);
    },

    error() {
      cardPreview.textContent = "Error cargando el CSV.";
      itemSelect.innerHTML = `<option>Error</option>`;
    }
  });
}

loadCSV();
