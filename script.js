document.addEventListener("DOMContentLoaded", () => {
  fetch("levels.json")
    .then(response => response.json())
    .then(data => renderList(data))
    .catch(error => console.error("Error cargando los niveles:", error));
});

function renderList(levels) {
  const container = document.getElementById("list-container");
  container.innerHTML = "";

  levels.sort((a, b) => a.position - b.position);

  levels.forEach(level => {
    const card = document.createElement("div");
    card.className = "level-card";

    card.innerHTML = `
      <div class="level-header">
        <span class="position">#${level.position}</span>
        <div>
          <h2 class="level-title">${level.name}</h2>
          <div class="level-info">
            <p><strong>Creador:</strong> ${level.publisher}</p>
            <p><strong>Verificador:</strong> ${level.verifier}</p>
            <p><strong>Requisito:</strong> ${level.percentToQualify}%</p>
          </div>
        </div>
      </div>
      <div class="video-wrapper">
        <iframe src="${level.video}" allowfullscreen></iframe>
      </div>
    `;

    container.appendChild(card);
  });
}