const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^\w\-]/g, '_')
      .slice(0, 40) || 'file';
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) {
      const err = new Error('Разрешены только изображения (png/jpg/gif/webp)');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

function removeUpload(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const full = path.join(UPLOAD_DIR, path.basename(publicPath));
  fs.unlink(full, () => {});
}

module.exports = { upload, removeUpload, UPLOAD_DIR };