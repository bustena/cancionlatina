const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";

const timelineEl = document.getElementById("timeline");
const detailEl = document.getElementById("detail");
const filterBarEl = document.getElementById("filterBar");

let items = [];
let activeIndex = 0;
let activeFilter = null;

const audioPlayer = new Audio();

let isShuffle = false;
let isPlaying = false;
let loadedTrackIndex = null;

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

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function loadTrack(index) {
  const item = items[index];
  if (!item || !item.audio) return false;

  if (loadedTrackIndex !== index) {
    audioPlayer.src = item.audio;
    loadedTrackIndex = index;
  }

  return true;
}

function goToTrack(newIndex, autoplay = false) {
  if (newIndex < 0 || newIndex >= items.length) return;
  if (!items[newIndex] || !items[newIndex].audio) return;

  activeIndex = newIndex;
  renderTimeline();
  renderDetail(items[activeIndex]);

  loadTrack(activeIndex);

  if (autoplay) {
    audioPlayer.play()
      .then(() => {
        isPlaying = true;
        updatePlayerUI();
      })
      .catch(() => {
        isPlaying = false;
        updatePlayerUI();
      });
  } else {
    updatePlayerUI();
  }
}

function getNextTrackIndex() {
  const filteredItems = getFilteredItems().filter(item => item.audio);
  if (filteredItems.length <= 1) return null;

  const currentItem = items[activeIndex];
  const currentFilteredIndex = filteredItems.indexOf(currentItem);

  if (currentFilteredIndex === -1) {
    return items.indexOf(filteredItems[0]);
  }

  if (isShuffle) {
    const candidates = filteredItems.filter(item => item !== currentItem);
    if (!candidates.length) return null;

    const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
    return items.indexOf(randomItem);
  }

  const nextFilteredIndex = currentFilteredIndex + 1;

  if (nextFilteredIndex >= filteredItems.length) {
    return null;
  }

  return items.indexOf(filteredItems[nextFilteredIndex]);
}

function getPreviousTrackIndex() {
  const filteredItems = getFilteredItems().filter(item => item.audio);
  if (!filteredItems.length) return null;

  const currentItem = items[activeIndex];
  const currentFilteredIndex = filteredItems.indexOf(currentItem);

  if (currentFilteredIndex === -1) {
    return items.indexOf(filteredItems[0]);
  }

  if (audioPlayer.currentTime > 3) {
    return activeIndex;
  }

  const previousFilteredIndex = currentFilteredIndex - 1;

  if (previousFilteredIndex < 0) {
    return null;
  }

  return items.indexOf(filteredItems[previousFilteredIndex]);
}

function playNextTrack(autoplay = true) {
  const nextIndex = getNextTrackIndex();
  if (nextIndex === null) {
    isPlaying = false;
    updatePlayerUI();
    return;
  }

  goToTrack(nextIndex, autoplay);
}

function playPreviousTrack(autoplay = true) {
  const previousIndex = getPreviousTrackIndex();
  if (previousIndex === null) {
    return;
  }

  if (previousIndex === activeIndex) {
    audioPlayer.currentTime = 0;

    if (autoplay && audioPlayer.paused) {
      audioPlayer.play()
        .then(() => {
          isPlaying = true;
          updatePlayerUI();
        })
        .catch(() => {
          isPlaying = false;
          updatePlayerUI();
        });
    } else {
      updatePlayerUI();
    }

    return;
  }

  goToTrack(previousIndex, autoplay);
}

function updatePlayerUI() {
  const playBtn = detailEl.querySelector(".play-btn");
  const shuffleBtn = detailEl.querySelector(".shuffle-btn");
  const progressFill = detailEl.querySelector(".progress-fill");
  const progressBar = detailEl.querySelector(".progress-bar");
  const currentTimeEl = detailEl.querySelector(".time-current");

if (playBtn) {
  playBtn.innerHTML = isPlaying
    ? `<svg viewBox="0 0 24 24" class="icon play-icon">
         <path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" class="icon play-icon">
         <path d="M8 5v14l11-7z" fill="currentColor"/>
       </svg>`;

  playBtn.setAttribute("aria-label", isPlaying ? "Pausar" : "Reproducir");
  playBtn.setAttribute("title", isPlaying ? "Pausar" : "Reproducir");
}

  if (shuffleBtn) {
    shuffleBtn.classList.toggle("active", isShuffle);
    shuffleBtn.setAttribute("aria-pressed", isShuffle ? "true" : "false");
  }

  const duration = audioPlayer.duration || 0;
  const currentTime = audioPlayer.currentTime || 0;
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }

  if (progressBar) {
    progressBar.setAttribute("aria-valuenow", String(Math.round(percent)));
    progressBar.setAttribute("aria-valuetext", `${formatTime(currentTime)} transcurridos`);
  }

  if (currentTimeEl) {
    currentTimeEl.textContent = formatTime(currentTime);
  }
}

function togglePlayPause() {
  const item = items[activeIndex];
  if (!item || !item.audio) return;

  if (loadedTrackIndex !== activeIndex) {
    const ok = loadTrack(activeIndex);
    if (!ok) return;
  }

  if (audioPlayer.paused) {
    audioPlayer.play()
      .then(() => {
        isPlaying = true;
        updatePlayerUI();
      })
      .catch(() => {
        isPlaying = false;
        updatePlayerUI();
      });
  } else {
    audioPlayer.pause();
    isPlaying = false;
    updatePlayerUI();
  }
}

function bindPlayerControls() {
  const playBtn = detailEl.querySelector(".play-btn");
  const prevBtn = detailEl.querySelector(".prev-btn");
  const nextBtn = detailEl.querySelector(".next-btn");
  const shuffleBtn = detailEl.querySelector(".shuffle-btn");
  const progressBar = detailEl.querySelector(".progress-bar");

  if (playBtn) {
    playBtn.onclick = () => {
      togglePlayPause();
    };
  }

  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      isShuffle = !isShuffle;
      updatePlayerUI();
    };
  }

  if (progressBar) {
    progressBar.onclick = (event) => {
      const rect = progressBar.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const duration = audioPlayer.duration || 0;

      if (duration > 0) {
        audioPlayer.currentTime = Math.max(0, Math.min(duration, ratio * duration));
        updatePlayerUI();
      }
    };
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      playPreviousTrack(isPlaying);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      playNextTrack(isPlaying || !audioPlayer.paused);
    };
  }

  updatePlayerUI();
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

function getCurrentFilteredIndex() {
  const filteredItems = getFilteredItems();
  const currentItem = items[activeIndex];
  return filteredItems.indexOf(currentItem);
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

function renderFilterBar() {
  if (!activeFilter) {
    filterBarEl.innerHTML = "";
    filterBarEl.classList.remove("visible");
    return;
  }

  filterBarEl.innerHTML = `
    <div class="active-filter-banner">
      <span class="active-filter-text">
        Mostrando: <strong>${escapeHtml(activeFilter.label)}</strong>
        <span class="active-filter-kind">(${escapeHtml(normalizeHeaderLabel(activeFilter.type))})</span>
      </span>
      <button type="button" class="clear-filter-button" id="clearFilterButton">Ver todo</button>
    </div>
  `;

  filterBarEl.classList.add("visible");

  const clearButton = document.getElementById("clearFilterButton");
  if (clearButton) {
    clearButton.onclick = () => {
      activeFilter = null;
      renderFilterBar();
      renderTimeline();
      renderCurrentDetail();
    };
  }
}

function renderTimeline() {
  const filteredItems = getFilteredItems();

  renderFilterBar();

  timelineEl.innerHTML = `
    <div class="timeline-list"></div>
  `;

  const timelineListEl = timelineEl.querySelector(".timeline-list");

  if (!filteredItems.length) {
    timelineListEl.innerHTML = `<div class="timeline-empty">No hay elementos para este filtro.</div>`;
    return;
  }

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
  const shouldAutoplay = isPlaying;

  activeIndex = originalIndex;
  renderTimeline();
  renderDetail(items[originalIndex]);

  if (items[activeIndex] && items[activeIndex].audio) {
    loadTrack(activeIndex);

    if (shouldAutoplay) {
      audioPlayer.play()
        .then(() => {
          isPlaying = true;
          updatePlayerUI();
        })
        .catch(() => {
          isPlaying = false;
          updatePlayerUI();
        });
    } else {
      updatePlayerUI();
    }
  }
};

    wrapper.appendChild(button);
    timelineListEl.appendChild(wrapper);
  });
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
  const countryTag = item.pais ? renderCountryTag(item.pais) : "";
  const genreTags = item.genero ? renderGenreTags(item.genero) : "";

  detailEl.classList.remove("empty");
  detailEl.innerHTML = `
    <article class="card" style="--accent: ${escapeHtml(color)};">
      <div class="card-inner">
        <div class="media-column" style="background: linear-gradient(
              180deg,
              ${hexToRgba(color, 0.75)},
              ${hexToRgba(color, 0.45)}
            );">
          ${
            hasImage
              ? `<img src="${escapeAttribute(item.imagen)}" alt="${escapeHtml(item.titulo || "Imagen")}">`
              : `<div class="no-image">Sin imagen</div>`
          }

          <div class="player">
<div class="controls">
  <button type="button" class="control-btn prev-btn" aria-label="Anterior">
    <svg viewBox="0 0 24 24" class="icon">
      <path d="M6 5v14M18 6l-8 6 8 6z" fill="currentColor"/>
    </svg>
  </button>

<button type="button" class="control-btn play-btn" aria-label="Reproducir" title="Reproducir">
  <svg viewBox="0 0 24 24" class="icon play-symbol icon-play" aria-hidden="true">
    <path d="M8 5v14l11-7z" fill="currentColor"/>
  </svg>

  <svg viewBox="0 0 24 24" class="icon play-symbol icon-pause" aria-hidden="true">
    <path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/>
  </svg>
</button>

  <button type="button" class="control-btn next-btn" aria-label="Siguiente">
    <svg viewBox="0 0 24 24" class="icon">
      <path d="M18 5v14M6 6l8 6-8 6z" fill="currentColor"/>
    </svg>
  </button>

  <button type="button" class="control-btn shuffle-btn" aria-label="Modo aleatorio" aria-pressed="false">
    <svg viewBox="0 0 24 24" class="icon">
      <path d="M4 7h3l5 5-5 5H4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M14 7h6v6" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M20 7l-6 6" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>
  </button>
</div>

            <div class="progress-wrap">
              <div class="progress-bar" role="progressbar" aria-label="Progreso de reproducción" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <div class="progress-fill"></div>
              </div>

              <div class="time-row">
                <span class="time-current">0:00</span>
              </div>
            </div>
          </div>
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
bindPlayerControls();
updatePlayerUI();
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

audioPlayer.addEventListener("timeupdate", () => {
  updatePlayerUI();
});

audioPlayer.addEventListener("loadedmetadata", () => {
  updatePlayerUI();
});

audioPlayer.addEventListener("play", () => {
  isPlaying = true;
  updatePlayerUI();
});

audioPlayer.addEventListener("pause", () => {
  isPlaying = false;
  updatePlayerUI();
});

audioPlayer.addEventListener("ended", () => {
  isPlaying = false;
  playNextTrack(true);
});

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
