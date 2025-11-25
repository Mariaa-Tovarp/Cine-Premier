// ============ FAVORITOS (render) ============
const $ = s => document.querySelector(s);

function fmtDate(d){
  try{ return new Date(d).toLocaleDateString('es-ES',{day:'2-digit',month:'short'}); }
  catch{ return d||''; }
}

function renderFavorites(){
  const wrap = $('#fav-container');
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');

  if(!favs.length){
    wrap.innerHTML = `
      <section class="panel">
        <div class="empty">
          No tienes favoritos aún 💔
          <div><a class="btn-ghost" href="index.html">Ir a cartelera</a></div>
        </div>
      </section>`;
    return;
  }

  const list = favs.map(f => `
    <article class="card">
      <div class="thumb">
        ${f.poster ? `<img src="${f.poster}" alt="${f.title}">` : ''}
      </div>

      <div class="body">
        <div class="title">${f.title}</div>
        <div class="meta">
          ${f.cinema ? `<span class="badge">📍 ${f.cinema}</span>`:''}
          ${f.format ? `<span class="badge">🎞 ${f.format}</span>`:''}
          ${f.date   ? `<span class="badge">📅 ${fmtDate(f.date)}</span>`:''}
        </div>
      </div>

      <div class="actions">
        <a class="btn-ghost" href="index.html">Ver horarios</a>
        <button class="remove" data-id="${f.id||f.title}">Quitar</button>
      </div>
    </article>
  `).join('');

  wrap.innerHTML = `
    <section class="panel">
      <div class="list">${list}</div>
    </section>
  `;

  // Quitar de favoritos
  wrap.querySelectorAll('.remove').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const next = (JSON.parse(localStorage.getItem('favorites')||'[]'))
        .filter(x => (x.id||x.title) !== id);
      localStorage.setItem('favorites', JSON.stringify(next));
      renderFavorites();
    });
  });
}

// init
document.addEventListener('DOMContentLoaded', renderFavorites);
