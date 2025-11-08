require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});
// 관리 탭 최소 API - accounts
app.get('/api/accounts', async (req, res) => {
  const [rows] = await pool.query('SELECT id,name FROM accounts ORDER BY name');
  res.json(rows);
});

app.post('/api/accounts', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name required' });
  await pool.query('INSERT INTO accounts (name) VALUES (?) ON DUPLICATE KEY UPDATE name=name', [name]);
  res.json({ success: true });
});

app.delete('/api/accounts/:id', async (req, res) => {
  await pool.query('DELETE FROM accounts WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// categories
app.get('/api/categories', async (req, res) => {
  const [rows] = await pool.query('SELECT id,type,name FROM categories ORDER BY type,name');
  res.json(rows);
});
app.post('/api/categories', async (req, res) => {
  const { type, name } = req.body || {};
  if (!type || !name) return res.status(400).json({ message: 'type/name required' });
  await pool.query(
    'INSERT INTO categories (type,name) VALUES (?,?) ON DUPLICATE KEY UPDATE name=name',
    [type, name]
  );
  res.json({ success: true });
});

app.delete('/api/categories/:id', async (req, res) => {
  await pool.query('DELETE FROM categories WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// extra routes (transactions CRUD, summary)
const extra = require('./routes-extra');
extra(app, pool);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log('API listening on', port);
});
