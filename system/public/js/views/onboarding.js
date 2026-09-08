import { api } from '../api.js';
import { todayStr } from '../state.js';

const FOCUS_AREAS = [
  { key: 'body', label: 'Body' },
  { key: 'mind', label: 'Mind' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'learning', label: 'Learning' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'health', label: 'Health' },
  { key: 'custom', label: 'Custom' },
];

export function renderOnboarding(root, onDone) {
  let step = 'intro';
  const selected = new Set();
  let goal = '';

  function shell(inner) {
    root.innerHTML = `<div class="center-page"><div class="sys-window glow" style="width:min(480px,100%);position:relative;">
      <div class="sys-corners"><span></span><span></span><span></span><span></span></div>
      ${inner}
    </div></div>`;
  }

  function renderIntro() {
    shell(`
      <div style="text-align:center;padding:12px 0;">
        <div class="eyebrow text-accent">SYSTEM INITIALIZED</div>
        <h1 class="h-display" style="margin-top:14px;">GOOD ${greeting()}, PLAYER.</h1>
        <p class="text-dim" style="margin-top:16px;font-size:14px;">TODAY'S OBJECTIVE:</p>
        <p class="text-accent" style="margin-top:6px;font-size:15px;font-weight:700;letter-spacing:.03em;">BECOME 1% STRONGER THAN YESTERDAY.</p>
        <button class="btn btn-primary" id="next" style="margin-top:28px;">Initialize Player</button>
      </div>
    `);
    document.getElementById('next').onclick = () => { step = 'focus'; renderFocus(); };
  }

  function renderFocus() {
    shell(`
      <div class="eyebrow text-accent">STEP 1 OF 3</div>
      <h2 class="h1" style="margin-top:10px;">What do you want to improve?</h2>
      <p class="text-dim" style="font-size:12.5px;margin-top:6px;">Choose up to three focus areas.</p>
      <div class="chip-select" style="margin-top:18px;">
        ${FOCUS_AREAS.map((f) => `<div class="chip" data-key="${f.key}">${f.label}</div>`).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="next" style="margin-top:26px;" disabled>Continue</button>
    `);
    const chips = [...document.querySelectorAll('.chip')];
    chips.forEach((c) => {
      c.onclick = () => {
        const key = c.dataset.key;
        if (selected.has(key)) { selected.delete(key); c.classList.remove('selected'); }
        else if (selected.size < 3) { selected.add(key); c.classList.add('selected'); }
        document.getElementById('next').disabled = selected.size === 0;
      };
    });
    document.getElementById('next').onclick = () => { step = 'goal'; renderGoal(); };
  }

  function renderGoal() {
    shell(`
      <div class="eyebrow text-accent">STEP 2 OF 3</div>
      <h2 class="h1" style="margin-top:10px;">What is your main goal?</h2>
      <div class="field" style="margin-top:18px;">
        <textarea class="input" id="goal" placeholder="e.g. Build discipline and get in the best shape of my life"></textarea>
      </div>
      <div class="row">
        <button class="btn btn-ghost" id="back">Back</button>
        <span class="spacer"></span>
        <button class="btn btn-primary" id="next">Continue</button>
      </div>
    `);
    document.getElementById('goal').value = goal;
    document.getElementById('back').onclick = () => { step = 'focus'; renderFocus(); };
    document.getElementById('next').onclick = async () => {
      goal = document.getElementById('goal').value.trim();
      step = 'generating';
      await renderGenerating();
    };
  }

  async function renderGenerating() {
    shell(`
      <div style="text-align:center;padding:20px 0;">
        <div class="eyebrow text-accent">STEP 3 OF 3</div>
        <h2 class="h1" style="margin-top:10px;">GENERATING QUEST LOG…</h2>
        <div class="bar" style="margin-top:22px;"><div class="bar-fill" style="width:100%;"></div></div>
      </div>
    `);
    const res = await api.onboard({ focusAreas: [...selected], goal, today: todayStr() });
    setTimeout(() => renderReady(res), 500);
  }

  function renderReady(res) {
    shell(`
      <div style="text-align:center;padding:8px 0;">
        <div class="eyebrow text-accent">SYSTEM MESSAGE</div>
        <h2 class="h1" style="margin-top:10px;">${res.questIds.length} QUESTS AVAILABLE</h2>
        <p class="text-dim" style="margin-top:10px;font-size:13px;">Your first mission has been recorded.</p>
        <p class="text-accent" style="margin-top:6px;font-size:13px;font-weight:600;">The First Ascent — a 90-day journey.</p>
        <button class="btn btn-primary" id="enter" style="margin-top:26px;">Enter The System</button>
      </div>
    `);
    document.getElementById('enter').onclick = onDone;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'MORNING';
    if (h < 18) return 'AFTERNOON';
    return 'EVENING';
  }

  renderIntro();
}
