const { supabaseRequest } = require("../db/supabase");

async function checkCredits(userId) {
  const rows = await supabaseRequest(`/rest/v1/users?id=eq.${userId}&select=id,credits`, {});
  if (!rows.length) throw new Error("User not found");
  return rows[0].credits > 0;
}

async function deductCredits(userId, amount = 1) {
  const rows = await supabaseRequest(`/rest/v1/users?id=eq.${userId}&select=credits`, {});
  const next = Math.max(0, Number(rows[0].credits || 0) - amount);
  await supabaseRequest(`/rest/v1/users?id=eq.${userId}`, { method: "PATCH", body: { credits: next } });
  return next;
}

module.exports = { checkCredits, deductCredits };
