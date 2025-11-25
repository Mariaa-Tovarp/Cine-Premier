const $ = (s, sc=document) => sc.querySelector(s);

const params   = new URLSearchParams(location.search);
const urlTitle = (params.get('title') || '').trim();
const urlId    = Number(params.get('id') || NaN);
const preTime  = (params.get('time')  || '').trim();

function pick(first, ...rest){
  for (const v of [first, ...rest]) if (v !== undefined && v !== null && v !== '') return v;
  return undefined;
}

let MOVIE = null;
try { MOVIE = JSON.parse(sessionStorage.getItem('pf:selectedMovie') || 'null'); } catch {}
let CATALOG = [];
try { CATALOG = JSON.parse(localStorage.getItem('pf:catalog') || '[]'); } catch {}

if ((!MOVIE || !MOVIE.title || !MOVIE.duration_min || !MOVIE.formats) && CATALOG.length) {
  let found = null;
  if (!isNaN(urlId)) found = CATALOG.find(m => Number(m.id) === urlId);
  if (!found && urlTitle) {
    const tl = urlTitle.toLowerCase();
    found = CATALOG.find(m => (m.title || '').trim().toLowerCase() === tl);
  }
  if (found) MOVIE = { ...found, ...(MOVIE || {}) };
}

if (!MOVIE) {
  MOVIE = { title: urlTitle || 'Película', formats: '2D', times: ['16:00','19:00'] };
}

function getYouTubeID(url) {
  if (!url) return null;
  const reg = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/;
  const match = url.match(reg);
  return match ? match[1] : null;
}

function renderMovie() {
  $('#mvTitle').textContent = MOVIE.title;
  $('#mvPlot').textContent = MOVIE.plot || 'Sinopsis no disponible.';
  $('#mvCrew').textContent = MOVIE.cast || 'Reparto no disponible.';
  $('#mvDirector').textContent = MOVIE.director || 'Desconocido';
  $('#mvRating').textContent = MOVIE.age_rating || 'PG';
  $('#mvDur').textContent = (MOVIE.duration_min || '') + ' min';
  $('#mvGenre').textContent = MOVIE.genre || '-';

  const poster = $('#moviePoster');
  if (poster && (MOVIE.poster_url || MOVIE.posterUrl)) poster.src = MOVIE.poster_url || MOVIE.posterUrl;

  // Tráiler
  const trailerBox = $('#trailerBox');
  const thumb = $('#trailerThumb');
  const btn = $('#playTrailerBtn');

  const vidId = getYouTubeID(MOVIE.trailerUrl);
  if (vidId) {
    thumb.src = `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`;
  } else if (MOVIE.poster_url) {
    thumb.src = MOVIE.poster_url;
  }

  const play = () => {
    trailerBox.innerHTML = `
      <iframe width="100%" height="100%" 
        src="https://www.youtube.com/embed/${vidId}?autoplay=1"
        frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  };

  btn.onclick = play;
  thumb.onclick = play;
}

// ====== Reservas ======
const state = { cinema: 'Premier Films - Centro', date: null, time: preTime || null, format: null };

function dayList(start=0, count=7){
  const arr=[], d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+start);
  const fmt = new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  for(let i=0;i<count;i++){ arr.push(fmt.format(d)); d.setDate(d.getDate()+1); }
  return arr;
}

function renderCinemas(){
  const sel = $('#selCinema');
  const list = [
    'Premier Films - El Poblado',
    'Premier Films - unico',
    'Premier Films - Buenavista',
    'Premier Films - Unicentro',  
  ];
  sel.innerHTML = list.map(c=>`<option value="${c}">${c}</option>`).join('');
  sel.value = state.cinema;
  sel.onchange = ()=>{ state.cinema = sel.value; state.date=state.time=state.format=null; renderDates(); renderTimes(); renderFormats(); updateCTA(); };
}

function renderDates(){
  const box=$('#dates'); box.innerHTML='';
  dayList(0,7).forEach(d=>{
    const b=document.createElement('button'); b.className='time-pill'; b.textContent=d;
    if(state.date===d) b.classList.add('active');
    b.onclick=()=>{ state.date=d; state.time=null; renderDates(); renderTimes(); updateCTA(); };
    box.appendChild(b);
  });
}

function renderTimes(){
  const box=$('#times'); box.innerHTML='';
  const list = MOVIE.times?.length ? MOVIE.times : ['15:20','18:30','21:00'];
  list.forEach(t=>{
    const b=document.createElement('button'); b.className='time-pill'; b.textContent=t;
    if(state.time===t) b.classList.add('active');
    b.onclick=()=>{ state.time=t; renderTimes(); updateCTA(); };
    box.appendChild(b);
  });
}

function renderFormats(){
  const box=$('#formats'); box.innerHTML='';
  const list = (MOVIE.formats || '2D,3D,IMAX').split(',').map(s=>s.trim());
  list.forEach(f=>{
    const b=document.createElement('button'); b.className='time-pill'; b.textContent=f;
    if(state.format===f) b.classList.add('active');
    b.onclick=()=>{ state.format=f; renderFormats(); updateCTA(); };
    box.appendChild(b);
  });
}

function updateCTA(){
  const ok = state.cinema && state.date && state.time && state.format;
  const btn = $('#goSeats');
  btn.disabled = !ok;
  btn.classList.toggle('enabled', ok);
}

function wireCTA(){
  const btn=$('#goSeats');
  btn.addEventListener('click',()=>{
    if(btn.disabled) return;
    const q = new URLSearchParams({
      movie: MOVIE.title,
      cinema: state.cinema,
      date: state.date,
      time: state.time,
      format: state.format
    });
    location.href = `asientos.html?${q}`;
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderMovie();
  renderCinemas();
  renderDates();
  renderTimes();
  renderFormats();
  updateCTA();
  wireCTA();
});
