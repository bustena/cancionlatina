const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";

const detailEl = document.getElementById("detail");

let items = [];
let selectedMode = "pais";
let selectedDifficulty = "facil";

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
  detailEl.innerHTML = `
    <article class="card">
      <div class="content-column home-content">

        <h1>TEST</h1>

        <p>
          ${items.length} audiciones cargadas
        </p>

        <div class="home-section">
          <h3 class="home-section-title">Modalidad</h3>

          <div class="mode-grid">
            <button class="tag ${selectedMode === "pais" ? "active" : ""}" data-mode="pais">País</button>
            <button class="tag ${selectedMode === "ritmo" ? "active" : ""}" data-mode="ritmo">Ritmo</button>
            <button class="tag ${selectedMode === "ano" ? "active" : ""}" data-mode="ano">Año</button>
            <button class="tag ${selectedMode === "autorTitulo" ? "active" : ""}" data-mode="autorTitulo">Autor / Título</button>
          </div>
        </div>

        <div class="home-section">
          <h3 class="home-section-title">Dificultad</h3>

          <div class="difficulty-grid">
            <button class="tag ${selectedDifficulty === "facil" ? "active" : ""}" data-difficulty="facil">Fácil</button>
            <button class="tag ${selectedDifficulty === "dificil" ? "active" : ""}" data-difficulty="dificil">Difícil</button>
          </div>
        </div>

        <div class="home-section">
          <button class="primary-button" id="startGameButton">
            Empezar
          </button>
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
      alert(`Modo: ${selectedMode}\nDificultad: ${selectedDifficulty}`);
    };
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

loadCSV();
