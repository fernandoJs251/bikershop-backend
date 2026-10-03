const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ==================== DIAGNÓSTICO ====================
console.log('=== DIAGNÓSTICO AL ARRANCAR ===');
console.log('__dirname:', __dirname);
const uploadsPath = path.join(__dirname, '..', 'uploads');
console.log('uploadsPath (calculado):', uploadsPath);
console.log('¿Existe esa carpeta?:', fs.existsSync(uploadsPath));
try {
    console.log('Archivos dentro:', fs.readdirSync(uploadsPath));
} catch (e) {
    console.log('ERROR leyendo uploads:', e.message);
}
console.log('================================');
// =====================================================

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(uploadsPath));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cascos', require('./routes/cascos'));
app.use('/api/comentarios', require('./routes/comentarios'));
app.use('/api/ventas', require('./routes/ventas'));

// Health check
app.get('/', (req, res) => {
  res.json({ ok: true, servicio: 'BikerShop API', version: '1.0' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 BikerShop API corriendo en http://localhost:${PORT}`);
});