const multer = require('multer');
const path = require('path');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Optional: Add timestamp to avoid name conflicts
    }
});

// Multer instance
const upload = multer({
    storage: storage,
    limits: { fileSize: 4 * 1000000 }, // 4MB limit
});

module.exports = {
    uploadMultiple: upload.array('productImages', 4) // For multiple file uploads
};
