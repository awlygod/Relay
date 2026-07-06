require('dotenv').config();
const express = require('express');
const { pool } = require('./db');
const { apiKeyAuth } = require('./api/middleware/apiKeyAuth');
const { apiRateLimit } = require('./api/middleware/rateLimit');
const tasksRouter = require('./api/routes/tasks');
const authRouter = require('./api/routes/auth');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(apiRateLimit);

app.get('/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/tasks', apiKeyAuth, tasksRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[api] Relay API running on port ${PORT}`));