/* ==========================================================================
   Where to Watch the 90s — frontend
   Vanilla ES module. No dependencies, no build step.
   ========================================================================== */

const SEARCH_DEBOUNCE_MS = 450;
const MIN_AUTO_SEARCH_CHARS = 2;
const REGION_STORAGE_KEY = 'wtw:region';

/* --------------------------------------------------------------- DOM refs */

const el = {
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  searchClear: document.getElementById('search-clear'),
  randomBtn: document.getElementById('random-btn'),
  decadePills: document.getElementById('decade-pills'),
  typePills: document.getElementById('type-pills'),
  regionSelect: document.getElementById('region-select'),
  resultsRegion: document.getElementById('results-region'),
  results: document.getElementById('results'),
  notice: document.getElementById('notice'),
  newsletter: document.getElementById('newsletter'),
  newsletterForm: document.getElementById('newsletter-form'),
  newsletterInput: document.getElementById('email-input'),
  newsletterSubmit: document.getElementById('newsletter-submit'),
  newsletterStatus: document.getElementById('newsletter-status'),
  disclosure: document.getElementById('affiliate-disclosure'),
  modal: document.getElementById('modal'),
  modalPanel: document.querySelector('.modal-panel'),
  modalBody: document.getElementById('modal-body'),
  modalClose: document.getElementById('modal-close'),
  toast: document.getElementById('toast'),
};

/* ------------------------------------------------------------------ State */

const state = {
  settings: null,
  decade: '90s',
  type: 'all',
  region: 'US',
  query: '',
  /** Incremented per request so stale responses can be discarded. */
  requestToken: 0,
  lastFocused: null,
};

/* ------------------------------------------------------------------ Utils */

/** Escape untrusted strings before interpolating into HTML. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    // Fall through to a generic error below.
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    const err = new Error(message);
    err.statusCode = response.status;
    throw err;
  }

  return payload;
}

let toastTimer;
function toast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.hidden = true;
  }, 4200);
}

function showNotice(html, isError = false) {
  el.notice.innerHTML = html;
  el.notice.classList.toggle('error', isError);
  el.notice.hidden = false;
}

function hideNotice() {
  el.notice.hidden = true;
}

function setBusy(busy) {
  el.resultsRegion.setAttribute('aria-busy', busy ? 'true' : 'false');
}

/* ---------------------------------------------------------------- Rendering */

function posterMarkup(item, sizeClass = 'card-art') {
  if (item.poster) {
    return `<div class="${sizeClass}">
      <img src="${esc(item.poster)}" alt="${esc(item.title)} poster" loading="lazy" decoding="async">
    </div>`;
  }
  // TMDB has no artwork for this title: show a styled fallback instead.
  return `<div class="${sizeClass}">
    <div class="card-art-fallback">${esc(item.title)}</div>
  </div>`;
}

function cardMarkup(item) {
  const typeLabel = item.type === 'tv' ? 'TV' : 'Film';
  const year = item.year ? esc(item.year) : '—';
  const rating = item.rating ? ` · ★ ${esc(item.rating)}` : '';

  return `
    <button class="card" type="button" data-type="${esc(item.type)}" data-id="${esc(item.id)}">
      ${posterMarkup(item)}
      <div class="card-body">
        <h3 class="card-title">${esc(item.title)}</h3>
        <p class="card-meta">${year}${rating}</p>
      </div>
      <span class="card-badge" aria-hidden="true">${typeLabel}</span>
    </button>`;
}

function gridMarkup(items) {
  return `<div class="grid">${items.map(cardMarkup).join('')}</div>`;
}

function rowMarkup(title, items, countLabel) {
  return `
    <section class="row">
      <div class="row-head">
        <h2 class="row-title">${esc(title)}</h2>
        ${countLabel ? `<span class="row-count">${esc(countLabel)}</span>` : ''}
      </div>
      ${gridMarkup(items)}
    </section>`;
}

function skeletonMarkup(count = 12) {
  const card = `
    <div class="card skeleton" aria-hidden="true">
      <div class="card-art"></div>
      <div class="card-body"></div>
    </div>`;
  return `<div class="grid">${card.repeat(count)}</div>`;
}

/* ------------------------------------------------------------ Browse rows */

async function renderBrowse() {
  const token = ++state.requestToken;
  const decadeLabel = decadeLabelFor(state.decade);

  hideNotice();
  setBusy(true);
  el.results.innerHTML = skeletonMarkup(12);

  const wantMovies = state.type === 'all' || state.type === 'movie';
  const wantTv = state.type === 'all' || state.type === 'tv';

  try {
    const [movies, shows] = await Promise.all([
      wantMovies
        ? fetchJson(`/api/discover?type=movie&decade=${encodeURIComponent(state.decade)}`)
        : Promise.resolve({ results: [] }),
      wantTv
        ? fetchJson(`/api/discover?type=tv&decade=${encodeURIComponent(state.decade)}`)
        : Promise.resolve({ results: [] }),
    ]);

    if (token !== state.requestToken) return; // A newer request superseded this one.

    let html = '';
    if (movies.results.length) {
      html += rowMarkup(`Popular ${decadeLabel} movies`, movies.results, 'tap any title');
    }
    if (shows.results.length) {
      html += rowMarkup(`Popular ${decadeLabel} TV`, shows.results, 'tap any title');
    }

    el.results.innerHTML =
      html || `<div class="notice">Nothing to browse here yet. Try a search instead.</div>`;
  } catch (err) {
    if (token !== state.requestToken) return;
    el.results.innerHTML = '';
    showNotice(`<strong>Couldn't load titles.</strong> ${esc(err.message)}`, true);
  } finally {
    if (token === state.requestToken) setBusy(false);
  }
}

/* ---------------------------------------------------------------- Searching */

async function runSearch() {
  const term = state.query.trim();

  if (!term) {
    renderBrowse();
    return;
  }

  const token = ++state.requestToken;
  hideNotice();
  setBusy(true);
  el.results.innerHTML = skeletonMarkup(8);

  try {
    const params = new URLSearchParams({
      q: term,
      type: state.type,
      decade: state.decade,
    });
    const data = await fetchJson(`/api/search?${params}`);

    if (token !== state.requestToken) return;

    if (!data.results.length) {
      el.results.innerHTML = '';

      // Distinguish "no such title" from "exists, but outside this decade".
      if (data.filteredOut > 0) {
        showNotice(
          `<strong>No ${esc(decadeLabelFor(state.decade))} match for &ldquo;${esc(term)}&rdquo;.</strong>
           We found ${data.filteredOut} result(s) from other decades &mdash;
           switch the decade filter to <em>Both</em> to include them.`
        );
      } else {
        showNotice(
          `<strong>Nothing found for &ldquo;${esc(term)}&rdquo;.</strong>
           Check the spelling, or try a shorter version of the title.`
        );
      }
      return;
    }

    el.results.innerHTML = rowMarkup(
      `Results for “${term}”`,
      data.results,
      `${data.results.length} title${data.results.length === 1 ? '' : 's'}`
    );
  } catch (err) {
    if (token !== state.requestToken) return;
    el.results.innerHTML = '';
    showNotice(`<strong>Search failed.</strong> ${esc(err.message)}`, true);
  } finally {
    if (token === state.requestToken) setBusy(false);
  }
}

const debouncedSearch = debounce(() => {
  if (state.query.trim().length >= MIN_AUTO_SEARCH_CHARS) {
    syncUrl();
    runSearch();
  } else if (!state.query.trim()) {
    syncUrl();
    renderBrowse();
  }
}, SEARCH_DEBOUNCE_MS);

/* ------------------------------------------------------------------ Detail */

function providerGroupMarkup(label, providers, modifier) {
  if (!providers?.length) return '';

  const chips = providers
    .map((p) => {
      const logo = p.logo
        ? `<img src="${esc(p.logo)}" alt="" loading="lazy" decoding="async">`
        : `<span class="provider-initial" aria-hidden="true">${esc(
            (p.name || '?').charAt(0).toUpperCase()
          )}</span>`;
      return `<li class="provider">${logo}<span>${esc(p.name)}</span></li>`;
    })
    .join('');

  return `
    <div class="provider-group ${modifier}">
      <h4 class="provider-group-title">${esc(label)}</h4>
      <ul class="provider-list">${chips}</ul>
    </div>`;
}

function detailMarkup(item) {
  const p = item.providers || {};

  const facts = [];
  if (item.year) facts.push(`${item.year}`);
  facts.push(item.type === 'tv' ? 'TV series' : 'Movie');
  if (item.runtime) facts.push(`${item.runtime} min`);
  if (item.seasons) {
    facts.push(`${item.seasons} season${item.seasons === 1 ? '' : 's'}`);
  }
  if (item.rating) facts.push(`★ ${item.rating}`);
  if (item.genres?.length) facts.push(item.genres.slice(0, 3).join(', '));

  const availability = p.available
    ? [
        providerGroupMarkup('Included with subscription', p.stream, 'is-stream'),
        providerGroupMarkup('Free', p.free, 'is-free'),
        providerGroupMarkup('Free with ads', p.ads, 'is-free'),
        providerGroupMarkup('Rent', p.rent, 'is-paid'),
        providerGroupMarkup('Buy', p.buy, 'is-paid'),
      ].join('')
    : `<div class="no-availability">
         Not on any streaming service in <strong>${esc(p.region || state.region)}</strong>
         right now. Try switching country, or grab a physical copy below.
       </div>`;

  const actions = [];
  if (p.link) {
    actions.push(
      `<a class="btn-link" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">
         ↗ All watch options
       </a>`
    );
  }
  if (item.amazonLink) {
    actions.push(
      `<a class="btn-link is-amazon" href="${esc(item.amazonLink)}" target="_blank" rel="noopener sponsored">
         📦 Find it on DVD / Blu-ray
       </a>`
    );
  }
  actions.push(
    `<button class="btn-link" type="button" data-share
       data-title="${esc(item.title)}">🔗 Share this</button>`
  );
  if (item.tmdbUrl) {
    actions.push(
      `<a class="btn-link" href="${esc(item.tmdbUrl)}" target="_blank" rel="noopener noreferrer">
         ℹ More info
       </a>`
    );
  }

  return `
    <div class="detail">
      <div class="detail-head">
        ${posterMarkup(item, 'detail-poster')}
        <div class="detail-heading">
          <h2 class="detail-title" id="modal-title">${esc(item.title)}</h2>
          <div class="detail-facts">${facts.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
          ${item.overview ? `<p class="detail-overview">${esc(item.overview)}</p>` : ''}
        </div>
      </div>

      <div class="availability">${availability}</div>
      <div class="detail-actions">${actions.join('')}</div>
    </div>`;
}

function openModal() {
  if (!el.modal.hidden) return;
  state.lastFocused = document.activeElement;
  el.modal.hidden = false;
  document.body.style.overflow = 'hidden';
  el.modalPanel.focus();
}

function closeModal({ updateHistory = true } = {}) {
  if (el.modal.hidden) return;
  el.modal.hidden = true;
  el.modalBody.innerHTML = '';
  document.body.style.overflow = '';

  if (updateHistory) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('t')) {
      url.searchParams.delete('t');
      history.replaceState({}, '', url);
    }
  }

  if (state.lastFocused?.isConnected) state.lastFocused.focus();
  state.lastFocused = null;
}

async function openTitle(type, id, { push = true } = {}) {
  openModal();
  el.modalBody.innerHTML = `<div class="detail"><p class="detail-overview">Loading…</p></div>`;

  if (push) {
    const url = new URL(window.location.href);
    url.searchParams.set('t', `${type}-${id}`);
    history.pushState({ t: `${type}-${id}` }, '', url);
  }

  try {
    const params = new URLSearchParams({ type, id: String(id), region: state.region });
    const item = await fetchJson(`/api/title?${params}`);
    if (el.modal.hidden) return; // Closed while loading.
    el.modalBody.innerHTML = detailMarkup(item);
  } catch (err) {
    el.modalBody.innerHTML = `
      <div class="detail">
        <div class="notice error"><strong>Couldn't load that title.</strong> ${esc(err.message)}</div>
      </div>`;
  }
}

async function openRandom() {
  el.randomBtn.disabled = true;
  try {
    const params = new URLSearchParams({
      decade: state.decade,
      type: state.type === 'tv' ? 'tv' : 'movie',
      region: state.region,
    });
    const item = await fetchJson(`/api/random?${params}`);
    openModal();
    el.modalBody.innerHTML = detailMarkup(item);

    const url = new URL(window.location.href);
    url.searchParams.set('t', `${item.type}-${item.id}`);
    history.pushState({ t: `${item.type}-${item.id}` }, '', url);
  } catch (err) {
    toast(err.message);
  } finally {
    el.randomBtn.disabled = false;
  }
}

/* --------------------------------------------------------------- Share ---- */

async function share(title) {
  const url = window.location.href;
  const text = `Where to watch ${title}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: text, url });
      return;
    } catch {
      return; // User cancelled: not an error worth surfacing.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied to clipboard');
  } catch {
    toast(url);
  }
}

/* ------------------------------------------------------------------- Pills */

function decadeLabelFor(key) {
  const found = state.settings?.decades?.find((d) => d.key === key);
  if (!found) return 'The 90s';
  return found.label;
}

function renderDecadePills() {
  const decades = state.settings?.decades || [
    { key: '90s', label: 'The 90s' },
    { key: '00s', label: 'The 2000s' },
    { key: 'all', label: 'Both' },
  ];

  el.decadePills.innerHTML = decades
    .map((d) => {
      // "all" reads better as "Both" in a two-decade picker.
      const label = d.key === 'all' ? 'Both' : d.label.replace(/^The\s+/, '');
      return `<button type="button" class="pill" data-decade="${esc(d.key)}">${esc(label)}</button>`;
    })
    .join('');

  syncPillStates();
}

function syncPillStates() {
  for (const pill of el.decadePills.querySelectorAll('[data-decade]')) {
    pill.setAttribute('aria-pressed', String(pill.dataset.decade === state.decade));
  }
  for (const pill of el.typePills.querySelectorAll('[data-type]')) {
    pill.setAttribute('aria-pressed', String(pill.dataset.type === state.type));
  }
}

/* --------------------------------------------------------------- URL sync  */

function syncUrl() {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  state.query.trim() ? params.set('q', state.query.trim()) : params.delete('q');
  state.decade !== '90s' ? params.set('decade', state.decade) : params.delete('decade');
  state.type !== 'all' ? params.set('type', state.type) : params.delete('type');
  state.region !== (state.settings?.defaultRegion || 'US')
    ? params.set('region', state.region)
    : params.delete('region');

  history.replaceState(history.state, '', url);
}

function readUrl() {
  const params = new URLSearchParams(window.location.search);

  const decade = params.get('decade');
  if (decade && state.settings?.decades?.some((d) => d.key === decade)) {
    state.decade = decade;
  }

  const type = params.get('type');
  if (type === 'movie' || type === 'tv' || type === 'all') state.type = type;

  const region = params.get('region');
  if (region && /^[A-Za-z]{2}$/.test(region)) state.region = region.toUpperCase();

  const q = params.get('q');
  if (q) state.query = q;

  return params.get('t');
}

/* ------------------------------------------------------------ Newsletter  */

async function submitNewsletter(event) {
  event.preventDefault();

  const email = el.newsletterInput.value.trim();
  if (!email) return;

  el.newsletterSubmit.disabled = true;
  el.newsletterStatus.textContent = 'Signing you up…';
  el.newsletterStatus.className = 'newsletter-status';

  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'where-to-watch-the-90s' }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(payload.error || 'Signup failed. Please try again.');

    el.newsletterStatus.textContent =
      payload.status === 'already_subscribed'
        ? "You're already on the list. See you Friday."
        : "You're in. Check your inbox to confirm.";
    el.newsletterStatus.className = 'newsletter-status ok';
    el.newsletterForm.reset();
  } catch (err) {
    el.newsletterStatus.textContent = err.message;
    el.newsletterStatus.className = 'newsletter-status err';
  } finally {
    el.newsletterSubmit.disabled = false;
  }
}

/* ----------------------------------------------------------------- Events  */

function bindEvents() {
  el.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.query = el.searchInput.value;
    syncUrl();
    runSearch();
    el.searchInput.blur(); // Dismiss the mobile keyboard.
  });

  el.searchInput.addEventListener('input', () => {
    state.query = el.searchInput.value;
    el.searchClear.hidden = !state.query;
    debouncedSearch();
  });

  el.searchClear.addEventListener('click', () => {
    state.query = '';
    el.searchInput.value = '';
    el.searchClear.hidden = true;
    el.searchInput.focus();
    syncUrl();
    renderBrowse();
  });

  el.decadePills.addEventListener('click', (event) => {
    const pill = event.target.closest('[data-decade]');
    if (!pill) return;
    state.decade = pill.dataset.decade;
    syncPillStates();
    syncUrl();
    state.query.trim() ? runSearch() : renderBrowse();
  });

  el.typePills.addEventListener('click', (event) => {
    const pill = event.target.closest('[data-type]');
    if (!pill) return;
    state.type = pill.dataset.type;
    syncPillStates();
    syncUrl();
    state.query.trim() ? runSearch() : renderBrowse();
  });

  el.regionSelect.addEventListener('change', () => {
    state.region = el.regionSelect.value;
    try {
      localStorage.setItem(REGION_STORAGE_KEY, state.region);
    } catch {
      // Private browsing: preference simply won't persist.
    }
    syncUrl();
    toast(`Now showing availability for ${el.regionSelect.selectedOptions[0].textContent}`);
  });

  el.randomBtn.addEventListener('click', openRandom);

  // Event delegation: cards are re-rendered constantly.
  el.results.addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    openTitle(card.dataset.type, card.dataset.id);
  });

  el.modalBody.addEventListener('click', (event) => {
    const shareBtn = event.target.closest('[data-share]');
    if (shareBtn) share(shareBtn.dataset.title);
  });

  el.modalClose.addEventListener('click', () => closeModal());
  el.modal.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close-modal')) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el.modal.hidden) closeModal();
  });

  // Back button closes the modal; forward/deep-link reopens it.
  window.addEventListener('popstate', () => {
    const t = new URLSearchParams(window.location.search).get('t');
    if (!t) {
      closeModal({ updateHistory: false });
      return;
    }
    const [type, id] = t.split('-');
    if ((type === 'movie' || type === 'tv') && id) {
      openTitle(type, id, { push: false });
    }
  });

  el.newsletterForm.addEventListener('submit', submitNewsletter);
}

/* -------------------------------------------------------------------- Init */

async function init() {
  bindEvents();

  // Restore a previously chosen country before settings load.
  try {
    const saved = localStorage.getItem(REGION_STORAGE_KEY);
    if (saved && /^[A-Za-z]{2}$/.test(saved)) state.region = saved.toUpperCase();
  } catch {
    // Ignore storage failures.
  }

  try {
    state.settings = await fetchJson('/api/settings');
  } catch {
    state.settings = null;
  }

  if (state.settings) {
    if (!localStorageHasRegion()) state.region = state.settings.defaultRegion || 'US';
    el.disclosure.hidden = !state.settings.affiliateEnabled;
    el.newsletter.hidden = !state.settings.emailEnabled;
  }

  const deepLink = readUrl();

  renderDecadePills();
  el.regionSelect.value = state.region;
  el.searchInput.value = state.query;
  el.searchClear.hidden = !state.query;
  syncPillStates();

  if (state.settings && !state.settings.configured) {
    showNotice(
      `<strong>Almost there.</strong> Add a <code>TMDB_API_KEY</code> environment
       variable to start showing real streaming data. See the README for the
       two-minute setup, or run with <code>MOCK=1</code> to preview with sample data.`
    );
    return;
  }

  if (state.settings?.mock) {
    showNotice(
      `<strong>Preview mode.</strong> Showing a small set of sample titles.
       Add a <code>TMDB_API_KEY</code> and set <code>MOCK=0</code> for live data.`
    );
  }

  // Render the page behind the modal first so closing it reveals content.
  await (state.query.trim() ? runSearch() : renderBrowse());

  if (deepLink) {
    const [type, id] = deepLink.split('-');
    if ((type === 'movie' || type === 'tv') && id) {
      openTitle(type, id, { push: false });
    }
  }
}

function localStorageHasRegion() {
  try {
    return Boolean(localStorage.getItem(REGION_STORAGE_KEY));
  } catch {
    return false;
  }
}

init();
