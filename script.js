// Tus claves de conexión a Supabase
const SUPABASE_URL = "https://jdvgdgiomrbmlxvvjvhd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdmdkZ2lvbXJibWx4dnZqdmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDY5ODQsImV4cCI6MjEwNjEyMjk4NH0.N842TjW2BF6bjk6vf5mL3LJNCP6PPu3Z_PSGKlnd2EI"; // Pegar aquí la clave pública muy larga

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let levelsData = [];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("levels.json");
    levelsData = await response.json();
    
    // Obtener récords aprobados de Supabase
    const approvedRecords = await fetchApprovedRecords();

    renderLevels(levelsData, approvedRecords);
    renderLeaderboard(levelsData, approvedRecords);
    populateLevelSelect(levelsData);
  } catch (error) {
    console.error("Error al cargar la lista o los récords:", error);
  }
});

// Obtener solo récords con estado 'approved' desde Supabase
async function fetchApprovedRecords() {
  const { data, error } = await _supabase
    .from('records')
    .select('*')
    .eq('status', 'approved');

  if (error) {
    console.error("Error consultando Supabase:", error);
    return [];
  }
  return data || [];
}

// Cambiar de pestañas
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  if (event && event.target) {
    event.target.classList.add('active');
  }
}

// Renderizar niveles en pantalla
function renderLevels(levels, dbRecords) {
  const container = document.getElementById("list-container");
  container.innerHTML = "";

  levels.sort((a, b) => a.position - b.position);

  levels.forEach(level => {
    // Combinar récords locales de levels.json y aprobados de Supabase
    const jsonRecords = level.records || [];
    const supabaseMatch = dbRecords.filter(r => r.level_name === level.name && r.percent === 100)
      .map(r => ({ user: r.username, hz: r.hz, video: r.video_url }));

    const allVictors = [...jsonRecords, ...supabaseMatch];

    const card = document.createElement("div");
    card.className = "level-card";

    let recordsHTML = allVictors.map(r => `
      <div class="record-item">
        <span><strong>${r.user}</strong> (${r.hz}Hz)</span>
        <a href="${r.video}" target="_blank" rel="noopener noreferrer">Ver Proof</a>
      </div>
    `).join("");

    card.innerHTML = `
      <div class="level-header">
        <span class="position">#${level.position}</span>
        <div>
          <h2>${level.name}</h2>
          <p><strong>Creador:</strong> ${level.publisher} | <strong>Puntos:</strong> ${level.points || 100} pts</p>
          <p><strong>Verificador:</strong> ${level.verifier}</p>
        </div>
      </div>
      <div class="video-wrapper">
        <iframe src="${level.video}" allowfullscreen></iframe>
      </div>
      <div class="records-section">
        <h4>Victors (${allVictors.length})</h4>
        ${recordsHTML.length > 0 ? recordsHTML : "<p style='color:#777;'>Aún no hay victors registrados.</p>"}
      </div>
    `;

    container.appendChild(card);
  });
}

// Calcular tabla de puntos
function renderLeaderboard(levels, dbRecords) {
  const players = {};

  // Procesar récords de levels.json
  levels.forEach(level => {
    const jsonRecords = level.records || [];
    jsonRecords.forEach(record => {
      if (record.percent === 100) {
        if (!players[record.user]) players[record.user] = { points: 0, victors: 0 };
        players[record.user].points += (level.points || 100);
        players[record.user].victors += 1;
      }
    });
  });

  // Procesar récords aprobados de Supabase
  dbRecords.forEach(record => {
    if (record.percent === 100) {
      const level = levels.find(l => l.name === record.level_name);
      const points = level ? (level.points || 100) : 100;

      if (!players[record.username]) players[record.username] = { points: 0, victors: 0 };
      players[record.username].points += points;
      players[record.username].victors += 1;
    }
  });

  const sortedPlayers = Object.keys(players)
    .map(name => ({ name, ...players[name] }))
    .sort((a, b) => b.points - a.points);

  const tbody = document.getElementById("leaderboard-body");
  tbody.innerHTML = sortedPlayers.map((player, index) => `
    <tr>
      <td><strong>#${index + 1}</strong></td>
      <td>${player.name}</td>
      <td>${player.points} pts</td>
      <td>${player.victors} Demons</td>
    </tr>
  `).join("");
}

// Llenar selector de niveles en el formulario
function populateLevelSelect(levels) {
  const select = document.getElementById("level-select");
  select.innerHTML = levels.map(l => `<option value="${l.name}">${l.name} (#${l.position})</option>`).join("");
}

// Enviar récord a Supabase
async function submitRecord(e) {
  e.preventDefault();
  
  const username = document.getElementById("username").value;
  const level_name = document.getElementById("level-select").value;
  const percent = parseInt(document.getElementById("percent").value);
  const hz = parseInt(document.getElementById("hz").value);
  const video_url = document.getElementById("video-url").value;

  const { data, error } = await _supabase
    .from('records')
    .insert([
      { username, level_name, percent, hz, video_url, status: 'pending' }
    ]);

  const msg = document.getElementById("submit-msg");
  if (error) {
    msg.style.color = "#e74c3c";
    msg.innerText = "Error al enviar el récord. Intenta de nuevo.";
    console.error(error);
  } else {
    msg.style.color = "#2ecc71";
    msg.innerText = `¡Gracias ${username}! Tu récord en ${level_name} fue enviado a revisión.`;
    document.getElementById("record-form").reset();
  }
}
