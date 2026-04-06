'use strict';
require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const jwt         = require('jsonwebtoken');
const bcrypt      = require('bcryptjs');
const { v4: uuid } = require('uuid');
const path        = require('path');

const db = require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'musharaka_secret_key_change_in_production';

/* ═══════════════════════════════════════════
   MIDDLEWARE
═══════════════════════════════════════════ */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:5500', 'null'],  // null for file://
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from parent directories
app.use('/wp-content', express.static(path.join(__dirname, '..', 'wp-content')));
app.use('/wp-json', express.static(path.join(__dirname, '..', 'wp-json')));
app.use('/gtag', express.static(path.join(__dirname, '..', 'gtag')));
app.use('/recaptcha', express.static(path.join(__dirname, '..', 'recaptcha')));

// Serve frontend pages
app.use('/ar', express.static(path.join(__dirname, '..', 'ar')));
app.use('/en', express.static(path.join(__dirname, '..', 'en')));

// Serve admin panel statically
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

/* ─── Rate limiters ─── */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, error: 'Too many login attempts.' }
});
app.use('/api', apiLimiter);

/* ─── Auth middleware ─── */
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  try {
    req.admin = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

/* ─── Helpers ─── */
const getIp = req =>
  (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

async function log(adminId, action, entity, entityId, detail, ip) {
  try {
    await db.prepare(`INSERT INTO activity_log (admin_id, action, entity, entity_id, detail, ip)
                      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(adminId || null, action, entity || null, entityId || null, detail || null, ip || null);
  } catch (err) {
    console.error('[LOG] Error:', err.message);
  }
}

function generateRef(type) {
  const prefix = type === 'entity' ? 'ENT' : 'IND';
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${ts}`;
}

/* ═══════════════════════════════════════════
   PUBLIC ROUTES
═══════════════════════════════════════════ */

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Musharaka API is running', timestamp: new Date().toISOString() });
});

/* ── Submit Individual Account Request ── */
app.post('/api/accounts/individual', async (req, res) => {
  try {
    const {
      full_name, national_id, nationality, dob, phone, email, address, city,
      employment, employer_name, income_source, annual_income,
      investment_goal, risk_level, wallet_platform, wallet_address
    } = req.body;

    if (!full_name || !phone || !national_id) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهوية والجوال مطلوبة.' });
    }

    const ref = generateRef('individual');
    await db.prepare(`
      INSERT INTO account_requests
        (ref_no, type, full_name, national_id, nationality, dob, phone, email,
         address, city, employment, employer_name, income_source, annual_income,
         investment_goal, risk_level, wallet_platform, wallet_address, ip_address)
      VALUES
        (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(ref, 'individual',
      full_name, national_id, nationality, dob, phone, email,
      address, city, employment, employer_name, income_source, annual_income,
      investment_goal, risk_level, wallet_platform, wallet_address, getIp(req)
    );

    await log(null, 'submit_individual', 'account_request', null, `ref:${ref}`, getIp(req));
    res.json({ success: true, ref_no: ref, message: 'تم استلام طلبك بنجاح. سيتواصل معك فريقنا قريباً.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم، يرجى المحاولة لاحقاً.' });
  }
});

/* ── Submit Entity Account Request ── */
app.post('/api/accounts/entity', async (req, res) => {
  try {
    const {
      entity_name, entity_type, cr_number, vat_number, entity_address,
      phone, email, city,
      auth_person, auth_id, auth_phone,
      wallet_platform, wallet_address,
      services, investment_goal
    } = req.body;

    if (!entity_name || !cr_number || !phone) {
      return res.status(400).json({ success: false, error: 'اسم الجهة ورقم السجل التجاري والجوال مطلوبة.' });
    }

    const ref = generateRef('entity');
    await db.prepare(`
      INSERT INTO account_requests
        (ref_no, type, entity_name, entity_type, cr_number, vat_number,
         entity_address, phone, email, city,
         auth_person, auth_id, auth_phone,
         wallet_platform, wallet_address, services, investment_goal, ip_address)
      VALUES
        (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(ref, 'entity',
      entity_name, entity_type, cr_number, vat_number,
      entity_address, phone, email, city,
      auth_person, auth_id, auth_phone,
      wallet_platform, wallet_address,
      JSON.stringify(services || []), investment_goal, getIp(req)
    );

    await log(null, 'submit_entity', 'account_request', null, `ref:${ref}`, getIp(req));
    res.json({ success: true, ref_no: ref, message: 'تم استلام طلب الكيان بنجاح. سيتواصل معك فريقنا قريباً.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم، يرجى المحاولة لاحقاً.' });
  }
});

/* ── Submit Contact Message ── */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ success: false, error: 'الاسم والرسالة مطلوبان.' });
    }
    const result = await db.prepare(`
      INSERT INTO contact_messages (name, email, phone, subject, message, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email, phone, subject, message, getIp(req));

    await log(null, 'contact_message', 'contact_messages', result.lastID, null, getIp(req));
    res.json({ success: true, message: 'تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ، يرجى المحاولة لاحقاً.' });
  }
});

/* ═══════════════════════════════════════════
   ADMIN AUTH ROUTES
═══════════════════════════════════════════ */
app.post('/api/admin/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'اسم المستخدم وكلمة المرور مطلوبان.' });
    }

    const admin = await db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ success: false, error: 'بيانات الدخول غير صحيحة.' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, name: admin.name, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await log(admin.id, 'admin_login', null, null, null, getIp(req));
    res.json({ success: true, token, admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ═══════════════════════════════════════════
   ADMIN PROTECTED ROUTES
═══════════════════════════════════════════ */

/* ── Dashboard Stats ── */
app.get('/api/admin/stats', authenticate, async (req, res) => {
  try {
    const totalRequests  = (await db.prepare('SELECT COUNT(*) AS c FROM account_requests').get()).c || 0;
    const pendingReq     = (await db.prepare("SELECT COUNT(*) AS c FROM account_requests WHERE status='pending'").get()).c || 0;
    const approvedReq    = (await db.prepare("SELECT COUNT(*) AS c FROM account_requests WHERE status='approved'").get()).c || 0;
    const rejectedReq    = (await db.prepare("SELECT COUNT(*) AS c FROM account_requests WHERE status='rejected'").get()).c || 0;
    const reviewingReq   = (await db.prepare("SELECT COUNT(*) AS c FROM account_requests WHERE status='reviewing'").get()).c || 0;
    const totalMessages  = (await db.prepare('SELECT COUNT(*) AS c FROM contact_messages').get()).c || 0;
    const unreadMessages = (await db.prepare("SELECT COUNT(*) AS c FROM contact_messages WHERE status='unread'").get()).c || 0;
    const todayRequests  = (await db.prepare("SELECT COUNT(*) AS c FROM account_requests WHERE date(submitted_at)=date('now')").get()).c || 0;
    const individuals    = (await db.prepare("SELECT COUNT(*) AS c FROM account_requests WHERE type='individual'").get()).c || 0;
    const entities       = (await db.prepare("SELECT COUNT(*) AS c FROM account_requests WHERE type='entity'").get()).c || 0;

    // Last 7 days requests
    const weekData = await db.prepare(`
      SELECT date(submitted_at) AS day, COUNT(*) AS count
      FROM account_requests
      WHERE submitted_at >= datetime('now','-7 days')
      GROUP BY day ORDER BY day
    `).all();

    res.json({
      success: true,
      stats: {
        totalRequests, pendingReq, approvedReq, rejectedReq, reviewingReq,
        totalMessages, unreadMessages, todayRequests, individuals, entities
      },
      weekData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── List Account Requests ── */
app.get('/api/admin/accounts', authenticate, async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];

    if (status) { where.push("status = ?"); params.push(status); }
    if (type)   { where.push("type = ?");   params.push(type); }
    if (search) {
      where.push("(full_name LIKE ? OR entity_name LIKE ? OR phone LIKE ? OR ref_no LIKE ? OR national_id LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = await db.prepare(`SELECT COUNT(*) AS c FROM account_requests ${whereClause}`).get(...params);
    const total = countResult ? countResult.c : 0;
    const rows  = await db.prepare(`
      SELECT id, ref_no, type, status, full_name, entity_name, phone, email,
             national_id, cr_number, submitted_at, updated_at
      FROM account_requests ${whereClause}
      ORDER BY submitted_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ success: true, total, page: parseInt(page), data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Get Single Account Request ── */
app.get('/api/admin/accounts/:id', authenticate, async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM account_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
    if (row.services) { try { row.services = JSON.parse(row.services); } catch {} }
    res.json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Update Account Status ── */
app.patch('/api/admin/accounts/:id', authenticate, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const valid = ['pending', 'reviewing', 'approved', 'rejected'];
    if (status && !valid.includes(status)) {
      return res.status(400).json({ success: false, error: 'حالة غير صالحة.' });
    }
    const existing = await db.prepare('SELECT * FROM account_requests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });

    const fields = [];
    const params = [];
    if (status) { fields.push("status = ?"); params.push(status); }
    if (notes !== undefined) { fields.push("notes = ?"); params.push(notes); }
    fields.push("updated_at = datetime('now')");
    params.push(req.params.id);

    await db.prepare(`UPDATE account_requests SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    await log(req.admin.id, 'update_account', 'account_request', req.params.id, `status→${status}`, getIp(req));
    res.json({ success: true, message: 'تم تحديث الطلب بنجاح.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Delete Account Request ── */
app.delete('/api/admin/accounts/:id', authenticate, async (req, res) => {
  try {
    const row = await db.prepare('SELECT id FROM account_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
    await db.prepare('DELETE FROM account_requests WHERE id = ?').run(req.params.id);
    await log(req.admin.id, 'delete_account', 'account_request', req.params.id, null, getIp(req));
    res.json({ success: true, message: 'تم حذف الطلب.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── List Contact Messages ── */
app.get('/api/admin/messages', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = status ? 'WHERE status = ?' : '';
    const params = status ? [status] : [];

    const countResult = await db.prepare(`SELECT COUNT(*) AS c FROM contact_messages ${where}`).get(...params);
    const total = countResult ? countResult.c : 0;
    const rows  = await db.prepare(`
      SELECT * FROM contact_messages ${where}
      ORDER BY received_at DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ success: true, total, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Update Message Status ── */
app.patch('/api/admin/messages/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['unread', 'read', 'replied'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: 'حالة غير صالحة.' });
    await db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, req.params.id);
    await log(req.admin.id, 'update_message', 'contact_messages', req.params.id, `status→${status}`, getIp(req));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Delete Message ── */
app.delete('/api/admin/messages/:id', authenticate, async (req, res) => {
  try {
    await db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
    await log(req.admin.id, 'delete_message', 'contact_messages', req.params.id, null, getIp(req));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Site Settings ── */
app.get('/api/admin/settings', authenticate, async (req, res) => {
  try {
    const rows = await db.prepare('SELECT key, value, label FROM site_settings').all();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

app.put('/api/admin/settings', authenticate, async (req, res) => {
  try {
    const { settings } = req.body; // array of {key, value}
    if (!Array.isArray(settings)) return res.status(400).json({ success: false, error: 'Invalid format.' });
    const upd = db.prepare('UPDATE site_settings SET value = ? WHERE key = ?');
    for (const { key, value } of settings) {
      await upd.run(value, key);
    }
    await log(req.admin.id, 'update_settings', null, null, null, getIp(req));
    res.json({ success: true, message: 'تم حفظ الإعدادات.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Change Admin Password ── */
app.post('/api/admin/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' });
    }
    const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
    if (!bcrypt.compareSync(current_password, admin.password)) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة.' });
    }
    const hash = bcrypt.hashSync(new_password, 10);
    await db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hash, req.admin.id);
    await log(req.admin.id, 'change_password', 'admins', req.admin.id, null, getIp(req));
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Activity Log ── */
app.get('/api/admin/log', authenticate, async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT l.*, a.name AS admin_name
      FROM activity_log l
      LEFT JOIN admins a ON l.admin_id = a.id
      ORDER BY l.logged_at DESC LIMIT 100
    `).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Admin profile ── */
app.get('/api/admin/me', authenticate, async (req, res) => {
  try {
    const admin = await db.prepare('SELECT id, username, name, role, created_at FROM admins WHERE id = ?').get(req.admin.id);
    res.json({ success: true, data: admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ═══════════════════════════════════════════
   ERROR HANDLER
═══════════════════════════════════════════ */
app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

/* ═══════════════════════════════════════════
   START
═══════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   Musharaka Backend API              ║`);
  console.log(`║   http://localhost:${PORT}              ║`);
  console.log(`║   Admin Panel: http://localhost:${PORT}/admin ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});

module.exports = app;
