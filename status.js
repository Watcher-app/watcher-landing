// Używa tej samej konfiguracji Supabase co app.js.
// Uzupełnij te dwie wartości tak samo jak w app.js.
const SUPABASE_URL = 'https://mzzkyyemsjtlumeokswa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QqX3vj_MJyertTcAlLu8hg_uO8Xbjwj';

const HEARTBEAT_OK_MINUTES = 20; // jeśli ostatni heartbeat jest starszy niż to, uznajemy że coś nie działa

let supabaseClient = null;
if (SUPABASE_URL.startsWith('http') && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function setBanner(state, title, sub) {
  const banner = document.getElementById('overall-banner');
  banner.className = 'status-banner ' + state;
  document.getElementById('overall-title').textContent = title;
  document.getElementById('overall-sub').textContent = sub;
}

function setBadge(id, state, label) {
  const el = document.getElementById(id);
  el.className = 'status-row-badge ' + state;
  el.textContent = label;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function loadStatus() {
  if (!supabaseClient) {
    setBanner('unknown', 'Status niedostępny', 'Panel statusu nie jest jeszcze skonfigurowany.');
    setBadge('badge-scraper', 'unknown', '—');
    setBadge('badge-telegram', 'unknown', '—');
    setBadge('badge-dashboard', 'unknown', '—');
    document.getElementById('incident-list').innerHTML = '<p class="empty-state">Historia incydentów będzie dostępna po pierwszym uruchomieniu.</p>';
    return;
  }

  try {
    const { data: heartbeats, error: hbError } = await supabaseClient
      .from('heartbeats')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(1);

    if (hbError) throw hbError;

    if (!heartbeats || heartbeats.length === 0) {
      setBanner('unknown', 'Brak danych', 'System monitorowania jeszcze nie raportował statusu.');
    } else {
      const hb = heartbeats[0];
      const minutesAgo = (Date.now() - new Date(hb.checked_at).getTime()) / 60000;
      const isRecent = minutesAgo <= HEARTBEAT_OK_MINUTES;
      const ok = isRecent && hb.success;

      if (ok) {
        setBanner('ok', 'Wszystko działa poprawnie', 'Wszystkie systemy Watchera funkcjonują normalnie.');
        setBadge('badge-scraper', 'ok', 'Działa');
        setBadge('badge-telegram', 'ok', 'Działa');
        setBadge('badge-dashboard', 'ok', 'Działa');
      } else if (isRecent && !hb.success) {
        setBanner('degraded', 'Wykryto problem', hb.note || 'Wykrywanie ogłoszeń napotyka błędy. Pracuję na naprawą.');
        setBadge('badge-scraper', 'down', 'Problem');
        setBadge('badge-telegram', 'degraded', 'Może być wolniej');
        setBadge('badge-dashboard', 'ok', 'Działa');
      } else {
        setBanner('down', 'Przerwa w działaniu', 'System monitorowania nie raportował statusu od dłuższego czasu.');
        setBadge('badge-scraper', 'down', 'Brak danych');
        setBadge('badge-telegram', 'down', 'Brak danych');
        setBadge('badge-dashboard', 'ok', 'Działa');
      }

      document.getElementById('last-check').textContent = 'Ostatnia aktualizacja: ' + formatDate(hb.checked_at);
    }
  } catch (err) {
    console.error(err);
    setBanner('unknown', 'Nie można wczytać statusu', 'Spróbuj odświeżyć stronę za chwilę.');
  }

  try {
    const { data: incidents, error: incError } = await supabaseClient
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (incError) throw incError;

    const list = document.getElementById('incident-list');
    if (!incidents || incidents.length === 0) {
      list.innerHTML = '<p class="empty-state">Brak zgłoszonych incydentów. Wszystko działa zgodnie z planem.</p>';
    } else {
      list.innerHTML = incidents.map(inc => `
        <div class="incident">
          <div class="incident-date">${formatDate(inc.created_at)}</div>
          <h3>${inc.title}</h3>
          <p>${inc.description || ''}</p>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

loadStatus();
