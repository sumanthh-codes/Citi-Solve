import multer from "multer";

const storage = multer.memoryStorage();

const isAllowedImageBuffer = (buffer) => {
  if (!buffer || buffer.length < 12) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isGif =
    buffer.slice(0, 6).toString("ascii") === "GIF87a" ||
    buffer.slice(0, 6).toString("ascii") === "GIF89a";
  const isWebp =
    buffer.slice(0, 4).toString("ascii") === "RIFF" &&
    buffer.slice(8, 12).toString("ascii") === "WEBP";
  const boxBrand = buffer.slice(4, 12).toString("ascii");
  const isAvif = boxBrand === "ftypavif" || boxBrand === "ftypavis";
  const isHeic =
    boxBrand === "ftypheic" ||
    boxBrand === "ftypheix" ||
    boxBrand === "ftyphevc" ||
    boxBrand === "ftyphevx" ||
    boxBrand === "ftypmif1" ||
    boxBrand === "ftypmsf1";

  return isJpeg || isPng || isGif || isWebp || isAvif || isHeic;
};

export const upload = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024,  
    files: 5                     
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

export const validateUploadedImages = (req, res, next) => {
  const files = req.files || [];
  const hasInvalidFile = files.some((file) => !isAllowedImageBuffer(file.buffer));

  if (hasInvalidFile) {
    return res.status(400).json({
      success: false,
      error: "Only valid image files are allowed. Please upload JPG, PNG, GIF, WebP, HEIC, HEIF, or AVIF."
    });
  }

  next();
};