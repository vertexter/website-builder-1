const { getEnv } = require("../utils/env");
const { supabaseRequest } = require("../db/supabase");

async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing bearer token");
  const token = authHeader.slice(7);
  const env = getEnv();
  const res = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: env.supabaseAnonKey || env.supabaseServiceRoleKey, Authorization: `Bearer ${token}` }
  });
  const user = await res.json();
  if (!res.ok) throw new Error("Invalid session");
  return { token, authUser: user };
}

async function ensureUserProfile(authUser) {
  const rows = await supabaseRequest(`/rest/v1/users?id=eq.${authUser.id}&select=id,email`, {});
  if (rows.length) return rows[0];
  const inserted = await supabaseRequest(`/rest/v1/users`, {
    method: "POST",
    body: [{ id: authUser.id, email: authUser.email, credits: 10, plan: "free" }]
  });
  return inserted[0];
}

module.exports = { getUserFromToken, ensureUserProfile };
