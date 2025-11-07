import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './supabase-config.js';

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, { auth: { persistSession: false } });

const $ = (sel) => document.querySelector(sel);
const els = {
  yes: $('#list-yes'), no: $('#list-no'), pending: $('#list-pending'),
  cYes: $('#count-yes'), cNo: $('#count-no'), cPend: $('#count-pending'),
  search: $('#search'), warn: $('#policyWarn')
};

const fixMojibake = (s = '') => s
  .replace(/Ã±/g, 'ñ')
  .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú')
  .replace(/Â/g, '');

const norm = (s = '') => fixMojibake(String(s))
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z\\s]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

async function loadLista() {
  try {
    const r = await fetch('Lista.json');
    const arr = await r.json();
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function loadRsvps() {
  try {
    const { data, error } = await supabase
      .from('rsvps')
      .select('invitados, created_at')
      .order('created_at', { ascending: true })
      .limit(10000);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('No se pudo leer rsvps:', e);
    if (els.warn) els.warn.hidden = false;
    return [];
  }
}

function aggregateRsvps(rows) {
  // Última respuesta prevalece por invitado
  const map = new Map();
  rows.forEach((row) => {
    const when = row.created_at || null;
    (row.invitados || []).forEach((inv) => {
      const key = norm(inv.nombre) + '|' + norm(inv.apellido);
      const prev = map.get(key);
      if (!prev || (when && (!prev.created_at || when > prev.created_at))) {
        map.set(key, { ...inv, created_at: when });
      }
    });
  });
  return map;
}

function renderList(container, data, filter = '') {
  if (!container) return;
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  const q = norm(filter);
  data
    .filter((i) => !q || norm(i.nombre + ' ' + i.apellido).includes(q))
    .forEach((item) => {
      const div = document.createElement('div');
      div.className = 'item';
      const right = [
        item.alimentacion && item.alimentacion !== 'Ninguno' ? `Alimentación: ${item.alimentacion}` : null,
        item.cancion ? `Canción: ${item.cancion}` : null
      ].filter(Boolean).join(' • ');
      div.innerHTML = `<span>${item.nombre} ${item.apellido}</span>` +
        (right ? `<span class="muted">${right}</span>` : '<span></span>');
      frag.appendChild(div);
    });
  container.appendChild(frag);
}

async function main() {
  const lista = await loadLista();
  const rsvps = await loadRsvps();
  const map = aggregateRsvps(rsvps);

  const allInv = (lista || []).map((p) => ({ nombre: p.Nombre, apellido: p.Apellido }));
  const confirmedYes = [];
  const confirmedNo = [];
  const pending = [];

  allInv.forEach((p) => {
    const key = norm(p.nombre) + '|' + norm(p.apellido);
    const rec = map.get(key);
    if (!rec) {
      pending.push({ nombre: p.nombre, apellido: p.apellido });
      return;
    }
    if (rec.asiste) confirmedYes.push({ nombre: p.nombre, apellido: p.apellido, alimentacion: rec.alimentacion || 'Ninguno', cancion: rec.cancion || '' });
    else confirmedNo.push({ nombre: p.nombre, apellido: p.apellido, alimentacion: rec.alimentacion || 'Ninguno', cancion: rec.cancion || '' });
  });

  els.cYes && (els.cYes.textContent = String(confirmedYes.length));
  els.cNo && (els.cNo.textContent = String(confirmedNo.length));
  els.cPend && (els.cPend.textContent = String(pending.length));

  const render = () => {
    const q = els.search ? els.search.value : '';
    renderList(els.yes, confirmedYes, q);
    renderList(els.no, confirmedNo, q);
    renderList(els.pending, pending, q);
  };
  render();
  els.search && els.search.addEventListener('input', render);
}

main();
