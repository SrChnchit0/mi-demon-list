// Configuración de Supabase
const SUPABASE_URL = "https://jdvgdgiomrbmlxvv.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdmdkZ2lvbXJibWx4dnZqdmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDY5ODQsImV4cCI6MjEwNjEyMjk4NH0.N842TjW2BF6bjk6vf5mL3LJNCP6PPu3Z_PSGKlnd2EI";

let supabase = null;

// Inicialización segura
try {
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error("Error al iniciar Supabase:", e);
}

let currentUser = null;

// Funciones de navegación (Pestañas)
function showSection(sectionName) {
  const sections = ["levels", "leaderboard", "submit", "rules"];
  sections.forEach(sec => {
    const el = document.getElementById("sec-" + sec);
    if (el) el.style.display = (sec === sectionName) ? "block" : "none";
  });
}

// Funciones para abrir y cerrar el Modal
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

  const isLogin = title.textContent.includes("Iniciar");
  title.textContent = isLogin ? "Crear Cuenta" : "Iniciar Sesión";
  if (submitBtn) submitBtn.textContent = isLogin ? "Registrarse" : "Entrar";
  if (switchLink) switchLink.textContent = isLogin ? "Inicia Sesión" : "Regístrate";
}

// Cargar niveles
async function loadLevels() {
  const container = document.getElementById("levels-container");
  if (!container || !supabase) return;

  const { data: levels, error } = await supabase.from("levels").select("*").order("position", { ascending: true });

  if (error || !levels || levels.length === 0) {
    container.innerHTML = "<p style='color: var(--text-muted);'>No hay niveles cargados aún.</p>";
    return;
  }

  container.innerHTML = levels.map(l => `
    <div style="background: var(--bg-color); padding: 12px; margin-bottom: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
      <strong style="color: var(--accent-color);">#${l.position} - ${l.name}</strong>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  loadLevels();
});
