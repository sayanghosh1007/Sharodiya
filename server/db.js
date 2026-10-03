import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const AUTH_SECRET = process.env.JWT_SECRET || 'sharodiya_festive_auth_secret_2026';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB Schema
const DEFAULT_DB = {
  users: {},
  tokens: {},
  parikramas: {},
  squads: {},
  crowdReports: {},
  reviews: []
};

class Database {
  constructor() {
    this.db = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_DB,
          ...parsed,
          users: parsed.users || {},
          tokens: parsed.tokens || {}
        };
      }
    } catch (err) {
      console.warn('[DB] Failed to load database file, creating fresh default:', err.message);
    }
    const initial = { ...DEFAULT_DB };
    this.saveDirect(initial);
    return initial;
  }

  saveDirect(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to write database file:', err.message);
    }
  }

  save() {
    this.saveDirect(this.db);
  }

  // --- PARIKRAMA METHODS ---
  getParikrama(id) {
    return this.db.parikramas[id] || null;
  }

  saveParikrama(id, payload) {
    const existing = this.db.parikramas[id] || {};
    const now = new Date().toISOString();
    const entry = {
      ...existing,
      ...payload,
      id,
      updatedAt: now,
      createdAt: existing.createdAt || now
    };
    this.db.parikramas[id] = entry;
    this.save();
    return entry;
  }

  listParikramas() {
    return Object.values(this.db.parikramas);
  }

  // --- SQUAD METHODS ---
  getSquad(code) {
    const normalized = String(code).toUpperCase().trim();
    return this.db.squads[normalized] || null;
  }

  createSquad(code, data = {}) {
    const normalized = String(code).toUpperCase().trim();
    const now = new Date().toISOString();
    const squad = {
      code: normalized,
      name: data.name || `Squad ${normalized}`,
      archetype: data.archetype || 'friends',
      members: data.members || ['Captain (You)'],
      checkins: data.checkins || [],
      sharedRoute: data.sharedRoute || [],
      createdAt: now,
      updatedAt: now
    };
    this.db.squads[normalized] = squad;
    this.save();
    return squad;
  }

  joinSquad(code, memberName) {
    const squad = this.getSquad(code);
    if (!squad) return null;
    if (memberName && !squad.members.includes(memberName)) {
      squad.members.push(memberName);
      squad.updatedAt = new Date().toISOString();
      this.save();
    }
    return squad;
  }

  addSquadCheckin(code, checkinData) {
    const squad = this.getSquad(code);
    if (!squad) return null;
    const checkin = {
      id: 'chk_' + Date.now(),
      entityType: checkinData.entityType || 'pandal', // 'pandal' | 'eatery'
      entityId: checkinData.entityId,
      entityName: checkinData.entityName,
      memberName: checkinData.memberName || 'Squad Member',
      note: checkinData.note || '',
      checkedInAt: new Date().toISOString()
    };
    squad.checkins.unshift(checkin);
    squad.updatedAt = new Date().toISOString();
    this.save();
    return checkin;
  }

  // --- CROWD REPORT METHODS ---
  addCrowdReport(pandalId, report) {
    if (!this.db.crowdReports[pandalId]) {
      this.db.crowdReports[pandalId] = [];
    }
    const newReport = {
      id: 'cr_' + Date.now(),
      pandalId,
      crowdLevel: report.crowdLevel || 'Moderate', // 'Low', 'Moderate', 'High', 'Peak'
      waitMinutes: parseInt(report.waitMinutes || '20', 10),
      note: report.note || '',
      reportedBy: report.reportedBy || 'Devotee',
      reportedAt: new Date().toISOString()
    };
    this.db.crowdReports[pandalId].unshift(newReport);
    // Keep max 50 recent reports per pandal
    if (this.db.crowdReports[pandalId].length > 50) {
      this.db.crowdReports[pandalId] = this.db.crowdReports[pandalId].slice(0, 50);
    }
    this.save();
    return newReport;
  }

  getCrowdReports(pandalId) {
    return this.db.crowdReports[pandalId] || [];
  }

  getLiveCrowdSummary(pandalId) {
    const reports = this.getCrowdReports(pandalId);
    if (reports.length === 0) return null;
    const latest = reports[0];
    const avgWait = Math.round(
      reports.slice(0, 5).reduce((acc, r) => acc + r.waitMinutes, 0) / Math.min(reports.length, 5)
    );
    return {
      currentLevel: latest.crowdLevel,
      estimatedWaitMinutes: avgWait,
      totalReports: reports.length,
      lastReportedAt: latest.reportedAt
    };
  }

  // --- REVIEWS METHODS ---
  addReview(reviewData) {
    const review = {
      id: 'rev_' + Date.now(),
      entityType: reviewData.entityType || 'pandal',
      entityId: reviewData.entityId,
      rating: parseFloat(reviewData.rating || 5),
      comment: reviewData.comment || '',
      userName: reviewData.userName || 'Devotee',
      createdAt: new Date().toISOString()
    };
    this.db.reviews.unshift(review);
    this.save();
    return review;
  }

  getReviews(entityId) {
    return this.db.reviews.filter(r => r.entityId === entityId);
  }

  // --- USER AUTHENTICATION METHODS ---
  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  createUser({ name, email, password, archetype = 'friends', avatar = '' }) {
    const normalizedEmail = String(email).toLowerCase().trim();
    if (this.getUserByEmail(normalizedEmail)) {
      throw new Error('An account with this email already exists.');
    }
    const id = 'usr_' + crypto.randomBytes(6).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);
    const now = new Date().toISOString();

    const user = {
      id,
      name: name.trim(),
      email: normalizedEmail,
      salt,
      passwordHash,
      archetype: archetype || 'friends',
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`,
      savedPlans: [],
      createdAt: now,
      updatedAt: now
    };

    if (!this.db.users) this.db.users = {};
    this.db.users[id] = user;
    this.save();
    return this.sanitizeUser(user);
  }

  getUserByEmail(email) {
    if (!email || !this.db.users) return null;
    const normalized = String(email).toLowerCase().trim();
    return Object.values(this.db.users).find(u => u.email === normalized) || null;
  }

  getUserById(id) {
    if (!id || !this.db.users) return null;
    return this.db.users[id] || null;
  }

  verifyUserPassword(email, password) {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    const hash = this.hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return null;
    return this.sanitizeUser(user);
  }

  createSessionToken(user) {
    const token = 'stk_' + crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    if (!this.db.tokens) this.db.tokens = {};
    this.db.tokens[token] = {
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt
    };
    this.save();
    return token;
  }

  getUserByToken(token) {
    if (!token || !this.db.tokens) return null;
    const session = this.db.tokens[token];
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      delete this.db.tokens[token];
      this.save();
      return null;
    }
    const user = this.getUserById(session.userId);
    return user ? this.sanitizeUser(user) : null;
  }

  invalidateToken(token) {
    if (token && this.db.tokens && this.db.tokens[token]) {
      delete this.db.tokens[token];
      this.save();
      return true;
    }
    return false;
  }

  updateUserProfile(userId, updates = {}) {
    const user = this.getUserById(userId);
    if (!user) return null;
    if (updates.name) user.name = updates.name.trim();
    if (updates.archetype) user.archetype = updates.archetype;
    if (updates.avatar) user.avatar = updates.avatar;
    user.updatedAt = new Date().toISOString();
    this.save();
    return this.sanitizeUser(user);
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { salt, passwordHash, ...safe } = user;
    return safe;
  }
}

export const db = new Database();
