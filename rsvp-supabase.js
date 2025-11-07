// Client-side Supabase save for RSVP (no backend)
// Requires a config with URL and anon key. Provide via:
//  - window.SUPABASE_CONFIG = { url: 'https://...supabase.co', anonKey: '...' }
//  - or create supabase-config.js exporting SUPABASE_CONFIG

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function getConfig() {
  if (window.SUPABASE_CONFIG) return window.SUPABASE_CONFIG;
  try {
    const mod = await import('./supabase-config.js');
    return mod.SUPABASE_CONFIG || mod.supabaseConfig || mod.default;
  } catch (_) {
    return null;
  }
}

const cfg = await getConfig();
if (cfg && cfg.url && cfg.anonKey) {
  const supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false }
  });

  window.saveRsvpToSupabase = async function saveRsvpToSupabase(payload) {
    const row = {
      fecha: payload.fecha,
      invitados: payload.invitados,
      user_agent: navigator.userAgent || null
    };
    const { error } = await supabase.from('rsvps').insert([row]);
    if (error) throw error;
  };
  // Alias para integrarse con el formulario existente sin tocar script.js
  window.saveRsvpToFirebase = window.saveRsvpToSupabase;
} else {
  window.saveRsvpToSupabase = undefined;
  window.saveRsvpToFirebase = undefined;
}
