let levelsData = [];

document.addEventListener("DOMContentLoaded", () => {
  fetch("levels.json")
    .then(response => response.json())
    .then(data => {
      levelsData = data;
      renderLevels(levelsData);
      renderLeaderboard(levelsData);
      populateLevelSelect(levelsData);
    })
    .catch(error => console.error("Error cargando los datos:", error));
});

// Control de pestañas
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  event.target.classList.add('active');
}

// Renderizar Niveles con Victors
function renderLevels(levels) {
  const container = document.getElementById("list-container");
  container.innerHTML = "";

  levels.sort((a, b) => a.position - b.position);

  levels.forEach(level => {
    const victors = level.records ? level.records.filter(r => r.percent === 100) : [];

    const card = document.createElement("div");
    card.className = "level-card";

    let recordsHTML = victors.map(r => `
      <div class="record-item">
        <span><strong>${r.user}</strong> (${r.hz}Hz)</span>
        <a href="${r.video}" target="_blank">Ver Proof</a>
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
        <h4>Victors (${victors.length})</h4>
        ${recordsHTML.length > 0 ? recordsHTML : "<p style='color:#777;'>Aún no hay victors registrados.</p>"}
      </div>
    `;

    container.appendChild(card);
  });
}

// Calcular y renderizar el Leaderboard
function renderLeaderboard(levels) {
  const players = {};

  levels.forEach(level => {
    if (!level.records) return;

    level.records.forEach(record => {
      if (record.percent === 100) {
        if (!players[record.user]) {
          players[record.user] = { points: 0, victors: 0 };
        }
        players[record.user].points += (level.points || 100);
        players[record.user].victors += 1;
      }
    });
  });

  // Convertir a lista y ordenar por puntos
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

// Llenar selector del formulario
function populateLevelSelect(levels) {
  const select = document.getElementById("level-select");
  select.innerHTML = levels.map(l => `<option value="${l.name}">${l.name} (#${l.position})</option>`).join("");
}

// Formulario ficticio de envío (Para guardar en BD real se usa Supabase)
function submitRecord(e) {
  e.preventDefault();
  const user = document.getElementById("username").value;
  const level = document.getElementById("level-select").value;
  
  document.getElementById("submit-msg").innerText = 
    `¡Gracias ${user}! Tu récord en ${level} ha sido enviado a revisión.`;
  
  document.getElementById("record-form").reset();
}
