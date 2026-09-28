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

async function updateSubmissionStatus(id, newStatus) {
  const { data: updatedSub } = await supabaseClient.from("submissions").update({ status: newStatus }).eq("id", id).select().single();
  
  if (updatedSub) {
    const lvl = globalLevels.find(l => l.id == updatedSub.level_id);
    const levelName = lvl ? `#${lvl.position} ${lvl.name}` : "un nivel";
    
    const { data: prof } = await supabaseClient.from("profiles").select("username, flag").eq("id", updatedSub.user_id).single();
    const playerName = prof ? `${prof.flag || ''} ${prof.username}` : "Un jugador";

    if (newStatus === 'approved') {
      await sendDiscordEmbed(
        DISCORD_PUBLIC_WEBHOOK_URL,
        "✅ ¡Récord Aprobado!",
        `**${playerName}** ha completado **${levelName}** con éxito.`,
        0x22c55e,
        [
          { name: "Porcentaje", value: `${updatedSub.percent}%`, inline: true },
          { name: "Tasa de Refresco", value: `${updatedSub.hz} Hz`, inline: true },
          { name: "Prueba en video", value: `[Ver video de YouTube](${updatedSub.video_url})`, inline: false }
        ]
      );
    } else if (newStatus === 'rejected') {
      await sendDiscordEmbed(
        DISCORD_PUBLIC_WEBHOOK_URL,
        "❌ Récord no Aprobado",
        `El envío de **${playerName}** para **${levelName}** no cumplió con los requisitos.`,
        0xef4444,
        [
          { name: "Porcentaje", value: `${updatedSub.percent}%`, inline: true },
          { name: "Intentado a", value: `${updatedSub.hz} Hz`, inline: true }
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
  const hz = document.getElementById("hz").value;
  const video_url = document.getElementById("video-url").value;

  const { error } = await supabaseClient.from("submissions").insert([
    { user_id: currentUser.id, level_id, percent, hz, video_url, status: "pending" }
  ]);

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("¡Récord enviado!");
    document.getElementById("record-form").reset();
    
    const lvl = globalLevels.find(l => l.id == level_id);
    const levelName = lvl ? `#${lvl.position} ${lvl.name}` : "un nivel";

    await sendDiscordEmbed(
      DISCORD_PRIVATE_WEBHOOK_URL,
      "📥 Nuevo Récord pendiente de revisión",
      `El usuario **${currentUsername}** ha enviado un nuevo récord para revisión.`,
      0x00ffcc,
      [
        { name: "Nivel", value: levelName, inline: true },
        { name: "Progreso", value: `${percent}%`, inline: true },
        { name: "Hz", value: `${hz} Hz`, inline: true },
        { name: "Prueba", value: `[Ver video](${video_url})`, inline: false }
      ]
    );
  }
}
