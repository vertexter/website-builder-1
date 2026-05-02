const { getEnv } = require("../utils/env");

async function supabaseRequest(path, { method = "GET", token, body } = {}) {
  const env = getEnv();
  const headers = {
    apikey: env.supabaseServiceRoleKey,
    Authorization: `Bearer ${token || env.supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };

  const res = await fetch(`${env.supabaseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`Supabase error (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

module.exports = { supabaseRequest };
