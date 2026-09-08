// Original, minimal geometric line-icon set (no third-party icon library).
const stroke = 'stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"';

export const icons = {
  home: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/><path d="M10 20v-6h4v6"/></svg>`,
  quests: `<svg viewBox="0 0 24 24" ${stroke}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l2.5 2.5L16 9"/></svg>`,
  progress: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/></svg>`,
  stats: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5V12l6 3"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="8.5" r="3.5"/><path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" ${stroke}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3v4M16 3v4"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1.2-.6-2-.6-2 1.6.6 2.6 2.4 2.6 4.4A5.5 5.5 0 0 1 6.5 13c0-4.5 4-6 5.5-10z"/></svg>`,
  sword: `<svg viewBox="0 0 24 24" ${stroke}><path d="M14.5 3.5l6 6-9 9-3-3z"/><path d="M4 20l4.5-4.5"/><path d="M3 21l1.5-3.5L7 20z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" ${stroke}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/></svg>`,
  star: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 3.5l2.6 5.4 5.9.6-4.4 4 1.2 5.9L12 16.4 6.7 19.4l1.2-5.9-4.4-4 5.9-.6z"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 8l4 3 5-6 5 6 4-3-1.5 10h-15z"/></svg>`,
  medal: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="14.5" r="5.5"/><path d="M9.5 10L7 3M14.5 10L17 3"/><path d="M10.5 14l1.2 1.2L14 12.7"/></svg>`,
  gem: `<svg viewBox="0 0 24 24" ${stroke}><path d="M5 9l4-5.5h6L19 9l-7 11.5z"/><path d="M5 9h14M9 3.5L7 9l5 11.5M15 3.5L17 9l-5 11.5"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 5v14M5 12h14"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${stroke}><path d="M5 12.5l4.5 4.5L19 7"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 20l.9-4L16 4.9a1.8 1.8 0 0 1 2.5 0l.6.6a1.8 1.8 0 0 1 0 2.5L8 19l-4 1z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4L17 7"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" ${stroke}><path d="M13 3L5 13.5h5.5L11 21l8-11.5h-5.5z"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" ${stroke}><path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9"/><path d="M14.5 16l4-4-4-4"/><path d="M18 12H9"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" ${stroke}><path d="M9 5l7 7-7 7"/></svg>`,
  x: `<svg viewBox="0 0 24 24" ${stroke}><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>`,
  target: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>`,
};

export function icon(name, cls = 'icon') {
  const svg = icons[name] || icons.bolt;
  return svg.replace('<svg ', `<svg class="${cls}" `);
}
