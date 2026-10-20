const express = require('express');
const router = express.Router();
const os = require('os');
const crypto = require('crypto');
const Conversation = require('../models/Conversation');
const MemoryNote = require('../models/MemoryNote');
const UserSettings = require('../models/UserSettings');
const User = require('../models/User');
const AuthToken = require('../models/AuthToken');
const aiService = require('../services/aiService');
const systemService = require('../services/systemService');
const mongoose = require('mongoose');

// Password crypto helpers (Native Node.js crypto, zero external dependency)
function hashPassword(password, salt = null) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  try {
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) {
    return false;
  }
}

// Multi-Device & User Authentication Middleware
router.use(async (req, res, next) => {
  const rawDeviceId = req.headers['x-device-id'] || req.query.deviceId || (req.body && req.body.deviceId) || 'default_device';
  const rawDeviceName = req.headers['x-device-name'] || req.query.deviceName || (req.body && req.body.deviceName) || 'Primary Device';
  req.deviceId = String(rawDeviceId).trim() || 'default_device';
  req.deviceName = String(rawDeviceName).trim() || 'Primary Device';

  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  let token = null;
  if (authHeader) {
    token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  }
  if (!token && req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  req.user = null;
  req.token = null;
  if (token && mongoose.connection.readyState === 1) {
    try {
      const session = await AuthToken.findOne({ token });
      if (session) {
        const u = await User.findById(session.userId).select('-passwordHash -passwordSalt');
        if (u) {
          req.user = u;
          req.token = token;
        }
      }
    } catch (e) {
      console.warn('Session verification notice:', e.message);
    }
  }
  next();
});

// Guard middleware for authenticated users
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }
  next();
}

// Guard middleware for admin-only operations
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Unauthorized: Administrator access required.' });
  }
  next();
}

// ============================================================================
// AUTHENTICATION ROUTES (Register, Login, Logout, Profile)
// ============================================================================

// Register new user
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, city, preferredLanguage } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Name is required.' });
    if (!email || !email.trim()) return res.status(400).json({ success: false, error: 'Email is required.' });
    if (!password || password.length < 4) return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });

    const cleanEmail = email.toLowerCase().trim();
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database offline. Please try again shortly.' });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    // If no admins exist in database yet, make first registered user an Admin!
    const adminCount = await User.countDocuments({ role: 'admin' });
    const assignedRole = adminCount === 0 ? 'admin' : 'user';

    const { salt, hash } = hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hash,
      passwordSalt: salt,
      role: assignedRole,
      city: (city && city.trim()) || 'Patna',
      preferredLanguage: preferredLanguage || 'en'
    });

    // Generate Session Token
    const token = crypto.randomBytes(32).toString('hex');
    await AuthToken.create({
      token,
      userId: newUser._id,
      email: newUser.email,
      role: newUser.role
    });

    const userObj = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      city: newUser.city,
      preferredLanguage: newUser.preferredLanguage
    };

    return res.json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: userObj
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

// Login existing user
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database offline. Please try again shortly.' });
    }

    let user = await User.findOne({ email: cleanEmail });
    const masterAdminEmail = (process.env.ADMIN_EMAIL || 'admin@arya.ai').toLowerCase().trim();
    const masterAdminPassword = process.env.ADMIN_PASSWORD || 'Admin@Arya2026';

    if (!user && cleanEmail === masterAdminEmail && password === masterAdminPassword) {
      const { salt, hash } = hashPassword(password);
      user = await User.create({
        name: 'Super Administrator',
        email: masterAdminEmail,
        passwordHash: hash,
        passwordSalt: salt,
        role: 'admin',
        city: 'Patna'
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    let isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!isValid && cleanEmail === masterAdminEmail && password === masterAdminPassword) {
      const { salt, hash } = hashPassword(password);
      user.passwordSalt = salt;
      user.passwordHash = hash;
      user.role = 'admin';
      await user.save().catch(() => {});
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    user.lastLogin = new Date();
    await user.save().catch(() => {});

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    await AuthToken.create({
      token,
      userId: user._id,
      email: user.email,
      role: user.role
    });

    const userObj = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      city: user.city || 'Patna',
      preferredLanguage: user.preferredLanguage || 'en',
      geminiApiKey: user.geminiApiKey || ''
    };

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: userObj
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Login failed.' });
  }
});

// Logout
router.post('/auth/logout', async (req, res) => {
  try {
    if (req.token && mongoose.connection.readyState === 1) {
      await AuthToken.deleteOne({ token: req.token });
    }
    return res.json({ success: true, message: 'Logged out cleanly.' });
  } catch (err) {
    return res.json({ success: true });
  }
});

// Claim Admin role with master secret (Bootstrap helper)
router.post('/auth/claim-admin', requireAuth, async (req, res) => {
  try {
    const { adminSecret } = req.body;
    const masterSecret = process.env.ADMIN_PASSWORD || 'Admin@Arya2026';
    if (!adminSecret || adminSecret.trim() !== masterSecret) {
      return res.status(403).json({ success: false, error: 'Invalid master administration key.' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    user.role = 'admin';
    await user.save();
    await AuthToken.updateMany({ userId: user._id }, { role: 'admin' });
    req.user.role = 'admin';
    return res.json({
      success: true,
      message: 'Your account has been elevated to Super Administrator 🛡️.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get Current User Profile
router.get('/auth/me', async (req, res) => {
  if (!req.user) {
    return res.json({ success: true, user: null, isAuthenticated: false });
  }
  return res.json({
    success: true,
    isAuthenticated: true,
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      city: req.user.city || 'Patna',
      preferredLanguage: req.user.preferredLanguage || 'en',
      geminiApiKey: req.user.geminiApiKey || ''
    }
  });
});

// Update Profile
router.post('/auth/profile', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Sign-in required.' });
  }
  try {
    const { name, city, preferredLanguage, geminiApiKey } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    if (name) user.name = name.trim();
    if (city) user.city = city.trim();
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (typeof geminiApiKey === 'string') user.geminiApiKey = geminiApiKey.trim();

    await user.save();
    return res.json({
      success: true,
      message: 'Profile updated.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
        preferredLanguage: user.preferredLanguage,
        geminiApiKey: user.geminiApiKey
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADMIN CONSOLE ROUTES (Discreet & Admin-Only)
// ============================================================================

// Get all chats across all users and devices
router.get('/admin/chats', requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database offline.' });
    }
    const limit = parseInt(req.query.limit, 10) || 50;
    const search = req.query.search ? String(req.query.search).trim() : '';

    const filter = {};
    if (search) {
      filter.$or = [
        { userMessage: new RegExp(search, 'i') },
        { aryaResponse: new RegExp(search, 'i') },
        { userEmail: new RegExp(search, 'i') },
        { userName: new RegExp(search, 'i') }
      ];
    }

    const chats = await Conversation.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit);

    const total = await Conversation.countDocuments(filter);
    return res.json({ success: true, chats, total });
  } catch (err) {
    console.error('Admin chats fetch error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get all registered users list
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database offline.' });
    }
    const users = await User.find()
      .select('-passwordHash -passwordSalt')
      .sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (u) => {
      const chatCount = await Conversation.countDocuments({
        $or: [{ userId: u._id }, { userEmail: u.email }]
      }).catch(() => 0);
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        city: u.city,
        preferredLanguage: u.preferredLanguage,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        chatCount
      };
    }));

    return res.json({ success: true, users: usersWithStats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Change user role (Promote to Admin or Demote to User) - ONLY admin can do this!
router.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be user or admin.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Safety: Prevent removing the last remaining admin
    if (targetUser.role === 'admin' && role === 'user') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, error: 'Cannot demote the last remaining Administrator.' });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    // Also update any active sessions
    await AuthToken.updateMany({ userId: targetUser._id }, { role });

    return res.json({
      success: true,
      message: `User ${targetUser.email} role updated to ${role}.`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Quick Promote any user to Admin by email (Admin-only)
router.post('/admin/promote-by-email', requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'User email is required.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const targetUser = await User.findOne({ email: cleanEmail });
    if (!targetUser) {
      return res.status(404).json({ success: false, error: `No user account found with email: ${cleanEmail}. The user must first sign up.` });
    }
    targetUser.role = 'admin';
    await targetUser.save();
    await AuthToken.updateMany({ userId: targetUser._id }, { role: 'admin' });
    return res.json({
      success: true,
      message: `User ${targetUser.name || targetUser.email} (${targetUser.email}) is now an Administrator 🛡️.`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new user directly by Admin
router.post('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, city, preferredLanguage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const cleanEmail = email.toLowerCase().trim();

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database offline. Please try again shortly.' });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: `An account with email '${cleanEmail}' already exists.` });
    }

    const { salt, hash } = hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hash,
      passwordSalt: salt,
      role: assignedRole,
      city: (city && city.trim()) || 'Patna',
      preferredLanguage: preferredLanguage || 'hi'
    });

    return res.json({
      success: true,
      message: `User '${newUser.name}' (${newUser.email}) created successfully as ${newUser.role.toUpperCase()} 🛡️.`,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        city: newUser.city,
        preferredLanguage: newUser.preferredLanguage,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error('Admin create user error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create user.' });
  }
});

// Delete user and all associated data by Admin
router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found or already deleted.' });
    }

    // Safety 1: Prevent self-deletion
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'Self-deletion prohibited: You cannot delete your own Administrator account.' });
    }

    // Safety 2: Protect system super admin account
    const superAdminEmail = (process.env.ADMIN_EMAIL || 'admin@arya.ai').toLowerCase().trim();
    if (targetUser.email.toLowerCase().trim() === superAdminEmail) {
      return res.status(403).json({ success: false, error: 'Protected Account: Master Super Administrator cannot be deleted.' });
    }

    // Safety 3: Prevent deleting the last remaining admin
    if (targetUser.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, error: 'Cannot delete the last remaining Administrator.' });
      }
    }

    // Purge associated user sessions, chats and notes
    const [deletedSessions, deletedChats, deletedNotes] = await Promise.all([
      AuthToken.deleteMany({ userId: targetUser._id }).catch(() => ({ deletedCount: 0 })),
      Conversation.deleteMany({
        $or: [
          { userId: targetUser._id },
          { userEmail: targetUser.email }
        ]
      }).catch(() => ({ deletedCount: 0 })),
      MemoryNote.deleteMany({
        $or: [
          { userId: targetUser._id },
          { userEmail: targetUser.email }
        ]
      }).catch(() => ({ deletedCount: 0 })),
      UserSettings.deleteMany({ userId: String(targetUser._id) }).catch(() => ({ deletedCount: 0 }))
    ]);

    // Delete the user record
    await User.findByIdAndDelete(targetUser._id);

    return res.json({
      success: true,
      message: `User '${targetUser.email}' and all associated records (${deletedChats.deletedCount || 0} chats, ${deletedNotes.deletedCount || 0} notes) have been permanently deleted.`,
      deletedUserId: targetUser._id
    });
  } catch (err) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete user.' });
  }
});

// Delete specific chat record by Admin
router.delete('/admin/chats/:id', requireAdmin, async (req, res) => {
  try {
    await Conversation.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Chat record deleted by Admin.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Process chat / voice input
router.post('/chat', async (req, res) => {
  try {
    const { message, apiKey, userName, language, city, fileAttachment } = req.body;
    const deviceId = req.deviceId;
    const deviceName = req.deviceName;
    const targetCity = (city && city.trim()) || (req.user && req.user.city) || 'Patna';
    const effectiveUserName = (req.user && req.user.name) || userName;

    if (effectiveUserName) {
      aiService.setUserName(effectiveUserName);
    }

    if (!message && !fileAttachment) {
      return res.status(400).json({ error: 'Message or attachment cannot be empty.' });
    }

    const effectiveApiKey = (apiKey && apiKey.trim()) || (req.user && req.user.geminiApiKey) || null;

    const userId = req.user ? req.user._id : null;
    const promptText = (message && message.trim()) || (fileAttachment ? (fileAttachment.type && fileAttachment.type.startsWith('image/') ? 'Please inspect and analyze this image.' : 'Please analyze this uploaded document.') : '');
    const aiResult = await aiService.processQuery(promptText, effectiveApiKey, language, deviceId, deviceName, targetCity, fileAttachment, userId);

    // Save automatically to MongoDB partitioned by user (if logged in) or deviceId (if guest)
    let savedRecord = null;
    if (mongoose.connection.readyState === 1) {
      try {
        savedRecord = await Conversation.create({
          deviceId,
          deviceName,
          userId: req.user ? req.user._id : null,
          userEmail: req.user ? req.user.email : '',
          userName: req.user ? req.user.name : (userName || 'Guest'),
          attachment: fileAttachment ? {
            name: fileAttachment.name || 'file',
            type: fileAttachment.type || '',
            size: fileAttachment.size || 0,
            dataUrl: fileAttachment.dataUrl || ''
          } : null,
          userMessage: message || (fileAttachment ? `[Uploaded: ${fileAttachment.name}]` : ''),
          aryaResponse: aiResult.display,
          jarvisResponse: aiResult.display,
          language: aiResult.language || 'en',
          action: aiResult.action,
          autoSaved: true,
          metadata: {
            speech: aiResult.speech,
            source: aiResult.source || 'ARYA Core',
            author: 'Shubhanshu Kumar Srivastav',
            deviceId,
            deviceName
          }
        });
      } catch (dbErr) {
        console.warn('Could not save conversation to DB:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      speech: aiResult.speech,
      display: aiResult.display,
      language: aiResult.language || 'en',
      action: aiResult.action,
      data: aiResult.data || null,
      attachment: savedRecord && savedRecord.attachment ? savedRecord.attachment : (fileAttachment || null),
      deviceId,
      deviceName,
      userId: req.user ? req.user._id : null,
      autoSaved: Boolean(savedRecord),
      id: savedRecord ? savedRecord._id : Date.now(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const isHindi = req.body && req.body.language === 'hi';
    const fallbackSpeech = isHindi
      ? 'माफ़ कीजिए सर, आपके अनुरोध को पूरा करने में एक क्षणिक रुकावट आई।'
      : 'My apologies, Sir. A momentary glitch occurred while processing your request.';
    const fallbackDisplay = isHindi
      ? `⚠️ **सिस्टम सूचना:** आपके अनुरोध को पूरा करने में समस्या आई (${error.message || 'त्रुटि'})। कृपया पुनः प्रयास करें।`
      : `⚠️ **System Notice:** A glitch occurred while processing your request (${error.message || 'unknown error'}). Please retry.`;
    return res.json({
      success: true,
      speech: fallbackSpeech,
      display: fallbackDisplay,
      language: isHindi ? 'hi' : 'en',
      action: 'error_recovered',
      deviceId: req.deviceId,
      deviceName: req.deviceName,
      timestamp: new Date().toISOString()
    });
  }
});

// Retrieve conversation history from MongoDB (Isolated per logged-in user or per guest device)
router.get('/history', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ history: [], status: 'MongoDB not connected', deviceId: req.deviceId });
    }
    const filter = req.user
      ? { userId: req.user._id }
      : { deviceId: req.deviceId, $or: [{ userId: null }, { userId: { $exists: false } }] };

    const history = await Conversation.find(filter)
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      history: history.reverse(),
      count: history.length,
      deviceId: req.deviceId,
      deviceName: req.deviceName,
      userId: req.user ? req.user._id : null
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to retrieve history.' });
  }
});

// Retrieve latest single conversation from MongoDB
router.get('/history/latest', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: false, message: 'MongoDB not connected', deviceId: req.deviceId });
    }
    const filter = req.user
      ? { userId: req.user._id }
      : { deviceId: req.deviceId, $or: [{ userId: null }, { userId: { $exists: false } }] };

    const latest = await Conversation.findOne(filter).sort({ timestamp: -1 });
    const count = await Conversation.countDocuments(filter);
    res.json({ success: true, latest, count, deviceId: req.deviceId, userId: req.user ? req.user._id : null });
  } catch (error) {
    console.error('Error fetching latest history:', error);
    res.status(500).json({ error: 'Failed to retrieve latest conversation.' });
  }
});

// Clear conversation history for the current user or current device only
router.delete('/history', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const filter = req.user
        ? { userId: req.user._id }
        : { deviceId: req.deviceId, $or: [{ userId: null }, { userId: { $exists: false } }] };
      await Conversation.deleteMany(filter);
    }
    res.json({ success: true, message: 'Memory logs successfully purged.', deviceId: req.deviceId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to purge history logs.' });
  }
});

// Notes Management (Isolated per logged-in user or per guest device)
router.get('/notes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ notes: [], deviceId: req.deviceId });
    }
    const filter = req.user
      ? { userId: req.user._id }
      : { deviceId: req.deviceId, $or: [{ userId: null }, { userId: { $exists: false } }] };

    const notes = await MemoryNote.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ notes, deviceId: req.deviceId, userId: req.user ? req.user._id : null });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Note content is required.' });
    }

    let cleanContent = content.trim();
    cleanContent = cleanContent.replace(/^(?:take a note(?:\s+that|\s+to)?|remember(?:\s+that)?|note likho(?:\s+ki)?|yaad rakhna(?:\s+ki)?|note banao(?:\s+ki)?|नोट लिखो(?:\s+कि)?|याद रखना(?:\s+कि)?)\s*[:\-–]?\s*/i, '').trim();
    cleanContent = cleanContent.replace(/^[:\-–,.]+\s*/, '').trim();
    cleanContent = cleanContent.charAt(0).toUpperCase() + cleanContent.slice(1);

    const humanTitle = title && title.trim()
      ? title.trim()
      : (cleanContent.length > 35 ? cleanContent.substring(0, 32).trim() + '...' : cleanContent);

    const note = await MemoryNote.create({
      deviceId: req.deviceId,
      deviceName: req.deviceName,
      userId: req.user ? req.user._id : null,
      userEmail: req.user ? req.user.email : '',
      title: humanTitle,
      content: cleanContent,
      category: category || 'note'
    });
    res.json({ success: true, note, autoSaved: true, deviceId: req.deviceId, userId: req.user ? req.user._id : null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note.' });
  }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    const filter = req.user
      ? { _id: req.params.id, userId: req.user._id }
      : { _id: req.params.id, deviceId: req.deviceId };

    await MemoryNote.findOneAndDelete(filter);
    res.json({ success: true, message: 'Note excised from memory bank.', deviceId: req.deviceId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// User Settings in MongoDB partitioned by deviceId
router.get('/settings', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let settings = await UserSettings.findOne({ deviceId: req.deviceId });
      if (!settings) {
        settings = await UserSettings.create({
          deviceId: req.deviceId,
          deviceName: req.deviceName,
          continuousListening: false // Default Push-To-Talk (Mic off by default)
        });
      }
      return res.json({ success: true, settings, deviceId: req.deviceId });
    }
    res.json({ success: false, message: 'MongoDB not connected', deviceId: req.deviceId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { userName, geminiApiKey, deviceName, continuousListening } = req.body;
    if (userName) {
      aiService.setUserName(userName);
    }
    // Only override system key if user provides a non-empty key
    if (geminiApiKey && typeof geminiApiKey === 'string' && geminiApiKey.trim()) {
      aiService.setApiKey(geminiApiKey.trim());
      if (req.user) {
        req.user.geminiApiKey = geminiApiKey.trim();
        await req.user.save().catch(() => {});
      }
    }

    if (mongoose.connection.readyState === 1) {
      const updateData = {
        ...req.body,
        deviceId: req.deviceId,
        deviceName: deviceName || req.deviceName,
        continuousListening: continuousListening !== undefined ? Boolean(continuousListening) : false,
        updatedAt: new Date()
      };
      const settings = await UserSettings.findOneAndUpdate(
        { deviceId: req.deviceId },
        updateData,
        { upsert: true, new: true }
      );
      return res.json({ success: true, settings, autoSaved: true, deviceId: req.deviceId });
    }
    res.json({ success: true, message: 'Settings applied locally', deviceId: req.deviceId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

// List all registered client devices
router.get('/devices', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, currentDeviceId: req.deviceId, devices: [] });
    }
    const devices = await UserSettings.find({}, 'deviceId deviceName userName language continuousListening updatedAt').sort({ updatedAt: -1 });
    res.json({ success: true, currentDeviceId: req.deviceId, devices });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list devices.' });
  }
});

// Live Atmospheric Weather for any City or Village
router.get('/weather', async (req, res) => {
  try {
    const city = (req.query.city && req.query.city.trim()) || 'Patna';
    const weather = await aiService.fetchRealWeather(city);
    res.json({ success: true, weather });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Network Telemetry & Device Access URLs (Cloud Hosting & Local Aware)
router.get('/network-info', (req, res) => {
  const isCloud = req.app.get('isCloud');
  const hostHeader = req.get('host') || 'localhost:3000';
  const isLocalHost = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');

  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ name, ip: net.address });
      }
    }
  }
  const primaryIp = ips.length > 0 ? ips[0].ip : 'localhost';
  const httpPort = req.app.get('httpPort') || 3000;
  const httpsPort = req.app.get('httpsPort') || 3443;

  // In Cloud Hosting (Render, Railway, Heroku, AWS), use the public hosted domain
  const isCloudDeployment = isCloud || (!isLocalHost && !primaryIp.startsWith('192.168.') && !primaryIp.startsWith('10.') && !primaryIp.startsWith('172.'));
  const publicHttpUrl = isCloudDeployment ? `https://${hostHeader}` : `http://${primaryIp}:${httpPort}`;
  const publicHttpsUrl = isCloudDeployment ? `https://${hostHeader}` : `https://${primaryIp}:${httpsPort}`;

  res.json({
    success: true,
    isCloud: Boolean(isCloudDeployment),
    host: hostHeader,
    primaryIp: isCloudDeployment ? hostHeader : primaryIp,
    interfaces: ips,
    httpUrl: publicHttpUrl,
    httpsUrl: publicHttpsUrl,
    isSecureContext: req.secure || req.protocol === 'https' || isCloudDeployment
  });
});

// Gemini AI Status Check (Auto-Detection Aware)
router.get('/gemini/status', (req, res) => {
  const userKey = (req.user && req.user.geminiApiKey) || '';
  const serverKey = aiService.geminiApiKey || process.env.GEMINI_API_KEY || '';
  const activeKey = (userKey && userKey.trim()) || (serverKey && serverKey.trim()) || '';
  const hasKey = Boolean(activeKey);
  const isSystemKey = !userKey && Boolean(serverKey);

  let maskedKey = '';
  if (activeKey) {
    maskedKey = activeKey.length > 8
      ? `${activeKey.substring(0, 6)}••••••••${activeKey.slice(-4)}`
      : '••••••••';
  }

  res.json({
    active: hasKey,
    hasKey: hasKey,
    isSystemKey: isSystemKey,
    source: isSystemKey ? 'System Auto-Detected (.env)' : (userKey ? 'User Vault' : 'None'),
    maskedKey: maskedKey,
    model: 'gemini-flash-lite-latest',
    author: 'Shubhanshu Kumar Srivastav'
  });
});

// System Direct Control API
router.post('/system/command', async (req, res) => {
  try {
    const { action, target, content, command } = req.body;
    let result = null;

    switch (action) {
      case 'screenshot':
        result = await systemService.takeScreenshot();
        break;
      case 'lock':
        result = await systemService.lockSystem();
        break;
      case 'volume':
        result = await systemService.setVolume(target || 'mute');
        break;
      case 'disk':
        result = await systemService.getDiskSpace();
        break;
      case 'battery':
        result = await systemService.getBatteryStatus();
        break;
      case 'network':
        result = await systemService.getNetworkInfo();
        break;
      case 'processes':
        result = await systemService.getRunningProcesses(15);
        break;
      case 'launch':
        result = await systemService.launchApp(target);
        break;
      case 'close':
        result = await systemService.closeApp(target);
        break;
      case 'open_folder':
        result = await systemService.openFolder(target);
        break;
      case 'list_files':
        result = await systemService.listFiles(target);
        break;
      case 'read_file':
        result = await systemService.readFile(target);
        break;
      case 'create_folder':
        result = await systemService.createFolder(target);
        break;
      case 'create_file':
        result = await systemService.createFile(target, content || '');
        break;
      case 'delete':
        result = await systemService.deleteFileOrFolder(target);
        break;
      case 'exec':
        result = await systemService.executeCustomCommand(command);
        break;
      default:
        return res.status(400).json({ success: false, error: `Unknown system action: ${action}` });
    }

    return res.json({ success: true, action, result });
  } catch (error) {
    console.error('System command error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Gemini API Key (Auto-detects system key if input is empty)
router.post('/gemini/test', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const keyToTest = (apiKey && apiKey.trim()) || (req.user && req.user.geminiApiKey) || aiService.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!keyToTest) {
      return res.status(400).json({ success: false, error: 'No Gemini API key detected on system or user profile.' });
    }
    const result = await aiService.testGeminiApiKey(keyToTest);
    res.json({
      ...result,
      isSystemKey: !(apiKey && apiKey.trim()) && !req.user?.geminiApiKey
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Gemini API Key directly
router.post('/gemini/key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (typeof apiKey === 'string') {
      aiService.setApiKey(apiKey);
      if (req.user) {
        req.user.geminiApiKey = apiKey.trim();
        await req.user.save().catch(() => {});
      }
      if (mongoose.connection.readyState === 1) {
        await UserSettings.findOneAndUpdate(
          { deviceId: req.deviceId },
          { geminiApiKey: apiKey.trim(), deviceName: req.deviceName, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }
      return res.json({ success: true, message: 'Gemini API Key updated successfully.' });
    }
    res.status(400).json({ success: false, error: 'Invalid API key.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real-time system telemetry
router.get('/system', (req, res) => {
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;

  const totalMemGB = (totalMemBytes / (1024 ** 3)).toFixed(2);
  const freeMemGB = (freeMemBytes / (1024 ** 3)).toFixed(2);
  const usedMemGB = (usedMemBytes / (1024 ** 3)).toFixed(2);
  const memUsagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown Processor';

  res.json({
    platform: `${os.type()} ${os.arch()} (${os.release()})`,
    hostname: os.hostname(),
    cpu: {
      model: cpuModel,
      cores: cpus.length,
      speedMHz: cpus.length > 0 ? cpus[0].speed : 0
    },
    memory: {
      totalGB: totalMemGB,
      freeGB: freeMemGB,
      usedGB: usedMemGB,
      usagePercent: memUsagePercent
    },
    uptimeSeconds: Math.floor(os.uptime()),
    uptimeFormatted: formatUptime(os.uptime()),
    database: {
      status: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
      dbName: mongoose.connection.name || 'ARYA_db',
      host: mongoose.connection.host || 'unknown',
      isAtlas: Boolean(mongoose.connection.readyState === 1 && mongoose.connection.host && !mongoose.connection.host.includes('127.0.0.1') && !mongoose.connection.host.includes('localhost'))
    }
  });
});

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
}

router.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'ARYA. Core V3.0',
    author: 'Shubhanshu Kumar Srivastav',
    mongodb: mongoose.connection.readyState === 1 ? 'ACTIVE' : 'INACTIVE',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
