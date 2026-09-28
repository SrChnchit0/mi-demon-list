// CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://jdvgdgiomrbmlxvvjvhd.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdmdkZ2lvbXJibWx4dnZqdmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDY5ODQsImV4cCI6MjEwNjEyMjk4NH0.N842TjW2BF6bjk6vf5mL3LJNCP6PPu3Z_PSGKlnd2EI";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// VARIABLES GLOBALES
let currentUser = null;
let isSignUpMode = false;

// 1. INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", async () => {
  // Verificar sesión existente
  const { data: { session } } = await _supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    updateUserUI();
  }

  // Escuchar cambios de autenticación
  _supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    updateUserUI();
  });

  // Cargar datos iniciales
  loadLevels();
  loadLeaderboard();
  loadPreviousSubmissions();
});

// NAVEGACIÓN ENTRE PESTAÑAS
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`tab-${tabId}`).classList.add('active');
  event.target.classList.add('active');
}

// 2. SISTEMA DE AUTENTICACIÓN (LOGIN / REGISTRO)
function updateUserUI() {
  const loggedInDiv = document.getElementById("user-logged-in");
  const loggedOutDiv = document.getElementById("user-logged-out");
  const userDisplay = document.getElementById("user-display-name");
  const usernameInput = document.getElementById("username");

  if (currentUser) {
    const username = currentUser.user_metadata?.username || currentUser.email.split('@')[0];
    userDisplay.innerText = username;
    loggedInDiv.style.display = "flex";
    loggedOutDiv.style.display = "none";
    
    if (usernameInput) {
      usernameInput.value = username;
      usernameInput.readOnly = true;
    }
  } else {
    loggedInDiv.style.display = "none";
    loggedOutDiv.style.display = "block";
    
    if (usernameInput) {
      usernameInput.value = "";
      usernameInput.placeholder = "Inicia sesión para enviar un récord";
      usernameInput.readOnly = true;
    }
  }
}

function showAuthModal() {
  document.getElementById("auth-modal").style.display = "flex";
}

function closeAuthModal() {
  document.getElementById("auth-modal").style.display = "none";
}

function toggleAuthMode(e) {
  e.preventDefault();
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById("modal-title");
  const btn = document.getElementById("auth-submit-btn");
  const link = document.getElementById("toggle-auth-mode");
  const usernameInput = document.getElementById("auth-username");

  if (isSignUpMode) {
    title.innerText = "Crear Cuenta";
    btn.innerText = "Registrarse";
    link.innerText = "¿Ya tienes cuenta? Inicia sesión";
    usernameInput.style.display = "block";
  } else {
    title.innerText = "Iniciar Sesión";
    btn.innerText = "Entrar";
    link.innerText = "¿No tienes cuenta? Regístrate aquí";
    usernameInput.style.display = "none";
  }
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  const username = document.getElementById("auth-username").value;

  if (isSignUpMode) {
    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username } }
    });

    if (error) {
      alert("Error en el registro: " + error.message);
    } else {
      alert("¡Cuenta creada exitosamente!");
      closeAuthModal();
    }
  } else {
    const { data, error } = await _supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
    } else {
      closeAuthModal();
    }
  }
}

async function logout() {
  await _supabase.auth.signOut();
  currentUser = null;
  updateUserUI();
}

// 3. FORMATEO DE VIDEOS A EMBED
function formatYouTubeEmbed(url) {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(new URL(url).search);
    videoId = urlParams.get('v');
  } else if (url.includes('youtube.com/embed/')) {
    return url;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

// 4. CARGA DE DATOS DESDE SUPABASE
async function loadLevels() {
  const { data: levels, error } = await _supabase
    .from('levels')
    .select('*')
    .order('position', { ascending: true });

  if (error) return console.error(error);

  const container = document.getElementById('levels-container');
  const select = document.getElementById('level-select');
  container.innerHTML = '';
  select.innerHTML = '';

  levels.forEach(level => {
    const embedUrl = formatYouTubeEmbed(level.video_url);
    
    // Card para el Tab de Niveles
    container.innerHTML += `
      <div class="level-card">
        <div class="level-rank">#${level.position}</div>
        <h3>${level.name}</h3>
        <p class="creator">por ${level.creator}</p>
        <div class="video-wrapper">
          <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
        </div>
        <p class="points">Puntos: <strong>${level.points}</strong></p>
      </div>
    `;

    // Opciones para el select de Submit
    select.innerHTML += `<option value="${level.name}">${level.name}</option>`;
  });
}

async function loadLeaderboard() {
  const { data: lb, error } = await _supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false });

  if (error) return console.error(error);

  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '';

  lb.forEach((player, index) => {
    tbody.innerHTML += `
      <tr>
        <td>#${index + 1}</td>
        <td><strong>${player.username}</strong></td>
        <td>${player.total_points} pts</td>
        <td>${player.demons_completed}</td>
      </tr>
    `;
  });
}

async function loadPreviousSubmissions() {
  const { data: submissions, error } = await _supabase
    .from('records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return console.error(error);

  const container = document.getElementById('previous-submissions');
  container.innerHTML = '';

  submissions.forEach(sub => {
    const statusClass = sub.status === 'approved' ? 'status-approved' : (sub.status === 'rejected' ? 'status-rejected' : 'status-pending');
    container.innerHTML += `
      <div class="submission-card">
        <div>
          <strong>${sub.username}</strong> - ${sub.level_name} (${sub.percent}%)
        </div>
        <span class="status-badge ${statusClass}">${sub.status.toUpperCase()}</span>
      </div>
    `;
  });
}

// 5. PROCESAMIENTO Y ENVÍO DE RÉCORDS
async function submitRecord(e) {
  e.preventDefault();
  
  if (!currentUser) {
    alert("Debes iniciar sesión para subir un récord.");
    showAuthModal();
    return;
  }

  const username = currentUser.user_metadata?.username || currentUser.email.split('@')[0];
  const level_name = document.getElementById("level-select").value;
  const percent = parseInt(document.getElementById("percent").value);
  const hz = parseInt(document.getElementById("hz").value);
  const video_url = document.getElementById("video-url").value;

  const { data, error } = await _supabase
    .from('records')
    .insert([
      { 
        username, 
        level_name, 
        percent, 
        hz, 
        video_url, 
        status: 'pending',
        user_id: currentUser.id 
      }
    ]);

  const msg = document.getElementById("submit-msg");

  if (error) {
    msg.style.color = "#e74c3c";
    msg.innerText = "Error al enviar el récord. Intenta de nuevo.";
  } else {
    msg.style.color = "#2ecc71";
    msg.innerText = `¡Gracias ${username}! Tu récord en ${level_name} fue enviado a revisión.`;
    
    document.getElementById("record-form").reset();
    loadPreviousSubmissions();

    // Notificar al canal privado #records de Discord
    sendDiscordNotification({ username, level_name, percent, hz, video_url });
  }
}

// Envío a Discord (Canal Privado #records)
async function sendDiscordNotification(record) {
  // ⚠️ PEGA AQUÍ LA URL DE TU WEBHOOK PRIVADO
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1553966150277275758/guiKF0NBX1D-b3qOcjGBLx5ClICBA0ToBImdoItn-yAEea3qUIBFOx-xcnKZsXjBV1nG";

  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("URL_DE_TU_WEBHOOK")) return;

  const payload = {
    username: "Demon List Bot",
    embeds: [
      {
        title: "📥 ¡Nuevo Récord Enviado!",
        color: 16729943, // Rojo Neón
        fields: [
          { name: "👤 Jugador", value: record.username, inline: true },
          { name: "📌 Nivel", value: record.level_name, inline: true },
          { name: "📊 Porcentaje", value: `${record.percent}%`, inline: true },
          { name: "⚡ Tasa (Hz)", value: `${record.hz} Hz`, inline: true },
          { name: "🎥 Video / Proof", value: `[Ver Video](${record.video_url})`, inline: false }
        ],
        footer: { text: "Demon List Submission System" },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Error enviando notificación a Discord:", err);
  }
}
