// js/library.js
(async function(){
  const container = document.getElementById('libraryContainer');
  if(!container) return;
  let stories = [];
  if(typeof getAllStories === 'function') stories = await getAllStories();
  else if(typeof getStories === 'function') stories = await getStories();
  else stories = JSON.parse(localStorage.getItem('nive_custom_stories')||'[]');

  function normalize(p){ if(!p) return ''; return (p.startsWith('/')||p.startsWith('http'))?p:'/'+p; }
  function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  container.innerHTML = '';
  if(!stories.length){ container.innerHTML = '<div class="empty">No stories available</div>'; return; }

  stories.forEach(s => {
    const card = document.createElement('div');
    card.className = 'story-card';
    const cover = normalize(s.cover||s.banner||'assets/covers/default.png');
    card.innerHTML = `
      <div class="cover" style="background-image:url('${cover}')"></div>
      <div class="info">
        <h3>${escapeHtml(s.title||'')}</h3>
        <div class="meta">${escapeHtml(s.author||'')} • ${escapeHtml(s.genre||'')}</div>
        <p>${escapeHtml((s.description||'').slice(0,140))}${(s.description||'').length>140?'…':''}</p>
        <div class="actions"><button class="btn" data-id="${encodeURIComponent(s.id)}">Read</button></div>
      </div>
    `;
    container.appendChild(card);
  });

  container.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-id]');
    if(!btn) return;
    const id = decodeURIComponent(btn.getAttribute('data-id'));
    location.href = `story.html?id=${id}`;
  });
})();
