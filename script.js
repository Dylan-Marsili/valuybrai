// Audio toggle
(function () {
  const audio = document.getElementById('heroAudio');
  const toggle = document.querySelector('.audio-toggle');
  if (!audio || !toggle) return;

  const labels = { playing: 'Pausar musica', paused: 'Reproducir musica' };
  const setState = (playing) => {
    toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    toggle.setAttribute('aria-label', playing ? labels.playing : labels.paused);
    toggle.classList.toggle('is-playing', playing);
  };
  const playAudio = () => {
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      return p.then(() => setState(true)).catch(() => setState(false));
    }
    setState(true);
    return Promise.resolve();
  };
  const pauseAudio = () => { audio.pause(); setState(false); };
  toggle.addEventListener('click', () => { if (audio.paused) playAudio(); else pauseAudio(); });
  audio.addEventListener('pause', () => setState(false));
  audio.addEventListener('play', () => setState(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden && !audio.paused) pauseAudio(); });
  setState(false);
})();

// Countdown
(function () {
  const container = document.querySelector('[data-countdown]');
  const host = container && container.closest('[data-countdown-date]');
  if (!container || !host) return;
  const target = new Date(host.getAttribute('data-countdown-date'));
  const fields = {
    days: container.querySelector('[data-countdown-value="days"]'),
    hours: container.querySelector('[data-countdown-value="hours"]'),
    minutes: container.querySelector('[data-countdown-value="minutes"]'),
    seconds: container.querySelector('[data-countdown-value="seconds"]')
  };
  const pad = (v) => String(v).padStart(2, '0');
  const render = () => {
    const diff = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    fields.days && (fields.days.textContent = pad(d));
    fields.hours && (fields.hours.textContent = pad(h));
    fields.minutes && (fields.minutes.textContent = pad(m));
    fields.seconds && (fields.seconds.textContent = pad(s));
  };
  render();
  setInterval(render, 1000);
})();

// Simple carousel
(function () {
  const carousels = document.querySelectorAll('[data-carousel]');
  carousels.forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = track ? Array.from(track.children) : [];
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    if (!track || !slides.length) return;
    let index = 0;
    const update = () => track.style.setProperty('--carousel-index', index);
    prev && prev.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; update(); });
    next && next.addEventListener('click', () => { index = (index + 1) % slides.length; update(); });
    update();
  });
})();

// Bank modal (contribuir)
(function () {
  const modal = document.querySelector('[data-bank-modal]');
  const triggers = document.querySelectorAll('[data-bank-modal-open]');
  if (!modal || !triggers.length) return;
  const dialog = modal.querySelector('.bank-modal__dialog');
  const closeEls = modal.querySelectorAll('[data-bank-modal-close]');
  const body = document.body;
  const open = () => { modal.hidden = false; requestAnimationFrame(() => modal.classList.add('is-visible')); body.classList.add('has-bank-modal'); dialog && dialog.focus(); };
  const close = () => { modal.classList.remove('is-visible'); body.classList.remove('has-bank-modal'); setTimeout(() => modal.hidden = true, 260); };
  triggers.forEach(t => t.addEventListener('click', open));
  closeEls.forEach(c => c.addEventListener('click', close));
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
})();

// RSVP modal + Supabase save
(function () {
  const modal = document.querySelector('[data-rsvp-modal]');
  if (!modal) return;
  const dialog = modal.querySelector('.bank-modal__dialog');
  const closeEls = modal.querySelectorAll('[data-rsvp-modal-close]');
  const body = document.body;
  const triggers = document.querySelectorAll('[data-rsvp-modal-open]');
  const open = () => { modal.hidden = false; requestAnimationFrame(() => modal.classList.add('is-visible')); body.classList.add('has-bank-modal'); dialog && dialog.focus(); ensureOneGuest(); };
  const close = () => { modal.classList.remove('is-visible'); body.classList.remove('has-bank-modal'); setTimeout(() => modal.hidden = true, 260); };
  triggers.forEach(t => t.addEventListener('click', (e) => { e.preventDefault(); open(); }));
  closeEls.forEach(c => c.addEventListener('click', close));
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // Form
  const guestContainer = modal.querySelector('#rsvpGuests');
  const template = modal.querySelector('#guestTemplate');
  const addGuestBtn = modal.querySelector('#addGuestBtn');
  const form = modal.querySelector('#rsvpForm');
  const errorEl = modal.querySelector('#rsvpError');
  const successEl = modal.querySelector('#rsvpSuccess');

  let guestList = null;
  let guestIndex = 0;

  const fixMojibake = (s) => (s || '')
    .replace(/A�/g, 'ñ').replace(/Ã±/g, 'ñ')
    .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú')
    .replace(/Â/g, '');

  const normalize = (s) => {
    return fixMojibake(String(s || ''))
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\sñ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const loadGuestList = () => {
    if (guestList) return Promise.resolve(guestList);
    return fetch('Lista.json').then(r => r.json()).then(arr => {
      guestList = Array.isArray(arr) ? arr : [];
      return guestList;
    }).catch(() => (guestList = []));
  };

  const listSet = () => {
    const set = new Set();
    (guestList || []).forEach(i => set.add(normalize(i.Nombre) + '|' + normalize(i.Apellido)));
    return set;
  };

  const newGuestEl = () => {
    const node = template.content.cloneNode(true);
    guestIndex += 1;
    const idx = node.querySelector('[data-guest-index]'); if (idx) idx.textContent = String(guestIndex);
    node.querySelectorAll('input[type="radio"]').forEach(r => { r.name = r.name.replace('__IDX__', String(guestIndex)); });
    return node;
  };

  const ensureOneGuest = () => { if (!guestContainer.querySelector('[data-guest]')) guestContainer.appendChild(newGuestEl()); updateGuestControls(); };
  const updateGuestControls = () => {
    const blocks = [...guestContainer.querySelectorAll('[data-guest]')];
    blocks.forEach((b, i) => {
      const idx = b.querySelector('[data-guest-index]'); if (idx) idx.textContent = String(i + 1);
      const rm = b.querySelector('[data-guest-remove]'); if (rm) rm.disabled = blocks.length <= 1;
    });
  };

  addGuestBtn && addGuestBtn.addEventListener('click', () => { guestContainer.appendChild(newGuestEl()); updateGuestControls(); });
  guestContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-guest-remove]'); if (!btn) return; e.preventDefault();
    const block = btn.closest('[data-guest]');
    const blocks = guestContainer.querySelectorAll('[data-guest]');
    if (blocks.length > 1) block.remove(); else block.querySelectorAll('input,select').forEach(el => { if (el.type==='radio') el.checked=false; else el.value=''; });
    updateGuestControls();
  });

  const clearMessages = () => {
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
    if (successEl) successEl.hidden = true;
    guestContainer.querySelectorAll('[data-guest-error]').forEach(e => { e.hidden = true; e.textContent = ''; });
  };

  const collectGuests = () => {
    const guests = [];
    guestContainer.querySelectorAll('[data-guest]').forEach((block) => {
      const nombre = block.querySelector('input[name="nombre"]').value || '';
      const apellido = block.querySelector('input[name="apellido"]').value || '';
      const radioName = block.querySelector('input[type="radio"][name^="asiste-"]')?.name || '';
      const asisteEl = radioName ? block.querySelector('input[type="radio"][name="' + radioName + '"]:checked') : null;
      const alimentacion = (block.querySelector('select[name="alimentacion"]').value || 'Ninguno').trim();
      const cancion = block.querySelector('input[name="cancion"]').value || '';
      guests.push({ nombre, apellido, asiste: !!(asisteEl && asisteEl.value === 'si'), alimentacion, cancion, _block: block });
    });
    return guests;
  };

  const validateAgainstList = (guests) => {
    const set = listSet();
    let ok = true;
    guests.forEach((g) => {
      const key = normalize(g.nombre) + '|' + normalize(g.apellido);
      const err = g._block.querySelector('[data-guest-error]');
      if (!g.nombre.trim() || !g.apellido.trim()) { ok = false; if (err) { err.hidden = false; err.textContent = 'Nombre y apellido son obligatorios.'; } return; }
      if (!set.has(key)) { ok = false; if (err) { err.hidden = false; err.textContent = 'No encontramos este invitado en la lista.'; } }
    });
    return ok;
  };

  form && form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    clearMessages();
    loadGuestList().then(() => {
      const guests = collectGuests();
      let radiosOk = true;
      guests.forEach(g => { if (!g._block.querySelector('input[type="radio"][name^="asiste-"]:checked')) { radiosOk = false; const e = g._block.querySelector('[data-guest-error]'); if (e) { e.hidden = false; e.textContent = 'Elegí una opción de asistencia.'; } } });
      const listOk = validateAgainstList(guests);
      if (!radiosOk || !listOk) { if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'Revisá los datos marcados en rojo.'; } return; }

      const payload = { fecha: new Date().toISOString(), invitados: guests.map(({ _block, ...rest }) => rest) };
      if (typeof window.saveRsvpToSupabase !== 'function') {
        if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'Supabase no está configurado.'; }
        console.warn('RSVP: Supabase no configurado. Ver rsvp-supabase.js y supabase-config.js');
        return;
      }
      window.saveRsvpToSupabase(payload)
        .then(() => { if (successEl) successEl.hidden = false; })
        .catch((err) => { if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'No se pudo guardar. Intentá de nuevo.'; } console.warn('Error guardando en Supabase:', err); });
    });
  });
})();

