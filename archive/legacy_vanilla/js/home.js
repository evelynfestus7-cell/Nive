// js/home.js
(async function(){
  "use strict";
  function safeGetUser(){ try{ return JSON.parse(localStorage.getItem('nive_user')||'{}'); }catch(e){return {}; } }

  const coinCountEl = document.getElementById('coinCount');
  const featuredStoriesContainer = document.getElementById('featuredStoriesContainer');
  const trendingContainer = document.getElementById('trendingContainer');
  const continueContainer = document.getElementById('continueReadingContainer');
  const heroTitle = document.getElementById('heroTitle');
  const heroDesc = document.getElementById('heroDesc');
  const heroArt = document.getElementById('heroArt');
  const heroReadBtn = document.getElementById('heroReadBtn');
  const heroDetailsBtn = document.getElementById('heroDetailsBtn');

  if(typeof renderNavigation === 'function') renderNavigation('home');

  const user = safeGetUser();
  if(coinCountEl) coinCountEl.textContent = `🪙 ${user.coins || 0}`;

  if (typeof checkDailyRewardModal === "function") {
    setTimeout(checkDailyRewardModal, 600);
  }

  [featuredStoriesContainer, trendingContainer, continueContainer].forEach(container => {
    if (!container) return;
    container.innerHTML = Array.from({ length: 4 }, () => '<div class="book skeleton" aria-hidden="true"></div>').join('');
  });

  let stories = [];
  if(typeof getAllStories === 'function') stories = await getAllStories();
  else if(typeof getStories === 'function') stories = await getStories();
  else stories = JSON.parse(localStorage.getItem('nive_custom_stories')||'[]');

  function normalize(p){ if(!p) return ''; return (p.startsWith('/')||p.startsWith('http')||p.startsWith('data:'))?p:'/'+p; }

  const featured = (stories.find(s=>s.featured) || stories.slice().sort((a,b)=> (b.rating||0)-(a.rating||0))[0] || stories[0]);
  if(featured && heroTitle && heroDesc && heroArt){
    heroTitle.textContent = featured.title || 'Featured';
    heroDesc.textContent = featured.description ? (featured.description.length>160 ? featured.description.slice(0,157)+'…' : featured.description) : '';
    heroArt.style.backgroundImage = `url('${normalize(featured.banner||featured.cover||'assets/covers/default.png')}')`;
    if(heroReadBtn) heroReadBtn.onclick = () => location.href = `story.html?id=${featured.id}`;
    if(heroDetailsBtn) heroDetailsBtn.onclick = () => location.href = `story.html?id=${featured.id}`;
  }

  function computeScore(s){
    const progress = (user.readingProgress?.[s.id] || 0);
    const rating = s.rating || 0;
    const downloads = (typeof getOfflineStories === 'function' && getOfflineStories().includes(s.id)) ? 1 : 0;
    return (rating * 2) + (progress/20) + downloads;
  }

  function renderBookCard(container, story, metaText){
    const div = document.createElement('div');
    div.className = 'book';
    div.tabIndex = 0;
    div.style.backgroundImage = `url('${normalize(story.cover||story.banner||'assets/covers/default.png')}')`;
    div.innerHTML = `<div class="meta">${escapeHtml(story.title||'')}<br><span>${escapeHtml(metaText || '')}</span></div>`;
    div.addEventListener('click', ()=> location.href = `story.html?id=${story.id}`);
    div.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        div.click();
      }
    });
    container.appendChild(div);
  }

  if(featuredStoriesContainer){
    featuredStoriesContainer.innerHTML = '';
    (stories || [])
      .filter(s => s.featured)
      .slice(0, 5)
      .forEach(s => renderBookCard(featuredStoriesContainer, s, `${s.genre || 'Story'} / ${s.rating || 0} stars`));
  }

  if(trendingContainer){
    trendingContainer.innerHTML = '';
    const trending = (stories||[]).slice().sort((a,b)=> computeScore(b)-computeScore(a)).slice(0,12);
    trending.forEach(s => {
      renderBookCard(trendingContainer, s, `${s.genre || 'Story'} / ${s.rating || 0} stars`);
    });
  }

  if(continueContainer){
    continueContainer.innerHTML = '';
    (stories||[]).forEach(s => {
      const p = user.readingProgress?.[s.id] || 0;
      if(p>0 && p<100){
        const chapter = user.lastChapter?.[s.id] || 1;
        const div = document.createElement('div');
        div.className = 'book';
        div.tabIndex = 0;
        div.style.backgroundImage = `url('${normalize(s.cover||s.banner||'assets/covers/default.png')}')`;
        div.innerHTML = `<div class="meta">Chapter ${chapter}<br>${p}% Complete</div>`;
        div.addEventListener('click', ()=> location.href = `reader.html?id=${s.id}&chapter=${chapter}`);
        div.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            div.click();
          }
        });
        continueContainer.appendChild(div);
      }
    });
  }

  function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
})();
