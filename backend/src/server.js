
import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import sharp from 'sharp';

import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';

import { pool } from './db.js';

// ========================================
// Application Configuration
// ========================================

const app = express();

const port = Number(process.env.PORT || 3001);

const uploadDir = path.resolve(
  process.env.UPLOAD_DIR || '../uploads'
);

const galleryDir = path.join(uploadDir, 'gallery');

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 30_000_000;

const ALLOWED_FORMATS = [
  'jpeg',
  'png',
  'webp',
  'avif',
  'heif',
];

await mkdir(galleryDir, { recursive: true });

// ========================================
// Security Middleware
// ========================================

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(
  express.json({
    limit: '32kb',
  })
);

// ========================================
// Administrator Authentication
// ========================================

// Temporary server-side API token authentication.
// Replace with account-based admin authentication
// before deploying the administration dashboard.

function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_API_TOKEN;

  const token = req.headers.authorization?.match(
    /^Bearer (.+)$/i
  )?.[1];

  if (!secret || !token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access',
    });
  }

  const expected = Buffer.from(secret);
  const received = Buffer.from(token);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }

  next();
}

// ========================================
// Backend Welcome Route
// ========================================

app.get('/', (_req, res) => {
  res.json({
    application: 'Graduation Website 2.0',
    service: 'Backend API',
    version: '0.1.0',
    status: 'running',

    endpoints: {
      health: '/api/health',
      gallery: '/api/gallery',
    },
  });
});

// ========================================
// Health Check
// ========================================

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      status: 'ok',
      database: 'connected',
      application: 'Graduation Website 2.0',
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    res.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
    });
  }
});

// ========================================
// Public Gallery API
// ========================================

app.get('/api/gallery', async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        filename,
        alt_text,
        created_at
      FROM gallery_images
      ORDER BY created_at DESC
      LIMIT 60
    `);

    const images = result.rows.map((image) => ({
      id: image.id,
      src:
        '/uploads/gallery/' +
        encodeURIComponent(image.filename),
      alt: image.alt_text,
      createdAt: image.created_at,
    }));

    res.status(200).json(images);
  } catch (error) {
    next(error);
  }
});

// ========================================
// Image Upload Configuration
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// ========================================
// Administrator Gallery Upload
// ========================================

app.post(
  '/api/admin/gallery',
  requireAdmin,
  upload.single('image'),

  async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
    }

    const alt = String(req.body.alt || '')
      .trim()
      .slice(0, 200);

    const imageId = randomUUID();
    const filename = `${imageId}.webp`;

    const destination = path.join(
      galleryDir,
      filename
    );

    let fileSaved = false;

    try {
      const processor = sharp(req.file.buffer, {
        limitInputPixels: MAX_IMAGE_PIXELS,
      });

      const metadata = await processor.metadata();

      if (!ALLOWED_FORMATS.includes(metadata.format)) {
        return res.status(415).json({
          success: false,
          message: 'Unsupported image format',
        });
      }

      // Automatically orient, resize and optimize images.
      await processor
        .rotate()
        .resize({
          width: 1920,
          withoutEnlargement: true,
        })
        .webp({
          quality: 80,
        })
        .toFile(destination);

      fileSaved = true;

      await pool.query(
        `
        INSERT INTO gallery_images (
          id,
          filename,
          alt_text
        )
        VALUES ($1, $2, $3)
        `,
        [imageId, filename, alt]
      );

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        image: {
          id: imageId,
          src: `/uploads/gallery/${filename}`,
          alt,
        },
      });
    } catch (error) {
      // Prevent orphaned files when database insertion fails.
      if (fileSaved) {
        await unlink(destination).catch(() => {});
      }

      next(error);
    }
  }
);

// ========================================
// Public Uploaded Files
// ========================================

app.use(
  '/uploads',
  express.static(uploadDir, {
    dotfiles: 'deny',
    fallthrough: false,
    maxAge: '7d',
  })
);

// ========================================
// Unknown API Routes
// ========================================

app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// ========================================
// Global Error Handling
// ========================================

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Image must not exceed 8 MB'
          : error.message,
    });
  }

  if (error?.status === 404) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }

  console.error('Backend error:', error);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ========================================
// Start Server
// ========================================

app.listen(port, '127.0.0.1', () => {
  console.log('====================================');
  console.log('Graduation Website 2.0');
  console.log('Backend API Running');
  console.log(`URL: http://localhost:${port}`);
  console.log('====================================');
});
