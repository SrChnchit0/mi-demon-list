const SUPABASE_URL = "https://jdvgdgiomrbmlxvvjvhd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdmdkZ2lvbXJibWx4dnZqdmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDY5ODQsImV4cCI6MjEwNjEyMjk4NH0.N842TjW2BF6bjk6vf5mL3LJNCP6PPu3Z_PSGKlnd2EI"; // Asegúrate de mantener tu anon key aquí

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let levelsData = [];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("levels.json");
    levelsData = await response.json();
    
    // Obtener récords aprobados para niveles y leaderboard
    const approvedRecords = await fetchApprovedRecords();

    renderLevels(levelsData, approvedRecords);
    renderLeaderboard(levelsData, approvedRecords);
    populateLevelSelect(levelsData);
    
    // Cargar la lista completa dePrevious Submissions (AREDL)
    loadPreviousSubmissions();
  } catch (error) {
    console.error("Error al cargar datos:", error);
  }
});

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

// Cargar todas las entregas para la sección Previous Submissions
async function loadPreviousSubmissions() {
  const container = document.getElementById("submissions-list");
  if (!container) return;

  const { data, error } = await _supabase
    .from('records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10); // Mostrar los últimos 10 envíos

  if (error || !data || data.length === 0) {
    container.innerHTML = "<p style='color: #777;'>No hay envíos recientes.</p>";
    return;
  }

  container.innerHTML = data.map(sub => {
    const dateFormatted = sub.created_at ? new Date(sub.created_at).toLocaleDateString('es-ES') : "Reciente";
    const statusClass = sub.status === 'approved' ? 'status-approved' : (sub.status === 'rejected' ? 'status-rejected' : 'status-pending');
    const statusText = sub.status === 'approved' ? 'ACCEPTED' : sub.status.toUpperCase();

    return `
      <div class="submission-card">
        <div class="submission-info">
          <strong>${sub.level_name} (${sub.percent}%)</strong>
          <span>Jugador: ${sub.username} | ${sub.hz}Hz | Enviado el: ${dateFormatted}</span>
        </div>
        <div>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
      </div>
    `;
  }).join("");
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  if (event && event.target) {
    event.target.classList.add('active');
  }
}

function renderLevels(levels, dbRecords) {
  const container = document.getElementById("list-container");
  container.innerHTML = "";

  levels.sort((a, b) => a.position - b.position);

  levels.forEach(level => {
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

function renderLeaderboard(levels, dbRecords) {
  const players = {};

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

function populateLevelSelect(levels) {
  const select = document.getElementById("level-select");
  select.innerHTML = levels.map(l => `<option value="${l.name}">${l.name} (#${l.position})</option>`).join("");
}

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
    
    // Recargar la lista de Previous Submissions inmediatamente
    loadPreviousSubmissions();
  }
}
