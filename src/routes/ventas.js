const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

// POST /api/ventas (comprar)
router.post('/', verificarToken, async (req, res) => {
  const { casco_id, cantidad = 1, idempotency_key } = req.body;
  if (!casco_id) return res.status(400).json({ error: 'Falta casco_id' });

  try {
    const r = await pool.query(
      'SELECT * FROM fn_registrar_compra($1, $2, $3, $4)',
      [req.usuario.id, casco_id, cantidad, idempotency_key || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/ventas/mis-compras
router.get('/mis-compras', verificarToken, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT v.*, c.nombre AS casco_nombre, c.imagen_url
       FROM ventas v
       JOIN cascos c ON c.id = v.casco_id
       WHERE v.usuario_id = $1
       ORDER BY v.fecha DESC`,
      [req.usuario.id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;