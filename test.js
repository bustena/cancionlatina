const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";
const HOME_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=1844389020&single=true&output=csv";

const detailEl = document.getElementById("detail");

let items = [];
let selectedMode = "pais";
let selectedDifficulty = "facil";
const QUESTIONS_PER_ROUND = 3;

let homeMeta = null;
let currentQuestion = null;
let score = 0;
let questionNumber = 0;
let correctCount = 0;
let wrongCount = 0;
let roundItems = [];
let roundIndex = 0;

const gainSound = new Audio("assets/gain.mp3");
const lossSound = new Audio("assets/loss.mp3");

function normalizeColor(value) {
  const raw = String(value || "").trim();
  if (!raw) return "#c9b79c";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  return "#c9b79c";
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

function renderHome() {
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
              <button class="tag ${selectedDifficulty === "facil" ? "active" : ""}" data-difficulty="facil">Fácil</button>
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
      renderHome();
    };
  });

  detailEl.querySelectorAll("[data-difficulty]").forEach(button => {
    button.onclick = () => {
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

function renderGamePanel() {
  const leftHeader = document.querySelector(".left-header");

  if (!leftHeader) return;

  leftHeader.innerHTML = `
    <h1 class="app-title">TEST</h1>

    <div class="game-panel">
      <div class="panel-card">
        <span class="panel-label">Modo</span>
        <span class="panel-value">${getModeLabel(selectedMode)}</span>
      </div>

      <div class="panel-card">
        <span class="panel-label">Dificultad</span>
        <span class="panel-value">${selectedDifficulty === "facil" ? "Fácil" : "Difícil"}</span>
      </div>

      <div class="panel-card">
        <span class="panel-label">Pregunta</span>
        <span class="panel-value">${questionNumber} / ${QUESTIONS_PER_ROUND}</span>
      </div>

      <div class="panel-card">
        <span class="panel-label">Puntuación</span>
        <span class="panel-value">${score}</span>
      </div>

      <div class="panel-card">
        <span class="panel-label">Aciertos</span>
        <span class="panel-value">${correctCount}</span>
      </div>

      <div class="panel-card">
        <span class="panel-label">Fallos</span>
        <span class="panel-value">${wrongCount}</span>
      </div>

      <button class="primary-button" id="homeButton">
        Inicio
      </button>
    </div>
  `;

  const homeButton = document.getElementById("homeButton");

  if (homeButton) {
    homeButton.onclick = () => {
      renderHome();
    };
  }
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

function startRound() {
  score = 0;
  questionNumber = 0;
  correctCount = 0;
  wrongCount = 0;

  const candidates = items.filter(item => item.pais);

  roundItems = shuffle(candidates).slice(0, QUESTIONS_PER_ROUND);
  roundIndex = 0;

  startCountryQuestion();
}

function startCountryQuestion() {
  if (roundIndex >= roundItems.length) {
    renderEndScreen();
    return;
  }

  questionNumber = roundIndex + 1;
  renderGamePanel();

  const item = roundItems[roundIndex];
  roundIndex += 1;

  const correctAnswer = item.pais;

  const wrongAnswers = shuffle(
    getUniqueCountries().filter(country => country !== correctAnswer)
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

  renderCountryQuestion(item, options);
}

function renderCountryQuestion(item, options) {

  const accentColor = item.color || "#c9b79c";
  const darkAccentColor = darkenColor(accentColor, 0.70);

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
          style="background:${item.color || "#c9b79c"};"
        >
          ${
            item.imagen
              ? `<img src="${item.imagen}" alt="">`
              : `<div class="no-image">Sin imagen</div>`
          }
        </div>

        <div class="content-column">

          <p class="question-kicker">
            ¿De qué país es esta audición?
          </p>

          <h2 class="author">
            ${item.autor}
          </h2>

          <p class="work-title">
            ${item.titulo}
          </p>

          <p class="question-year">
            ${item.ano || ""}
          </p>

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

        playSound(gainSound);
        renderGamePanel();

        nextButton.disabled = false;
      } else {
        button.classList.add("wrong");

        score -= 2;
        wrongCount += 1;

        feedback.textContent = "✗ Inténtalo de nuevo";
        feedback.className = "feedback is-error";

        playSound(lossSound);
        renderGamePanel();
      }
    };
  });

  nextButton.onclick = () => {
    startCountryQuestion();
  };
}

function renderEndScreen() {
  renderGamePanel();

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

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
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
