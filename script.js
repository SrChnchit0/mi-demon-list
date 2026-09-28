// Configuración inicial de usuario y carga de su perfil
    async function fetchUserData(user) {
      currentUser = user;
      const authBtn = document.getElementById("auth-btn");
      const usernameDisplay = document.getElementById("username-display");
      const submitBtn = document.getElementById("submit-record-btn");
      const adminNavBtn = document.getElementById("admin-nav-btn");
      const profileNavBtn = document.getElementById("profile-nav-btn");

      if (user) {
        // Traemos el perfil vinculado al ID del usuario actual
        let { data: profile } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Si el usuario recién se registra y aún no tiene fila en profiles, la creamos automáticamente
        if (!profile) {
          const defaultUsername = user.email.split('@')[0];
          const { data: newProfile } = await supabaseClient
            .from("profiles")
            .insert([{ id: user.id, username: defaultUsername }])
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

        // Rellenar los campos de edición con la información actual del perfil
        document.getElementById("profile-username").value = currentUsername;
        document.getElementById("profile-bio-input").value = profile?.bio || "";
        document.getElementById("profile-avatar-input").value = profile?.avatar_url || "";
        document.getElementById("profile-banner-input").value = profile?.banner_url || "";
        
        if (profile?.hardest_level_id) {
          document.getElementById("profile-hardest-select").value = profile.hardest_level_id;
        }

        renderProfileCard(profile, currentUsername);

        if (adminNavBtn && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          adminNavBtn.style.display = "block";
        }
      }
    }

    // Renderizado de la tarjeta de perfil visual en la interfaz
    function renderProfileCard(profile, username) {
      const cardContainer = document.getElementById("profile-card-container");
      if (!cardContainer) return;

      const avatar = profile?.avatar_url || "";
      const banner = profile?.banner_url || "";
      const bio = profile?.bio || "Sin biografía configurada.";
      
      // Buscar el nombre del nivel hardest si existe
      let hardestName = "Desconocido";
      if (profile?.hardest_level_id && window.globalLevels) {
        const found = window.globalLevels.find(l => l.id == profile.hardest_level_id);
        if (found) hardestName = `#${found.position} ${found.name}`;
      }

      cardContainer.innerHTML = `
        <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; max-width: 400px; margin: 0 auto;">
          <div style="height: 100px; background: ${banner ? `url('${banner}') center/cover` : 'var(--accent-color);'};"></div>
          <div style="padding: 16px; position: relative;">
            <div style="width: 70px; height: 70px; border-radius: 50%; border: 3px solid var(--card-bg); background: #333 url('${avatar}') center/cover; position: absolute; top: -45px; left: 16px;"></div>
            <div style="margin-left: 80px; min-height: 35px;">
              <h3 style="margin: 0; color: var(--text-color);">${username}</h3>
            </div>
            <p style="margin: 12px 0 8px; color: var(--text-muted); font-size: 0.9rem; white-space: pre-wrap;">${bio}</p>
            <div style="margin-top: 10px; font-size: 0.85rem; color: var(--accent-color);">
              🏆 Hardest Principal: <strong>${hardestName}</strong>
            </div>
          </div>
        </div>
      `;
    }

    // Carga de la tabla de clasificación (Leaderboard) con nombres correctos
    async function loadLeaderboard() {
      const container = document.getElementById("leaderboard-container");
      if (!container || !supabaseClient) return;

      try {
        // Relacionamos correctamente las tablas 'submissions' con 'levels' y 'profiles'
        const { data: subs, error } = await supabaseClient
          .from("submissions")
          .select(`
            *,
            levels ( position, name ),
            profiles ( username )
          `)
          .eq("status", "approved");

        if (error) {
          console.error(error);
          container.innerHTML = "<p style='color: var(--danger-color);'>Error al cargar el leaderboard.</p>";
          return;
        }

        if (!subs || subs.length === 0) {
          container.innerHTML = "<p style='color: var(--text-muted);'>No hay récords aprobados aún.</p>";
          return;
        }

        container.innerHTML = subs.map(sub => {
          const playerName = sub.profiles?.username || "Jugador anónimo";
          const levelName = sub.levels ? `#${sub.levels.position} ${sub.levels.name}` : "Nivel desconocido";
          return `
            <div style="background: var(--card-bg); padding: 12px; margin-bottom: 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: var(--accent-color); font-size: 1.1rem;">${playerName}</strong> completó ${levelName} (${sub.percent}%)
                <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--text-muted);">HZ: ${sub.hz}</p>
              </div>
              ${sub.video_url ? `<a href="${sub.video_url}" target="_blank" class="btn" style="text-decoration: none; font-size: 0.8rem;">Ver Prueba</a>` : ''}
            </div>
          `;
        }).join("");
      } catch (err) { console.error(err); }
    }
