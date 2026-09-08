import { api, getToken, setToken } from './api.js';
import { icon } from './icons.js';
import { setSoundEnabled } from './sound.js';
import { state, todayStr } from './state.js';
import { renderAuth } from './views/auth.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderHome } from './views/home.js';
import { renderQuests } from './views/quests.js';
import { renderProgress } from './views/progress.js';
import { renderStats } from './views/stats.js';
import { renderProfile } from './views/profile.js';

const NAV = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'quests', label: 'Quests', icon: 'quests' },
  { key: 'progress', label: 'Progress', icon: 'progress' },
  { key: 'stats', label: 'Stats', icon: 'stats' },
  { key: 'profile', label: 'Profile', icon: 'profile' },
];

const VIEWS = {
  home: renderHome,
  quests: renderQuests,
  progress: renderProgress,
  stats: renderStats,
  profile: renderProfile,
};

const root = document.getElementById('root');

function currentRoute() {
  const hash = (location.hash || '#/home').replace('#/', '');
  const [key] = hash.split('/');
  return VIEWS[key] ? key : 'home';
}

function applySettings(settings) {
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.body.classList.toggle('reduced-motion', !!settings.reducedMotion);
  setSoundEnabled(settings.soundEnabled);
}

function navMarkup(activeKey) {
  return NAV.map(
    (n) => `<a class="nav-item ${n.key === activeKey ? 'active' : ''}" href="#/${n.key}">${icon(n.icon)}<span>${n.label}</span></a>`
  ).join('');
}

export async function refreshPlayerStatus() {
  state.player = await api.status(state.today);
  const footer = document.querySelector('.sidebar-footer .text-faint');
  if (footer) footer.textContent = `LV ${state.player.level} · ${state.user.player_name}`;
  return state.player;
}

async function renderShell() {
  const activeKey = currentRoute();
  if (!state.player) {
    try {
      state.player = await api.status(state.today);
    } catch {
      state.player = null;
    }
  }
  root.innerHTML = `
    <div class="app-shell">
      <nav class="sidebar">
        <div class="sidebar-brand">
          <div class="mark">S</div>
          <div class="name">THE SYSTEM</div>
        </div>
        ${navMarkup(activeKey)}
        <div class="sidebar-footer">
          <div class="text-faint" style="font-size:10.5px;letter-spacing:.08em;">LV ${state.player ? state.player.level : '—'} · ${state.user.player_name}</div>
        </div>
      </nav>
      <main class="main" id="view-root"></main>
    </div>
    <nav class="bottom-nav">${navMarkup(activeKey)}</nav>
  `;
  const viewRoot = document.getElementById('view-root');
  await VIEWS[activeKey](viewRoot);
}

async function boot() {
  const token = getToken();
  if (!token) {
    renderAuth(root, onAuthed);
    return;
  }
  try {
    const { user } = await api.me();
    state.user = user;
    const { settings } = await api.getSettings();
    state.settings = settings;
    applySettings(settings);

    if (!user.onboarded) {
      renderOnboarding(root, onOnboarded);
      return;
    }
    await renderShell();
  } catch (e) {
    setToken(null);
    renderAuth(root, onAuthed);
  }
}

async function onAuthed() {
  await boot();
}

async function onOnboarded() {
  await boot();
}

window.addEventListener('hashchange', () => {
  if (state.user && state.user.onboarded) renderShell();
});

export async function refreshAndRerender() {
  await renderShell();
}

boot();
