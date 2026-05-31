const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJM_fPxtlc5UEyNf0DHLNg5B4tGIm8Qbba3k78kbQDRj9a9jGpSDRHwz_UOgAz4jbpcRJKHEUe1eNY/pub?gid=0&single=true&output=csv";

const detailEl = document.getElementById("detail");

let items = [];

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
      <div class="content-column">

        <h1>TEST</h1>

        <p>
          ${items.length} audiciones cargadas
        </p>

        <h3>Modalidad</h3>

        <p>País</p>
        <p>Ritmo</p>
        <p>Año</p>
        <p>Autor / Título</p>

      </div>
    </article>
  `;
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
