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
  const adminNoteInput = document.getElementById(`admin-note-${id}`);
  const admin_notes = adminNoteInput ? adminNoteInput.value : "";

  const { data: updatedSub } = await supabaseClient.from("submissions").update({ status: newStatus, admin_notes }).eq("id", id).select().single();
  
  if (updatedSub) {
    const lvl = globalLevels.find(l => l.id == updatedSub.level_id);
    const levelName = lvl ? `#${lvl.position} ${lvl.name}` : "un nivel";
    const proofUrl = updatedSub.video_url || updatedSub.image_url;
    const proofTypeLabel = updatedSub.video_url ? "Ver video de YouTube" : "Ver imagen de prueba";
    
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
          { name: "Prueba", value: `[${proofTypeLabel}](${proofUrl})`, inline: false }
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
    
    const lvl = globalLevels.find(l => l.id == level_id);
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
        { name: "Notas", value: user_notes ||
