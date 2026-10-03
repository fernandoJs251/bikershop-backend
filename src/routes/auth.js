const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  const { username, email, password, nombre_completo } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO usuarios (username, email, password_hash, nombre_completo, role)
       VALUES ($1, $2, $3, $4, 'CLIENTE')
       RETURNING id, username, email, role, nombre_completo`,
      [username, email, hash, nombre_completo || username]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Usuario o email ya existe' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });

  try {
    const r = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (r.rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      usuario: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nombre_completo: user.nombre_completo,
        foto_url: user.foto_url,
        followers_count: user.followers_count,
        cascos_count: user.cascos_count,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', verificarToken, async (req, res) => {
  const r = await pool.query(
    `SELECT id, username, email, role, nombre_completo, foto_url, followers_count, cascos_count
     FROM usuarios WHERE id = $1`,
    [req.usuario.id]
  );
  res.json(r.rows[0]);
});

module.exports = router;