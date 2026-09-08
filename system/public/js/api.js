const TOKEN_KEY = 'system.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  guest: (playerName) => request('POST', '/auth/guest', { playerName }),
  register: (payload) => request('POST', '/auth/register', payload),
  login: (payload) => request('POST', '/auth/login', payload),
  me: () => request('GET', '/auth/me'),
  onboardingOptions: () => request('GET', '/auth/onboarding-options'),
  onboard: (payload) => request('POST', '/auth/onboarding', payload),

  todayQuests: (date) => request('GET', `/quests?date=${date}`),
  allQuests: (date) => request('GET', `/quests/all?date=${date}`),
  createQuest: (payload) => request('POST', '/quests', payload),
  updateQuest: (id, payload) => request('PUT', `/quests/${id}`, payload),
  deleteQuest: (id) => request('DELETE', `/quests/${id}`),
  completeQuest: (id, date) => request('POST', `/quests/${id}/complete`, { date }),
  undoQuest: (id, date) => request('POST', `/quests/${id}/undo`, { date }),

  status: (date) => request('GET', `/player/status?date=${date}`),
  progression: () => request('GET', '/player/progression'),
  achievements: () => request('GET', '/player/achievements'),
  calendar: (month) => request('GET', `/player/calendar?month=${month}`),
  analytics: (date) => request('GET', `/player/analytics?date=${date}`),
  missions: () => request('GET', '/player/missions'),
  createMission: (payload) => request('POST', '/player/missions', payload),

  getSettings: () => request('GET', '/settings'),
  updateSettings: (payload) => request('PUT', '/settings', payload),
};
