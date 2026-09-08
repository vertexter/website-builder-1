// Synthesized SFX via WebAudio — no external audio files, no autoplay.
let ctx = null;
let enabled = false;

export function setSoundEnabled(v) {
  enabled = !!v;
}

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, duration = 0.16, type = 'sine', gain = 0.05, delay = 0, slideTo = null }) {
  if (!enabled) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + delay);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + delay + duration);
  g.gain.setValueAtTime(0.0001, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + delay + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + duration);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration + 0.02);
}

export const sfx = {
  questComplete: () => {
    tone({ freq: 520, type: 'triangle', duration: 0.12, gain: 0.06 });
    tone({ freq: 780, type: 'triangle', duration: 0.16, gain: 0.05, delay: 0.07 });
  },
  xpGain: () => tone({ freq: 660, type: 'sine', duration: 0.09, gain: 0.04 }),
  levelUp: () => {
    [440, 554, 659, 880].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.22, gain: 0.055, delay: i * 0.09 }));
  },
  achievement: () => {
    tone({ freq: 500, type: 'square', duration: 0.08, gain: 0.03 });
    tone({ freq: 750, type: 'square', duration: 0.14, gain: 0.035, delay: 0.09 });
  },
  rankUp: () => {
    tone({ freq: 300, type: 'sawtooth', duration: 0.4, gain: 0.04, slideTo: 900 });
  },
  click: () => tone({ freq: 340, type: 'sine', duration: 0.05, gain: 0.025 }),
};
