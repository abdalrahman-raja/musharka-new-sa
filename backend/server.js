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
    await db.from('activity_log').insert({
      admin_id: adminId || null,
      action,
      entity: entity || null,
      entity_id: entityId || null,
      detail: detail || null,
      ip: ip || null
    });
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
    const { error } = await db.from('account_requests').insert({
      ref_no: ref,
      type: 'individual',
      full_name, national_id, nationality, dob, phone, email,
      address, city, employment, employer_name, income_source, annual_income,
      investment_goal, risk_level, wallet_platform, wallet_address,
      ip_address: getIp(req)
    });

    if (error) throw error;

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
    const { error } = await db.from('account_requests').insert({
      ref_no: ref,
      type: 'entity',
      entity_name, entity_type, cr_number, vat_number,
      entity_address, phone, email, city,
      auth_person, auth_id, auth_phone,
      wallet_platform, wallet_address,
      services: services || [],
      investment_goal,
      ip_address: getIp(req)
    });

    if (error) throw error;

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
    const { data: result, error } = await db.from('contact_messages').insert({
      name, email, phone, subject, message,
      ip_address: getIp(req)
    }).select('id').single();

    if (error) throw error;

    await log(null, 'contact_message', 'contact_messages', result.id, null, getIp(req));
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

    const { data: admin, error } = await db.from('admins').select('*').eq('username', username).single();
    if (error || !admin || !bcrypt.compareSync(password, admin.password)) {
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
    const today = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      { count: totalRequests },
      { count: pendingReq },
      { count: approvedReq },
      { count: rejectedReq },
      { count: reviewingReq },
      { count: totalMessages },
      { count: unreadMessages },
      { count: todayRequests },
      { count: individuals },
      { count: entities },
      { data: weekRows }
    ] = await Promise.all([
      db.from('account_requests').select('*', { count: 'exact', head: true }),
      db.from('account_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('account_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      db.from('account_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      db.from('account_requests').select('*', { count: 'exact', head: true }).eq('status', 'reviewing'),
      db.from('contact_messages').select('*', { count: 'exact', head: true }),
      db.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
      db.from('account_requests').select('*', { count: 'exact', head: true }).gte('submitted_at', today),
      db.from('account_requests').select('*', { count: 'exact', head: true }).eq('type', 'individual'),
      db.from('account_requests').select('*', { count: 'exact', head: true }).eq('type', 'entity'),
      db.from('account_requests').select('submitted_at').gte('submitted_at', weekAgo.toISOString())
    ]);

    // Aggregate week data manually since client doesn't support GROUP BY
    const weekMap = {};
    (weekRows || []).forEach(r => {
      const d = r.submitted_at.split('T')[0];
      weekMap[d] = (weekMap[d] || 0) + 1;
    });
    const weekData = Object.keys(weekMap).sort().map(day => ({ day, count: weekMap[day] }));

    res.json({
      success: true,
      stats: {
        totalRequests: totalRequests || 0,
        pendingReq: pendingReq || 0,
        approvedReq: approvedReq || 0,
        rejectedReq: rejectedReq || 0,
        reviewingReq: reviewingReq || 0,
        totalMessages: totalMessages || 0,
        unreadMessages: unreadMessages || 0,
        todayRequests: todayRequests || 0,
        individuals: individuals || 0,
        entities: entities || 0
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
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = db.from('account_requests').select('id, ref_no, type, status, full_name, entity_name, phone, email, national_id, cr_number, submitted_at, updated_at', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (type)   query = query.eq('type', type);
    if (search) {
      const s = `%${search}%`;
      query = query.or(`full_name.ilike.${s},entity_name.ilike.${s},phone.ilike.${s},ref_no.ilike.${s},national_id.ilike.${s}`);
    }

    const { data: rows, count: total, error } = await query
      .order('submitted_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({ success: true, total: total || 0, page: parseInt(page), data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Get Single Account Request ── */
app.get('/api/admin/accounts/:id', authenticate, async (req, res) => {
  try {
    const { data: row, error } = await db.from('account_requests').select('*').eq('id', req.params.id).single();
    if (error || !row) return res.status(404).json({ success: false, error: 'الطلب غير موجود.' });
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

    const updateData = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { error } = await db.from('account_requests').update(updateData).eq('id', req.params.id);
    if (error) throw error;

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
    const { error } = await db.from('account_requests').delete().eq('id', req.params.id);
    if (error) throw error;

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
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = db.from('contact_messages').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);

    const { data: rows, count: total, error } = await query
      .order('received_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json({ success: true, total: total || 0, data: rows });
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

    const { error } = await db.from('contact_messages').update({ status }).eq('id', req.params.id);
    if (error) throw error;

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
    const { error } = await db.from('contact_messages').delete().eq('id', req.params.id);
    if (error) throw error;

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
    const { data: rows, error } = await db.from('site_settings').select('key, value, label');
    if (error) throw error;
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

    for (const { key, value } of settings) {
      await db.from('site_settings').update({ value }).eq('key', key);
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
    const { data: admin, error } = await db.from('admins').select('*').eq('id', req.admin.id).single();
    if (error || !admin || !bcrypt.compareSync(current_password, admin.password)) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة.' });
    }
    const hash = bcrypt.hashSync(new_password, 10);
    await db.from('admins').update({ password: hash }).eq('id', req.admin.id);
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
    const { data: rows, error } = await db.from('activity_log')
      .select('*, admins(name)')
      .order('logged_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Flatten admins.name to admin_name for compatibility
    const formatted = (rows || []).map(r => ({
      ...r,
      admin_name: r.admins ? r.admins.name : null
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم.' });
  }
});

/* ── Admin profile ── */
app.get('/api/admin/me', authenticate, async (req, res) => {
  try {
    const { data: admin, error } = await db.from('admins').select('id, username, name, role, created_at').eq('id', req.admin.id).single();
    if (error) throw error;
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
