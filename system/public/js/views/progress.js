import { api } from '../api.js';
import { todayStr } from '../state.js';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export async function renderProgress(root) {
  let tab = 'map';
  let month = todayStr().slice(0, 7);

  async function draw() {
    root.innerHTML = `
      <div class="section-title">
        <h1 class="h1">PROGRESSION</h1>
        <div class="row" style="gap:8px;">
          <button class="btn ${tab === 'map' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="map">Map</button>
          <button class="btn ${tab === 'calendar' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="calendar">Calendar</button>
        </div>
      </div>
      <div id="content"></div>
    `;
    root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    const content = document.getElementById('content');
    if (tab === 'map') await renderMap(content);
    else await renderCalendar(content);
  }

  async function renderMap(content) {
    const data = await api.progression();
    content.innerHTML = `
      <div class="sys-window">
        <div class="sys-window-label">CHARACTER PROGRESSION</div>
        <div class="progress-map">
          ${data.milestones
            .map((m, i) => {
              const state = i === data.currentMilestoneIndex ? 'current' : m.reached ? 'reached' : '';
              return `
              <div class="map-node-row ${state}">
                <div class="line"></div>
                <div class="map-node">${m.level}</div>
                <div>
                  <div style="font-size:13.5px;font-weight:700;">LEVEL ${m.level}</div>
                  <div class="text-faint" style="font-size:11px;">RANK ${m.rank}${state === 'current' ? ' · YOU ARE HERE' : ''}</div>
                </div>
              </div>`;
            })
            .join('')}
        </div>
        ${data.nextMilestone ? `<p class="text-dim" style="font-size:12.5px;margin-top:10px;">Next milestone: <span class="text-accent">Level ${data.nextMilestone.level}</span></p>` : `<p class="text-dim" style="font-size:12.5px;margin-top:10px;">You've reached the outer edge of the known map.</p>`}
      </div>
    `;
  }

  async function renderCalendar(content) {
    const { days } = await api.calendar(month);
    const first = new Date(`${month}-01T00:00:00Z`);
    let firstDow = first.getUTCDay(); // 0=Sun
    firstDow = firstDow === 0 ? 6 : firstDow - 1; // convert to Mon=0..Sun=6
    const leadingBlanks = Array.from({ length: firstDow });

    content.innerHTML = `
      <div class="sys-window">
        <div class="row between" style="margin-bottom:14px;">
          <button class="icon-btn" id="prev-month">&larr;</button>
          <div class="sys-window-label" style="margin:0;">${monthLabel(month)}</div>
          <button class="icon-btn" id="next-month">&rarr;</button>
        </div>
        <div class="cal-grid">
          ${DOW.map((d) => `<div class="cal-dow">${d}</div>`).join('')}
          ${leadingBlanks.map(() => `<div class="cal-cell empty"></div>`).join('')}
          ${days
            .map((d) => {
              let cls = '';
              if (d.perfect) cls = 'perfect';
              else if (d.completed > 0) cls = 'partial';
              else if (d.missed) cls = 'missed';
              return `<div class="cal-cell ${cls}" title="${d.completed}/${d.due} completed · ${d.xpEarned} XP">${Number(d.date.slice(-2))}${d.completed > 0 ? '<span class="dot"></span>' : ''}</div>`;
            })
            .join('')}
        </div>
        <div class="row" style="gap:16px;margin-top:16px;flex-wrap:wrap;">
          <span class="text-faint" style="font-size:11px;"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent);margin-right:5px;"></span>Perfect day</span>
          <span class="text-faint" style="font-size:11px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(245,183,61,.6);margin-right:5px;"></span>Partial</span>
          <span class="text-faint" style="font-size:11px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(239,72,103,.5);margin-right:5px;"></span>Missed</span>
        </div>
      </div>
    `;
    document.getElementById('prev-month').onclick = () => { month = shiftMonth(month, -1); renderCalendar(content); };
    document.getElementById('next-month').onclick = () => { month = shiftMonth(month, 1); renderCalendar(content); };
  }

  function monthLabel(m) {
    const [y, mo] = m.split('-').map(Number);
    return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
  }
  function shiftMonth(m, delta) {
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  await draw();
}
