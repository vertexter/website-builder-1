import { api } from '../api.js';
import { icon } from '../icons.js';
import { state, todayStr } from '../state.js';
import { mountQuestList } from '../components/questlist.js';
import { questCompleteToast, showToast } from '../components/toast.js';
import { queueLevelUp, queueRankUp, queueAchievement } from '../components/overlays.js';
import { refreshPlayerStatus } from '../app.js';

export async function renderHome(root) {
  root.innerHTML = `<div class="system-loading">LOADING PLAYER DATA…</div>`;

  const date = todayStr();
  const [status, questsRes, missionsRes, achRes] = await Promise.all([
    api.status(date),
    api.todayQuests(date),
    api.missions(),
    api.achievements(),
  ]);

  const recentAchievements = achRes.achievements
    .filter((a) => a.unlocked)
    .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
    .slice(0, 3);
  const activeMissions = missionsRes.missions.filter((m) => m.status === 'active').slice(0, 3);

  root.innerHTML = `
    <div class="stack">
      <div class="sys-window glow" style="position:relative;">
        <div class="sys-corners"><span></span><span></span><span></span><span></span></div>
        <div class="eyebrow">WELCOME BACK, PLAYER</div>
        <div class="row" style="margin-top:10px;align-items:baseline;gap:18px;flex-wrap:wrap;">
          <h1 class="h-display">LEVEL ${status.level}</h1>
          <span class="badge rank" style="font-size:12px;padding:6px 14px;">RANK ${status.rank}</span>
          <span class="text-dim" style="font-size:12.5px;">${status.rankLabel}</span>
        </div>
        <div style="margin-top:18px;">
          <div class="row between" style="margin-bottom:6px;">
            <span class="eyebrow">XP</span>
            <span class="text-dim mono" style="font-size:12px;">${fmt(status.xpIntoLevel)} / ${fmt(status.xpForNextLevel)}</span>
          </div>
          <div class="bar"><div class="bar-fill" style="width:${pct(status.xpIntoLevel, status.xpForNextLevel)}%;"></div></div>
        </div>
        <div class="row" style="margin-top:18px;gap:22px;flex-wrap:wrap;">
          <div>
            <div class="eyebrow">STREAK</div>
            <div class="h2" style="margin-top:4px;">${icon('flame', 'icon')} ${status.currentStreak} DAYS</div>
          </div>
          <div>
            <div class="eyebrow">QUESTS</div>
            <div class="h2" style="margin-top:4px;">${status.todayCompleted} / ${status.todayDue} COMPLETED</div>
          </div>
          <div>
            <div class="eyebrow">NEXT RANK</div>
            <div class="h2" style="margin-top:4px;">${status.nextRank || 'MAX'}</div>
          </div>
        </div>
      </div>

      <div class="sys-window">
        <div class="section-title">
          <div class="sys-window-label" style="margin:0;">TODAY'S QUESTS</div>
          <a href="#/quests" class="text-faint" style="font-size:11px;">Manage ${icon('chevronRight', 'icon')}</a>
        </div>
        <div id="today-quests"></div>
      </div>

      <div class="grid-2">
        <div class="sys-window">
          <div class="sys-window-label">PLAYER STATS</div>
          <div id="stat-bars" class="stack" style="gap:12px;"></div>
        </div>
        <div class="stack">
          <div class="sys-window">
            <div class="sys-window-label">ACTIVE MISSIONS</div>
            ${activeMissions.length ? activeMissions.map(missionHtml).join('') : `<p class="text-faint" style="font-size:12.5px;">No active missions.</p>`}
          </div>
          <div class="sys-window">
            <div class="sys-window-label">RECENT ACHIEVEMENTS</div>
            ${recentAchievements.length ? `<div class="ach-grid">${recentAchievements.map(achHtml).join('')}</div>` : `<p class="text-faint" style="font-size:12.5px;">Complete quests to unlock achievements.</p>`}
          </div>
        </div>
      </div>
    </div>
  `;

  renderStatBars(status.stats, status.statDefs);

  const listRoot = document.getElementById('today-quests');
  mountQuestList(listRoot, questsRes.quests, {
    onComplete: async (q, card) => {
      const res = await api.completeQuest(q.id, date);
      card.classList.add('completed');
      card.querySelector('.quest-check').classList.add('checked');
      card.querySelector('.quest-check').innerHTML = icon('check', 'icon');
      questCompleteToast({ xpAwarded: res.xpAwarded, statKey: res.statKey, streak: res.streak });
      await refreshPlayerStatus();
      await handleProgressionEvents(res);
      renderHome(root);
    },
    onUndo: async (q, card) => {
      await api.undoQuest(q.id, date);
      await refreshPlayerStatus();
      renderHome(root);
    },
  });
}

async function handleProgressionEvents(res) {
  if (res.leveledUp) queueLevelUp(res.previousLevel, res.newLevel, res.xpAwarded);
  if (res.rankedUp) queueRankUp(res.previousRank, res.newRank, res.newRank);
  if (res.achievementsUnlocked && res.achievementsUnlocked.length) {
    res.achievementsUnlocked.forEach((a) => queueAchievement(a));
  }
  if (res.perfectDay) {
    showToast({ title: 'PERFECT DAY', body: 'Every quest completed. The System takes notice.' });
  }
}

function renderStatBars(stats, defs) {
  const el = document.getElementById('stat-bars');
  const visible = state.settings && state.settings.visibleStats ? new Set(state.settings.visibleStats) : null;
  const shown = visible ? defs.filter((d) => visible.has(d.key)) : defs;
  const max = Math.max(50, ...Object.values(stats));
  el.innerHTML = shown
    .map((d) => {
      const xp = stats[d.key] || 0;
      return `
        <div>
          <div class="row between" style="margin-bottom:5px;">
            <span class="text-dim" style="font-size:12px;font-weight:600;">${d.key}</span>
            <span class="mono text-faint" style="font-size:11px;">${xp} XP</span>
          </div>
          <div class="bar thin"><div class="bar-fill" style="width:${Math.min(100, (xp / max) * 100)}%;"></div></div>
        </div>
      `;
    })
    .join('');
}

function missionHtml(m) {
  return `
    <div style="margin-bottom:14px;">
      <div class="row between" style="margin-bottom:5px;">
        <span style="font-size:13px;font-weight:600;">${m.name}</span>
        <span class="mono text-faint" style="font-size:11px;">${m.progress}/${m.target}</span>
      </div>
      <div class="bar thin"><div class="bar-fill gold" style="width:${Math.min(100, (m.progress / m.target) * 100)}%;"></div></div>
    </div>
  `;
}

function achHtml(a) {
  return `<div class="ach-card"><div class="ach-icon">${icon(a.icon, 'icon')}</div><div class="ach-name">${a.name}</div></div>`;
}

function pct(v, total) {
  return Math.min(100, Math.max(0, (v / total) * 100));
}
function fmt(n) {
  return Number(n).toLocaleString();
}
