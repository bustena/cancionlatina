const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";
const HOME_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=1844389020&single=true&output=csv";

const detailEl = document.getElementById("detail");

let items = [];
let selectedMode = "pais";
let selectedDifficulty = "facil";
const QUESTIONS_PER_ROUND = 8;

let homeMeta = null;
let currentQuestion = null;
let score = 0;
let questionNumber = 0;
let correctCount = 0;
let wrongCount = 0;
let roundItems = [];
let roundIndex = 0;

let currentAudioPlayer = new Audio();
let fragmentStart = 0;
let fragmentDuration = 0;
let fragmentTimer = null;
let isPlaying = false;
let maxFragmentSeconds = 50;

const gainSound = new Audio("assets/gain.mp3");
const lossSound = new Audio("assets/loss.mp3");

function normalizeColor(value) {
  const raw = String(value || "").trim();
  if (!raw) return "#c9b79c";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  return "#c9b79c";
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
    duracion: parseInt(normalized.duracion || "60", 10) || 60
  };
}

function applyHomeTheme() {
  const fondo = homeMeta?.fondo || "#FFFAFA";
  const texto = homeMeta?.texto || "#151821";
  const destacado = homeMeta?.destacado || "#7a6a2e";

  document.documentElement.style.setProperty("--app-bg", fondo);
  document.documentElement.style.setProperty("--app-text", texto);
  document.documentElement.style.setProperty("--app-accent", destacado);
}

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
    color: normalized.color || "#c9b79c"
  };
}

function renderHomePanel() {
  const leftHeader = document.querySelector(".left-header");
  
  if (leftHeader) {
    leftHeader.style.color = "";
  }
  if (!leftHeader) return;

  setLeftPanelBackground("");

  leftHeader.innerHTML = `
    <h1 class="app-title">Ponte a prueba</h1>

    <div class="home-panel-text">
      <p>
        Elige una modalidad y una dificultad. En cada ronda tendrás que identificar la respuesta correcta entre cuatro opciones.
      </p>

      <p>
        Los aciertos suman puntos; los fallos restan. No avanzarás hasta acertar.
      </p>
    </div>
  `;
}

function renderHome() {

  renderHomePanel();
    
  const meta = homeMeta || {
    titulo: "TEST",
    subtitulo: "Pon a prueba tu oído con la canción latinoamericana.",
    icono: "",
    enlace: ""
  };

  detailEl.classList.remove("empty");

  detailEl.innerHTML = `
    <article class="card home-card" style="--accent: var(--app-accent, #8b6a43);">
      <div class="card-inner">
        <div class="media-column home-media">
          <div class="home-branding">
            <h1 class="home-title">${meta.titulo || "TEST"}</h1>
            <p class="home-subtitle">${meta.subtitulo || ""}</p>
          </div>
        </div>

        <div class="content-column home-content">
          <div class="home-section">
            <h3 class="home-section-title">Modalidad</h3>

            <div class="mode-grid">
              <button class="tag ${selectedMode === "pais" ? "active" : ""}" data-mode="pais">País</button>
              <button class="tag ${selectedMode === "ritmo" ? "active" : ""}" data-mode="ritmo">Ritmo</button>
              <button class="tag ${selectedMode === "ano" ? "active" : ""}" data-mode="ano">Año</button>
              <button class="tag ${selectedMode === "obra" ? "active" : ""}" data-mode="obra">Obra</button>
            </div>
          </div>

          <div class="home-section">
            <h3 class="home-section-title">Dificultad</h3>

            <div class="difficulty-grid">
              <button
                class="tag ${selectedDifficulty === "facil" ? "active" : ""}"
                data-difficulty="facil"
                ${selectedMode === "obra" ? "disabled" : ""}
              >
                Fácil
              </button>
              <button class="tag ${selectedDifficulty === "dificil" ? "active" : ""}" data-difficulty="dificil">Difícil</button>
            </div>
          </div>

          <div class="home-section home-random">
            <div class="home-tags">
              <button class="tag home-tag primary-start" id="startGameButton">
                Empezar
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;

  detailEl.querySelectorAll("[data-mode]").forEach(button => {
    button.onclick = () => {
    selectedMode = button.dataset.mode;
    
    if (selectedMode === "obra") {
      selectedDifficulty = "dificil";
    }
    
    renderHome();
    };
  });

  detailEl.querySelectorAll("[data-difficulty]").forEach(button => {
    button.onclick = () => {
      if (button.disabled) return;
  
      selectedDifficulty = button.dataset.difficulty;
      renderHome();
    };
  });

  const startButton = document.getElementById("startGameButton");

  if (startButton) {
    startButton.onclick = () => {
      startRound();
    };
  }
}

function renderGamePanel(item = null) {
  const leftHeader = document.querySelector(".left-header");
  const rhythmLegend = selectedMode === "ritmo" ? `
    <div class="rhythm-legend">
      <div><strong>HAB</strong> · Habanera</div>
      <div><strong>TER</strong> · Ternaria</div>
      <div><strong>SON</strong> · Clave de son</div>
      <div><strong>BRA</strong> · Afrobrasileña</div>
      <div><strong>CAR</strong> · Afrocaribeña</div>
      <div><strong>URB</strong> · Urbana</div>
    </div>
  ` : "";
  
  if (leftHeader) {
    leftHeader.style.color = "";
  }

  if (!leftHeader) return;

  const accent = item?.color || homeMeta?.destacado || "#8b6a43";
  const panelBg = lightenColor(accent, 0.86);
  
  setLeftPanelBackground(panelBg);

  leftHeader.innerHTML = `
    <h1 class="app-title">Ronda en curso</h1>
  
    <div class="game-panel game-panel-compact">
      <div class="game-line">
        <span class="game-label">Modo</span>
        <span class="game-value">${getModeLabel(selectedMode)} / ${selectedDifficulty === "facil" ? "Fácil" : "Difícil"}</span>
      </div>
  
      <div class="game-line">
        <span class="game-label">Pregunta</span>
        <span class="game-value">${questionNumber} / ${QUESTIONS_PER_ROUND}</span>
      </div>
  
      <div class="game-line">
        <span class="game-label">Puntos</span>
        <span class="game-value">${score}</span>
      </div>
  
      <div class="game-line">
        <span class="game-label">Fallos</span>
        <span class="game-value">${wrongCount}</span>
      </div>
      ${rhythmLegend}
    </div>
  `;
}

function setLeftPanelBackground(color = "") {
  const leftColumn = document.querySelector(".left-column");
  const leftHeader = document.querySelector(".left-header");

  if (leftColumn) leftColumn.style.background = color;
  if (leftHeader) leftHeader.style.background = color;
}

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getModeLabel(mode) {
  if (mode === "pais") return "País";
  if (mode === "ritmo") return "Ritmo";
  if (mode === "ano") return "Año";
  if (mode === "obra") return "Obra";
  return mode;
}

function getUniqueCountries() {
  return [...new Set(
    items
      .map(item => item.pais)
      .filter(Boolean)
  )];
}

function getAnswerValue(item, mode = selectedMode) {
  if (mode === "pais") return item.pais;
  if (mode === "ritmo") return item.ritmo;
  if (mode === "ano") return item.ano;
  if (mode === "obra") return `${item.autor} — ${item.titulo}`;
  return "";
}

function getQuestionText(mode = selectedMode) {
  if (mode === "pais") return "¿De qué país es esta audición?";
  if (mode === "ritmo") return "¿Qué ritmo tiene esta audición?";
  if (mode === "ano") return "¿De qué año es esta audición?";
  if (mode === "obra") return "¿Qué obra estás escuchando?";
  return "¿Cuál es la respuesta correcta?";
}

function getValidItemsForMode(mode = selectedMode) {
  return items.filter(item => {
    const answer = getAnswerValue(item, mode);
    return Boolean(answer);
  });
}

function getUniqueAnswersForMode(mode = selectedMode) {
  return [...new Set(
    getValidItemsForMode(mode)
      .map(item => getAnswerValue(item, mode))
      .filter(Boolean)
  )];
}

function startRound() {
  score = 0;
  questionNumber = 0;
  correctCount = 0;
  wrongCount = 0;

  const candidates = getValidItemsForMode(selectedMode);
  const uniqueAnswers = getUniqueAnswersForMode(selectedMode);

  if (candidates.length < QUESTIONS_PER_ROUND || uniqueAnswers.length < 4) {
    alert("No hay suficientes datos para iniciar esta modalidad.");
    return;
  }

  roundItems = shuffle(candidates).slice(0, QUESTIONS_PER_ROUND);
  roundIndex = 0;

  startQuestion();
}

function startQuestion() {
  stopAudio();
  
  if (roundIndex >= roundItems.length) {
    renderEndScreen();
    return;
  }

  questionNumber = roundIndex + 1;

  const item = roundItems[roundIndex];
  roundIndex += 1;

  renderGamePanel(item);

  const correctAnswer = getAnswerValue(item, selectedMode);

  const wrongAnswers = shuffle(
    getUniqueAnswersForMode(selectedMode).filter(answer => answer !== correctAnswer)
  ).slice(0, 3);

  const options = shuffle([
    correctAnswer,
    ...wrongAnswers
  ]);

  currentQuestion = {
    item,
    correctAnswer,
    answered: false
  };

  renderQuestion(item, options);
}

function renderQuestion(item, options) {
  const accentColor = item.color || "#c9b79c";
  const darkAccentColor = darkenColor(accentColor, 0.70);
  const isHardMode = selectedDifficulty === "dificil" || selectedMode === "obra";
  const hardModeColor = toGrayscale(accentColor, 0.45);

  detailEl.innerHTML = `
    <article
      class="card"
      style="
        --question-accent: ${accentColor};
        --question-accent-dark: ${darkAccentColor};
      "
    >
      <div class="card-inner">

        <div
          class="media-column"
          style="background: linear-gradient(
            180deg,
            ${hexToRgba(accentColor, 0.75)},
            ${hexToRgba(accentColor, 0.45)}
          );"
        >
          ${
            isHardMode
              ? `<div
                  class="hard-mode-image"
                  id="hardModeImage"
                  style="background:${hardModeColor};"
                  data-image="${item.imagen || ""}"
                ></div>`
              : item.imagen
                ? `<img src="${item.imagen}" alt="">`
                : `<div class="no-image">Sin imagen</div>`
          }

          <div class="player test-player">
            <div class="controls">
              <button type="button" class="control-btn play-btn" id="audioPlayButton" aria-label="Reproducir" title="Reproducir">
                <svg viewBox="0 0 24 24" class="icon play-symbol icon-play" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="currentColor"/>
                </svg>
          
                <svg viewBox="0 0 24 24" class="icon play-symbol icon-pause" aria-hidden="true">
                  <path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          
            <div class="progress-wrap">
              <div class="progress-bar" role="progressbar" aria-label="Progreso de reproducción" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <div class="progress-fill" id="audioProgressFill"></div>
              </div>
          
              <div class="time-row">
                <span class="time-current" id="audioTime">0:00</span>
              </div>
            </div>
          </div>
        </div>

        <div class="content-column">

          <p class="question-kicker">
            ${getQuestionText(selectedMode)}
          </p>

          ${!isHardMode ? `
            <h2 class="author">
              ${item.autor}
            </h2>
          
            <p class="work-title">
              ${item.titulo}
            </p>
          ` : selectedMode !== "obra" ? `
            <div class="reveal-info" id="revealInfo"></div>
          ` : ""}

          <div class="options-grid">
            ${options.map(option => `
              <button
                class="option-button"
                data-option="${option}"
              >
                ${option}
              </button>
            `).join("")}
          </div>

          <div class="feedback" id="feedback"></div>

          <div class="next-row">
            <button
              class="next-button"
              id="nextButton"
              disabled
            >
              Siguiente
            </button>
          </div>

        </div>

      </div>
    </article>
  `;

  const audioButton = document.getElementById("audioPlayButton");

  if (audioButton) {
    audioButton.onclick = toggleAudioPlay;
  }

  currentAudioPlayer.ontimeupdate = updateAudioUI;
  loadAndPlayAudio(item);

  attachQuestionEvents();
}

function attachQuestionEvents() {
  const feedback = document.getElementById("feedback");
  const nextButton = document.getElementById("nextButton");

  detailEl.querySelectorAll("[data-option]").forEach(button => {
    button.onclick = () => {
      if (currentQuestion.answered) return;

      const value = button.dataset.option;

      if (value === currentQuestion.correctAnswer) {
        button.classList.add("correct");

        score += 10;
        correctCount += 1;

        currentQuestion.answered = true;

        feedback.textContent = "✓ Correcto";
        feedback.className = "feedback is-success";
        
        revealHardModeImage();
        revealAnswerInfo();
        
        playSound(gainSound);
        renderGamePanel(currentQuestion.item);

        nextButton.disabled = false;
      } else {
        button.classList.add("wrong");

        score -= 2;
        wrongCount += 1;

        feedback.textContent = "✗ Inténtalo de nuevo";
        feedback.className = "feedback is-error";

        playSound(lossSound);
        renderGamePanel(currentQuestion.item);
      }
    };
  });

  nextButton.onclick = () => {
    startQuestion();
  };
}

function renderEndPanel() {
  const leftHeader = document.querySelector(".left-header");
  if (!leftHeader) return;

  setLeftPanelBackground(homeMeta?.destacado || "#7a6a2e");
  leftHeader.style.color = "#ffffff";

  leftHeader.innerHTML = `
    <h1 class="app-title">Resultado</h1>

    <div class="game-panel game-panel-compact end-left-panel">
      <div class="game-line">
        <span class="game-label">Puntuación</span>
        <span class="game-value">${score}</span>
      </div>

      <div class="game-line">
        <span class="game-label">Preguntas</span>
        <span class="game-value">${QUESTIONS_PER_ROUND}</span>
      </div>

      <div class="game-line">
        <span class="game-label">Fallos</span>
        <span class="game-value">${wrongCount}</span>
      </div>
    </div>
  `;

}

function renderEndScreen() {
  stopAudio();
  renderEndPanel();

  detailEl.innerHTML = `
    <article class="card end-card">
      <div class="end-panel">

        <p class="end-kicker">
          Ronda terminada
        </p>

        <h1 class="end-score">
          ${score}
        </h1>

        <p class="end-label">
          puntos
        </p>

        <p class="end-summary">
          Has completado ${QUESTIONS_PER_ROUND} preguntas.
        </p>

        <button class="primary-button end-button" id="restartButton">
          Jugar otra vez
        </button>

      </div>
    </article>
  `;

  const restartButton = document.getElementById("restartButton");

  if (restartButton) {
    restartButton.onclick = () => {
      renderHome();
    };
  }
}

function darkenColor(hex, factor = 0.75) {
  const color = hex.replace("#", "");

  const r = Math.round(parseInt(color.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(color.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(color.substring(4, 6), 16) * factor);

  return "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0");
}

function lightenColor(hex, factor = 0.88) {
  const color = hex.replace("#", "");

  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);

  return "#" +
    nr.toString(16).padStart(2, "0") +
    ng.toString(16).padStart(2, "0") +
    nb.toString(16).padStart(2, "0");
}

function toGrayscale(hex, saturation = 0.35) {
  const clean = String(hex || "").replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return "#b8b8b8";
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  const gray = Math.round((r + g + b) / 3);

  const nr = Math.round(gray + (r - gray) * saturation);
  const ng = Math.round(gray + (g - gray) * saturation);
  const nb = Math.round(gray + (b - gray) * saturation);

  return "#" +
    nr.toString(16).padStart(2, "0") +
    ng.toString(16).padStart(2, "0") +
    nb.toString(16).padStart(2, "0");
}

function revealHardModeImage() {
  const placeholder = document.getElementById("hardModeImage");

  if (!placeholder) return;

  const imageUrl = placeholder.dataset.image;

  if (!imageUrl) return;

  placeholder.outerHTML = `
    <img src="${imageUrl}" alt="">
  `;
}

function revealAnswerInfo() {
  const revealInfo = document.getElementById("revealInfo");

  if (!revealInfo || !currentQuestion?.item) return;

  revealInfo.innerHTML = `
    <h2 class="author">
      ${currentQuestion.item.autor}
    </h2>

    <p class="work-title">
      ${currentQuestion.item.titulo}
    </p>
  `;

  revealInfo.classList.add("is-visible");
}

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function clearFragmentTimer() {
  if (fragmentTimer) {
    clearTimeout(fragmentTimer);
    fragmentTimer = null;
  }
}

function stopAudio() {
  clearFragmentTimer();
  currentAudioPlayer.pause();
  currentAudioPlayer.currentTime = 0;
  currentAudioPlayer.src = "";
  isPlaying = false;
}

function chooseFragmentStart(duration) {
  if (!Number.isFinite(duration) || duration <= maxFragmentSeconds) return 0;

  const maxStart = Math.max(0, duration - maxFragmentSeconds);
  return Math.random() * maxStart;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function updateAudioUI() {
  const playButton = document.getElementById("audioPlayButton");
  const progressFill = document.getElementById("audioProgressFill");
  const timeEl = document.getElementById("audioTime");

  const elapsed = Math.max(0, currentAudioPlayer.currentTime - fragmentStart);
  const duration = fragmentDuration || maxFragmentSeconds;
  const percent = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  if (playButton) {
    playButton.classList.toggle("is-playing", !currentAudioPlayer.paused);
  }

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }

  if (timeEl) {
    timeEl.textContent = formatTime(elapsed);
  }
}

function scheduleFragmentStop() {
  clearFragmentTimer();

  const endTime = fragmentStart + fragmentDuration;
  const remaining = endTime - currentAudioPlayer.currentTime;

  if (remaining <= 0) return;

  fragmentTimer = setTimeout(() => {
    currentAudioPlayer.pause();
    currentAudioPlayer.currentTime = fragmentStart;
    isPlaying = false;
    updateAudioUI();
  }, remaining * 1000);
}

function loadAndPlayAudio(item) {
  stopAudio();

  if (!item.audio) return;

  currentAudioPlayer.src = item.audio;
  currentAudioPlayer.preload = "auto";

  const onMetadata = () => {
    const duration = Number.isFinite(currentAudioPlayer.duration)
      ? currentAudioPlayer.duration
      : 0;

    fragmentStart = chooseFragmentStart(duration);
    fragmentDuration = Math.min(maxFragmentSeconds, Math.max(0, duration - fragmentStart));

    currentAudioPlayer.currentTime = fragmentStart;

    currentAudioPlayer.play()
      .then(() => {
        isPlaying = true;
        updateAudioUI();
        scheduleFragmentStop();
      })
      .catch(() => {
        isPlaying = false;
        updateAudioUI();
      });

    currentAudioPlayer.removeEventListener("loadedmetadata", onMetadata);
  };

  currentAudioPlayer.addEventListener("loadedmetadata", onMetadata);
}

function toggleAudioPlay() {
  if (!currentAudioPlayer.src) return;

  if (currentAudioPlayer.paused) {
    currentAudioPlayer.play()
      .then(() => {
        isPlaying = true;
        updateAudioUI();
        scheduleFragmentStop();
      })
      .catch(() => {});
  } else {
    currentAudioPlayer.pause();
    clearFragmentTimer();
    isPlaying = false;
    updateAudioUI();
  }
}

function loadCSV() {
  detailEl.innerHTML = "<p>Cargando...</p>";

  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,

    complete(results) {
      items = results.data
        .map(mapRow)
        .filter(item => item.titulo || item.autor);

      renderHome();
    },

    error() {
      detailEl.innerHTML = "<p>Error cargando Google Sheets.</p>";
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
          maxFragmentSeconds = homeMeta.duracion || 60;
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
