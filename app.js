// --- KONFIGURACJA SUPABASE ---
// Uzupełnij te dwie wartości po założeniu darmowego projektu na supabase.com
// (Project Settings → API → Project URL / anon public key)
const SUPABASE_URL = 'https://mzzkyyemsjtlumeokswa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QqX3vj_MJyertTcAlLu8hg_uO8Xbjwj';

let supabaseClient = null;
if (SUPABASE_URL.startsWith('http') && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function handleWaitlistSubmit(form, statusEl) {
  const email = form.querySelector('input[name="email"]').value.trim();
  if (!email) return;

  const submitBtn = form.querySelector('button');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Zapisuję...';
  submitBtn.disabled = true;

  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('waitlist').insert({ email });
      if (error && error.code !== '23505') { // 23505 = duplikat e-maila, traktujemy jako sukces
        throw error;
      }
    } else {
      // Fallback, gdy Supabase nie jest jeszcze skonfigurowany: nic nie wysyłamy,
      // tylko informujemy w konsoli, żeby nie zgubić zgłoszenia podczas testów.
      console.warn('Supabase nie jest skonfigurowany. E-mail zgłoszenia:', email);
    }

    form.reset();
    if (statusEl) {
      statusEl.textContent = 'Zapisano. Dam znać, gdy Watcher będzie gotowy do testów.';
    } else {
      alert('Zapisano! Dam znać, gdy Watcher będzie gotowy do testów.');
    }
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.textContent = 'Coś poszło nie tak. Spróbuj ponownie za chwilę.';
    } else {
      alert('Coś poszło nie tak. Spróbuj ponownie za chwilę.');
    }
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

document.getElementById('waitlist-form-hero')?.addEventListener('submit', (e) => {
  e.preventDefault();
  handleWaitlistSubmit(e.target, null);
});

document.getElementById('waitlist-form-main')?.addEventListener('submit', (e) => {
  e.preventDefault();
  handleWaitlistSubmit(e.target, document.getElementById('form-status'));
});
