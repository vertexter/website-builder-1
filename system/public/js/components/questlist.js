import { icon } from '../icons.js';

const DIFF_LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard', elite: 'Elite', boss: 'Boss' };

function questCardHtml(q) {
  const bossClass = q.isBoss || q.difficulty === 'boss' ? ' boss' : '';
  const completedClass = q.completed ? ' completed' : '';
  const period = q.periodProgress ? `<span class="badge stat-tag">${q.periodProgress.current}/${q.periodProgress.target} this ${q.questType === 'weekly' ? 'week' : 'month'}</span>` : '';
  return `
    <div class="quest-card${bossClass}${completedClass}" data-id="${q.id}">
      <div class="quest-check ${q.completed ? 'checked' : ''}" data-action="toggle">${q.completed ? icon('check', 'icon') : ''}</div>
      <div class="quest-main">
        <div class="quest-name">${q.isBoss ? '⚔ ' : ''}${escapeHtml(q.name)}</div>
        <div class="quest-meta">
          <span class="badge diff-${q.difficulty}">${DIFF_LABEL[q.difficulty] || q.difficulty}</span>
          ${q.statKey ? `<span class="badge stat-tag">${q.statKey}</span>` : ''}
          ${period}
        </div>
      </div>
      <div class="quest-xp">+${q.xpReward} XP</div>
    </div>
  `;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Renders a list of quest cards into `container` and wires completion toggling.
 * `handlers.onComplete(quest)` / `handlers.onUndo(quest)` should return a Promise
 * resolving to the API response (or rejecting on error).
 */
export function mountQuestList(container, quests, handlers) {
  if (!quests.length) {
    container.innerHTML = `<p class="text-faint" style="font-size:13px;padding:8px 2px;">No quests due today. Add one from the Quests tab.</p>`;
    return;
  }
  container.innerHTML = quests.map(questCardHtml).join('');
  quests.forEach((q) => {
    const card = container.querySelector(`.quest-card[data-id="${q.id}"]`);
    const check = card.querySelector('[data-action="toggle"]');
    check.addEventListener('click', async () => {
      check.style.pointerEvents = 'none';
      try {
        if (q.completed) {
          await handlers.onUndo(q, card);
        } else {
          await handlers.onComplete(q, card);
        }
      } finally {
        check.style.pointerEvents = '';
      }
    });
  });
}
