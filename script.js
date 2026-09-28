// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://jdvgdgiomrbmlxvvjvhd.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdmdkZ2lvbXJibWx4dnZqdmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDY5ODQsImV4cCI6MjEwNjEyMjk4NH0.N842TjW2BF6bjk6vf5mL3LJNCP6PPu3Z_PSGKlnd2EI";

let supabase = null;
try {
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error("Error al inicializar Supabase:", e);
}

let currentUser = null;

// ==========================================
// FUNCIONES DE INTERFAZ Y MODAL (RESPUESTA INMEDIATA)
// ==========================================
function openAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "flex";
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "none";
}

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  const title = document.getElementById("modal-title");
  const submitBtn = document.getElementById("auth-submit-btn");
  const switchLink = document.getElementById("auth-switch-link");
  if (!title) return;

  const isLogin = title.textContent === "Iniciar Sesión";
  title.textContent = isLogin ? "Crear Cuenta" : "Iniciar Sesión";
  if (submitBtn) submitBtn.textContent = isLogin ? "Registrarse" : "Entrar";
  if (switchLink) switchLink.textContent = isLogin ? "Inicia Sesión" : "Regístrate";
}

function showSection(sectionName) {
  const sections = ["levels", "leaderboard", "submit", "rules"];
  sections.forEach(sec => {
    const el = document.getElementById(`sec-${sec}`);
    if (el) el.style.display = (sec === sectionName) ? "block" : "none";
  });

  if (sectionName === "leaderboard") loadLeaderboard();
  if (sectionName === "submit" && currentUser) loadPreviousSubmissions();
}

// ==========================================
// CARGA DE NIVELES (CON TIMEOUT DE SEGURIDAD)
// ==========================================
async function loadLevels() {
  const container = document.getElementById("levels-container");
  if (!container) return;

  if (!supabase) {
    container.innerHTML = "<p style='color: var(--text-muted);'>No se pudo inicializar la conexión.</p>";
    return;
  }

  try {
    const fetchPromise = supabase
      .from("levels")
      .select("*")
      .order("position", { ascending: true });

    // Cancela la espera si Supabase tarda más de 3 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 3000)
    );

    const { data: levels, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error) throw error;

    if (!levels || levels.length === 0) {
      container.innerHTML = "<p style='color: var(--text-muted);'>No hay niveles registrados en la base de datos.</p>";
      return;
    }

    container.innerHTML = levels.map(level => `
      <div style="background: var(--bg-color); padding: 15px; margin-bottom: 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--accent-color); font-size: 1.1rem;">#${level.position} - ${level.name}</strong>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Creador: ${level.creator || 'Desconocido'} | Puntos: ${level.points || 0}</p>
        </div>
        ${level.video_url ? `<a href="${level.video_url}" target="_blank" class="btn" style="text-decoration: none; font-size: 0.8rem;">Ver Showcase</a>` : ''}
      </div>
    `).join("");

    const levelSelect = document.getElementById("level-select");
    if (levelSelect) {
      levelSelect.innerHTML = levels.map(l => `<option value="${l.id}">${l.name}</option>`).join("");
    }
  } catch (err) {
    console.warn("Aviso:", err);
    container.innerHTML = "<p style='color: var(--text-muted);'>No se pudieron obtener los niveles en este momento.</p>";
  }
}

// ==========================================
// AUTENTICACIÓN (SUPABASE AUTH)
// ==========================================
async function checkSession() {
  if (!supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session?.user || null);
  } catch (e) {
    console.error(e);
  }
}

function updateAuthUI(user) {
  currentUser = user;
  const authBtn = document.getElementById("auth-btn");
  const usernameInput = document.getElementById("username");

  if (user) {
    const name = user.user_metadata?.username || user.email.split("@")[0];
    if (authBtn) {
      authBtn.textContent = `Hola, ${name}`;
      authBtn.onclick = logout;
    }
    if (usernameInput) {
      usernameInput.value = name;
      usernameInput.disabled = true;
    }
  } else {
    if (authBtn) {
      authBtn.textContent = "Iniciar Sesión";
      authBtn.onclick = openAuthModal;
    }
    if (usernameInput) {
      usernameInput.value = "";
      usernameInput.placeholder = "Inicia sesión para enviar un récord";
      usernameInput.disabled = true;
    }
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  if (!supabase) return alert("Error de conexión con Supabase.");

  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  const isRegister = document.getElementById("modal-title").textContent.includes("Registro") || 
                     document.getElementById("modal-title").textContent.includes("Crear");

  if (isRegister) {
    const username = prompt("Ingresa tu nombre de usuario para la Demon List:");
    if (!username) return;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });

    if (error) alert("Error al registrarse: " + error.message);
    else {
      alert("¡Cuenta creada con éxito!");
      updateAuthUI(data.user);
      closeAuthModal();
    }
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error al iniciar sesión: " + error.message);
    else {
      updateAuthUI(data.user);
      closeAuthModal();
    }
  }
}

async function logout() {
  if (!supabase) return;
  await supabase.auth.signOut();
  updateAuthUI(null);
  alert("Sesión cerrada");
}

// ==========================================
// RÉCORDS Y NOTIFICACIÓN DISCORD
// ==========================================
async function handleRecordSubmit(e) {
  e.preventDefault();
  if (!currentUser) return alert("Debes iniciar sesión para subir un récord");
  if (!supabase) return;

  const level_id = document.getElementById("level-select").value;
  const percent = document.getElementById("percent").value;
  const hz = document.getElementById("hz").value;
  const video_url = document.getElementById("video-url").value;
  const username = currentUser.user_metadata?.username || currentUser.email.split("@")[0];

  const { error } = await supabase.from("records").insert([{
    user_id: currentUser.id,
    username,
    level_id,
    percent,
    hz,
    video_url,
    status: "pending"
  }]);

  if (error) alert("Error al enviar récord: " + error.message);
  else {
    alert("¡Récord enviado con éxito a revisión!");
    document.getElementById("record-form").reset();
    sendDiscordNotification({ username, percent, hz, video_url });
    loadPreviousSubmissions();
  }
}

async function sendDiscordNotification(record) {
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1553966150277275758/guiKF0NBX1D-b3qOcjGBLx5ClICBA0ToBImdoItn-yAEea3qUIBFOx-xcnKZsXjBV1nG";

  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Demon List Bot",
      embeds: [{
        title: "📥 ¡Nuevo Récord Enviado!",
        color: 16729943,
        fields: [
          { name: "👤 Jugador", value: record.username, inline: true },
          { name: "📊 Porcentaje", value: `${record.percent}%`, inline: true },
          { name: "⚡ Hz", value: `${record.hz}Hz`, inline: true },
          { name: "🎥 Prueba", value: `[Ver Video](${record.video_url})`, inline: false }
        ],
        footer: { text: "Demon List Submission System" },
        timestamp: new Date().toISOString()
      }]
    })
  });
}

async function loadPreviousSubmissions() {
  const container = document.getElementById("previous-submissions");
  if (!container || !currentUser || !supabase) return;

  const { data: records, error } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", currentUser.id);

  if (error || !records || records.length === 0) {
    container.innerHTML = "<p style='color: var(--text-muted);'>No has enviado récords aún.</p>";
    return;
  }

  container.innerHTML = records.map(r => `
    <div style="background: var(--bg-color); padding: 10px; margin-bottom: 8px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.9rem;">
      <strong>${r.percent}%</strong> - Estado: 
      <span style="color: ${r.status === 'approved' ? 'var(--success-color)' : r.status === 'rejected' ? 'var(--danger-color)' : 'orange'};">
        ${r.status.toUpperCase()}
      </span>
    </div>
  `).join("");
}

async function loadLeaderboard() {
  const body = document.getElementById("leaderboard-body");
  if (!body || !supabase) return;
  body.innerHTML = "<tr><td colspan='4'>Cargando clasificación...</td></tr>";

  const { data: records, error } = await supabase
    .from("records")
    .select("*")
    .eq("status", "approved");

  if (error || !records || records.length === 0) {
    body.innerHTML = "<tr><td colspan='4'>No hay récords aprobados aún.</td></tr>";
    return;
  }

  const scores = {};
  records.forEach(r => {
    scores[r.username] = (scores[r.username] || 0) + 100;
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  body.innerHTML = sorted.map(([user, pts], idx) => `
    <tr>
      <td>#${idx + 1}</td>
      <td><strong>${user}</strong></td>
      <td>${pts} pts</td>
      <td>-</td>
    </tr>
  `).join("");
}

// Inicializar al cargar
document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  loadLevels();
});
