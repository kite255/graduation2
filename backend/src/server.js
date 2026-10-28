
import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import sharp from 'sharp';

import { randomUUID, randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
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

const COOKIE_NAME = 'graduation_admin';
const SESSION_SECONDS = 8 * 60 * 60;
const loginAttempts = new Map();
const hashSession = token => createHash('sha256').update(token).digest('hex');
const cookieToken = req => {
  const match = String(req.headers.cookie || '').match(/(?:^|;\s*)graduation_admin=([a-f0-9]{64})(?:;|$)/);
  return match?.[1] || null;
};
const adminCookie = (token, maxAge) => `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${maxAge}`;
const validOrigin = req => {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host === req.headers.host && new URL(origin).protocol === 'https:'; }
  catch { return false; }
};
async function sessionAuthenticated(req) {
  const token = cookieToken(req);
  if (!token) return false;
  const result = await pool.query('SELECT 1 FROM admin_sessions WHERE session_hash=$1 AND expires_at > NOW()', [hashSession(token)]);
  return result.rowCount > 0;
}
async function requireAdmin(req, res, next) {
  try {
    if (await sessionAuthenticated(req)) {
      if (!['GET','HEAD','OPTIONS'].includes(req.method) && !validOrigin(req)) return res.status(403).json({message:'Invalid request origin'});
      return next();
    }
    // Legacy token is retained for existing API integrations during migration.
    const secret = process.env.ADMIN_API_TOKEN;
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (secret && token) {
      const a = Buffer.from(secret), b = Buffer.from(token);
      if (a.length === b.length && timingSafeEqual(a,b)) return next();
    }
    return res.status(401).json({message:'Please sign in'});
  } catch(err) { next(err); }
}
app.post('/api/auth/login', async (req,res,next) => {
  try {
    if (!validOrigin(req)) return res.status(403).json({message:'HTTPS required'});
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const expectedEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const stored = process.env.ADMIN_PASSWORD_HASH || '';
    const ip = req.ip;
    const attempt = loginAttempts.get(ip) || {count:0,since:Date.now()};
    if (Date.now()-attempt.since > 15*60000) {attempt.count=0;attempt.since=Date.now()}
    if (attempt.count >= 8) return res.status(429).json({message:'Too many attempts. Try again later.'});
    let valid = false;
    const parts = stored.split(':');
    if (parts.length === 3 && parts[0] === 'scrypt' && /^[a-f0-9]{32}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]) && password.length <= 1024) {
      const actual = scryptSync(password,Buffer.from(parts[1],'hex'),64);
      valid = timingSafeEqual(actual,Buffer.from(parts[2],'hex')) && email === expectedEmail;
    }
    if (!valid || !expectedEmail) {
      attempt.count++;loginAttempts.set(ip,attempt);
      return res.status(401).json({message:'Incorrect email or password'});
    }
    loginAttempts.delete(ip);
    const token = randomBytes(32).toString('hex');
    await pool.query('INSERT INTO admin_sessions (session_hash,expires_at) VALUES ($1,NOW()+INTERVAL \'8 hours\')',[hashSession(token)]);
    res.setHeader('Set-Cookie',adminCookie(token,SESSION_SECONDS));
    res.json({authenticated:true,email});
  } catch(err) {next(err)}
});
app.get('/api/auth/me',async(req,res,next)=>{
  try {res.json({authenticated:await sessionAuthenticated(req)})}catch(err){next(err)}
});
app.post('/api/auth/logout',async(req,res,next)=>{
  try {
    if (!validOrigin(req)) return res.status(403).json({message:'Invalid request origin'});
    const token=cookieToken(req);
    if(token) await pool.query('DELETE FROM admin_sessions WHERE session_hash=$1',[hashSession(token)]);
    res.setHeader('Set-Cookie',adminCookie('',0));
    res.json({success:true});
  } catch(err){next(err)}
});

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

// Managed graduation websites. The hostname is passed by our trusted Nginx proxy.
const baseDomain = (process.env.SITES_BASE_DOMAIN || '').toLowerCase().trim();
function siteSlug(req) {
  if (!baseDomain) return null;
  const hostname = String(req.headers.host || '').split(':')[0].toLowerCase();
  const suffix = '.' + baseDomain;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : null;
}
async function resolveSite(req, explicitSlug = null) {
  const slug = explicitSlug || siteSlug(req);
  if (!slug) return null;
  const result = await pool.query('SELECT * FROM graduation_sites WHERE slug = $1 AND status = $2 AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)', [slug, 'active']);
  return result.rows[0] || null;
}
app.get('/api/site', async (req, res, next) => {
  try {
    const slug = siteSlug(req);
    if (!slug) return res.json({ site: null });
    const site = await resolveSite(req);
    if (!site) return res.status(404).json({ message: 'Website not available' });
    res.json({ site: { graduateName: site.graduate_name, slug: site.slug, eventDate: site.event_date, eventTime: site.event_time, venue: site.venue, message: site.message, giftPhone:site.gift_phone, giftName:site.gift_name, giftProvider:site.gift_provider, heroImage: site.hero_image ? '/uploads/hero/' + encodeURIComponent(site.hero_image) : null } });
  } catch (err) { next(err); }
});
app.get('/api/sites/:slug', async (req, res, next) => {
  try {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(req.params.slug)) return res.status(404).json({message:'Website not available'});
    const site = await resolveSite(req, req.params.slug);
    if (!site) return res.status(404).json({message:'Website not available'});
    res.json({ site: { graduateName: site.graduate_name, slug:site.slug, eventDate:site.event_date, eventTime:site.event_time, venue:site.venue, message:site.message, giftPhone:site.gift_phone, giftName:site.gift_name, giftProvider:site.gift_provider, heroImage: site.hero_image ? '/uploads/hero/' + encodeURIComponent(site.hero_image) : null } });
  } catch (err) { next(err); }
});
app.get('/api/sites/:slug/gallery', async (req, res, next) => {
  try {
    const site = await resolveSite(req, req.params.slug);
    if (!site) return res.status(404).json({message:'Website not available'});
    const {rows} = await pool.query('SELECT id, filename, alt_text, created_at FROM gallery_images WHERE site_id=$1 ORDER BY created_at DESC LIMIT 60',[site.id]);
    res.json(rows.map(image => ({id:image.id,src:'/uploads/gallery/'+encodeURIComponent(image.filename),alt:image.alt_text,createdAt:image.created_at})));
  } catch (err) { next(err); }
});
const rsvpTraffic = new Map();
function limitRsvp(req,res,next) {
  const now=Date.now();
  const key=String(req.ip || req.socket.remoteAddress || 'unknown');
  if(rsvpTraffic.size>10000)for(const [k,v] of rsvpTraffic)if(now-v.start>3600000)rsvpTraffic.delete(k);
  const entry=rsvpTraffic.get(key);
  const bucket=entry && now-entry.start<3600000 ? entry : {start:now,count:0};
  bucket.count++;
  rsvpTraffic.set(key,bucket);
  if(bucket.count>20)return res.status(429).json({message:'Too many responses. Please try again later.'});
  next();
}
app.post('/api/sites/:slug/rsvp', limitRsvp, async (req,res,next) => {
  try {
    const site = await resolveSite(req,req.params.slug);
    if (!site) return res.status(404).json({message:'Website not available'});
    if (req.body.website) return res.status(201).json({success:true});
    const name=String(req.body.name || '').trim();
    const attending=req.body.attending;
    const message=String(req.body.message || '').trim();
    if(!name || name.length>120 || (attending!==null && typeof attending!=='boolean') || message.length>1200 || (attending===null && !message)) return res.status(400).json({message:'Enter your name and choose attendance or write a wish'});
    const recent=await pool.query('SELECT 1 FROM graduation_rsvps WHERE site_id=$1 AND lower(guest_name)=lower($2) AND created_at>NOW()-INTERVAL \'10 minutes\' LIMIT 1',[site.id,name]);
    if(recent.rowCount)return res.status(409).json({message:'A response with this name was recently submitted. Please try later.'});
    await pool.query('INSERT INTO graduation_rsvps(id,site_id,guest_name,attending,message,wish_approved) VALUES($1,$2,$3,$4,$5,TRUE)',[randomUUID(),site.id,name,attending,message]);
    res.status(201).json({success:true,message:'Thank you for responding'});
  } catch(err){next(err)}
});
app.get('/api/sites/:slug/wishes',async(req,res,next)=>{
 try{
  const site=await resolveSite(req,req.params.slug);
  if(!site)return res.status(404).json({message:'Website not available'});
  const page=Math.max(1,Math.min(100000,Number.parseInt(String(req.query.page||'1'),10)||1));
  const limit=3;
  const offset=(page-1)*limit;
  const countResult=await pool.query("SELECT COUNT(*)::int AS total FROM graduation_rsvps WHERE site_id=$1 AND wish_approved=TRUE AND message<>''",[site.id]);
  const total=countResult.rows[0].total;
  const {rows}=await pool.query("SELECT guest_name AS \"guestName\",message,created_at AS \"createdAt\" FROM graduation_rsvps WHERE site_id=$1 AND wish_approved=TRUE AND message<>'' ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3",[site.id,limit,offset]);
  res.json({items:rows,page,total,totalPages:Math.ceil(total/limit)});
 }catch(err){next(err)}
});
app.patch('/api/admin/sites/:id/rsvps/:rsvpId/wish',requireAdmin,async(req,res,next)=>{
 try{
  if(req.body.approved!==false)return res.status(400).json({message:'Only hiding wishes is supported'});
  const result=await pool.query('UPDATE graduation_rsvps SET wish_approved=$1 WHERE id=$2 AND site_id=$3 AND message<>\'\' RETURNING id',[req.body.approved,req.params.rsvpId,req.params.id]);
  if(!result.rowCount)return res.status(404).json({message:'Wish not found'});
  res.json({success:true});
 }catch(err){next(err)}
});
app.patch('/api/admin/sites/:id/rsvps/:rsvpId/message',requireAdmin,async(req,res,next)=>{
 try{
  if(typeof req.body.message!=='string')return res.status(400).json({message:'Wish text is required'});
  const message=req.body.message.trim();
  if(!message || message.length>1200)return res.status(400).json({message:'Wish must contain 1 to 1200 characters'});
  const {rows}=await pool.query('UPDATE graduation_rsvps SET message=$1 WHERE id=$2 AND site_id=$3 AND message<>\'\' RETURNING id,message',[message,req.params.rsvpId,req.params.id]);
  if(!rows.length)return res.status(404).json({message:'Wish not found'});
  res.json({success:true,wish:rows[0]});
 }catch(err){next(err)}
});
app.get('/api/admin/sites/:id/rsvp-summary',requireAdmin,async(req,res,next)=>{
 try {
  const {rows}=await pool.query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE attending)::int AS attending, COUNT(*) FILTER (WHERE attending=FALSE)::int AS declined FROM graduation_rsvps WHERE site_id=$1',[req.params.id]);
  res.json(rows[0]);
 } catch(err){next(err)}
});
app.get('/api/admin/sites/:id/rsvps',requireAdmin,async(req,res,next)=>{
  try {
    const {rows}=await pool.query('SELECT id,guest_name AS "guestName",attending,message,wish_approved AS "wishApproved",created_at AS "createdAt" FROM graduation_rsvps WHERE site_id=$1 ORDER BY created_at DESC LIMIT 500',[req.params.id]);
    res.json(rows);
  } catch(err){next(err)}
});
app.get('/api/admin/sites', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, slug, graduate_name AS "graduateName", event_date AS "eventDate", event_time AS "eventTime", venue, message, gift_phone AS "giftPhone", gift_name AS "giftName", gift_provider AS "giftProvider", hero_image AS "heroImageFilename", status, payment_status AS "paymentStatus", price_tzs AS "priceTzs", expires_at AS "expiresAt", (SELECT COUNT(*)::int FROM graduation_rsvps r WHERE r.site_id = graduation_sites.id) AS "rsvpCount", (SELECT COUNT(*)::int FROM gallery_images g WHERE g.site_id = graduation_sites.id) AS "photoCount" FROM graduation_sites ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});
app.post('/api/admin/sites', requireAdmin, async (req, res, next) => {
  try {
    const { slug, graduateName, eventDate, eventTime, venue, message, priceTzs, giftPhone, giftName, giftProvider } = req.body;
    if(giftPhone && !/^\+?[0-9][0-9\s-]{7,22}$/.test(String(giftPhone).trim()))return res.status(400).json({message:'Invalid gift phone number'});
    const cleanSlug = String(slug || '').toLowerCase().trim();
    const cleanName = String(graduateName || '').trim();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(cleanSlug) || ['www', 'admin', 'api', 'app'].includes(cleanSlug) || !cleanName || cleanName.length > 160) {
      return res.status(400).json({ message: 'Enter a valid graduate name and a unique, lowercase subdomain.' });
    }
    if (priceTzs != null && (!Number.isSafeInteger(Number(priceTzs)) || Number(priceTzs) < 0)) return res.status(400).json({message:'Invalid price'});
    const result = await pool.query(`INSERT INTO graduation_sites(id, slug, graduate_name, event_date, event_time, venue, message, price_tzs, gift_phone, gift_name, gift_provider)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,slug,status`,
      [randomUUID(), cleanSlug, cleanName, eventDate || null, String(eventTime || '').slice(0,100), String(venue || '').slice(0,240), String(message || '').slice(0,3000), Number(priceTzs || 0),String(giftPhone||'').trim()||null,String(giftName||'').trim().slice(0,120)||null,String(giftProvider||'').trim().slice(0,50)||null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Subdomain already exists' });
    next(err);
  }
});
app.patch('/api/admin/sites/:id', requireAdmin, async (req, res, next) => {
  try {
    const allowed = { graduateName:'graduate_name',eventDate:'event_date',eventTime:'event_time',venue:'venue',message:'message',giftPhone:'gift_phone',giftName:'gift_name',giftProvider:'gift_provider',status:'status',paymentStatus:'payment_status',priceTzs:'price_tzs',expiresAt:'expires_at' };
    const fields = Object.entries(allowed).filter(([key])=>Object.hasOwn(req.body,key));
    if (!fields.length) return res.status(400).json({message:'No changes provided'});
    if(Object.hasOwn(req.body,'giftPhone') && req.body.giftPhone && !/^\+?[0-9][0-9\s-]{7,22}$/.test(String(req.body.giftPhone).trim()))return res.status(400).json({message:'Invalid gift phone number'});
    if (req.body.status && !['draft','active','suspended'].includes(req.body.status)) return res.status(400).json({message:'Invalid status'});
    if (req.body.paymentStatus && !['pending','paid'].includes(req.body.paymentStatus)) return res.status(400).json({message:'Invalid payment status'});
    if (Object.hasOwn(req.body,'priceTzs') && (!Number.isSafeInteger(Number(req.body.priceTzs)) || Number(req.body.priceTzs) < 0)) return res.status(400).json({message:'Invalid price'});
    const values = fields.map(([key])=>key === 'priceTzs' ? Number(req.body[key]) : (req.body[key] === '' ? null : req.body[key]));
    const updates = fields.map(([,column],i)=>`${column} = $${i+1}`).join(', ');
    const result = await pool.query(`UPDATE graduation_sites SET ${updates}, updated_at = NOW() WHERE id = $${values.length+1} RETURNING id,slug,status`, [...values,req.params.id]);
    if (!result.rowCount) return res.status(404).json({message:'Site not found'});
    res.json(result.rows[0]);
  } catch(err) { next(err); }
});

// ========================================
// PUBLIC GALLERY
// ========================================

app.get('/api/gallery', async (_req, res, next) => {
  try {
    const slug = siteSlug(_req);
    const site = slug ? await resolveSite(_req) : null;
    if (slug && !site) return res.status(404).json({ message: 'Website not available' });
    const result = await pool.query(
      'SELECT id, filename, alt_text, created_at FROM gallery_images WHERE site_id IS NOT DISTINCT FROM $1 ORDER BY created_at DESC LIMIT 60',
      [site?.id || null]
    );

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

app.get('/api/admin/gallery',requireAdmin,async(req,res,next)=>{
 try{
  const siteId=String(req.query.siteId||'');
  if(siteId && !/^[a-f\d-]{36}$/i.test(siteId))return res.status(400).json({message:'Invalid website ID'});
  const {rows}=await pool.query('SELECT id,filename,alt_text,created_at FROM gallery_images WHERE site_id IS NOT DISTINCT FROM $1 ORDER BY created_at DESC LIMIT 200',[siteId||null]);
  res.json(rows.map(photo=>({id:photo.id,src:'/uploads/gallery/'+encodeURIComponent(photo.filename),alt:photo.alt_text,createdAt:photo.created_at})));
 }catch(err){next(err)}
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

// Graduate-specific hero portrait upload
app.post('/api/admin/sites/:id/hero', requireAdmin, upload.single('image'), async (req,res,next) => {
  if (!req.file) return res.status(400).json({message:'Select a portrait'});
  const {rows} = await pool.query('SELECT id,hero_image FROM graduation_sites WHERE id=$1',[req.params.id]);
  if (!rows.length) return res.status(404).json({message:'Graduate not found'});
  const filename = randomUUID() + '.webp';
  const dir = path.join(uploadDir,'hero');
  const destination = path.join(dir,filename);
  let saved=false;
  try {
    const processor=sharp(req.file.buffer,{limitInputPixels:MAX_IMAGE_PIXELS});
    const metadata=await processor.metadata();
    if (!ALLOWED_FORMATS.has(metadata.format)) return res.status(415).json({message:'Unsupported image format'});
    await mkdir(dir,{recursive:true});
    await processor.rotate().resize({width:1600,withoutEnlargement:true}).webp({quality:82}).toFile(destination);
    saved=true;
    await pool.query('UPDATE graduation_sites SET hero_image=$1,updated_at=NOW() WHERE id=$2',[filename,req.params.id]);
    // Keep old file until the new image and DB update succeed.
    if(rows[0].hero_image) await unlink(path.join(dir,rows[0].hero_image)).catch(()=>{});
    res.json({success:true,heroImage:'/uploads/hero/'+filename});
  } catch(err) {if(saved)await unlink(destination).catch(()=>{});next(err)}
});

app.patch('/api/admin/gallery/:id',requireAdmin,async(req,res,next)=>{
 try{
  if(typeof req.body.alt!=='string'||req.body.alt.trim().length>200)return res.status(400).json({message:'Caption must be 200 characters or less'});
  const {rows}=await pool.query('UPDATE gallery_images SET alt_text=$1 WHERE id=$2 RETURNING id,alt_text AS alt',[req.body.alt.trim(),req.params.id]);
  if(!rows.length)return res.status(404).json({message:'Photo not found'});
  res.json({success:true,image:rows[0]});
 }catch(err){next(err)}
});

app.delete('/api/admin/gallery/:id',requireAdmin,async(req,res,next)=>{
 try{
  const {rows}=await pool.query('DELETE FROM gallery_images WHERE id=$1 RETURNING filename',[req.params.id]);
  if(!rows.length)return res.status(404).json({message:'Photo not found'});
  const filename=rows[0].filename;
  if(/^[a-f0-9-]+\.webp$/i.test(filename)){
    await unlink(path.join(galleryDir,filename)).catch(err=>{if(err.code!=='ENOENT')console.error('Gallery file cleanup failed:',err)});
  }
  res.json({success:true});
 }catch(err){next(err)}
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

    const siteId = req.body.siteId || null;
    if (siteId) {
      const check = await pool.query('SELECT id FROM graduation_sites WHERE id = $1', [siteId]);
      if (!check.rowCount) return res.status(400).json({message:'Invalid graduation website'});
    }
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

      // Normalize orientation, size and format before hashing. Different filenames
      // or source encodings of the same resulting image cannot create duplicates.
      const optimized = await processor.rotate().resize({
        width: 1920,
        withoutEnlargement: true,
      }).webp({quality:80}).toBuffer();
      const contentHash = createHash('sha256').update(optimized).digest('hex');
      const existing = await pool.query(
        'SELECT id FROM gallery_images WHERE site_id IS NOT DISTINCT FROM $1 AND content_hash=$2 LIMIT 1',
        [siteId,contentHash]
      );
      if(existing.rowCount)return res.status(409).json({
        success:false,message:'This photo is already in this gallery.'
      });
      await writeFile(destination,optimized);
      fileSaved = true;

      // Store file metadata in PostgreSQL.
      await pool.query(
        `
        INSERT INTO gallery_images (
          id,
          filename,
          alt_text, site_id, content_hash
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [imageId, filename, alt, siteId, contentHash]
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

      if(error.code==='23505')return res.status(409).json({success:false,message:'This photo is already in this gallery.'});
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
