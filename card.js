const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";

const timelineEl = document.getElementById("timeline");
const cardPreview = document.getElementById("cardPreview");

let items = [];
let activeIndex = 0;
let selectedLayout = "vertical";

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

function hexToRgba(hex, alpha) {
  const clean = String(hex || "").replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `rgba(201, 183, 156, ${alpha})`;
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const item = items[activeIndex];

  if (selectedLayout === "vertical") {
    renderVerticalCard(item);
    return;
  }

  if (selectedLayout === "horizontal") {
    renderHorizontalCard(item);
    return;
  }

  if (selectedLayout === "full") {
    renderFullCard(item);
    return;
  }

  renderVerticalCard(item);
}

function renderVerticalCard(item) {
  if (!item) return;

  cardPreview.innerHTML = `
    <article
      class="vertical-card"
      style="
        --item-color: ${item.color};
        --item-color-soft-top: ${hexToRgba(item.color, 0.30)};
        --item-color-soft-bottom: ${hexToRgba(item.color, 0.18)};
      "
    >
      ${renderImageBox(item, "card-image vertical-image")}

      <h2 class="vertical-author">${escapeHtml(item.autor)}</h2>
      <p class="vertical-title">${escapeHtml(item.titulo)}</p>

      <div class="vertical-meta">
        ${renderTags(item)}
      </div>
    </article>
  `;
}

function renderHorizontalCard(item) {
  if (!item) return;

  cardPreview.innerHTML = `
      <article
        class="horizontal-card"
        style="
          --item-color: ${item.color};
          --item-color-light: ${lightenColor(item.color, 0.86)};
        "
      >
      ${renderImageBox(item, "card-image horizontal-image")}

      <div class="horizontal-content">
        <h2 class="horizontal-author">${escapeHtml(item.autor)}</h2>
        <p class="horizontal-title">${escapeHtml(item.titulo)}</p>

        <div class="horizontal-meta">
          ${renderTags(item)}
        </div>
      </div>
    </article>
  `;
}

function renderFullCard(item) {
  if (!item) return;

  cardPreview.innerHTML = `
      <article
        class="full-card"
        style="
          --item-color: ${item.color};
          --item-color-light: ${lightenColor(item.color, 0.86)};
        "
      >
      <div class="full-content">
        <p class="full-author">${escapeHtml(item.autor)}</p>
        <h2 class="full-title">${escapeHtml(item.titulo)}</h2>

        <div class="full-text">
          ${item.texto || ""}
        </div>

        <div class="full-meta">
          ${renderTags(item)}
        </div>
      </div>

      <div class="full-media">
        ${renderImageBox(item, "card-image full-image")}

        <div class="fake-player">
          <div class="fake-controls">
            <div class="fake-play">▶</div>
          </div>

          <div class="fake-progress-wrap">
            <div class="fake-progress-bar">
              <div class="fake-progress-fill"></div>
            </div>

            <div class="fake-time">0:00</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function bindLayoutButtons() {
  document.querySelectorAll("[data-layout]").forEach(button => {
    button.onclick = () => {
      selectedLayout = button.dataset.layout;

      document.querySelectorAll("[data-layout]").forEach(btn => {
        btn.classList.toggle("active", btn === button);
      });

      renderCurrentCard();
    };
  });
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function renderImageBox(item, className) {
  if (!item.imagen) {
    return `<div class="${className} no-card-image">Sin imagen</div>`;
  }

  return `
    <div
      class="${className}"
      style="background-image: url('${item.imagen}');"
      role="img"
      aria-label="${escapeHtml(item.titulo || "Imagen")}"
    ></div>
  `;
}

function downloadCard() {
  const card = cardPreview.querySelector("article");
  const item = items[activeIndex];

  if (!card || !item) return;

  html2canvas(card, {
    backgroundColor: null,
    scale: 2,
    useCORS: true
  }).then(canvas => {
    const link = document.createElement("a");
    const filename = [
      "card",
      selectedLayout,
      slugify(item.autor),
      slugify(item.titulo)
    ].filter(Boolean).join("-");

    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

async function downloadAllCards() {
  const zip = new JSZip();

  const originalIndex = activeIndex;

  const downloadAllButton = document.getElementById("downloadAllButton");

  if (downloadAllButton) {
    downloadAllButton.disabled = true;
    downloadAllButton.textContent = "Generando ZIP...";
  }

  try {
    for (let i = 0; i < items.length; i++) {
      activeIndex = i;

      renderTimeline();
      renderCurrentCard();

      await new Promise(resolve => setTimeout(resolve, 150));

      const card = cardPreview.querySelector("article");
      const item = items[i];

      const canvas = await html2canvas(card, {
        backgroundColor: null,
        scale: 2,
        useCORS: true
      });

      const dataUrl = canvas.toDataURL("image/png");

      const base64 = dataUrl.split(",")[1];

      const filename = [
        selectedLayout,
        slugify(item.autor),
        slugify(item.titulo)
      ].filter(Boolean).join("-");

      zip.file(`${filename}.png`, base64, {
        base64: true
      });
    }

    const content = await zip.generateAsync({
      type: "blob"
    });

    const url = URL.createObjectURL(content);

    const link = document.createElement("a");

    link.href = url;
    link.download = `card-${selectedLayout}.zip`;

    link.click();

    URL.revokeObjectURL(url);
  }
  finally {
    activeIndex = originalIndex;

    renderTimeline();
    renderCurrentCard();

    if (downloadAllButton) {
      downloadAllButton.disabled = false;
      downloadAllButton.textContent = "Descargar todas";
    }
  }
}

function bindDownloadButton() {
  const downloadButton = document.getElementById("downloadButton");

  if (downloadButton) {
    downloadButton.onclick = downloadCard;
  }
}

function bindDownloadAllButton() {
  const button = document.getElementById("downloadAllButton");

  if (button) {
    button.onclick = downloadAllCards;
  }
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
      bindLayoutButtons();
      bindDownloadButton();
      bindDownloadAllButton();
    },

    error() {
      cardPreview.textContent = "Error cargando el CSV.";
    }
  });
}

loadCSV();
