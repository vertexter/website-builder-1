import { api, setToken } from '../api.js';
import { icon } from '../icons.js';

export function renderAuth(root, onDone) {
  let mode = 'landing'; // landing | register | login

  function render() {
    root.innerHTML = `
      <div class="center-page">
        <div class="sys-window glow" style="width:min(420px,100%);position:relative;">
          <div class="sys-corners"><span></span><span></span><span></span><span></span></div>
          <div class="row" style="justify-content:center;margin-bottom:6px;">
            <div class="mark" style="width:44px;height:44px;border:1.5px solid var(--border-strong);border-radius:12px;display:grid;place-items:center;color:var(--accent);box-shadow:var(--glow);font-family:'Orbitron',sans-serif;font-weight:700;">S</div>
          </div>
          <h1 class="h-display" style="text-align:center;">THE SYSTEM</h1>
          <p class="text-dim" style="text-align:center;margin-top:8px;font-size:13px;">A private progression engine for your real life.</p>
          <div id="auth-body" style="margin-top:26px;"></div>
        </div>
      </div>
    `;
    renderBody();
  }

  function renderBody() {
    const body = document.getElementById('auth-body');
    if (mode === 'landing') {
      body.innerHTML = `
        <button class="btn btn-primary btn-block" id="btn-guest">${icon('bolt')} Begin as Player</button>
        <p class="text-faint" style="text-align:center;font-size:11px;margin:14px 0;">Personal mode — instant, private, no account required.</p>
        <div class="row" style="margin:18px 0;gap:10px;">
          <div style="flex:1;height:1px;background:var(--border);"></div>
          <span class="text-faint" style="font-size:10px;letter-spacing:.1em;">OR</span>
          <div style="flex:1;height:1px;background:var(--border);"></div>
        </div>
        <button class="btn btn-ghost btn-block" id="btn-login">Sign In</button>
        <button class="btn btn-ghost btn-block" id="btn-register" style="margin-top:10px;">Create Account</button>
      `;
      document.getElementById('btn-guest').onclick = async () => {
        const { token, user } = await api.guest('Player');
        setToken(token);
        onDone();
      };
      document.getElementById('btn-login').onclick = () => { mode = 'login'; renderBody(); };
      document.getElementById('btn-register').onclick = () => { mode = 'register'; renderBody(); };
    } else if (mode === 'register') {
      body.innerHTML = `
        <div class="field"><label>Player Name</label><input class="input" id="f-name" placeholder="How the System addresses you" /></div>
        <div class="field"><label>Email</label><input class="input" id="f-email" type="email" placeholder="you@example.com" /></div>
        <div class="field"><label>Password</label><input class="input" id="f-pass" type="password" placeholder="At least 8 characters" /></div>
        <p class="text-danger" id="f-err" style="font-size:12px;min-height:16px;"></p>
        <button class="btn btn-primary btn-block" id="btn-submit">Create Account</button>
        <button class="btn btn-ghost btn-block" id="btn-back" style="margin-top:10px;">Back</button>
      `;
      wireForm(async () => {
        const playerName = document.getElementById('f-name').value.trim();
        const email = document.getElementById('f-email').value.trim();
        const password = document.getElementById('f-pass').value;
        const { token } = await api.register({ playerName, email, password });
        setToken(token);
        onDone();
      });
    } else if (mode === 'login') {
      body.innerHTML = `
        <div class="field"><label>Email</label><input class="input" id="f-email" type="email" /></div>
        <div class="field"><label>Password</label><input class="input" id="f-pass" type="password" /></div>
        <p class="text-danger" id="f-err" style="font-size:12px;min-height:16px;"></p>
        <button class="btn btn-primary btn-block" id="btn-submit">Sign In</button>
        <button class="btn btn-ghost btn-block" id="btn-back" style="margin-top:10px;">Back</button>
      `;
      wireForm(async () => {
        const email = document.getElementById('f-email').value.trim();
        const password = document.getElementById('f-pass').value;
        const { token } = await api.login({ email, password });
        setToken(token);
        onDone();
      });
    }
  }

  function wireForm(submitFn) {
    document.getElementById('btn-back').onclick = () => { mode = 'landing'; renderBody(); };
    document.getElementById('btn-submit').onclick = async () => {
      const err = document.getElementById('f-err');
      err.textContent = '';
      try {
        await submitFn();
      } catch (e) {
        err.textContent = e.message || 'Something went wrong.';
      }
    };
  }

  render();
}
