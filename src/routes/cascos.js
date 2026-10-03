const express = require('express');
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

const router = express.Router();

// ============================================================
// CONFIGURACIÓN DE MULTER (subida de imágenes)
// ============================================================

// Ruta absoluta a la carpeta uploads (al nivel del backend, no de src/)
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Asegurar que la carpeta existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Carpeta uploads creada en:', uploadsDir);
}

// Almacenamiento: guarda con nombre único
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `casco-${unique}${ext}`);
  }
});

// Filtro: acepta cualquier tipo de imagen (más permisivo)
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Formato no permitido. Sube una imagen.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB máximo
});

// ============================================================
// RUTAS
// ============================================================

// GET /api/cascos (catálogo público)
router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;
    let sql = `SELECT * FROM cascos WHERE publicado = TRUE`;
    const params = [];
    if (categoria) {
      sql += ` AND categoria = $1`;
      params.push(categoria);
    }
    sql += ` ORDER BY creado_en DESC`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cascos/:id
router.get('/:id', async (req, res) => {
  try {
    const c = await pool.query('SELECT * FROM cascos WHERE id = $1', [req.params.id]);
    if (c.rows.length === 0) return res.status(404).json({ error: 'Casco no encontrado' });

    const imgs = await pool.query(
      'SELECT url, orden FROM casco_imagenes WHERE casco_id = $1 ORDER BY orden',
      [req.params.id]
    );
    res.json({ ...c.rows[0], imagenes: imgs.rows.map(i => i.url) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cascos (solo admin, con subida de imagen)
router.post(
  '/',
  verificarToken,
  soloAdmin,
  upload.single('imagen'),
  async (req, res) => {
    const {
      nombre,
      categoria,
      precio_bs,
      modelo_3d_url,
      stock,
      certificacion,
      descripcion
    } = req.body;

    // Validar campos obligatorios
    if (!nombre || !categoria || !precio_bs) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Faltan campos: nombre, categoria, precio_bs' });
    }

    // Determinar imagen_url: archivo subido o URL pegada
    let imagen_url = req.body.imagen_url || null;
    if (req.file) {
      imagen_url = `/uploads/${req.file.filename}`;
    }

    try {
      const r = await pool.query(
        `INSERT INTO cascos 
         (nombre, categoria, precio_bs, imagen_url, modelo_3d_url, stock, certificacion, descripcion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          nombre,
          categoria,
          precio_bs,
          imagen_url,
          modelo_3d_url || null,
          stock || 0,
          certificacion || null,
          descripcion || null
        ]
      );
      res.status(201).json(r.rows[0]);
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: err.message });
    }
  }
);

// Middleware de errores de Multer (para devolver JSON en vez de HTML)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Error al subir imagen: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;