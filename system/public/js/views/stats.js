import { api } from '../api.js';
import { icon } from '../icons.js';
import { todayStr } from '../state.js';
import { areaChart, barChart } from '../components/chart.js';
import { state } from '../state.js';

export async function renderStats(root) {
  let tab = 'status';

  async function draw() {
    root.innerHTML = `
      <div class="section-title">
        <h1 class="h1">PLAYER STATUS</h1>
        <div class="row" style="gap:8px;">
          <button class="btn ${tab === 'status' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="status">Status</button>
          <button class="btn ${tab === 'analytics' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="analytics">Analytics</button>
          <button class="btn ${tab === 'achievements' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="achievements">Achievements</button>
        </div>
      </div>
      <div id="content"></div>
    `;
    root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    const content = document.getElementById('content');
    if (tab === 'status') await renderStatus(content);
    else if (tab === 'analytics') await renderAnalytics(content);
    else await renderAchievements(content);
  }

  async function renderStatus(content) {
    const status = await api.status(todayStr());
    content.innerHTML = `
      <div class="grid-3">
        ${metricCard('LEVEL', status.level)}
        ${metricCard('RANK', `${status.rank}`, status.rankLabel)}
        ${metricCard('TOTAL XP', fmt(status.totalXp))}
        ${metricCard('CURRENT STREAK', `${status.currentStreak}d`)}
        ${metricCard('LONGEST STREAK', `${status.longestStreak}d`)}
        ${metricCard('PERFECT DAYS', status.perfectDays)}
        ${metricCard('QUESTS COMPLETED', fmt(status.totalQuestsCompleted))}
        ${metricCard('DAILY RATE TODAY', status.todayDue ? `${Math.round((status.todayCompleted / status.todayDue) * 100)}%` : '—')}
        ${metricCard('WEEKLY RATE', `${Math.round(status.weeklyCompletionRate * 100)}%`)}
      </div>
      <div class="sys-window" style="margin-top:16px;">
        <div class="sys-window-label">RANK PROGRESS</div>
        <div class="row between" style="margin-bottom:6px;">
          <span class="mono" style="font-size:12px;">${status.rank}</span>
          <span class="mono text-faint" style="font-size:12px;">${status.nextRank || 'MAX'}</span>
        </div>
        <div class="bar"><div class="bar-fill gold" style="width:${Math.round(status.rankProgress * 100)}%;"></div></div>
      </div>
      <div class="sys-window" style="margin-top:16px;">
        <div class="sys-window-label">ATTRIBUTES</div>
        <div class="stack" style="gap:12px;">
          ${status.statDefs
            .filter((d) => !state.settings || !state.settings.visibleStats || state.settings.visibleStats.includes(d.key))
            .map((d) => {
              const xp = status.stats[d.key] || 0;
              const max = Math.max(50, ...Object.values(status.stats));
              return `
              <div>
                <div class="row between" style="margin-bottom:5px;">
                  <span style="font-size:12.5px;font-weight:700;">${d.key} <span class="text-faint" style="font-weight:400;">— ${d.name}</span></span>
                  <span class="mono text-dim" style="font-size:11.5px;">${xp} XP</span>
                </div>
                <div class="bar thin"><div class="bar-fill" style="width:${Math.min(100, (xp / max) * 100)}%;"></div></div>
              </div>`;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  async function renderAnalytics(content) {
    const data = await api.analytics(todayStr());
    const xpValues = data.xpOverTime.map((d) => d.xp);
    const weeklyItems = data.weeklyPerformance.map((w) => ({ value: Math.round(w.rate * 100) }));

    content.innerHTML = `
      <div class="sys-window">
        <div class="sys-window-label">XP OVER TIME (30 DAYS)</div>
        <div class="chart-wrap">${areaChart(xpValues)}</div>
      </div>
      <div class="grid-2" style="margin-top:16px;">
        <div class="sys-window">
          <div class="sys-window-label">WEEKLY COMPLETION RATE</div>
          <div class="chart-wrap">${barChart(weeklyItems, { max: 100 })}</div>
        </div>
        <div class="sys-window">
          <div class="sys-window-label">BEST DAYS</div>
          <div class="stack" style="gap:10px;">
            ${data.bestDays
              .slice(0, 5)
              .map(
                (d) => `
              <div class="row between">
                <span style="font-size:12.5px;">${d.day}</span>
                <span class="mono text-accent" style="font-size:12px;">${Math.round((d.rate || 0) * 100)}%</span>
              </div>`
              )
              .join('') || `<p class="text-faint" style="font-size:12.5px;">Not enough data yet.</p>`}
          </div>
        </div>
      </div>
      <div class="sys-window" style="margin-top:16px;">
        <div class="sys-window-label">WEAKEST HABITS</div>
        <div class="stack" style="gap:10px;">
          ${data.weakestHabits
            .map(
              (h) => `
            <div>
              <div class="row between" style="margin-bottom:4px;">
                <span style="font-size:12.5px;">${escapeHtml(h.name)}</span>
                <span class="mono text-faint" style="font-size:11px;">${Math.round((h.rate || 0) * 100)}%</span>
              </div>
              <div class="bar thin"><div class="bar-fill" style="width:${Math.round((h.rate || 0) * 100)}%;"></div></div>
            </div>`
            )
            .join('') || `<p class="text-faint" style="font-size:12.5px;">Not enough data yet.</p>`}
        </div>
      </div>
    `;
  }

  async function renderAchievements(content) {
    const { achievements } = await api.achievements();
    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    content.innerHTML = `
      <div class="sys-window">
        <div class="section-title">
          <div class="sys-window-label" style="margin:0;">ACHIEVEMENTS</div>
          <span class="text-faint mono" style="font-size:11.5px;">${unlockedCount}/${achievements.length}</span>
        </div>
        <div class="ach-grid">
          ${achievements
            .map(
              (a) => `
            <div class="ach-card ${a.unlocked ? '' : 'locked'}">
              <div class="ach-icon">${icon(a.icon, 'icon')}</div>
              <div class="ach-name">${a.name}</div>
              <div class="ach-desc">${a.description}</div>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  function metricCard(label, value, sub) {
    return `
      <div class="sys-window tight">
        <div class="eyebrow">${label}</div>
        <div class="stat-num" style="font-size:22px;margin-top:6px;">${value}</div>
        ${sub ? `<div class="text-faint" style="font-size:11px;margin-top:2px;">${sub}</div>` : ''}
      </div>
    `;
  }
  function fmt(n) { return Number(n).toLocaleString(); }
  function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  await draw();
}
