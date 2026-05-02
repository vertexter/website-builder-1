const { parse } = require('url');
const { json, parseBody } = require('../utils/http');
const { getUserFromToken, ensureUserProfile } = require('../services/auth.service');
const { checkCredits, deductCredits } = require('../services/credits.service');
const { callOpenAI } = require('../services/ai.service');
const { supabaseRequest } = require('../db/supabase');
const { exportPpt } = require('../services/ppt.service');
const { subscribeToSlides } = require('../services/realtime.service');

async function handleGeneratePresentation(req, res) {
  const { authUser } = await getUserFromToken(req.headers.authorization);
  await ensureUserProfile(authUser);
  if (!(await checkCredits(authUser.id))) return json(res, 402, { error: 'No credits left' });
  const body = await parseBody(req);
  const ai = await callOpenAI('You create presentation slide structures.', `Topic: ${body.topic}`, '{slides:[{title:string, layout_type:string, content:object}]}');
  const pres = await supabaseRequest('/rest/v1/presentations', { method: 'POST', body: [{ user_id: authUser.id, topic: body.topic }] });
  const presentationId = pres[0].id;
  const slides = ai.slides.map((s) => ({ presentation_id: presentationId, title: s.title, content: s.content, layout_type: s.layout_type }));
  await supabaseRequest('/rest/v1/slides', { method: 'POST', body: slides });
  await deductCredits(authUser.id, 1);
  json(res, 200, { presentationId, slides });
}

async function handleGenerateReels(req, res) {
  const { authUser } = await getUserFromToken(req.headers.authorization);
  await ensureUserProfile(authUser);
  if (!(await checkCredits(authUser.id))) return json(res, 402, { error: 'No credits left' });
  const body = await parseBody(req);
  const analysis = await callOpenAI('You analyze youtube video intent from metadata/url text only.', `URL: ${body.youtubeUrl}`, '{clips:array,hooks:array,captions:array}');
  const saved = await supabaseRequest('/rest/v1/reels', { method: 'POST', body: [{ user_id: authUser.id, video_url: body.youtubeUrl, analysis_data: analysis }] });
  await deductCredits(authUser.id, 1);
  json(res, 200, { reel: saved[0] });
}

async function handleUpdateSlide(req, res) {
  const { authUser } = await getUserFromToken(req.headers.authorization);
  await ensureUserProfile(authUser);
  const body = await parseBody(req);
  const updated = await supabaseRequest(`/rest/v1/slides?id=eq.${body.slideId}`, { method: 'PATCH', body: { title: body.title, content: body.content, layout_type: body.layoutType, updated_at: new Date().toISOString() } });
  json(res, 200, { slide: updated[0] });
}

async function handleExportPpt(req, res, query) {
  await getUserFromToken(req.headers.authorization);
  const file = await exportPpt(query.presentationId);
  json(res, 200, { filePath: file });
}

async function handleSlideSubscription(req, res, query) {
  json(res, 200, subscribeToSlides(query.presentationId));
}

module.exports = { handleGeneratePresentation, handleGenerateReels, handleUpdateSlide, handleExportPpt, handleSlideSubscription };
