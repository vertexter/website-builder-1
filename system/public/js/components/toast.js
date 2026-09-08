import { sfx } from '../sound.js';

const root = () => document.getElementById('toast-root');

export function showToast({ title, body, kind = 'info', playSfx = null }) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-title">${title}</div><div class="toast-body">${body}</div>`;
  root().appendChild(el);
  if (playSfx) playSfx();
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 260);
  }, 3600);
}

export function questCompleteToast({ xpAwarded, statKey, streak }) {
  const statLine = statKey ? ` &nbsp;•&nbsp; <span class="text-accent">+${xpAwarded} ${statKey}</span>` : '';
  showToast({
    title: 'QUEST COMPLETE',
    body: `+${xpAwarded} XP${statLine} &nbsp;•&nbsp; Streak ${streak}d`,
    playSfx: sfx.questComplete,
  });
}
