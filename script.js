const SUPABASE_URL = "https://jdvgdgiomrbmlxvvjvhd.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdmdkZ2lvbXJibWx4dnZqdmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDY5ODQsImV4cCI6MjEwNjEyMjk4NH0.N842TjW2BF6bjk6vf5mL3LJNCP6PPu3Z_PSGKlnd2EI";

// Webhooks de Discord (Privado para nuevos envíos / Público para aprobados o rechazados)
const DISCORD_PRIVATE_WEBHOOK_URL = "https://discord.com/api/webhooks/1553966150277275758/guiKF0NBX1D-b3qOcjGBLx5ClICBA0ToBImdoItn-yAEea3qUIBFOx-xcnKZsXjBV1nG";
const DISCORD_PUBLIC_WEBHOOK_URL = "https://discord.com/api/webhooks/1553966408369573978/Ugr9Q5-zH5gC6mdprG1AuLKToJeiRnojRVZyQYOaiyvuX_12OMNsKH9aqonGqNVCuXKW"; 

// Administrador
const ADMIN_EMAIL = "fermisael.051178@gmail.com";

let supabaseClient = null;
let currentUser = null;
let currentUsername = "";
let globalLevels = [];

try {
  if (window.supabase) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) { console.error(e); }

function openAuthModal() { document.getElementById("auth-modal").style.display = "flex"; }
function closeAuthModal() { document.getElementById("auth-modal").style.display = "none"; }

function enterMainSite() {
    const welcome = document.getElementById("welcome-screen");
    if (welcome) welcome.style.display = "none";
}

function getYouTubeThumbnail(url) {
    if (!url) return null;
    let videoId = null;
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0];
    }
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

function showSection(sec) {
  ["levels", "leaderboard", "submit", "profile", "admin", "rules", "view-profile"].forEach(s => {
    const el = document.getElementById(`sec-${s}`);
    if (el) el.style.display = (s === sec) ? "block" : "none";
  });
  if (sec === 'admin') loadAdminSubmissions();
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      if (confirm("Cuenta no encontrada. ¿Deseas registrar este correo?")) {
        const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({ email, password });
        if (signUpError) alert("Error: " + signUpError.message);
        else { alert("¡Registrado!"); await fetchUserData(signUpData.user); closeAuthModal(); }
      }
    } else alert("Error: " + error.message);
  } else {
    alert("¡Sesión iniciada!");
    await fetchUserData(data.user);
    closeAuthModal();
  }
}

async function sendDiscordEmbed(url, title, description, color = 0x00ffcc, fields = []) {
  if (!url || url.trim() === "") return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: title,
          description: description,
          color: color,
          fields: fields,
          footer: { text: "Geometry Dash Demon List" },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) { console.error("Error enviando webhook embed a Discord:", err); }
}

async function calculateUserPoints(userId) {
  const { data: subs } = await supabaseClient.from("submissions").select("*");
  let totalPoints = 0;
  if (subs && globalLevels.length > 0) {
    subs.forEach(sub => {
      const isApproved = sub.status && ["approved", "aprobado"].includes(String(sub.status).toLowerCase());
      if (isApproved && String(sub.user_id) === String(userId)) {
        const lvl = globalLevels.find(l => String(l.id).trim() === String(sub.level_id).trim());
        if (lvl) {
          totalPoints += (lvl.points || 50);
        }
      }
    });
  }
  return totalPoints;
}

async function fetchUserData(user) {
  currentUser = user;
  const authBtn = document.getElementById("auth-btn");
  const usernameDisplay = document.getElementById("username-display");
  const submitBtn = document.getElementById("submit-record-btn");
  const adminNavBtn = document.getElementById("admin-nav-btn");
  const profileNavBtn = document.getElementById("profile-nav-btn");

  if (user) {
    let { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      const defaultUsername = user.email.split('@')[0];
      const { data: newProfile } = await supabaseClient
        .from("profiles")
        .insert([{ id: user.id, username: defaultUsername, flag: '🇲🇽' }])
        .select()
        .single();
      profile = newProfile;
    }

    currentUsername = profile ? profile.username : user.email.split('@')[0];

    if (authBtn) {
      authBtn.textContent = currentUsername;
      authBtn.onclick = () => { if (confirm("¿Cerrar sesión?")) { supabaseClient.auth.signOut(); location.reload(); } };
    }
    if (usernameDisplay) usernameDisplay.value = currentUsername;
    if (submitBtn) submitBtn.disabled = false;
    if (profileNavBtn) profileNavBtn.style.display = "block";

    document.getElementById("profile-username").value = currentUsername;
    document.getElementById("profile-flag").value = profile?.flag || '🇲🇽';
    document.getElementById("profile-bio-input").value = profile?.bio || "";
    document.getElementById("profile-avatar-input").value = profile?.avatar_url || "";
    document.getElementById("profile-banner-input").value = profile?.banner_url || "";
    
    if (profile?.hardest_level_id) {
      document.getElementById("profile-hardest-select").value = profile.hardest_level_id;
    }

    const points = await calculateUserPoints(user.id);
    renderProfileCard(profile, currentUsername, points);

    if (adminNavBtn && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      adminNavBtn.style.display = "block";
    }
  }
}

function renderProfileCard(profile, username, points = 0) {
  const flag = profile?.flag || '🇲🇽';
  document.getElementById("prev-name").innerHTML = `${flag} ${username}`;
  document.getElementById("prev-bio").textContent = profile?.bio || "Sin biografía configurada.";
  document.getElementById("prev-points").textContent = `${points} pts`;
  
  const bannerEl = document.getElementById("prev-banner");
  if (profile?.banner_url) bannerEl.style.backgroundImage = `url('${profile.banner_url}')`;
  else bannerEl.style.backgroundImage = "none";
  
  const avatarEl = document.getElementById("prev-avatar");
  if (profile?.avatar_url) avatarEl.style.backgroundImage = `url('${profile.avatar_url}')`;
  else avatarEl.style.backgroundImage = "none";

  if (profile?.hardest_level_id) {
    const hardestLvl = globalLevels.find(l => l.id == profile.hardest_level_id);
    document.getElementById("prev-hardest").textContent = hardestLvl ? `#${hardestLvl.position} - ${hardestLvl.name}` : "Desconocido";
  } else {
    document.getElementById("prev-hardest").textContent = "Ninguno";
  }
}

async function updateProfile(e) {
  e.preventDefault();
  if (!currentUser) return;

  const updates = {
    username: document.getElementById("profile-username").value.trim(),
    flag: document.getElementById("profile-flag").value.trim() || '🇲🇽',
    bio: document.getElementById("profile-bio-input").value.trim(),
    avatar_url: document.getElementById("profile-avatar-input").value.trim(),
    banner_url: document.getElementById("profile-banner-input").value.trim(),
    hardest_level_id: document.getElementById("profile-hardest-select").value || null,
    updated_at: new Date()
  };

  const { error } = await supabaseClient.from("profiles").update(updates).eq("id", currentUser.id);

  if (error) alert("Error al actualizar: " + error.message);
  else {
    alert("¡Perfil guardado con éxito!");
    currentUsername = updates.username;
    document.getElementById("auth-btn").textContent = currentUsername;
    document.getElementById("username-display").value = currentUsername;
    const points = await calculateUserPoints(currentUser.id);
    renderProfileCard(updates, currentUsername, points);
  }
}

async function viewUserProfile(userId) {
  showSection('view-profile');
  const container = document.getElementById("external-profile-container");
  container.innerHTML = "<p style='color: var(--text-muted);'>Cargando perfil...</p>";

  const [profileRes, subsRes] = await Promise.all([
    supabaseClient.from("profiles").select("*").eq("id", userId).single(),
    supabaseClient.from("submissions").select("*")
  ]);

  const profile = profileRes.data;
  const userSubs = (subsRes.data || []).filter(s => {
    const isApproved = s.status && ["approved", "aprobado"].includes(String(s.status).toLowerCase());
    return isApproved && String(s.user_id) === String(userId);
  });

  if (!profile) {
    container.innerHTML = "<p style='color: var(--danger-color);'>Perfil no encontrado.</p>";
    return;
  }

  const flag = profile.flag || '🇲🇽';
  const points = await calculateUserPoints(userId);
  let hardestName = "Ninguno";
  if (profile.hardest_level_id) {
    const found = globalLevels.find(l => l.id == profile.hardest_level_id);
    if (found) hardestName = `#${found.position} - ${found.name}`;
  }

  let completedHtml = userSubs.map(r => {
    const lvl = globalLevels.find(l => String(l.id).trim() === String(r.level_id).trim());
    if (!lvl) return '';
    return `<li style="margin-bottom: 6px;">#${lvl.position} ${lvl.name} (${r.percent}%) - <b style="color: var(--accent-color);">+${lvl.points || 50} pts</b></li>`;
  }).join('');

  container.innerHTML = `
    <div class="profile-card" style="margin-bottom: 20px;">
      <div class="profile-banner" style="${profile.banner_url ? `background-image: url('${profile.banner_url}')` : ''}"></div>
      <div class="profile-header-info">
        <div class="profile-avatar" style="${profile.avatar_url ? `background-image: url('${profile.avatar_url}')` : ''}"></div>
        <div class="profile-name">${flag} ${profile.username}</div>
        <div class="profile-bio">${profile.bio || "Sin biografía configurada."}</div>
        <div class="profile-stats">
          <div class="stat-box">
            <label>🏆 Hardest Principal</label>
            <span>${hardestName}</span>
          </div>
          <div class="stat-box">
            <label>⭐ Puntuación Total</label>
            <span>${points} pts</span>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-content" style="max-width: 100%;">
      <h3 style="margin-top:0; color: var(--accent-color);">Niveles Completados</h3>
      <ul style="padding-left: 20px; line-height: 1.5;">${completedHtml || '<li>Aún no hay récords aprobados.</li>'}</ul>
    </div>
  `;
}

async function loadLevels() {
  const container = document.getElementById("levels-container");
  const select = document.getElementById("level-select");
  const profileHardestSelect = document.getElementById("profile-hardest-select");
  if (!container || !supabaseClient) return;

  try {
    const { data: levels } = await supabaseClient.from("levels").select("*");
    globalLevels = levels || [];
    globalLevels.sort((a, b) => (a.position || 0) - (b.position || 0));

    if (globalLevels.length === 0) {
      container.innerHTML = "<p style='color: var(--text-muted);'>No hay niveles.</p>";
      return;
    }

    container.innerHTML = globalLevels.map(l => `
      <div class="list-item" style="cursor: pointer;" onclick="openLevelDetails('${l.id}')">
        <div>
          <strong style="color: var(--accent-color); font-size: 1.1rem;">#${l.position} - ${l.name}</strong>
          <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-muted);">Creador: ${l.creator || 'Desconocido'} | 🏆 ${l.points || 50} pts</p>
        </div>
        ${l.video_url ? `<a href="${l.video_url}" target="_blank" onclick="event.stopPropagation()" class="btn" style="text-decoration: none; font-size: 0.8rem;">Ver Nivel</a>` : ''}
      </div>
    `).join("");

    const optionsHtml = globalLevels.map(l => `<option value="${l.id}">#${l.position} - ${l.name}</option>`).join("");
    if (select) select.innerHTML = optionsHtml;
    if (profileHardestSelect) profileHardestSelect.innerHTML = `<option value="">Ninguno</option>` + optionsHtml;

  } catch (err) { console.error(err); }
}

async function openLevelDetails(levelId) {
    const lvl = globalLevels.find(l => String(l.id).trim() === String(levelId).trim());
    if (!lvl) return;

    ["levels", "leaderboard", "submit", "profile", "admin", "rules", "view-profile"].forEach(s => {
        document.getElementById(`sec-${s}`).style.display = "none";
    });

    const detailContainer = document.getElementById("level-detail-view");
    detailContainer.style.display = "block";

    const thumb = getYouTubeThumbnail(lvl.video_url);

    const [subRes, profRes] = await Promise.all([
        supabaseClient.from("submissions").select("*"),
        supabaseClient.from("profiles").select("*")
    ]);

    const allRecords = subRes.data || [];
    const profiles = profRes.data || [];
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.id] = p; });

    const records = allRecords.filter(r => {
        const isApproved = r.status && ["approved", "aprobado"].includes(String(r.status).toLowerCase());
        
        const subLvl = String(r.level_id).trim().toLowerCase();
        const matchesId = subLvl === String(lvl.id).trim().toLowerCase();
        const matchesPos = subLvl === String(lvl.position).trim().toLowerCase();
        const matchesName = subLvl === String(lvl.name).trim().toLowerCase();

        return isApproved && (matchesId || matchesPos || matchesName);
    });

    records.sort((a, b) => (Number(b.percent) || 0) - (Number(a.percent) || 0));

    let recordsHtml = "";
    if (records.length > 0) {
        recordsHtml = records.map(r => {
            const prof = profileMap[r.user_id] || { username: "Jugador Anónimo", flag: "🇲🇽" };
            const proof = r.video_url || r.image_url;
            
            return `
                <div class="list-item" style="display: block; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>${prof.flag || ''} <b>${prof.username}</b> - ${r.percent}%</span>
                        ${proof ? `<a href="${proof}" target="_blank" class="btn" style="font-size: 0.8rem; text-decoration: none;">Ver Prueba</a>` : ''}
                    </div>
                    ${r.user_notes ? `<p style="margin: 6px 0 0; font-size: 0.85rem; color: var(--text-muted);">"${r.user_notes}"</p>` : ''}
                </div>
            `;
        }).join('');
    }

    detailContainer.innerHTML = `
        <button onclick="closeLevelDetails()" class="btn" style="margin-bottom: 20px;">⬅ Volver a la Lista</button>
        <div class="profile-card" style="margin-bottom: 20px;">
            <div class="level-banner" style="${thumb ? `background-image: url('${thumb}')` : 'background: #18181b'}"></div>
            <div style="padding: 24px;">
                <h2 style="margin: 0 0 10px 0; border: none; padding: 0; color: var(--accent-color);">#${lvl.position} - ${lvl.name}</h2>
                <p style="color: var(--text-muted); margin: 4px 0;">Creador: <b>${lvl.creator || 'Desconocido'}</b></p>
                <p style="color: var(--text-muted); margin: 4px 0;">Puntos otorgados: <b>${lvl.points || 50} pts</b></p>
                ${lvl.video_url ? `<p style="margin-top: 10px;"><a href="${lvl.video_url}" target="_blank" class="btn btn-primary" style="text-decoration:none; display:inline-block;">Ver Video del Nivel</a></p>` : ''}
            </div>
        </div>
        <h3 style="color: var(--text-color);">🏆 Récords Aprobados</h3>
        <div>${recordsHtml || '<p style="color: var(--text-muted);">Aún no hay récords aprobados para este nivel.</p>'}</div>
    `;
}

function closeLevelDetails() {
    document.getElementById("level-detail-view").style.display = "none";
    showSection('levels');
}

async function loadLeaderboard() {
  const container = document.getElementById("leaderboard-container");
  if (!container || !supabaseClient) return;

  try {
    const [subRes, profRes] = await Promise.all([
      supabaseClient.from("submissions").select("*"),
      supabaseClient.from("profiles").select("*")
    ]);

    const subs = subRes.data || [];
    const profiles = profRes.data || [];

    if (profiles.length === 0) {
      container.innerHTML = "<p style='color: var(--text-muted);'>No hay usuarios registrados aún.</p>";
      return;
    }

    let leaderboardData = [];
    for (const p of profiles) {
      const userSubs = subs.filter(s => {
        const isApproved = s.status && ["approved", "aprobado"].includes(String(s.status).toLowerCase());
        return isApproved && String(s.user_id) === String(p.id);
      });

      let points = 0;
      userSubs.forEach(sub => {
        const lvl = globalLevels.find(l => String(l.id).trim() === String(sub.level_id).trim());
        if (lvl) {
          points += (lvl.points || 50);
        }
      });

      leaderboardData.push({
        id: p.id,
        username: p.username || "Jugador anónimo",
        flag: p.flag || '🇲🇽',
        points: points,
        completions: userSubs.length
      });
    }

    leaderboardData.sort((a, b) => b.points - a.points);

    container.innerHTML = leaderboardData.map((user, index) => {
      const rank = index + 1;
      const rankClass = rank === 1 ? 'rank-1' : '';
      return `
        <div class="list-item">
          <div style="display: flex; align-items: center;">
            <span class="rank-badge ${rankClass}">#${rank}</span>
            <span style="font-size: 1.1rem; margin-right: 10px;">${user.flag}</span>
            <div>
              <strong class="clickable-player" onclick="viewUserProfile('${user.id}')" style="font-size: 1.1rem;">${user.username}</strong>
              <p style="margin: 2px 0 0; font-size: 0.8rem; color: var(--text-muted);">${user.completions} demon(s) completados</p>
            </div>
          </div>
          <div style="font-size: 1.1rem; font-weight: bold; color: var(--accent-color);">
            ${user.points} pts
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p style='color: var(--danger-color);'>Error al cargar el leaderboard.</p>";
  }
}

async function loadAdminSubmissions() {
  const container = document.getElementById("admin-submissions-container");
  if (!container || !supabaseClient) return;

  try {
    const [subRes, lvlRes, profRes] = await Promise.all([
      supabaseClient.from("submissions").select("*"),
      supabaseClient.from("levels").select("*"),
      supabaseClient.from("profiles").select("*")
    ]);

    const pendingSubs = (subRes.data || []).filter(sub => sub.status && sub.status.toLowerCase() === "pending");
    const levelMap = {}; (lvlRes.data || []).forEach(l => { levelMap[l.id] = l.name; });
    const profileMap = {}; (profRes.data || []).forEach(p => { profileMap[p.id] = p.username; });

    if (pendingSubs.length === 0) {
      container.innerHTML = "<p style='color: var(--text-muted);'>No hay envíos pendientes.</p>";
      return;
    }

    container.innerHTML = pendingSubs.map(sub => {
      const playerName = profileMap[sub.user_id] || "Jugador anónimo";
      const levelName = levelMap[sub.level_id] || "Nivel desconocido";
      const proofLink = sub.video_url ? `<a href="${sub.video_url}" target="_blank" style="color: var(--accent-color);">Ver Video</a>` : `<a href="${sub.image_url}" target="_blank" style="color: var(--accent-color);">Ver Imagen de Prueba</a>`;
      return `
        <div class="list-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
          <p style="margin: 0;"><strong>Jugador:</strong> ${playerName}</p>
          <p style="margin: 0;"><strong>Nivel:</strong> ${levelName} (${sub.percent}%)</p>
          <p style="margin: 0;"><strong>Notas del usuario:</strong> ${sub.user_notes || 'Ninguna'}</p>
          <p style="margin: 0;"><strong>Prueba:</strong> ${proofLink}</p>
          
          <div class="form-group" style="width: 100%; margin: 8px 0 0 0;">
            <input type="text" id="admin-note-${sub.id}" placeholder="Razón de aprobación o rechazo (opcional)...">
          </div>

          <div style="display: flex; gap: 10px; margin-top: 5px;">
            <button onclick="updateSubmissionStatus('${sub.id}', 'approved')" class="btn btn-success">Aceptar</button>
            <button onclick="updateSubmissionStatus('${sub.id}', 'rejected')" class="btn btn-danger">Rechazar</button>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) { console.error(err); }
}

async function updateSubmissionStatus(id, newStatus) {
  const adminNoteInput = document.getElementById(`admin-note-${id}`);
  const admin_notes = adminNoteInput ? adminNoteInput.value : "";

  const { data: updatedSub } = await supabaseClient.from("submissions").update({ status: newStatus, admin_notes }).eq("id", id).select().single();
  
  if (updatedSub) {
    const lvl = globalLevels.find(l => String(l.id).trim() === String(updatedSub.level_id).trim());
    const levelName = lvl ? `#${lvl.position} ${lvl.name}` : "un nivel";
    const proofUrl = updatedSub.video_url || updatedSub.image_url;
    
    const { data: prof } = await supabaseClient.from("profiles").select("username, flag").eq("id", updatedSub.user_id).single();
    const playerName = prof ? `${prof.flag || ''} ${prof.username}` : "Un jugador";

    if (newStatus === 'approved') {
      await sendDiscordEmbed(
        DISCORD_PUBLIC_WEBHOOK_URL,
        "✅ ¡Récord Aprobado!",
        `**${playerName}** ha completado **${levelName}** con éxito.\n*Nota del Staff:* ${admin_notes || 'Sin comentarios'}`,
        0x22c55e,
        [
          { name: "Porcentaje", value: `${updatedSub.percent}%`, inline: true },
          { name: "Notas del usuario", value: updatedSub.user_notes || 'Ninguna', inline: false },
          { name: "Prueba", value: `[Ver enlace](${proofUrl})`, inline: false }
        ]
      );
    } else if (newStatus === 'rejected') {
      await sendDiscordEmbed(
        DISCORD_PUBLIC_WEBHOOK_URL,
        "❌ Récord no Aprobado",
        `El envío de **${playerName}** para **${levelName}** no fue aprobado.\n*Motivo:* ${admin_notes || 'Sin especificar'}`,
        0xef4444,
        [
          { name: "Porcentaje", value: `${updatedSub.percent}%`, inline: true }
        ]
      );
    }
  }

  alert(`Récord ${newStatus === 'approved' ? 'aprobado' : 'rechazado'}.`);
  loadAdminSubmissions();
  loadLeaderboard();
}

async function handleRecordSubmit(e) {
  e.preventDefault();
  if (!currentUser) return alert("Inicia sesión primero.");

  const levelSelect = document.getElementById("level-select");
  const level_id = levelSelect.value;
  const percent = document.getElementById("percent").value;
  const video_url = document.getElementById("video-url").value;
  const user_notes = document.getElementById("user-notes").value;
  const imageFile = document.getElementById("image-file").files[0];

  if (!video_url && !imageFile) {
    return alert("¡Atención! Si no pones un enlace de video de YouTube, DEBES subir una foto de tus intentos o pantalla final.");
  }

  let image_url = "";
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('submissions-proof')
      .upload(fileName, imageFile);

    if (uploadError) return alert("Error al subir la imagen: " + uploadError.message);

    const { data: publicURLData } = supabaseClient.storage
      .from('submissions-proof')
      .getPublicUrl(fileName);
      
    image_url = publicURLData.publicUrl;
  }

  const { error } = await supabaseClient.from("submissions").insert([
    { 
      user_id: currentUser.id, 
      level_id, 
      percent, 
      video_url: video_url || null, 
      image_url: image_url || null,
      user_notes, 
      status: "pending" 
    }
  ]);

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("¡Récord enviado!");
    document.getElementById("record-form").reset();
    
    const lvl = globalLevels.find(l => String(l.id).trim() === String(level_id).trim());
    const levelName = lvl ? `#${lvl.position} ${lvl.name}` : "un nivel";
    const proofLink = video_url ? `[Ver video](${video_url})` : `[Ver foto de prueba](${image_url})`;

    await sendDiscordEmbed(
      DISCORD_PRIVATE_WEBHOOK_URL,
      "📥 Nuevo Récord pendiente de revisión",
      `El usuario **${currentUsername}** ha enviado un nuevo récord para revisión.`,
      0x00ffcc,
      [
        { name: "Nivel", value: levelName, inline: true },
        { name: "Progreso", value: `${percent}%`, inline: true },
        { name: "Notas", value: user_notes || 'Ninguna', inline: false },
        { name: "Prueba", value: proofLink, inline: false }
      ]
    );
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("--- INICIANDO DIAGNÓSTICO ---");
  
  const { data: levels, error: lvlError } = await supabaseClient.from("levels").select("*");
  console.log("Niveles cargados desde Supabase:", levels, lvlError);
  globalLevels = levels || [];

  const { data: subs, error: subError } = await supabaseClient.from("submissions").select("*");
  console.log("Envíos cargados desde Supabase:", subs, subError);

  const { data: profs, error: profError } = await supabaseClient.from("profiles").select("*");
  console.log("Perfiles cargados desde Supabase:", profs, profError);

  console.log("--- FIN DEL DIAGNÓSTICO ---");

  await loadLevels();
  loadLeaderboard();
  if (supabaseClient) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) await fetchUserData(user);
  }
});
