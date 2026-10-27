
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
// APPLICATION CONFIGURATION
// ========================================

const app = express();

const port = Number(process.env.PORT || 3001);

// Listen on all container interfaces for Docker.
// Keep the backend port private in Docker Compose.
const host = process.env.HOST || '0.0.0.0';

const uploadDir = path.resolve(
  process.env.UPLOAD_DIR || '../uploads'
);

const galleryDir = path.join(uploadDir, 'gallery');

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 30_000_000;

const ALLOWED_FORMATS = new Set([
  'jpeg',
  'png',
  'webp',
  'avif',
  'heif',
]);

// ========================================
// INITIALIZE STORAGE
// ========================================

try {
  await mkdir(galleryDir, {
    recursive: true,
  });

  console.log('Upload storage initialized');
} catch (error) {
  console.error(
    'Unable to initialize upload storage:',
    error
  );

  process.exit(1);
}

// ========================================
// SECURITY MIDDLEWARE
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
// ADMINISTRATOR AUTHENTICATION
// ========================================

// Temporary API token authentication.
// Replace with secure account-based authentication
// before enabling the administration dashboard.

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
// BACKEND WELCOME ROUTE
// ========================================

app.get('/', (_req, res) => {
  res.status(200).json({
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
// HEALTH CHECK
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
    console.error(
      'Database health check failed:',
      error
    );

    res.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
    });
  }
});

// ========================================
// PUBLIC GALLERY
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
// IMAGE UPLOAD CONFIGURATION
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// ========================================
// ADMINISTRATOR GALLERY UPLOAD
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

      if (!ALLOWED_FORMATS.has(metadata.format)) {
        return res.status(415).json({
          success: false,
          message: 'Unsupported image format',
        });
      }

      // Optimize and convert to WebP.
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

      // Store file metadata in PostgreSQL.
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

      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',

        image: {
          id: imageId,
          src: `/uploads/gallery/${filename}`,
          alt,
        },
      });
    } catch (error) {
      // Remove file if database insertion fails.
      if (fileSaved) {
        await unlink(destination).catch(
          (cleanupError) => {
            console.error(
              'Failed to clean up uploaded file:',
              cleanupError
            );
          }
        );
      }

      next(error);
    }
  }
);

// ========================================
// PUBLIC FILE STORAGE
// ========================================

app.use(
  '/uploads',
  express.static(uploadDir, {
    dotfiles: 'deny',
    fallthrough: false,
    maxAge: '7d',
    index: false,
  })
);

// ========================================
// UNKNOWN API ROUTES
// ========================================

app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// ========================================
// GLOBAL ERROR HANDLER
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
      message: 'Resource not found',
    });
  }

  console.error('Backend error:', error);

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

let server;

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);

  server.close(async () => {
    try {
      await pool.end();
      console.log('Database pool closed');
      process.exit(0);
    } catch (error) {
      console.error('Shutdown error:', error);
      process.exit(1);
    }
  });
}

// ========================================
// START EXPRESS SERVER
// ========================================

server = app.listen(port, host, () => {
  console.log('====================================');
  console.log('Graduation Website 2.0');
  console.log('Backend API Running');
  console.log(`Listening on ${host}:${port}`);
  console.log('====================================');
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
