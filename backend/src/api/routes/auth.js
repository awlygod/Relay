const express = require('express');
const router = express.Router();
const { pool } = require('../../db');
const { v4: uuidv4 } = require('uuid');

router.post('/register', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const apiKey = uuidv4();
  const result = await pool.query(
    `INSERT INTO agents (name, api_key) VALUES ($1, $2) RETURNING *`,
    [name, apiKey]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;