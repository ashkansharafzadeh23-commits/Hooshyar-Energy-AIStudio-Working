import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { FileValidationError } from './StorageErrors.js';
import { MAX_PDF_SIZE_BYTES } from './fileValidator.js';

/**
 * Bounded memory storage for multipart file ingestion.
 * Hard limit: 16 MB max file size, 1 file per request, memory-only temporary buffer.
 * NEVER writes temporary upload files to local disk.
 */
const memoryStorage = multer.memoryStorage();

export const uploadSingleFile = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_PDF_SIZE_BYTES + 1024 * 1024, // 16 MB hard boundary
    files: 1,
    fields: 10
  }
}).single('file');

/**
 * Express middleware wrapper to catch Multer errors gracefully and return Persian error messages.
 */
export function handleMultipartUpload(req: Request, res: Response, next: NextFunction): void {
  uploadSingleFile(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            code: 'FILE_TOO_LARGE',
            error: 'حجم فایل ارسالی بیش از سقف مجاز است.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            code: 'LIMIT_FILE_COUNT',
            error: 'تنها بارگذاری یک فایل در هر درخواست مجاز است.'
          });
        }
        return res.status(400).json({
          code: err.code,
          error: `خطا در دریافت فایل: ${err.message}`
        });
      }
      return res.status(400).json({
        code: 'UPLOAD_ERROR',
        error: err.message || 'خطا در خواندن فایل ارسالی'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        code: 'FILE_MISSING',
        error: 'هیچ فایلی برای بارگذاری ارسال نشده است.'
      });
    }

    next();
  });
}
