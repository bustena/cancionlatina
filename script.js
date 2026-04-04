const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";
const HOME_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=1844389020&single=true&output=csv";

const timelineEl = document.getElementById("timeline");
const detailEl = document.getElementById("detail");
const filterBarEl = document.getElementById("filterBar");

let homeMeta = null;
let isHomeView = true;

let items = [];
let activeIndex = 0;
let activeFilter = null;

let shuffleQueue = [];
let shuffleQueueKey = "";

let isShuffle = false;
let isPlaying = false;
let loadedTrackIndex = null;
let maxFragmentSeconds = 120;
const CROSSFADE_SECONDS = 4;

let fragmentStart = 0;
let fragmentDuration = 0;
let fragmentTimer = null;
let preloadTimer = null;
let currentPlaybackMode = "manual"; // "manual" | "auto"

let currentAudioPlayer = new Audio();
let incomingAudioPlayer = null;

let crossfadeInterval = null;
let isCrossfading = false;

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
    color: normalizeColor(normalized.color),
    spotify: normalized.spotify || ""
  };
}

function mapHomeRow(row) {
  const normalized = {};

  for (const key in row) {
    normalized[normalizeHeader(key)] = String(row[key] || "").trim();
  }

  return {
    titulo: normalized.titulo || "",
    subtitulo: normalized.subtitulo || "",
    icono: normalized.icono || "",
    enlace: normalized.enlace || "",
    fondo: normalizeColor(normalized.fondo),
    texto: normalizeColor(normalized.texto),
    destacado: normalizeColor(normalized.destacado),
    duracion: parseInt(normalized["duracion"] || "120", 10) || 120
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

function getTopGenres(limit = 6) {
  const counts = new Map();

  items.forEach(item => {
    parseGenres(item.genero).forEach(genre => {
      const cleanGenre = String(genre || "").trim();
      if (!cleanGenre) return;

      counts.set(cleanGenre, (counts.get(cleanGenre) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(entry => entry[0]);
}

function extractFlagEmoji(pais) {
  if (!pais) return "";

  const trimmed = pais.trim();
  return trimmed.split(" ")[0];
}

function getRandomTrackIndex(sourceItems = items) {
  const playable = sourceItems
    .map(item => ({ item, index: items.indexOf(item) }))
    .filter(entry => entry.item && entry.item.audio);

  if (!playable.length) return null;

  const randomEntry = playable[Math.floor(Math.random() * playable.length)];
  return randomEntry.index;
}

function startRandomFromFilter(type, value) {
  const normalizedValue = normalizeFilterValue(value);

  activeFilter = {
    type,
    value: normalizedValue,
    label: String(value || "").trim()
  };

  const playableIndices = getPlayableFilteredIndices();
  if (!playableIndices.length) return;

  isShuffle = true;
  resetShuffleQueue();

  const randomIndex = playableIndices[Math.floor(Math.random() * playableIndices.length)];
  rebuildShuffleQueue(randomIndex);

  isHomeView = false;
  goToTrack(randomIndex, true, "auto");
}

function startRandomTrack() {
  const playableIndices = getPlayableFilteredIndices();
  if (!playableIndices.length) return;

  isShuffle = true;
  resetShuffleQueue();

  const randomIndex = playableIndices[Math.floor(Math.random() * playableIndices.length)];
  rebuildShuffleQueue(randomIndex);

  activeFilter = null;
  isHomeView = false;
  goToTrack(randomIndex, true, "auto");
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

function clearPreloadTimer() {
  if (preloadTimer) {
    clearTimeout(preloadTimer);
    preloadTimer = null;
  }
}

function clearFragmentTimer() {
  if (fragmentTimer) {
    clearTimeout(fragmentTimer);
    fragmentTimer = null;
  }
}

function getSpotifyEmbedUrl(url) {
  if (!url) return "";

  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  if (!match) return "";

  return `https://open.spotify.com/embed/track/${match[1]}`;
}

function shouldUseCrossfade() {
  return window.innerWidth > 980;
}

function clearCrossfadeInterval() {
  if (crossfadeInterval) {
    clearInterval(crossfadeInterval);
    crossfadeInterval = null;
  }
}

function clearAllPlaybackTimers() {
  clearFragmentTimer();
  clearPreloadTimer();
  clearCrossfadeInterval();
}

function getTrackDuration() {
  return Number.isFinite(currentAudioPlayer.duration) ? currentAudioPlayer.duration : 0;
}

function getFragmentCurrentTime() {
  return Math.max(0, currentAudioPlayer.currentTime - fragmentStart);
}

function getMaxFragmentStart(duration) {
  return Math.max(0, duration - maxFragmentSeconds);
}

function chooseFragmentStart(duration, mode = "manual") {
  if (duration <= maxFragmentSeconds) return 0;
  if (mode === "manual") return 0;

  const maxStart = getMaxFragmentStart(duration);
  return Math.random() * maxStart;
}

function setFragmentForCurrentTrack(mode = "manual") {
  const duration = getTrackDuration();

  fragmentStart = chooseFragmentStart(duration, mode);
  fragmentDuration = Math.min(maxFragmentSeconds, Math.max(0, duration - fragmentStart));

  currentAudioPlayer.currentTime = fragmentStart;
  updatePlayerUI();
}

function getFragmentDataForDuration(duration, mode = "manual") {
  const start = chooseFragmentStart(duration, mode);
  const durationValue = Math.min(maxFragmentSeconds, Math.max(0, duration - start));

  return {
    start,
    duration: durationValue
  };
}

function scheduleFragmentEnd() {
  clearFragmentTimer();
  clearPreloadTimer();

  const fragmentEndTime = fragmentStart + fragmentDuration;
  const currentTime = currentAudioPlayer.currentTime;
  const timeUntilEnd = fragmentEndTime - currentTime;

  if (timeUntilEnd <= 0) {
    return;
  }

  // En móvil no usamos crossfade: salto limpio al final
  if (!shouldUseCrossfade()) {
    fragmentTimer = setTimeout(() => {
      const nextIndex = getNextTrackIndexFromIndex(activeIndex);

      if (nextIndex === null) {
        isPlaying = false;
        updatePlayerUI();
        return;
      }

      goToTrack(nextIndex, true, "auto");
    }, timeUntilEnd * 1000);

    return;
  }

  // En escritorio sí: lanzar el crossfade antes del final
  const timeUntilCrossfade = timeUntilEnd - CROSSFADE_SECONDS;
  const preloadDelay = timeUntilCrossfade - 1;

  if (preloadDelay > 0) {
    preloadTimer = setTimeout(() => {
      preloadNextTrack();
    }, preloadDelay * 1000);
  }

  // Si hay margen, hacemos crossfade
  if (timeUntilCrossfade > 0.1) {
    fragmentTimer = setTimeout(() => {
      startCrossfadeToNextTrack();
    }, timeUntilCrossfade * 1000);
  } else {
    // Si ya estamos demasiado cerca del final, mejor dejar que ended resuelva
    fragmentTimer = null;
  }
}

function loadTrack(index) {
  const item = items[index];
  if (!item || !item.audio) return false;

  clearFragmentTimer();

  if (loadedTrackIndex !== index) {
    currentAudioPlayer.src = item.audio;
    loadedTrackIndex = index;
    fragmentStart = 0;
    fragmentDuration = 0;
  }

  return true;
}

function goToTrack(newIndex, autoplay = false, mode = "manual") {
  if (newIndex < 0 || newIndex >= items.length) return;
  if (!items[newIndex] || !items[newIndex].audio) return;

  clearAllPlaybackTimers();
  isCrossfading = false;

  currentAudioPlayer.pause();
  
  if (incomingAudioPlayer) {
    incomingAudioPlayer.pause();
    incomingAudioPlayer.currentTime = 0;
    incomingAudioPlayer.src = "";
    incomingAudioPlayer.volume = 1;
    incomingAudioPlayer = null;
  }

  let nextTrackIndex = null;
  let nextFragmentStart = 0;
  let nextFragmentDuration = 0;

  activeIndex = newIndex;
  currentPlaybackMode = mode;

  renderTimeline();
  scrollActiveTimelineItemIntoView();
  renderDetail(items[activeIndex]);

  const ok = loadTrack(activeIndex);
  if (!ok) return;

  const onMetadata = () => {
    setFragmentForCurrentTrack(mode);

    if (autoplay) {
      currentAudioPlayer.play()
        .then(() => {
          isPlaying = true;
          currentAudioPlayer.volume = 1;
          updatePlayerUI();
          scheduleFragmentEnd();
        })
        .catch(() => {
          isPlaying = false;
          updatePlayerUI();
        });
    } else {
      isPlaying = false;
      updatePlayerUI();
    }

    currentAudioPlayer.removeEventListener("loadedmetadata", onMetadata);
  };

  currentAudioPlayer.addEventListener("loadedmetadata", onMetadata);
}

function getNextTrackIndex() {
  return getNextTrackIndexFromIndex(activeIndex);
}

function getPreviousTrackIndex() {
  const filteredItems = getFilteredItems().filter(item => item.audio);
  if (!filteredItems.length) return null;

  const currentItem = items[activeIndex];
  const currentFilteredIndex = filteredItems.indexOf(currentItem);

  if (currentFilteredIndex === -1) {
    return items.indexOf(filteredItems[0]);
  }

  if (currentAudioPlayer.currentTime > 3) {
    return activeIndex;
  }

  const previousFilteredIndex = currentFilteredIndex - 1;

  if (previousFilteredIndex < 0) {
    return null;
  }

  return items.indexOf(filteredItems[previousFilteredIndex]);
}

function getNextTrackIndexFromIndex(baseIndex) {
  const filteredItems = getFilteredItems().filter(item => item.audio);
  if (!filteredItems.length) return null;

  const baseItem = items[baseIndex];
  const currentFilteredIndex = filteredItems.indexOf(baseItem);

  if (currentFilteredIndex === -1) {
    return items.indexOf(filteredItems[0]);
  }

  if (isShuffle) {
    return getNextShuffleIndex(baseIndex);
  }
  
      const nextFilteredIndex = currentFilteredIndex + 1;
      
      if (nextFilteredIndex >= filteredItems.length) {
        return items.indexOf(filteredItems[0]);
      }
      
      return items.indexOf(filteredItems[nextFilteredIndex]);
  }

function preloadNextTrack() {
  const nextIndex = getNextTrackIndex();
  if (nextIndex === null) return;

  const item = items[nextIndex];
  if (!item || !item.audio) return;

  const audio = new Audio(item.audio);
  audio.preload = "auto";
}

function playNextTrack(autoplay = true, mode = "auto") {
  const nextIndex = getNextTrackIndex();

  if (nextIndex === null) {
    return;
  }

  goToTrack(nextIndex, autoplay, mode);
}

function playPreviousTrack(autoplay = true) {
  const previousIndex = getPreviousTrackIndex();
  if (previousIndex === null) {
    return;
  }

  if (previousIndex === activeIndex) {
    currentAudioPlayer.currentTime = fragmentStart;
    updatePlayerUI();

    if (autoplay && currentAudioPlayer.paused) {
      currentAudioPlayer.play()
        .then(() => {
          isPlaying = true;
          updatePlayerUI();
          scheduleFragmentEnd();
        })
        .catch(() => {
          isPlaying = false;
          updatePlayerUI();
        });
    } else if (autoplay) {
      scheduleFragmentEnd();
    }

    return;
  }

  goToTrack(previousIndex, autoplay, "manual");
}

function startCrossfadeToNextTrack() {
  if (isCrossfading) return;

    if (!shouldUseCrossfade()) {
    const nextIndex = getNextTrackIndexFromIndex(activeIndex);
  
    if (nextIndex === null) {
      clearAllPlaybackTimers();
      isPlaying = false;
      updatePlayerUI();
      return;
    }
  
    goToTrack(nextIndex, true, "auto");
    return;
  }

  const candidateIndex = getNextTrackIndexFromIndex(activeIndex);
  if (candidateIndex === null) {
    clearAllPlaybackTimers();
    isPlaying = false;
    updatePlayerUI();
    return;
  }

  const item = items[candidateIndex];
  if (!item || !item.audio) return;

  incomingAudioPlayer = new Audio();
  incomingAudioPlayer.preload = "auto";
  incomingAudioPlayer.src = item.audio;
  incomingAudioPlayer.volume = 0;

  const onCanPlay = () => {
    const duration = Number.isFinite(incomingAudioPlayer.duration)
      ? incomingAudioPlayer.duration
      : 0;

    const fragmentData = getFragmentDataForDuration(duration, "auto");
    const start = fragmentData.start;
    const fragDuration = fragmentData.duration;

    incomingAudioPlayer.currentTime = start;

    incomingAudioPlayer.play()
      .then(() => {
        isCrossfading = true;

        const fadeSteps = 20;
        const fadeInterval = (CROSSFADE_SECONDS * 1000) / fadeSteps;
        let currentStep = 0;

        crossfadeInterval = setInterval(() => {
          currentStep++;
          const progress = currentStep / fadeSteps;

          currentAudioPlayer.volume = Math.max(0, 1 - progress);
          incomingAudioPlayer.volume = Math.min(1, progress);

          if (currentStep >= fadeSteps) {
            clearCrossfadeInterval();

            detachCurrentPlayerListeners();
            currentAudioPlayer.pause();
            currentAudioPlayer.volume = 1;

            currentAudioPlayer = incomingAudioPlayer;
            incomingAudioPlayer = null;

            activeIndex = candidateIndex;
            loadedTrackIndex = candidateIndex;
            fragmentStart = start;
            fragmentDuration = fragDuration;

            attachCurrentPlayerListeners();
            
            isCrossfading = false;
            isPlaying = true;
            
            // programa primero el siguiente final de fragmento
            scheduleFragmentEnd();
            
            // luego refresca interfaz
            renderTimeline();
            scrollActiveTimelineItemIntoView();
            renderCurrentDetail();
            updatePlayerUI();
          }
        }, fadeInterval);
      })
      .catch((err) => {
        console.error("Crossfade failed:", err);
        isCrossfading = false;
        clearCrossfadeInterval();
        if (incomingAudioPlayer) {
          incomingAudioPlayer.pause();
          incomingAudioPlayer.src = "";
          incomingAudioPlayer = null;
        }
        scheduleFragmentEnd();
      });

    incomingAudioPlayer.removeEventListener("canplay", onCanPlay);
    incomingAudioPlayer.removeEventListener("error", onError);
  };

  const onError = () => {
    console.error("Incoming track could not load");
    isCrossfading = false;
    if (incomingAudioPlayer) {
      incomingAudioPlayer.pause();
      incomingAudioPlayer.src = "";
      incomingAudioPlayer = null;
    }
    scheduleFragmentEnd();
    incomingAudioPlayer.removeEventListener("canplay", onCanPlay);
    incomingAudioPlayer.removeEventListener("error", onError);
  };

  incomingAudioPlayer.addEventListener("canplay", onCanPlay);
  incomingAudioPlayer.addEventListener("error", onError);
  incomingAudioPlayer.load();
}
  
function updatePlayerUI() {
  const playBtn = detailEl.querySelector(".play-btn");
  const shuffleBtn = detailEl.querySelector(".shuffle-btn");
  const progressFill = detailEl.querySelector(".progress-fill");
  const progressBar = detailEl.querySelector(".progress-bar");
  const currentTimeEl = detailEl.querySelector(".time-current");

  if (playBtn) {
    playBtn.classList.toggle("is-playing", isPlaying);
    playBtn.setAttribute("aria-label", isPlaying ? "Pausar" : "Reproducir");
    playBtn.setAttribute("title", isPlaying ? "Pausar" : "Reproducir");
  }

  if (shuffleBtn) {
    shuffleBtn.classList.toggle("active", isShuffle);
    shuffleBtn.setAttribute("aria-pressed", isShuffle ? "true" : "false");
    shuffleBtn.setAttribute("title", isShuffle ? "Desactivar modo aleatorio" : "Modo aleatorio");
  }

  const currentTime = getFragmentCurrentTime();
  const duration = fragmentDuration || Math.min(getTrackDuration(), maxFragmentSeconds);
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (progressFill) {
    progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  if (progressBar) {
    progressBar.setAttribute("aria-valuenow", String(Math.round(Math.max(0, Math.min(100, percent)))));
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
    currentPlaybackMode = "manual";
    const ok = loadTrack(activeIndex);
    if (!ok) return;

    const onMetadata = () => {
      setFragmentForCurrentTrack("manual");

      currentAudioPlayer.play()
        .then(() => {
          isPlaying = true;
          updatePlayerUI();
          scheduleFragmentEnd();
        })
        .catch(() => {
          isPlaying = false;
          updatePlayerUI();
        });

      currentAudioPlayer.removeEventListener("loadedmetadata", onMetadata);
    };

    currentAudioPlayer.addEventListener("loadedmetadata", onMetadata);
    return;
  }

  if (currentAudioPlayer.paused) {
    const startPlayback = () => {
      if (!fragmentDuration || fragmentDuration <= 0) {
        setFragmentForCurrentTrack("manual");
      }

      currentAudioPlayer.play()
        .then(() => {
          isPlaying = true;
          updatePlayerUI();
          scheduleFragmentEnd();
        })
        .catch(() => {
          isPlaying = false;
          updatePlayerUI();
        });
    };

    if (!Number.isFinite(currentAudioPlayer.duration) || currentAudioPlayer.duration <= 0) {
      const onMetadata = () => {
        startPlayback();
        currentAudioPlayer.removeEventListener("loadedmetadata", onMetadata);
      };

      currentAudioPlayer.addEventListener("loadedmetadata", onMetadata);
    } else {
      startPlayback();
    }
  } else {
    currentAudioPlayer.pause();
    clearAllPlaybackTimers();
    if (incomingAudioPlayer) {
      incomingAudioPlayer.pause();
      incomingAudioPlayer.currentTime = 0;
      incomingAudioPlayer.src = "";
      incomingAudioPlayer.volume = 1;
      incomingAudioPlayer = null;
    }
    isCrossfading = false;
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
      resetShuffleQueue();
  
      if (isShuffle) {
        rebuildShuffleQueue(activeIndex);
      }
  
      updatePlayerUI();
    };
  }

  if (progressBar) {
    progressBar.onclick = (event) => {
      const rect = progressBar.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const duration = fragmentDuration || Math.min(getTrackDuration(), maxFragmentSeconds);

      if (duration > 0) {
        const newTime = fragmentStart + Math.max(0, Math.min(duration, ratio * duration));
        currentAudioPlayer.currentTime = newTime;
        updatePlayerUI();

        if (isPlaying) {
          clearFragmentTimer();
          clearPreloadTimer();

          const fragmentEndTime = fragmentStart + fragmentDuration;
          const remaining = fragmentEndTime - newTime;

          if (!shouldUseCrossfade() || remaining <= CROSSFADE_SECONDS + 0.25) {
            fragmentTimer = setTimeout(() => {
              const nextIndex = getNextTrackIndexFromIndex(activeIndex);

              if (nextIndex === null) {
                isPlaying = false;
                updatePlayerUI();
                return;
              }

              goToTrack(nextIndex, true, "auto");
            }, Math.max(0, remaining * 1000));
          } else {
            scheduleFragmentEnd();
          }
        }
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
      playNextTrack(isPlaying || !currentAudioPlayer.paused);
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

function getPlayableFilteredIndices() {
  return getFilteredItems()
    .filter(item => item.audio)
    .map(item => items.indexOf(item))
    .filter(index => index !== -1);
}

function getShuffleQueueKey() {
  return getPlayableFilteredIndices().join("|");
}

function shuffleArray(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function rebuildShuffleQueue(currentIndex = activeIndex) {
  const playableIndices = getPlayableFilteredIndices();
  const key = playableIndices.join("|");

  shuffleQueueKey = key;

  if (!playableIndices.length) {
    shuffleQueue = [];
    return;
  }

  const remaining = playableIndices.filter(index => index !== currentIndex);
  shuffleQueue = shuffleArray(remaining);
}

function ensureShuffleQueue(currentIndex = activeIndex) {
  const key = getShuffleQueueKey();

  if (shuffleQueueKey !== key || !shuffleQueue.length) {
    rebuildShuffleQueue(currentIndex);
  }
}

function getNextShuffleIndex(baseIndex) {
  const playableIndices = getPlayableFilteredIndices();
  if (!playableIndices.length) return null;

  ensureShuffleQueue(baseIndex);

  if (!shuffleQueue.length) {
    rebuildShuffleQueue(baseIndex);
  }

  if (!shuffleQueue.length) {
    return null;
  }

  return shuffleQueue.shift();
}

function resetShuffleQueue() {
  shuffleQueue = [];
  shuffleQueueKey = "";
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
  resetShuffleQueue();
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
    scrollActiveTimelineItemIntoView();
    bindFilterTagEventsInDetail();
  } else {
      activeIndex = items.indexOf(filteredItems[0]);
      renderTimeline();
      scrollActiveTimelineItemIntoView();
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
      resetShuffleQueue();
      renderFilterBar();
      renderTimeline();
      scrollActiveTimelineItemIntoView();
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
      <span class="timeline-year">
        ${escapeHtml(item.ano || "s. f.")} <span class="timeline-flag">${extractFlagEmoji(item.pais)}</span>
      </span>
      <span class="timeline-title">${escapeHtml(item.titulo || "Sin título")}</span>
      <span class="timeline-author">${escapeHtml(item.autor || "")}</span>
    `;

    button.onclick = () => {
      const shouldAutoplay = isPlaying;
      isHomeView = false;
    
      if (shouldAutoplay) {
        goToTrack(originalIndex, true, "manual");
      } else {
        activeIndex = originalIndex;
        renderTimeline();
        scrollActiveTimelineItemIntoView();
        renderDetail(items[originalIndex]);
    
        if (items[activeIndex] && items[activeIndex].audio) {
          loadTrack(activeIndex);
    
          const onMetadata = () => {
            setFragmentForCurrentTrack("manual");
            updatePlayerUI();
            currentAudioPlayer.removeEventListener("loadedmetadata", onMetadata);
          };
    
          currentAudioPlayer.addEventListener("loadedmetadata", onMetadata);
        }
      }
    };

    wrapper.appendChild(button);
    timelineListEl.appendChild(wrapper);
  });
}

function scrollActiveTimelineItemIntoView() {
  requestAnimationFrame(() => {
    const activeItem = timelineEl.querySelector(".timeline-item.active");
    if (!activeItem) return;

    activeItem.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
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

function renderHome() {
  const meta = homeMeta || {
    titulo: "Canción latina",
    subtitulo: "Una cronología sonora para explorar obras, autores, países y géneros.",
    icono: "",
    enlace: ""
  };

  const topCountries = getTopCountries(4);
  const topGenres = getTopGenres(4);

  const countryButtons = topCountries.map(country => `
    <button
      type="button"
      class="tag filter-tag home-tag home-country-tag"
      data-home-action="pais"
      data-home-value="${escapeAttribute(country)}"
    >
      ${escapeHtml(country)}
    </button>
  `).join("");

  const genreButtons = topGenres.map(genre => `
    <button
      type="button"
      class="tag filter-tag home-tag home-genre-tag"
      data-home-action="genero"
      data-home-value="${escapeAttribute(genre)}"
    >
      ${escapeHtml(genre)}
    </button>
  `).join("");

  const iconHtml = meta.icono
    ? (
        meta.enlace
          ? `<a href="${escapeAttribute(meta.enlace)}" target="_blank" rel="noopener noreferrer" class="home-logo-link">
               <img src="${escapeAttribute(meta.icono)}" alt="${escapeHtml(meta.titulo || "Icono")}">
             </a>`
          : `<img src="${escapeAttribute(meta.icono)}" alt="${escapeHtml(meta.titulo || "Icono")}">`
      )
    : "";

  detailEl.classList.remove("empty");
  detailEl.innerHTML = `
    <article class="card home-card" style="--accent: #8b6a43;">
      <div class="card-inner">
        <div class="media-column home-media">
          <div class="home-branding">
            ${iconHtml ? `<div class="home-logo">${iconHtml}</div>` : ""}
            <h1 class="home-title">${escapeHtml(meta.titulo || "")}</h1>
            <p class="home-subtitle">${escapeHtml(meta.subtitulo || "")}</p>
          </div>
        </div>

        <div class="content-column home-content">
          <div class="home-section">
            <h3 class="home-section-title">Explorar por país</h3>
            <div class="home-tags">
              ${countryButtons}
            </div>
          </div>
        
          <div class="home-section">
            <h3 class="home-section-title">Explorar por género</h3>
            <div class="home-tags">
              ${genreButtons}
            </div>
          </div>
        
          <div class="home-section home-random">
            <div class="home-tags">
              <button class="tag home-tag" data-random-start>
                Descubrir al azar
              </button>
            </div>
          </div>
        
          <p class="home-note" id="homeNote">
            También puedes entrar desde la línea de tiempo de la izquierda.
          </p>
        </div>
      </div>
    </article>
  `;

  detailEl.querySelectorAll("[data-random-start]").forEach(btn => {
    btn.onclick = () => {
      startRandomTrack();
    };
  });

  detailEl.querySelectorAll("[data-home-action]").forEach(button => {
  button.onclick = () => {
    const type = button.dataset.homeAction;
    const value = button.dataset.homeValue;
    startRandomFromFilter(type, value);
    };
  });
  
updateHomeNoteText();
}

function renderDetail(item) {
  const color = item.color || "#c9b79c";
  const hasImage = Boolean(item.imagen);
  const countryTag = item.pais ? renderCountryTag(item.pais) : "";
  const genreTags = item.genero ? renderGenreTags(item.genero) : "";
  const spotifyUrl = item.spotify ? item.spotify.trim() : "";
  const spotifyEmbed = getSpotifyEmbedUrl(spotifyUrl);

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
              ${spotifyUrl ? `
                <div class="spotify-slot is-collapsed" data-spotify-slot data-spotify-embed="${escapeAttribute(spotifyEmbed)}">
                  <button type="button" class="spotify-slot-trigger" data-spotify-toggle>
                    Escuchar en Spotify
                  </button>
                  <div class="spotify-slot-content"></div>
                </div>
              ` : ""}
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

detailEl.querySelectorAll("[data-spotify-slot]").forEach(slot => {
  const trigger = slot.querySelector("[data-spotify-toggle]");
  const content = slot.querySelector(".spotify-slot-content");
  const embedUrl = slot.dataset.spotifyEmbed;

  if (!trigger || !content || !embedUrl) return;

  trigger.addEventListener("click", () => {
    const isOpen = slot.classList.contains("is-open");

    if (isOpen) {
      slot.classList.remove("is-open");
      slot.classList.add("is-collapsed");
      content.innerHTML = "";
      return;
    }

    slot.classList.remove("is-collapsed");
    slot.classList.add("is-open");

    content.innerHTML = `
      <iframe
        src="${embedUrl}"
        width="100%"
        height="80"
        frameborder="0"
        allow="encrypted-media"
        loading="lazy"
        style="border-radius:12px;">
      </iframe>
    `;
  });
});

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

function updateHomeNoteText() {
  const el = document.getElementById("homeNote");
  if (!el) return;

  if (window.innerWidth <= 980) {
    el.textContent = "También puedes entrar desde la línea de tiempo de arriba.";
  } else {
    el.textContent = "También puedes entrar desde la línea de tiempo de la izquierda.";
  }
}
function showLoading() {
  detailEl.classList.remove("empty");
  detailEl.innerHTML = `<div class="loading">Cargando datos…</div>`;
}

function showError(message) {
  detailEl.classList.remove("empty");
  detailEl.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

function handleCurrentPlayerTimeUpdate() {
  updatePlayerUI();
}

function handleCurrentPlayerLoadedMetadata() {
  updatePlayerUI();
}

function handleCurrentPlayerPlay() {
  isPlaying = true;
  currentAudioPlayer.volume = 1;
  updatePlayerUI();
}

function handleCurrentPlayerPause() {
  clearAllPlaybackTimers();

  if (!isCrossfading) {
    isPlaying = false;
  }

  updatePlayerUI();
}

function attachCurrentPlayerListeners() {
  currentAudioPlayer.addEventListener("timeupdate", handleCurrentPlayerTimeUpdate);
  currentAudioPlayer.addEventListener("loadedmetadata", handleCurrentPlayerLoadedMetadata);
  currentAudioPlayer.addEventListener("play", handleCurrentPlayerPlay);
  currentAudioPlayer.addEventListener("pause", handleCurrentPlayerPause);
  currentAudioPlayer.addEventListener("ended", handleEnded);
  currentAudioPlayer.addEventListener("error", handleError);
}

function handleEnded() {
  if (isCrossfading) return;

  const nextIndex = getNextTrackIndexFromIndex(activeIndex);

  if (nextIndex === null) {
    isPlaying = false;
    updatePlayerUI();
    return;
  }

  // En móvil, o si no queremos crossfade, salto limpio
  if (!shouldUseCrossfade()) {
    goToTrack(nextIndex, true, "auto");
    return;
  }

  startCrossfadeToNextTrack();
}

function handleError() {
  console.warn("Playback error, skipping track");
  if (!isCrossfading) {
    startCrossfadeToNextTrack();
  }
}
  
function detachCurrentPlayerListeners() {
  currentAudioPlayer.removeEventListener("timeupdate", handleCurrentPlayerTimeUpdate);
  currentAudioPlayer.removeEventListener("loadedmetadata", handleCurrentPlayerLoadedMetadata);
  currentAudioPlayer.removeEventListener("play", handleCurrentPlayerPlay);
  currentAudioPlayer.removeEventListener("pause", handleCurrentPlayerPause);
  currentAudioPlayer.removeEventListener("ended", handleEnded);
  currentAudioPlayer.removeEventListener("error", handleError);
}

function reconcilePlaybackState() {
  if (!currentAudioPlayer) return;

  const fragmentEndTime = fragmentStart + fragmentDuration;
  const currentTime = currentAudioPlayer.currentTime;

  // Si ya hemos pasado el final del fragmento → forzar avance
  if (currentTime >= fragmentEndTime - 0.1) {
    const nextIndex = getNextTrackIndexFromIndex(activeIndex);

    if (nextIndex === null) {
      isPlaying = false;
      updatePlayerUI();
      return;
    }

    goToTrack(nextIndex, true, "auto");
    return;
  }

  // Si no, reprogramar timers y refrescar UI
  if (isPlaying) {
    scheduleFragmentEnd();
  }

  updatePlayerUI();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    reconcilePlaybackState();
  }
});

function loadHomeCSV() {
  return new Promise((resolve) => {
    Papa.parse(HOME_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        if (results.data && results.data.length) {
          homeMeta = mapHomeRow(results.data[0]);
          maxFragmentSeconds = homeMeta.duracion || 120;

          console.log("homeMeta:", homeMeta);
          console.log("accent:", homeMeta?.destacado);

          applyHomeTheme();

          console.log(
            "css accent:",
            getComputedStyle(document.documentElement).getPropertyValue("--app-accent")
          );
        }
        resolve();
      },
      error: function () {
        resolve();
      }
    });
  });
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
      isHomeView = true;
      renderTimeline();
      scrollActiveTimelineItemIntoView();
      renderHome();
    },
    error: function () {
      showError("No se ha podido leer el CSV de Google Sheets.");
    }
  });
}

attachCurrentPlayerListeners();
window.addEventListener("resize", updateHomeNoteText);
loadHomeCSV().then(() => {
  loadCSV();
});
