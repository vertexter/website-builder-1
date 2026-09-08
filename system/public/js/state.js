function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}

export const state = {
  user: null,
  settings: null,
  player: null,
  today: todayStr(),
  listeners: new Set(),
};

export function onStateChange(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

export function notify() {
  state.listeners.forEach((fn) => fn());
}

export { todayStr };
