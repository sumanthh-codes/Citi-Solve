import cloudinary from '../config/cloudinary.js';
import { logger } from './logger.js';
export const uploadToCloudinary = (fileBuffer, folder = 'complaints') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    
    uploadStream.end(fileBuffer);
  });
};

// ✅ ADD THIS NEW DELETE FUNCTION
export const deleteFromCloudinary = async (imageUrl) => {
  try {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/xxx/image/upload/v123/folder/filename.jpg
    const urlParts = imageUrl.split('/');
    const filenameWithExt = urlParts[urlParts.length - 1]; // filename.jpg
    const folder = urlParts[urlParts.length - 2];          // complaints
    const filename = filenameWithExt.split('.')[0];        // filename
    
    const publicId = `${folder}/${filename}`;
    
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw error;
  }
};