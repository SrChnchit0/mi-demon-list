const SUPABASE_URL = "https://jdvgdgiomrbmlxvvjvhd.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdmdkZ2lvbXJibWx4dnZqdmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDY5ODQsImV4cCI6MjEwNjEyMjk4NH0.N842TjW2BF6bjk6vf5mL3LJNCP6PPu3Z_PSGKlnd2EI";

let supabase = null;
if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Funciones para botones
function openAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "flex";
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "none";
}

function showSection(sec) {
  const sections = ["levels", "leaderboard", "submit", "rules"];
  sections.forEach(s => {
    const el = document.getElementById(`sec-${s}`);
    if (el) el.style.display = (s === sec) ? "block" : "none";
  });
}

// Carga inmediata de prueba
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("levels-container");
  if (!container) return;

  if (!supabase) {
    container.innerHTML = "<p style='color: yellow;'>Librería Supabase no encontrada.</p>";
    return;
  }

  const { data, error } = await supabase.from("levels").select("*");

  if (error) {
    container.innerHTML = `<p style='color: red;'>Error de Supabase: ${error.message}</p>`;
  } else if (!data || data.length === 0) {
    container.innerHTML = "<p style='color: green;'>¡Conectado! La tabla 'levels' está vacía.</p>";
  } else {
    container.innerHTML = data.map(l => `<p style='color: #00ffff;'>#${l.position} - ${l.name} (${l.points} pts)</p>`).join("");
  }
});
