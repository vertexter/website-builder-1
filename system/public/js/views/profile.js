import { api, setToken } from '../api.js';
import { icon } from '../icons.js';
import { state } from '../state.js';
import { setSoundEnabled, sfx } from '../sound.js';

const THEMES = [
  { key: 'system-dark', label: 'System Dark', desc: 'Black + electric blue.' },
  { key: 'void', label: 'Void', desc: 'Black + violet.' },
  { key: 'aether', label: 'Aether', desc: 'Deep navy + cyan.' },
  { key: 'light-system', label: 'Light System', desc: 'Premium white + blue.' },
];
const AVATARS = ['default', 'blade', 'shield', 'eye', 'flame', 'star'];
const STAT_KEYS = ['STR', 'INT', 'VIT', 'AGI', 'DISC', 'FOC', 'CHA'];

export async function renderProfile(root) {
  const { settings } = await api.getSettings();
  state.settings = settings;

  root.innerHTML = `
    <h1 class="h1" style="margin-bottom:18px;">PROFILE</h1>

    <div class="sys-window" style="margin-bottom:16px;">
      <div class="sys-window-label">PLAYER</div>
      <div class="field"><label>Player Name</label><input class="input" id="p-name" value="${escapeAttr(state.user.player_name)}" /></div>
      <div class="field"><label>Avatar</label>
        <div class="chip-select">
          ${AVATARS.map((a) => `<div class="chip avatar-chip ${state.user.avatar === a ? 'selected' : ''}" data-av="${a}">${icon(avatarIcon(a), 'icon')}</div>`).join('')}
        </div>
      </div>
      ${state.user.is_guest ? `<p class="text-faint" style="font-size:11.5px;margin-top:10px;">Personal mode — this profile lives only on this device.</p>` : `<p class="text-faint" style="font-size:11.5px;margin-top:10px;">${state.user.email}</p>`}
    </div>

    <div class="sys-window" style="margin-bottom:16px;">
      <div class="sys-window-label">THEME</div>
      <div class="grid-2">
        ${THEMES.map(
          (t) => `
          <div class="chip theme-chip ${settings.theme === t.key ? 'selected' : ''}" data-theme-key="${t.key}" style="text-align:left;padding:12px 14px;">
            <div style="font-weight:700;font-size:12.5px;">${t.label}</div>
            <div class="text-faint" style="font-size:11px;margin-top:2px;">${t.desc}</div>
          </div>`
        ).join('')}
      </div>
    </div>

    <div class="sys-window" style="margin-bottom:16px;">
      <div class="sys-window-label">SYSTEM PREFERENCES</div>
      <div class="row between" style="padding:8px 0;">
        <div><div style="font-size:13px;font-weight:600;">System Sound</div><div class="text-faint" style="font-size:11px;">Quest, level-up and achievement chimes.</div></div>
        <div class="toggle ${settings.soundEnabled ? 'on' : ''}" id="t-sound"></div>
      </div>
      <div class="row between" style="padding:8px 0;">
        <div><div style="font-size:13px;font-weight:600;">Reduced Motion</div><div class="text-faint" style="font-size:11px;">Minimize animation across THE SYSTEM.</div></div>
        <div class="toggle ${settings.reducedMotion ? 'on' : ''}" id="t-motion"></div>
      </div>
      <div class="field" style="margin-top:14px;"><label>Animation Intensity</label>
        <select class="input" id="p-anim">
          <option value="normal" ${settings.animationIntensity === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="minimal" ${settings.animationIntensity === 'minimal' ? 'selected' : ''}>Minimal</option>
        </select>
      </div>
    </div>

    <div class="sys-window" style="margin-bottom:16px;">
      <div class="sys-window-label">VISIBLE STATS</div>
      <div class="chip-select">
        ${STAT_KEYS.map((s) => `<div class="chip stat-chip ${settings.visibleStats.includes(s) ? 'selected' : ''}" data-stat="${s}">${s}</div>`).join('')}
      </div>
    </div>

    <div class="row" style="gap:10px;">
      <button class="btn btn-primary" id="save">Save Changes</button>
      <button class="btn btn-ghost" id="logout">${icon('logout')} Logout</button>
    </div>
    ${state.user.isAdmin ? `<div class="sys-window" style="margin-top:24px;"><div class="sys-window-label">ADMIN</div><p class="text-faint" style="font-size:12px;">Signed in with admin privileges. Configure XP values, thresholds and achievements via the admin API.</p></div>` : ''}
  `;

  let theme = settings.theme;
  root.querySelectorAll('.theme-chip').forEach((c) => {
    c.onclick = () => {
      theme = c.dataset.themeKey;
      root.querySelectorAll('.theme-chip').forEach((x) => x.classList.remove('selected'));
      c.classList.add('selected');
      document.documentElement.setAttribute('data-theme', theme);
    };
  });

  let avatar = state.user.avatar;
  root.querySelectorAll('.avatar-chip').forEach((c) => {
    c.onclick = () => {
      avatar = c.dataset.av;
      root.querySelectorAll('.avatar-chip').forEach((x) => x.classList.remove('selected'));
      c.classList.add('selected');
    };
  });

  const visibleStats = new Set(settings.visibleStats);
  root.querySelectorAll('.stat-chip').forEach((c) => {
    c.onclick = () => {
      const s = c.dataset.stat;
      if (visibleStats.has(s)) { visibleStats.delete(s); c.classList.remove('selected'); }
      else { visibleStats.add(s); c.classList.add('selected'); }
    };
  });

  const soundToggle = document.getElementById('t-sound');
  let soundEnabled = settings.soundEnabled;
  soundToggle.onclick = () => {
    soundEnabled = !soundEnabled;
    soundToggle.classList.toggle('on', soundEnabled);
    setSoundEnabled(soundEnabled);
    if (soundEnabled) sfx.click();
  };

  const motionToggle = document.getElementById('t-motion');
  let reducedMotion = settings.reducedMotion;
  motionToggle.onclick = () => {
    reducedMotion = !reducedMotion;
    motionToggle.classList.toggle('on', reducedMotion);
    document.body.classList.toggle('reduced-motion', reducedMotion);
  };

  document.getElementById('save').onclick = async () => {
    const playerName = document.getElementById('p-name').value.trim() || state.user.player_name;
    const animationIntensity = document.getElementById('p-anim').value;
    const { settings: updated } = await api.updateSettings({
      theme,
      soundEnabled,
      reducedMotion,
      animationIntensity,
      visibleStats: [...visibleStats],
      playerName,
      avatar,
    });
    state.settings = updated;
    state.user.player_name = playerName;
    state.user.avatar = avatar;
    document.documentElement.setAttribute('data-theme', updated.theme);
    document.body.classList.toggle('reduced-motion', updated.reducedMotion);
    setSoundEnabled(updated.soundEnabled);
    const footer = document.querySelector('.sidebar-footer .text-faint');
    if (footer) footer.textContent = `LV ${state.player ? state.player.level : '—'} · ${playerName}`;
  };

  document.getElementById('logout').onclick = () => {
    setToken(null);
    location.hash = '';
    location.reload();
  };

  function avatarIcon(a) {
    return { default: 'target', blade: 'sword', shield: 'shield', eye: 'eye', flame: 'flame', star: 'star' }[a] || 'target';
  }
  function escapeAttr(s) { return (s || '').replace(/"/g, '&quot;'); }
}
