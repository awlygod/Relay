const { getAgentByApiKey } = require('../../db/taskRepository');

async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }

  const agent = await getAgentByApiKey(apiKey);
  if (!agent) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.agent = agent; // attach for downstream handlers
  next();
}

module.exports = { apiKeyAuth };