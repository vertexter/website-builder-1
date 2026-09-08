import { api } from '../api.js';
import { icon } from '../icons.js';
import { todayStr } from '../state.js';
import { mountQuestList } from '../components/questlist.js';
import { questCompleteToast, showToast } from '../components/toast.js';
import { queueLevelUp, queueRankUp, queueAchievement } from '../components/overlays.js';
import { refreshPlayerStatus } from '../app.js';

const DIFFICULTIES = ['easy', 'normal', 'hard', 'elite', 'boss'];
const STATS = ['STR', 'INT', 'VIT', 'AGI', 'DISC', 'FOC', 'CHA'];
const FREQS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekdays', label: 'Weekdays' },
  { key: 'weekly', label: 'Weekly Target' },
  { key: 'monthly', label: 'Monthly Target' },
];

export async function renderQuests(root) {
  let tab = 'today';
  let showForm = false;
  let editingQuest = null;
  const date = todayStr();

  async function draw() {
    root.innerHTML = `
      <div class="section-title">
        <h1 class="h1">QUEST LOG</h1>
        <button class="btn btn-primary btn-sm" id="new-quest">${icon('plus')} New Quest</button>
      </div>
      <div class="row" style="gap:8px;margin-bottom:18px;">
        ${tabBtn('today', 'Today')}
        ${tabBtn('all', 'All Quests')}
        ${tabBtn('missions', 'Missions')}
      </div>
      <div id="form-slot"></div>
      <div id="tab-content"></div>
    `;
    document.getElementById('new-quest').onclick = () => { editingQuest = null; showForm = true; renderForm(); };
    root.querySelectorAll('[data-tab]').forEach((b) => {
      b.onclick = () => { tab = b.dataset.tab; showForm = false; draw(); };
    });
    if (showForm) renderForm();
    await renderTab();
  }

  function tabBtn(key, label) {
    return `<button class="btn ${tab === key ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="${key}">${label}</button>`;
  }

  function renderForm() {
    const slot = document.getElementById('form-slot');
    const q = editingQuest;
    slot.innerHTML = `
      <div class="sys-window" style="margin-bottom:18px;">
        <div class="sys-window-label">${q ? 'EDIT QUEST' : 'NEW QUEST'}</div>
        <div class="field"><label>Name</label><input class="input" id="qf-name" value="${q ? escapeAttr(q.name) : ''}" placeholder="e.g. Read 20 pages" /></div>
        <div class="grid-2">
          <div class="field"><label>Category</label>
            <select class="input" id="qf-stat">
              <option value="">None</option>
              ${STATS.map((s) => `<option value="${s}" ${q && q.statKey === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Difficulty</label>
            <select class="input" id="qf-diff">
              ${DIFFICULTIES.map((d) => `<option value="${d}" ${q && q.difficulty === d ? 'selected' : (!q && d === 'normal') ? 'selected' : ''}>${cap(d)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="field"><label>XP Reward (optional override)</label><input class="input" id="qf-xp" type="number" min="1" placeholder="Auto by difficulty" value="${q ? q.xpReward : ''}" /></div>
          <div class="field"><label>Frequency</label>
            <select class="input" id="qf-freq">
              ${FREQS.map((f) => `<option value="${f.key}" ${q && q.frequencyType === f.key ? 'selected' : ''}>${f.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field" id="target-wrap" style="display:${q && (q.questType === 'weekly' || q.questType === 'monthly') ? 'flex' : 'none'};">
          <label>Target Count (per period)</label><input class="input" id="qf-target" type="number" min="1" value="${q && q.targetCount ? q.targetCount : 3}" />
        </div>
        <div class="field"><label>Notes (optional)</label><textarea class="input" id="qf-notes">${q && q.notes ? escapeHtml(q.notes) : ''}</textarea></div>
        <div class="row">
          <button class="btn btn-ghost" id="qf-cancel">Cancel</button>
          <span class="spacer"></span>
          <button class="btn btn-primary" id="qf-submit">${q ? 'Save Changes' : 'Create Quest'}</button>
        </div>
      </div>
    `;
    document.getElementById('qf-freq').onchange = (e) => {
      const wrap = document.getElementById('target-wrap');
      wrap.style.display = e.target.value === 'weekly' || e.target.value === 'monthly' ? 'flex' : 'none';
    };
    document.getElementById('qf-cancel').onclick = () => { showForm = false; editingQuest = null; draw(); };
    document.getElementById('qf-submit').onclick = async () => {
      const freq = document.getElementById('qf-freq').value;
      const payload = {
        name: document.getElementById('qf-name').value.trim(),
        statKey: document.getElementById('qf-stat').value || null,
        difficulty: document.getElementById('qf-diff').value,
        xpReward: document.getElementById('qf-xp').value ? Number(document.getElementById('qf-xp').value) : undefined,
        frequencyType: freq,
        questType: freq === 'weekly' ? 'weekly' : freq === 'monthly' ? 'monthly' : 'daily',
        targetCount: (freq === 'weekly' || freq === 'monthly') ? Number(document.getElementById('qf-target').value) : null,
        notes: document.getElementById('qf-notes').value.trim() || null,
        startDate: date,
      };
      if (!payload.name) return showToast({ title: 'MISSING NAME', body: 'A quest needs a name.' });
      if (q) await api.updateQuest(q.id, payload);
      else await api.createQuest(payload);
      showForm = false; editingQuest = null;
      draw();
    };
  }

  async function renderTab() {
    const content = document.getElementById('tab-content');
    if (tab === 'today') return renderTodayTab(content);
    if (tab === 'all') return renderAllTab(content);
    if (tab === 'missions') return renderMissionsTab(content);
  }

  async function renderTodayTab(content) {
    content.innerHTML = `<div class="sys-window"><div class="sys-window-label">TODAY'S QUESTS</div><div id="ql"></div></div>`;
    const { quests } = await api.todayQuests(date);
    mountQuestList(document.getElementById('ql'), quests, {
      onComplete: async (q, card) => {
        const res = await api.completeQuest(q.id, date);
        card.classList.add('completed');
        card.querySelector('.quest-check').classList.add('checked');
        card.querySelector('.quest-check').innerHTML = icon('check', 'icon');
        questCompleteToast({ xpAwarded: res.xpAwarded, statKey: res.statKey, streak: res.streak });
        await refreshPlayerStatus();
        if (res.leveledUp) queueLevelUp(res.previousLevel, res.newLevel, res.xpAwarded);
        if (res.rankedUp) queueRankUp(res.previousRank, res.newRank, res.newRank);
        (res.achievementsUnlocked || []).forEach((a) => queueAchievement(a));
      },
      onUndo: async (q) => {
        await api.undoQuest(q.id, date);
        await refreshPlayerStatus();
        renderTodayTab(content);
      },
    });
  }

  async function renderAllTab(content) {
    const { quests } = await api.allQuests(date);
    content.innerHTML = `<div class="sys-window"><div class="sys-window-label">ALL QUESTS</div><div id="aq"></div></div>`;
    const list = document.getElementById('aq');
    if (!quests.length) {
      list.innerHTML = `<p class="text-faint" style="font-size:13px;">No quests yet. Create your first one above.</p>`;
      return;
    }
    list.innerHTML = quests
      .map(
        (q) => `
        <div class="quest-card" data-id="${q.id}" style="${q.active ? '' : 'opacity:.45;'}">
          <div class="quest-main">
            <div class="quest-name">${escapeHtml(q.name)}</div>
            <div class="quest-meta">
              <span class="badge diff-${q.difficulty}">${cap(q.difficulty)}</span>
              ${q.statKey ? `<span class="badge stat-tag">${q.statKey}</span>` : ''}
              <span class="badge stat-tag">${cap(q.frequencyType)}</span>
              ${!q.active ? `<span class="badge stat-tag">Paused</span>` : ''}
            </div>
          </div>
          <div class="quest-xp">+${q.xpReward} XP</div>
          <button class="icon-btn" data-edit="${q.id}">${icon('edit')}</button>
          <button class="icon-btn" data-del="${q.id}">${icon('trash')}</button>
        </div>
      `
      )
      .join('');
    quests.forEach((q) => {
      list.querySelector(`[data-edit="${q.id}"]`).onclick = () => {
        editingQuest = q; showForm = true; tab = 'all'; draw();
      };
      list.querySelector(`[data-del="${q.id}"]`).onclick = async () => {
        if (!confirm(`Delete "${q.name}"? This removes its full history.`)) return;
        await api.deleteQuest(q.id);
        renderAllTab(content);
      };
    });
  }

  async function renderMissionsTab(content) {
    const { missions } = await api.missions();
    content.innerHTML = `
      <div class="sys-window" style="margin-bottom:16px;">
        <div class="sys-window-label">CREATE MISSION</div>
        <div class="grid-2">
          <div class="field"><label>Name</label><input class="input" id="mf-name" placeholder="e.g. 20 Workouts This Month" /></div>
          <div class="field"><label>Target</label><input class="input" id="mf-target" type="number" min="1" value="10" /></div>
        </div>
        <div class="field"><label>Description</label><input class="input" id="mf-desc" placeholder="Optional" /></div>
        <button class="btn btn-primary btn-sm" id="mf-submit">${icon('plus')} Add Mission</button>
      </div>
      <div class="sys-window"><div class="sys-window-label">MISSIONS</div><div id="mlist"></div></div>
    `;
    document.getElementById('mf-submit').onclick = async () => {
      const name = document.getElementById('mf-name').value.trim();
      const target = Number(document.getElementById('mf-target').value) || 1;
      const description = document.getElementById('mf-desc').value.trim();
      if (!name) return;
      await api.createMission({ name, target, description, startDate: date, xpReward: target * 20 });
      renderMissionsTab(content);
    };
    const mlist = document.getElementById('mlist');
    if (!missions.length) {
      mlist.innerHTML = `<p class="text-faint" style="font-size:13px;">No missions yet.</p>`;
      return;
    }
    mlist.innerHTML = missions
      .map(
        (m) => `
        <div style="margin-bottom:16px;">
          <div class="row between" style="margin-bottom:5px;">
            <span style="font-size:13.5px;font-weight:600;">${escapeHtml(m.name)} ${m.status === 'completed' ? `<span class="badge diff-elite" style="margin-left:6px;">Complete</span>` : ''}</span>
            <span class="mono text-faint" style="font-size:11px;">${m.progress}/${m.target}</span>
          </div>
          ${m.description ? `<p class="text-faint" style="font-size:11.5px;margin-bottom:6px;">${escapeHtml(m.description)}</p>` : ''}
          <div class="bar thin"><div class="bar-fill gold" style="width:${Math.min(100, (m.progress / m.target) * 100)}%;"></div></div>
        </div>
      `
      )
      .join('');
  }

  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function escapeAttr(s) { return escapeHtml(s); }

  await draw();
}
