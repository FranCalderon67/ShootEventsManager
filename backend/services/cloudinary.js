const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tirosport/etapas',
    resource_type: 'raw',   // PDFs are raw files
    allowed_formats: ['pdf'],
    use_filename: true,
    unique_filename: true,
  },
});

const uploadPdf = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  },
});

const deleteFile = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (err) {
    console.error('Error eliminando archivo de Cloudinary:', err.message);
  }
};

module.exports = { uploadPdf, deleteFile, cloudinary };
