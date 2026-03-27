const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";

const timelineEl = document.getElementById("timeline");
const detailEl = document.getElementById("detail");

let items = [];
let activeIndex = 0;
let activeFilter = null;

function normalizeHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeaderLabel(header) {
  if (header === "pais") return "País";
  if (header === "genero") return "Género";
  return header;
}

function normalizeColor(value) {
  const raw = String(value || "").trim();
  if (!raw) return "#c9b79c";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  return "#c9b79c";
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

function escapeAttribute(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
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

function normalizeFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}

function parseGenres(value) {
  return String(value || "")
    .split(";")
    .map(part => part.trim())
    .filter(Boolean);
}

function getFilteredItems() {
  if (!activeFilter) return items;

  if (activeFilter.type === "pais") {
    return items.filter(item => normalizeFilterValue(item.pais) === activeFilter.value);
  }

  if (activeFilter.type === "genero") {
    return items.filter(item =>
      parseGenres(item.genero).some(genre => normalizeFilterValue(genre) === activeFilter.value)
    );
  }

  return items;
}

function isFilterActive(type, label) {
  return Boolean(
    activeFilter &&
    activeFilter.type === type &&
    activeFilter.value === normalizeFilterValue(label)
  );
}

function setFilter(type, label) {
  const value = normalizeFilterValue(label);
  if (!value) return;

  const previousIndex = activeIndex;
  const previousItem = items[previousIndex];

  if (activeFilter && activeFilter.type === type && activeFilter.value === value) {
    activeFilter = null;
  } else {
    activeFilter = {
      type,
      value,
      label: String(label || "").trim()
    };
  }

  const filteredItems = getFilteredItems();

  if (!filteredItems.length) {
    renderTimeline();
    renderCurrentDetail();
    return;
  }

  const currentStillVisible = filteredItems.includes(previousItem);

  if (currentStillVisible) {
    activeIndex = previousIndex;
    renderTimeline();
    bindFilterTagEventsInDetail();
  } else {
    activeIndex = items.indexOf(filteredItems[0]);
    renderTimeline();
    renderCurrentDetail();
  }
}

function bindFilterTagEventsInDetail() {
  detailEl.querySelectorAll(".filter-tag").forEach(tag => {
    tag.onclick = () => {
      const type = tag.dataset.filterType;
      const value = tag.dataset.filterValue;
      setFilter(type, value);
    };
  });

  detailEl.querySelectorAll(".filter-tag").forEach(tag => {
    const type = tag.dataset.filterType;
    const value = tag.dataset.filterValue;
    const isActive = activeFilter &&
      activeFilter.type === type &&
      activeFilter.value === normalizeFilterValue(value);

    tag.classList.toggle("active", Boolean(isActive));
    tag.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderFilterBanner() {
  if (!activeFilter) return "";

  return `
    <div class="active-filter-banner">
      <span class="active-filter-text">
        Mostrando: <strong>${escapeHtml(activeFilter.label)}</strong>
        <span class="active-filter-kind">(${escapeHtml(normalizeHeaderLabel(activeFilter.type))})</span>
      </span>
      <button type="button" class="clear-filter-button" id="clearFilterButton">Ver todo</button>
    </div>
  `;
}

function renderTimeline() {
  const filteredItems = getFilteredItems();

  timelineEl.innerHTML = `
    ${renderFilterBanner()}
    <div class="timeline-list"></div>
  `;

  const timelineListEl = timelineEl.querySelector(".timeline-list");

  if (!filteredItems.length) {
    timelineListEl.innerHTML = `<div class="timeline-empty">No hay elementos para este filtro.</div>`;
  } else {
    filteredItems.forEach((item) => {
      const originalIndex = items.indexOf(item);
      const wrapper = document.createElement("div");
      wrapper.className = `timeline-item${originalIndex === activeIndex ? " active" : ""}`;
      wrapper.style.setProperty("--item-color", item.color || "#c9b79c");

      const button = document.createElement("button");
      button.className = "timeline-button";
      button.type = "button";
      button.setAttribute("aria-label", `${item.ano} ${item.titulo} ${item.autor}`.trim());

      button.innerHTML = `
        <span class="timeline-year">${escapeHtml(item.ano || "s. f.")}</span>
        <span class="timeline-title">${escapeHtml(item.titulo || "Sin título")}</span>
        <span class="timeline-author">${escapeHtml(item.autor || "")}</span>
      `;

      button.onclick = () => {
        activeIndex = originalIndex;
        renderTimeline();
        renderDetail(items[originalIndex]);
      };

      wrapper.appendChild(button);
      timelineListEl.appendChild(wrapper);
    });
  }

  const clearButton = document.getElementById("clearFilterButton");
  if (clearButton) {
    clearButton.onclick = () => {
      activeFilter = null;
      renderTimeline();
      renderCurrentDetail();
    };
  }
}

function renderCountryTag(country) {
  const activeClass = isFilterActive("pais", country) ? " active" : "";
  return `
    <button
      type="button"
      class="tag filter-tag country-tag${activeClass}"
      data-filter-type="pais"
      data-filter-value="${escapeAttribute(country)}"
      aria-pressed="${isFilterActive("pais", country) ? "true" : "false"}"
    >
      ${escapeHtml(country)}
    </button>
  `;
}

function renderGenreTags(value) {
  return parseGenres(value)
    .map(genre => {
      const activeClass = isFilterActive("genero", genre) ? " active" : "";
      return `
        <button
          type="button"
          class="tag filter-tag genre-tag${activeClass}"
          data-filter-type="genero"
          data-filter-value="${escapeAttribute(genre)}"
          aria-pressed="${isFilterActive("genero", genre) ? "true" : "false"}"
        >
          ${escapeHtml(genre)}
        </button>
      `;
    })
    .join("");
}

function bindFilterTagEvents() {
  bindFilterTagEventsInDetail();
}

function renderDetail(item) {
  const color = item.color || "#c9b79c";
  const hasImage = Boolean(item.imagen);
  const hasAudio = Boolean(item.audio);
  const countryTag = item.pais ? renderCountryTag(item.pais) : "";
  const genreTags = item.genero ? renderGenreTags(item.genero) : "";

  detailEl.classList.remove("empty");
  detailEl.innerHTML = `
    <article class="card" style="--accent: ${escapeHtml(color)};">
      <div class="card-inner">
        <div class="media-column" style="background: ${hexToRgba(color, 0.08)};">
          ${
            hasImage
              ? `<img src="${escapeAttribute(item.imagen)}" alt="${escapeHtml(item.titulo || "Imagen")}">`
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
          <p class="author">${escapeHtml(item.autor || "")}</p>
          <h2 class="work-title">${escapeHtml(item.titulo || "Sin título")}</h2>
          <div class="text">${item.texto || ""}</div>

          <div class="meta-bottom">
            ${countryTag}
            ${genreTags}
          </div>
        </div>
      </div>
    </article>
  `;

  bindFilterTagEvents();
}

function renderCurrentDetail() {
  const filteredItems = getFilteredItems();

  if (!filteredItems.length) {
    detailEl.classList.remove("empty");
    detailEl.innerHTML = `<div class="error">No hay elementos para este filtro.</div>`;
    return;
  }

  if (!filteredItems.includes(items[activeIndex])) {
    activeIndex = items.indexOf(filteredItems[0]);
  }

  renderDetail(items[activeIndex]);
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
          .filter(item => item.titulo || item.autor || item.texto || item.imagen || item.audio)
      );

      if (!items.length) {
        showError("Los datos existen, pero no hay filas válidas para mostrar.");
        return;
      }

      activeFilter = null;
      activeIndex = 0;
      renderTimeline();
      renderCurrentDetail();
    },
    error: function () {
      showError("No se ha podido leer el CSV de Google Sheets.");
    }
  });
}

loadCSV();
