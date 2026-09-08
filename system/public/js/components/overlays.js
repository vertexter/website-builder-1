import { icon } from '../icons.js';
import { sfx } from '../sound.js';

const root = () => document.getElementById('overlay-root');
let queue = [];
let showing = false;

function enqueue(renderFn) {
  queue.push(renderFn);
  if (!showing) dequeue();
}

function dequeue() {
  const next = queue.shift();
  if (!next) {
    showing = false;
    return;
  }
  showing = true;
  next(() => dequeue());
}

function overlayShell(inner) {
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  wrap.innerHTML = inner;
  return wrap;
}

function closeAfter(wrap, ms, cb) {
  const close = () => {
    wrap.style.animation = 'fade-in 0.2s ease reverse';
    setTimeout(() => {
      wrap.remove();
      cb();
    }, 180);
  };
  wrap.addEventListener('click', close);
  const t = setTimeout(close, ms);
  return () => clearTimeout(t);
}

export function queueLevelUp(fromLevel, toLevel, bonusXp = 0) {
  enqueue((done) => {
    const wrap = overlayShell(`
      <div class="levelup-card">
        <div class="eyebrow text-accent">SYSTEM MESSAGE</div>
        <h2 class="h1" style="margin-top:10px;">LEVEL UP</h2>
        <div class="levelup-transition">
          <span class="num from">${fromLevel}</span>
          <span class="arrow">&#8594;</span>
          <span class="num to">${toLevel}</span>
        </div>
        <div class="levelup-rule"></div>
        <p class="text-dim" style="font-size:13px;">Your attributes have increased.</p>
        ${bonusXp ? `<p class="text-accent stat-num" style="margin-top:10px;font-size:15px;">+${bonusXp} XP</p>` : ''}
        <p class="text-faint" style="margin-top:16px;font-size:11px;letter-spacing:.08em;">PLAYER STATUS UPDATED</p>
      </div>
    `);
    root().appendChild(wrap);
    sfx.levelUp();
    closeAfter(wrap, 2600, done);
  });
}

export function queueRankUp(fromRank, toRank, label) {
  enqueue((done) => {
    const wrap = overlayShell(`
      <div class="levelup-card">
        <div class="eyebrow text-accent">RANK ADVANCEMENT</div>
        <h2 class="h1" style="margin-top:10px;">RANK UP</h2>
        <div class="levelup-transition">
          <span class="num from mono">${fromRank}</span>
          <span class="arrow">&#8594;</span>
          <span class="num to mono">${toRank}</span>
        </div>
        <div class="levelup-rule"></div>
        <p class="text-dim" style="font-size:13px;">You are now recognized as</p>
        <p class="text-accent" style="font-size:16px;font-weight:700;letter-spacing:.08em;margin-top:4px;">${(label || '').toUpperCase()}</p>
      </div>
    `);
    root().appendChild(wrap);
    sfx.rankUp();
    closeAfter(wrap, 2600, done);
  });
}

export function queueAchievement(a) {
  enqueue((done) => {
    const wrap = overlayShell(`
      <div class="levelup-card">
        <div class="eyebrow text-accent">ACHIEVEMENT UNLOCKED</div>
        <div class="ach-icon" style="margin:18px auto;width:60px;height:60px;">${icon(a.icon, 'icon')}</div>
        <h2 class="h1">${a.name}</h2>
        <p class="text-dim" style="font-size:13px;margin-top:8px;">${a.description}</p>
      </div>
    `);
    root().appendChild(wrap);
    sfx.achievement();
    closeAfter(wrap, 2400, done);
  });
}
