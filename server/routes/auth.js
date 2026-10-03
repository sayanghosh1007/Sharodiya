import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db.js';

const router = express.Router();

// Initialize Supabase Server Client if environment credentials exist
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
    console.log('⚡ [Supabase Auth] Cloud backend integration initialized successfully.');
  } catch (err) {
    console.warn('⚠️ [Supabase Auth] Initialization warning:', err.message);
  }
}

// Helper to extract Bearer token
function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, archetype, avatar } = req.body || {};

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Please provide a valid name (at least 2 characters).' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanArchetype = archetype || 'friends';
    const cleanAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

    // If Supabase cloud is configured, register user on Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: cleanName,
              archetype: cleanArchetype,
              avatar: cleanAvatar
            }
          }
        });
        if (!error && data?.user) {
          const userObj = {
            id: data.user.id,
            name: cleanName,
            email: cleanEmail,
            archetype: cleanArchetype,
            avatar: cleanAvatar
          };
          return res.status(201).json({
            success: true,
            provider: 'supabase',
            message: 'Devotee account registered with Supabase! Welcome to Sharodiya 🌺',
            user: userObj,
            token: data.session?.access_token || db.createSessionToken(userObj)
          });
        }
      } catch (sbErr) {
        console.warn('[Supabase Backend] Fallback to local DB:', sbErr.message);
      }
    }

    // Local DB Creation
    const user = db.createUser({
      name: cleanName,
      email: cleanEmail,
      password,
      archetype: cleanArchetype,
      avatar: cleanAvatar
    });

    const token = db.createSessionToken(user);

    return res.status(201).json({
      success: true,
      provider: 'supabase-compatible',
      message: 'Devotee account registered successfully! Welcome to Sharodiya 🌺',
      user,
      token
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // If Supabase is configured, try Supabase sign in
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
        if (!error && data?.user) {
          const userObj = {
            id: data.user.id,
            name: data.user.user_metadata?.name || 'Devotee',
            email: cleanEmail,
            archetype: data.user.user_metadata?.archetype || 'friends',
            avatar: data.user.user_metadata?.avatar || 'assets/logo.png'
          };
          return res.json({
            success: true,
            provider: 'supabase',
            message: `Welcome back, ${userObj.name}! 🪔`,
            user: userObj,
            token: data.session?.access_token
          });
        }
      } catch (sbErr) {
        console.warn('[Supabase Backend] Fallback to local login verification:', sbErr.message);
      }
    }

    const user = db.verifyUserPassword(cleanEmail, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password. Please try again.' });
    }

    const token = db.createSessionToken(user);

    return res.json({
      success: true,
      provider: 'supabase-compatible',
      message: `Welcome back, ${user.name}! 🪔`,
      user,
      token
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication token required.' });
    }

    // Check Supabase token verification
    if (supabase) {
      try {
        const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
        if (!error && sbUser) {
          return res.json({
            success: true,
            provider: 'supabase',
            user: {
              id: sbUser.id,
              name: sbUser.user_metadata?.name || 'Devotee',
              email: sbUser.email,
              archetype: sbUser.user_metadata?.archetype || 'friends',
              avatar: sbUser.user_metadata?.avatar || 'assets/logo.png'
            }
          });
        }
      } catch (sbErr) {}
    }

    const user = db.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid token.' });
    }

    return res.json({
      success: true,
      provider: 'supabase-compatible',
      user
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  try {
    const token = getBearerToken(req);
    if (token) {
      db.invalidateToken(token);
    }
    return res.json({
      success: true,
      message: 'Signed out successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication token required.' });
    }

    const user = db.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid token.' });
    }

    const updated = db.updateUserProfile(user.id, req.body);
    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

