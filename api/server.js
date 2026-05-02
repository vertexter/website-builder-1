require('dotenv').config();
const http = require('http');
const { parse } = require('url');
const { json } = require('../utils/http');
const { getEnv } = require('../utils/env');
const g = require('../controllers/generation.controller');
const a = require('../controllers/admin.controller');

const server = http.createServer(async (req, res) => {
  const { pathname, query } = parse(req.url, true);
  try {
    if (req.method === 'GET' && pathname === '/health') return json(res, 200, { status: 'ok' });
    if (req.method === 'POST' && pathname === '/generate-presentation') return await g.handleGeneratePresentation(req, res);
    if (req.method === 'POST' && pathname === '/generate-reels') return await g.handleGenerateReels(req, res);
    if (req.method === 'POST' && pathname === '/slides/update') return await g.handleUpdateSlide(req, res);
    if (req.method === 'GET' && pathname === '/slides/subscribe') return await g.handleSlideSubscription(req, res, query);
    if (req.method === 'GET' && pathname === '/export-ppt') return await g.handleExportPpt(req, res, query);
    if (req.method === 'GET' && pathname === '/admin/users') return await a.adminUsers(req, res);
    if (req.method === 'GET' && pathname === '/admin/usage') return await a.adminUsage(req, res);
    if (req.method === 'GET' && pathname === '/admin/revenue') return await a.adminRevenue(req, res);
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
});

server.listen(getEnv().port, () => console.log(`Pitch AI backend running on :${getEnv().port}`));
