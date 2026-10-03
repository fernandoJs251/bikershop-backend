const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

// GET /api/comentarios/casco/:cascoId
router.get('/casco/:cascoId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*, u.foto_url AS autor_foto
       FROM comentarios c
       LEFT JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.casco_id = $1
       ORDER BY c.fecha DESC`,
      [req.params.cascoId]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comentarios/casco/:cascoId
router.post('/casco/:cascoId', verificarToken, async (req, res) => {
  const { comentario } = req.body;
  if (!comentario) return res.status(400).json({ error: 'Comentario vacío' });

  try {
    const u = await pool.query(
      'SELECT nombre_completo, username FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    const nombre = u.rows[0]?.nombre_completo || u.rows[0]?.username || 'Anónimo';

    const r = await pool.query(
      `INSERT INTO comentarios (casco_id, usuario_id, usuario_nombre, comentario)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.cascoId, req.usuario.id, nombre, comentario]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comentarios/:id/like
router.post('/:id/like', verificarToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM fn_toggle_like($1, $2)', [
      req.params.id,
      req.usuario.id,
    ]);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;