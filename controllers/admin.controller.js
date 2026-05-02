const { json } = require('../utils/http');
const { getUserFromToken } = require('../services/auth.service');
const { getEnv } = require('../utils/env');
const { supabaseRequest } = require('../db/supabase');

async function ensureAdmin(req) {
  const { authUser } = await getUserFromToken(req.headers.authorization);
  if (!getEnv().adminEmails.includes(authUser.email)) throw new Error('Forbidden');
}

async function adminUsers(req,res){ await ensureAdmin(req); const rows=await supabaseRequest('/rest/v1/users?select=id,email,credits,plan,created_at'); json(res,200,{users:rows}); }
async function adminUsage(req,res){ await ensureAdmin(req); const p=await supabaseRequest('/rest/v1/presentations?select=id,user_id,created_at'); const r=await supabaseRequest('/rest/v1/reels?select=id,user_id,created_at'); json(res,200,{presentations:p.length,reels:r.length}); }
async function adminRevenue(req,res){ await ensureAdmin(req); const users=await supabaseRequest('/rest/v1/users?select=plan'); const revenue=users.reduce((a,u)=>a+(u.plan==='monthly'?29:u.plan==='yearly'?199:0),0); json(res,200,{estimatedMRR:revenue}); }

module.exports = { adminUsers, adminUsage, adminRevenue };
