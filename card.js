const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";
const HOME_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=1844389020&single=true&output=csv";

const timelineEl = document.getElementById("timeline");
const cardPreview = document.getElementById("cardPreview");

let items = [];
let activeIndex = 0;
let selectedLayout = "vertical";
let currentView = "card";

let homeMeta = null;

function mapHomeRow(row) {
  const normalized = {};

  for (const key in row) {
    normalized[normalizeHeader(key)] = String(row[key] || "").trim();
  }

  return {
    titulo: normalized.titulo || "",
    subtitulo: normalized.subtitulo || "",
    fondo: normalizeColor(normalized.fondo),
    texto: normalizeColor(normalized.texto),
    destacado: normalizeColor(normalized.destacado)
  };
}

function applyHomeTheme() {
  const fondo = homeMeta?.fondo || "#efefef";
  const texto = homeMeta?.texto || "#222222";
  const destacado = homeMeta?.destacado || "#8b6a43";

  document.documentElement.style.setProperty("--app-bg", fondo);
  document.documentElement.style.setProperty("--app-text", texto);
  document.documentElement.style.setProperty("--app-accent", destacado);
}

function applyFavicon() {
  if (!homeMeta?.icono) return;

  const favicon = document.getElementById("favicon");

  if (favicon) {
    favicon.href = homeMeta.icono;
  }
}

function normalizeHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getExportTarget() {
  return cardPreview.querySelector("[data-export]");
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

function darkenColor(hex, factor = 0.18) {
  const color = String(hex || "").replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(color)) {
    return "#4b5563";
  }

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const nr = Math.round(r * (1 - factor));
  const ng = Math.round(g * (1 - factor));
  const nb = Math.round(b * (1 - factor));

  return "#" +
    nr.toString(16).padStart(2, "0") +
    ng.toString(16).padStart(2, "0") +
    nb.toString(16).padStart(2, "0");
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

function getTopCountries(limit = 6) {
  const counts = new Map();

  items.forEach(item => {
    const country = String(item.pais || "").trim();
    if (!country) return;
    counts.set(country, (counts.get(country) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(entry => entry[0]);
}

function getTopRhythms(limit = 6) {
  const counts = new Map();

  items.forEach(item => {
    const rhythm = String(item.ritmo || "").trim();
    if (!rhythm) return;
    counts.set(rhythm, (counts.get(rhythm) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(entry => entry[0]);
}

function getTopGenres(limit = 6) {
  const counts = new Map();

  items.forEach(item => {
    parseGenres(item.genero).forEach(genre => {
      if (!genre) return;
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(entry => entry[0]);
}

function renderCardHome() {
  currentView = "card-home";

  const topCountries = getTopCountries(6);
  const topRhythms = getTopRhythms(6);
  const topGenres = getTopGenres(6);

  const countryButtons = topCountries.map(country => `
    <button
      type="button"
      class="tag filter-tag home-tag"
      data-card-home-action="pais"
      data-card-home-value="${escapeHtml(country)}"
    >
      ${escapeHtml(country)}
    </button>
  `).join("");

  const rhythmButtons = topRhythms.map(rhythm => `
    <button
      type="button"
      class="tag filter-tag home-tag"
      data-card-home-action="ritmo"
      data-card-home-value="${escapeHtml(rhythm)}"
    >
      ${escapeHtml(rhythm)}
    </button>
  `).join("");

  const genreButtons = topGenres.map(genre => `
    <button
      type="button"
      class="tag filter-tag home-tag"
      data-card-home-action="genero"
      data-card-home-value="${escapeHtml(genre)}"
    >
      ${escapeHtml(genre)}
    </button>
  `).join("");

  cardPreview.innerHTML = `
    <article class="card home-card" data-export style="--accent: #8b6a43;">
      <div class="card-inner">
        <div class="media-column home-media">
          <div class="home-branding">
            <h1 class="home-title">CARD</h1>
            <p class="home-subtitle">
              Generador de tarjetas para la canción latinoamericana.
            </p>
          </div>
        </div>
  
        <div class="content-column home-content">
          <div class="home-section">
            <h3 class="home-section-title">Explorar por país</h3>
            <div class="home-tags">${countryButtons}</div>
          </div>
  
          <div class="home-section">
            <h3 class="home-section-title">Explorar por ritmo</h3>
            <div class="home-tags">${rhythmButtons}</div>
          </div>
  
          <div class="home-section">
            <h3 class="home-section-title">Explorar por género</h3>
            <div class="home-tags">${genreButtons}</div>
          </div>
  
          <div class="home-section home-random">
            <div class="home-tags">
              <button class="tag home-tag" data-card-random>
                Descubrir al azar
              </button>
            </div>
          </div>
  
          <div class="home-section home-mockups">
            <button type="button" class="home-return-button-static" data-show-timeline-home>
              Ver HOME de TIMELINE
            </button>
  
            <button type="button" class="home-return-button-static" data-show-test-home>
              Ver HOME de TEST
            </button>
          </div>
        </div>
      </div>
    </article>
  `;

  bindCardHomeEvents();
}

function bindCardHomeEvents() {
  cardPreview.querySelectorAll("[data-card-home-action]").forEach(button => {
    button.onclick = () => {
      const type = button.dataset.cardHomeAction;
      const value = button.dataset.cardHomeValue;

      const candidates = items.filter(item => {
        if (type === "pais") return item.pais === value;
        if (type === "ritmo") return item.ritmo === value;
        if (type === "genero") return parseGenres(item.genero).includes(value);
        return false;
      });

      if (!candidates.length) return;

      activeIndex = items.indexOf(candidates[0]);
      renderTimeline();
      renderCurrentCard();
    };
  });

  const randomButton = cardPreview.querySelector("[data-card-random]");
  
  if (randomButton) {
    randomButton.onclick = () => {
      if (!items.length) return;
  
      activeIndex = Math.floor(Math.random() * items.length);
  
      renderTimeline();
      renderCurrentCard();
    };
  }

  const timelineHomeButton = cardPreview.querySelector("[data-show-timeline-home]");

  if (timelineHomeButton) {
    timelineHomeButton.onclick = () => {
      renderTimelineHomeMockup();
    };
  } 
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
  currentView = "card";
  
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
      data-export
      style="
        --item-color: ${item.color};
        --item-color-soft-top: ${hexToRgba(item.color, 0.75)};
        --item-color-soft-bottom: ${hexToRgba(item.color, 0.45)};
      "
    >
      ${renderImageBox(item, "card-image vertical-image")}

      <div class="vertical-info">
        <h2 class="vertical-author">${escapeHtml(item.autor)}</h2>
        <p class="vertical-title">${escapeHtml(item.titulo)}</p>
      
        <div class="vertical-meta">
          ${renderTags(item)}
        </div>
      </div>
    </article>
  `;
}

function renderHorizontalCard(item) {
  if (!item) return;

  cardPreview.innerHTML = `
      <article
        class="horizontal-card"
        data-export
        style="
          --item-color: ${darkenColor(item.color, 0.18)};
        "
      >
      
      ${renderImageBox(item, "card-image horizontal-image")}

      <div class="horizontal-content">
      
        <h2 class="spotify-title">
          ${escapeHtml(item.titulo)}
        </h2>
      
        <p class="spotify-author">
          ${escapeHtml(item.autor)}
        </p>
      
        <div class="spotify-meta">
        
          ${item.ano ? `
            <span class="spotify-pill">
              ${escapeHtml(item.ano)}
            </span>
          ` : ""}
        
          ${item.pais ? `
            <span class="spotify-pill">
              ${escapeHtml(item.pais)}
            </span>
          ` : ""}
        
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
        data-export
        style="
          --item-color: ${item.color};
          --item-color-soft-top: ${hexToRgba(item.color, 0.75)};
          --item-color-soft-bottom: ${hexToRgba(item.color, 0.45)};
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

function renderTimelineHomeMockup() {
  currentView = "timeline-home";

  const meta = homeMeta || {};

  cardPreview.innerHTML = `
    <article class="card home-card" data-export style="--accent: #8b6a43;">
      <div class="card-inner">

        <div class="media-column home-media">
          <div class="home-branding">
            <h1 class="home-title">
              ${escapeHtml(meta.titulo || "Canción latina")}
            </h1>

            <p class="home-subtitle">
              ${escapeHtml(
                meta.subtitulo ||
                "Una cronología sonora para explorar obras, autores, países y géneros."
              )}
            </p>
          </div>
        </div>

        <div class="content-column home-content">

          <div class="home-section">
            <h3 class="home-section-title">Explorar por país</h3>

            <div class="home-tags">
              <span class="tag home-tag">Cuba</span>
              <span class="tag home-tag">México</span>
              <span class="tag home-tag">Brasil</span>
              <span class="tag home-tag">Argentina</span>
              <span class="tag home-tag">Chile</span>
              <span class="tag home-tag">Perú</span>
            </div>
          </div>

          <div class="home-section">
            <h3 class="home-section-title">Explorar por ritmo</h3>

            <div class="home-tags">
              <span class="tag home-tag">Bolero</span>
              <span class="tag home-tag">Son</span>
              <span class="tag home-tag">Tango</span>
              <span class="tag home-tag">Vals</span>
              <span class="tag home-tag">Samba</span>
              <span class="tag home-tag">Ranchera</span>
            </div>
          </div>

          <div class="home-section">
            <h3 class="home-section-title">Explorar por género</h3>

            <div class="home-tags">
              <span class="tag home-tag">Romántica</span>
              <span class="tag home-tag">Tradicional</span>
              <span class="tag home-tag">Folclórica</span>
              <span class="tag home-tag">Urbana</span>
            </div>
          </div>

          <div class="home-section home-random">
            <div class="home-tags">
              <span class="tag home-tag">
                Descubrir al azar
              </span>
            </div>
          </div>

          <p class="home-note">
            También puedes entrar desde la línea de tiempo de la izquierda.
          </p>

        </div>
      </div>
    </article>
  `;

    cardPreview.innerHTML = `
    <div class="export-view-wrap">
      <article class="card home-card" data-export style="--accent: #8b6a43;">
        ...
      </article>
  
      <button class="outside-home-button" data-return-home>
        Inicio
      </button>
    </div>
  `;

  const backButton = cardPreview.querySelector("[data-return-home]");

  if (backButton) {
    backButton.onclick = () => {
      renderCardHome();
    };
  }
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
  const card = getExportTarget();
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
      renderCardHome();
      bindLayoutButtons();
      bindDownloadButton();
      bindDownloadAllButton();
    },

    error() {
      cardPreview.textContent = "Error cargando el CSV.";
    }
  });
}

function loadHomeCSV() {
  return new Promise((resolve) => {
    Papa.parse(HOME_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,

      complete(results) {
        if (results.data && results.data.length) {
          homeMeta = mapHomeRow(results.data[0]);
          applyHomeTheme();
        }

        resolve();
      },

      error() {
        resolve();
      }
    });
  });
}

loadHomeCSV().then(() => {
  loadCSV();
});
