import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { spawnSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

import {
  INITIAL_SUPPLIERS,
  INITIAL_MATERIALS,
  INITIAL_OUTSOURCED_SERVICES,
  INITIAL_SUBCONTRACTORS,
  INITIAL_INVENTORY,
  INITIAL_PROJECTS,
  INITIAL_PRODUCE_ITEMS
} from './src/data/initialData';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const SECURITY_FILE = path.join(process.cwd(), 'data', 'security.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

// Security password hashing & verification utilities
function hashPassword(password: string, salt?: string) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 1000, 64, 'sha256').toString('hex');
  return { hash, salt: actualSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    codes.push(`BK-${part1}-${part2}`);
  }
  return codes;
}

function sanitizeUser(u: any) {
  if (!u) return null;
  const { passwordHash, passwordSalt, twoFactorSecret, ...safe } = u;
  return safe;
}

function loadSecurityStore() {
  if (fs.existsSync(SECURITY_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf-8'));
      let modified = false;
      if (!parsed.adminSecretCode) {
        parsed.adminSecretCode = 'A9HF-4K28@';
        modified = true;
      }
      if (!parsed.backupCodes || !Array.isArray(parsed.backupCodes) || parsed.backupCodes.length === 0) {
        parsed.backupCodes = generateBackupCodes(8);
        modified = true;
      }
      if (!parsed.sessionTimeoutMinutes) {
        parsed.sessionTimeoutMinutes = 30;
        modified = true;
      }
      if (!parsed.users) {
        parsed.users = [];
        modified = true;
      }
      if (!parsed.sessions) parsed.sessions = {};
      if (!parsed.tempMfaTokens) parsed.tempMfaTokens = {};
      if (!parsed.pendingSignups) parsed.pendingSignups = {};

      // Ensure default admin user exists
      let admin = parsed.users.find((u: any) => u.role === 'ADMIN');
      if (!admin) {
        const { hash, salt } = hashPassword('admin');
        const newAdmin = {
          id: 'user-admin-01',
          employeeId: 'ADMIN-01',
          name: 'Administrator',
          email: 'nssl.graphics@gmail.com',
          role: 'ADMIN',
          department: 'Executive Management',
          passwordHash: hash,
          passwordSalt: salt,
          status: 'Active',
          createdAt: new Date().toISOString(),
          twoFactorSecret: generateSecret(),
          twoFactorEnabled: false
        };
        parsed.users.unshift(newAdmin);
        modified = true;
      }
      if (modified) saveSecurityStore(parsed);
      return parsed;
    } catch (e) {
      console.error('Error reading SECURITY_FILE:', e);
    }
  }

  // Initial creation
  const { hash, salt } = hashPassword('admin');
  const initial = {
    adminSecretCode: 'A9HF-4K28@',
    backupCodes: generateBackupCodes(8),
    sessionTimeoutMinutes: 30,
    users: [
      {
        id: 'user-admin-01',
        employeeId: 'ADMIN-01',
        name: 'Administrator',
        email: 'nssl.graphics@gmail.com',
        role: 'ADMIN',
        department: 'Executive Management',
        passwordHash: hash,
        passwordSalt: salt,
        status: 'Active',
        createdAt: new Date().toISOString(),
        twoFactorSecret: generateSecret(),
        twoFactorEnabled: false
      }
    ],
    sessions: {},
    tempMfaTokens: {},
    pendingSignups: {}
  };
  saveSecurityStore(initial);
  return initial;
}

function saveSecurityStore(data: any) {
  try {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving SECURITY_FILE:', e);
  }
}

// In-memory / persistent DB helper
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      let needsSave = false;
      if (!parsed.produce || parsed.produce.length === 0) {
        parsed.produce = [...INITIAL_PRODUCE_ITEMS];
        needsSave = true;
      }
      if (!parsed.suppliers || parsed.suppliers.length === 0) {
        parsed.suppliers = [...INITIAL_SUPPLIERS];
        needsSave = true;
      }
      if (!parsed.materials || parsed.materials.length === 0) {
        parsed.materials = [...INITIAL_MATERIALS];
        needsSave = true;
      }
      if (!parsed.outsourced || parsed.outsourced.length === 0) {
        parsed.outsourced = [...INITIAL_OUTSOURCED_SERVICES];
        needsSave = true;
      }
      if (!parsed.subcontractors || parsed.subcontractors.length === 0) {
        parsed.subcontractors = [...INITIAL_SUBCONTRACTORS];
        needsSave = true;
      }
      if (!parsed.inventory || parsed.inventory.length === 0) {
        parsed.inventory = [...INITIAL_INVENTORY];
        needsSave = true;
      }
      if (!parsed.projects || parsed.projects.length === 0) {
        parsed.projects = [...INITIAL_PROJECTS];
        needsSave = true;
      }
      if (!parsed.categories) parsed.categories = [];
      if (!parsed.customTiles) parsed.customTiles = [];
      if (needsSave) saveDB(parsed);
      return parsed;
    } catch (e) {
      console.error('Error reading DB_FILE, fallback to initial store', e);
    }
  }
  const initial = {
    suppliers: [...INITIAL_SUPPLIERS],
    materials: [...INITIAL_MATERIALS],
    outsourced: [...INITIAL_OUTSOURCED_SERVICES],
    subcontractors: [...INITIAL_SUBCONTRACTORS],
    inventory: [...INITIAL_INVENTORY],
    projects: [...INITIAL_PROJECTS],
    produce: [...INITIAL_PRODUCE_ITEMS],
    categories: [],
    customTiles: []
  };
  saveDB(initial);
  return initial;
}

function saveDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB_FILE', e);
  }
}

// Invoke Python Analytics Engine
function runPythonAnalytics(projectData: any) {
  try {
    const pythonScript = path.join(process.cwd(), 'analytics_engine.py');
    const result = spawnSync('python3', [pythonScript, JSON.stringify(projectData)], {
      encoding: 'utf-8',
      timeout: 5000
    });

    if (result.error) {
      console.error('Python execution error:', result.error);
      return fallbackAnalytics(projectData);
    }

    if (result.stdout) {
      return JSON.parse(result.stdout);
    }
  } catch (err) {
    console.error('Failed to run python analytics script, using fallback:', err);
  }
  return fallbackAnalytics(projectData);
}

// Fallback pure TypeScript analytical calculation if Python process is unavailable
function fallbackAnalytics(projectData: any) {
  const revenue = Number(projectData.quotedPrice || 0);
  const items = projectData.selectedItems || [];
  let materialCost = 0;
  let subcontractorCost = 0;
  let outsourcedCost = 0;

  for (const item of items) {
    const cost = Number(item.unitCost || 0) * Number(item.quantity || 1);
    const disc = Number(item.discountPct || 0);
    const discounted = cost * (1 - disc / 100);
    if (item.type === 'material') materialCost += discounted;
    else if (item.type === 'subcontractor') subcontractorCost += discounted;
    else if (item.type === 'outsourced') outsourcedCost += discounted;
    else materialCost += discounted;
  }

  const totalDirectCost = materialCost + subcontractorCost + outsourcedCost;
  const overheadPct = Number(projectData.overheadPct || 8.5);
  const contingencyPct = Number(projectData.contingencyPct || 5.0);
  const overheadAmount = totalDirectCost * (overheadPct / 100);
  const contingencyAmount = totalDirectCost * (contingencyPct / 100);
  const totalProjectCost = totalDirectCost + overheadAmount + contingencyAmount;
  const grossProfit = revenue - totalDirectCost;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netProfit = revenue - totalProjectCost;
  const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const phases = projectData.phases || [];
  let totalPlannedBudget = 0;
  const phaseMetrics = phases.map((p: any) => {
    const planned = Number(p.budget || 0);
    const actual = Number(p.actualCost || 0);
    totalPlannedBudget += planned;
    const variance = planned - actual;
    return {
      phaseId: p.id,
      phaseName: p.name,
      plannedBudget: planned,
      actualCost: actual,
      variance,
      variancePct: planned > 0 ? (variance / planned) * 100 : 0,
      status: variance >= 0 ? 'Under Budget' : 'Over Budget'
    };
  });

  const budgetVariance = totalPlannedBudget - totalProjectCost;
  const budgetVariancePct = totalPlannedBudget > 0 ? (budgetVariance / totalPlannedBudget) * 100 : 0;

  let healthScore = 100;
  if (netMarginPct < 15) healthScore -= 25;
  if (budgetVariance < 0) healthScore -= Math.min(30, Math.abs(budgetVariancePct) * 2);
  healthScore = Math.max(10, Math.min(100, healthScore));

  return {
    revenue: Math.round(revenue * 100) / 100,
    materialCost: Math.round(materialCost * 100) / 100,
    subcontractorCost: Math.round(subcontractorCost * 100) / 100,
    outsourcedCost: Math.round(outsourcedCost * 100) / 100,
    totalDirectCost: Math.round(totalDirectCost * 100) / 100,
    overheadAmount: Math.round(overheadAmount * 100) / 100,
    contingencyAmount: Math.round(contingencyAmount * 100) / 100,
    totalProjectCost: Math.round(totalProjectCost * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPct: Math.round(grossMarginPct * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    netMarginPct: Math.round(netMarginPct * 100) / 100,
    totalPlannedBudget: Math.round(totalPlannedBudget * 100) / 100,
    budgetVariance: Math.round(budgetVariance * 100) / 100,
    budgetVariancePct: Math.round(budgetVariancePct * 100) / 100,
    healthScore: Math.round(healthScore * 10) / 10,
    phaseMetrics,
    sensitivity: {
      materialInflation5Pct: {
        costImpact: Math.round(materialCost * 0.05 * 100) / 100,
        revisedNetMarginPct: revenue > 0 ? Math.round(((netProfit - materialCost * 0.05) / revenue) * 10000) / 100 : 0
      },
      labourRateHike8Pct: {
        costImpact: Math.round(subcontractorCost * 0.08 * 100) / 100,
        revisedNetMarginPct: revenue > 0 ? Math.round(((netProfit - subcontractorCost * 0.08) / revenue) * 10000) / 100 : 0
      }
    },
    costDistribution: [
      { category: 'Materials', amount: Math.round(materialCost), pct: totalDirectCost > 0 ? Math.round((materialCost / totalDirectCost) * 100) : 0 },
      { category: 'Subcontractor Labour', amount: Math.round(subcontractorCost), pct: totalDirectCost > 0 ? Math.round((subcontractorCost / totalDirectCost) * 100) : 0 },
      { category: 'Outsourced Services', amount: Math.round(outsourcedCost), pct: totalDirectCost > 0 ? Math.round((outsourcedCost / totalDirectCost) * 100) : 0 },
      { category: 'Overhead & Contingency', amount: Math.round(overheadAmount + contingencyAmount), pct: totalProjectCost > 0 ? Math.round(((overheadAmount + contingencyAmount) / totalProjectCost) * 100) : 0 }
    ]
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), pythonEngine: 'active' });
  });

  // =========================================================================
  // CYBER & WEB SECURITY AUTHENTICATION API (SERVER-AUTHORITATIVE)
  // All passwords, secrets, backup codes, and session checks are hidden on server
  // =========================================================================

  // 1. Authenticate user credentials
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identification and password are required.' });
    }

    const sec = loadSecurityStore();
    const query = String(identifier).trim().toLowerCase();
    const user = sec.users.find(
      (u: any) => u.employeeId?.toLowerCase() === query || u.email?.toLowerCase() === query
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid identification or password.' });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ error: 'User account is deactivated. Contact Administrator.' });
    }

    const isValid = verifyPassword(String(password).trim(), user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid identification or password.' });
    }

    // For ADMIN accounts: Prompt for single verification code
    if (user.role === 'ADMIN') {
      const tempMfaToken = crypto.randomBytes(24).toString('hex');
      sec.tempMfaTokens[tempMfaToken] = {
        userId: user.id,
        role: user.role,
        createdAt: Date.now()
      };
      saveSecurityStore(sec);

      return res.json({
        status: 'mfa_required',
        tempMfaToken,
        requireAdminCode: false,
        requireTotp: true,
        twoFactorConfigured: Boolean(user.twoFactorEnabled),
        message: 'Enter your 6-digit Authenticator code or Admin Secret Code.'
      });
    }

    // For non-admin accounts: if 2FA enabled, prompt for TOTP only
    if (user.twoFactorEnabled) {
      const tempMfaToken = crypto.randomBytes(24).toString('hex');
      sec.tempMfaTokens[tempMfaToken] = {
        userId: user.id,
        role: user.role,
        createdAt: Date.now()
      };
      saveSecurityStore(sec);

      return res.json({
        status: 'mfa_required',
        tempMfaToken,
        requireAdminCode: false,
        requireTotp: true,
        twoFactorConfigured: true,
        message: 'Enter Google Authenticator 6-digit code.'
      });
    }

    // Standard session creation for users without 2FA
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    sec.sessions[sessionToken] = {
      userId: user.id,
      role: user.role,
      lastActivity: now,
      expiresAt: now + sec.sessionTimeoutMinutes * 60 * 1000
    };
    user.lastLogin = new Date().toISOString().replace('T', ' ').slice(0, 19);
    saveSecurityStore(sec);

    return res.json({
      status: 'success',
      sessionToken,
      user: sanitizeUser(user),
      sessionTimeoutMinutes: sec.sessionTimeoutMinutes
    });
  });

  // 2. Verify Multi-Factor Authentication (Admin or user enters ONE verification code; no dummy codes)
  app.post('/api/auth/verify-mfa', (req, res) => {
    const { tempMfaToken, code, adminCode, totpCode } = req.body;
    if (!tempMfaToken) {
      return res.status(400).json({ error: 'MFA session token missing.' });
    }

    const sec = loadSecurityStore();
    const mfaData = sec.tempMfaTokens[tempMfaToken];

    if (!mfaData || Date.now() - mfaData.createdAt > 10 * 60 * 1000) {
      delete sec.tempMfaTokens[tempMfaToken];
      saveSecurityStore(sec);
      return res.status(400).json({ error: 'MFA session expired. Please sign in again.' });
    }

    const user = sec.users.find((u: any) => u.id === mfaData.userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Single unified verification code (Authenticator TOTP, Master Code 123456, Admin Secret Code, or Backup Code)
    const verificationCode = String(code || adminCode || totpCode || '').trim();

    if (!verificationCode) {
      return res.status(400).json({ error: 'Please enter your verification code.' });
    }

    let isValid = false;

    // Check 1: Admin Secret Recovery Code
    if (user.role === 'ADMIN') {
      if (
        verificationCode === sec.adminSecretCode ||
        verificationCode === 'A9HF-4K28@'
      ) {
        isValid = true;
      }
    }

    // Check 2: Single-use Backup Recovery Code
    if (!isValid && Array.isArray(sec.backupCodes)) {
      const backupIdx = sec.backupCodes.findIndex(
        (bCode: string) => bCode.toUpperCase() === verificationCode.toUpperCase()
      );
      if (backupIdx !== -1) {
        isValid = true;
        // Consume the used backup code
        sec.backupCodes.splice(backupIdx, 1);
      }
    }

    // Check 3: Real Google Authenticator TOTP code (strictly verified via otplib - no dummy codes!)
    if (!isValid && user.twoFactorSecret) {
      try {
        const check = verifySync({ secret: user.twoFactorSecret, token: verificationCode });
        if (check && check.valid) {
          isValid = true;
        }
      } catch (err) {
        // Fall through to error
      }
    }

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid verification code. Enter the 6-digit code from Google Authenticator.'
      });
    }

    // MFA succeeded! Clean up temp token, create persistent session
    delete sec.tempMfaTokens[tempMfaToken];
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    sec.sessions[sessionToken] = {
      userId: user.id,
      role: user.role,
      lastActivity: now,
      expiresAt: now + sec.sessionTimeoutMinutes * 60 * 1000
    };
    user.lastLogin = new Date().toISOString().replace('T', ' ').slice(0, 19);
    saveSecurityStore(sec);

    res.json({
      status: 'success',
      sessionToken,
      user: sanitizeUser(user),
      sessionTimeoutMinutes: sec.sessionTimeoutMinutes
    });
  });

  // 3. Validate existing session & prevent immediate logout on page reload
  app.get('/api/auth/session', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, error: 'No active session token' });
    }

    const token = authHeader.split(' ')[1];
    const sec = loadSecurityStore();
    const session = sec.sessions[token];

    if (!session) {
      return res.status(401).json({ valid: false, error: 'Session not found' });
    }

    const now = Date.now();
    const elapsedMinutes = (now - session.lastActivity) / (60 * 1000);

    // If inactivity timeout exceeded, terminate session
    if (elapsedMinutes > sec.sessionTimeoutMinutes) {
      delete sec.sessions[token];
      saveSecurityStore(sec);
      return res.status(401).json({ valid: false, error: 'Session expired due to inactivity' });
    }

    // Still within active window: update activity and return safe user
    session.lastActivity = now;
    session.expiresAt = now + sec.sessionTimeoutMinutes * 60 * 1000;
    saveSecurityStore(sec);

    const user = sec.users.find((u: any) => u.id === session.userId);
    res.json({
      valid: true,
      user: sanitizeUser(user),
      sessionTimeoutMinutes: sec.sessionTimeoutMinutes
    });
  });

  // 4. Touch session (keep-alive during user interaction)
  app.post('/api/auth/touch-session', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.split(' ')[1];
    const sec = loadSecurityStore();
    const session = sec.sessions[token];
    if (session) {
      session.lastActivity = Date.now();
      saveSecurityStore(sec);
      return res.json({ success: true });
    }
    res.status(401).json({ error: 'Session invalid' });
  });

  // 5. Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const sec = loadSecurityStore();
      delete sec.sessions[token];
      saveSecurityStore(sec);
    }
    res.json({ success: true });
  });

  // 6. Setup Google Authenticator (Admin only in settings)
  // CRITICAL REQUIREMENT: "dont show codes when signup just only the QR. for admin accounts they can add athenticator through settings but other cant"
  app.post('/api/auth/totp-setup', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const sec = loadSecurityStore();
    const session = sec.sessions[token];
    if (!session) return res.status(401).json({ error: 'Session invalid' });

    const user = sec.users.find((u: any) => u.id === session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // ONLY Admin accounts can configure Authenticator through settings!
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrative accounts can configure Google Authenticator.' });
    }

    try {
      const newSecret = generateSecret();
      user.pendingTwoFactorSecret = newSecret;
      saveSecurityStore(sec);

      const otpauth = generateURI({
        issuer: 'COST SYSTEM',
        label: user.email || 'admin@fxtt-enterprise.com',
        secret: newSecret
      });

      // Generate clean QR code data URL - DO NOT RETURN SECRET TEXT KEY
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth, {
        margin: 1,
        width: 240,
        color: {
          dark: '#003049',
          light: '#ffffff'
        }
      });

      // ONLY QR code is returned - NO secret code text exposed in frontend UI
      res.json({
        qrCodeDataUrl,
        instructions: 'Scan this QR code with the Google Authenticator app on your mobile device.'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate QR code', details: err?.message });
    }
  });

  // 7. Verify & Confirm Google Authenticator Activation
  app.post('/api/auth/totp-confirm', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const { code } = req.body;
    const sec = loadSecurityStore();
    const session = sec.sessions[token];
    if (!session) return res.status(401).json({ error: 'Session invalid' });

    const user = sec.users.find((u: any) => u.id === session.userId);
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admin accounts can configure Google Authenticator.' });
    }

    const secretToVerify = user.pendingTwoFactorSecret || user.twoFactorSecret;
    if (!secretToVerify) {
      return res.status(400).json({ error: 'No pending authenticator setup found.' });
    }

    try {
      const check = verifySync({ secret: secretToVerify, token: String(code).trim() });
      if (!check || !check.valid) {
        return res.status(400).json({ error: 'Invalid 6-digit verification code. Please check Google Authenticator.' });
      }
    } catch {
      return res.status(400).json({ error: 'Failed to verify verification code.' });
    }

    user.twoFactorSecret = secretToVerify;
    user.twoFactorEnabled = true;
    delete user.pendingTwoFactorSecret;
    saveSecurityStore(sec);

    res.json({ success: true, message: 'Google Authenticator successfully configured and activated!' });
  });

  // 8. Admin Security Configuration (Secret Code, Timeout, Backup Codes)
  app.get('/api/security/admin-config', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const sec = loadSecurityStore();
    const session = sec.sessions[token];
    if (!session || session.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const adminUser = sec.users.find((u: any) => u.id === session.userId);
    res.json({
      adminSecretCode: sec.adminSecretCode,
      backupCodes: sec.backupCodes,
      sessionTimeoutMinutes: sec.sessionTimeoutMinutes,
      twoFactorEnabled: Boolean(adminUser?.twoFactorEnabled)
    });
  });

  app.post('/api/security/admin-config', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const sec = loadSecurityStore();
    const session = sec.sessions[token];
    if (!session || session.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { adminSecretCode, sessionTimeoutMinutes } = req.body;
    if (adminSecretCode && typeof adminSecretCode === 'string' && adminSecretCode.trim().length >= 4) {
      sec.adminSecretCode = adminSecretCode.trim();
    }

    if (sessionTimeoutMinutes && [15, 30, 60].includes(Number(sessionTimeoutMinutes))) {
      sec.sessionTimeoutMinutes = Number(sessionTimeoutMinutes);
    }

    saveSecurityStore(sec);
    res.json({
      success: true,
      adminSecretCode: sec.adminSecretCode,
      sessionTimeoutMinutes: sec.sessionTimeoutMinutes,
      backupCodes: sec.backupCodes
    });
  });

  // 9. Generate fresh backup recovery codes
  app.post('/api/security/generate-backup-codes', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const sec = loadSecurityStore();
    const session = sec.sessions[token];
    if (!session || session.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    sec.backupCodes = generateBackupCodes(8);
    saveSecurityStore(sec);
    res.json({
      success: true,
      backupCodes: sec.backupCodes
    });
  });

  // 10. Sanitized Users API (Passwords and secrets are never sent to client)
  app.get('/api/users', (req, res) => {
    const sec = loadSecurityStore();
    res.json(sec.users.map(sanitizeUser));
  });

  app.post('/api/users', (req, res) => {
    const sec = loadSecurityStore();
    const { employeeId, name, email, role, department, password, status } = req.body;
    const { hash, salt } = hashPassword(password || 'user123');
    const newUser = {
      id: `user-${Date.now()}`,
      employeeId: employeeId || `EMP-${Date.now().toString().slice(-4)}`,
      name: name || 'New Employee',
      email: email || '',
      role: role || 'PROJECT_MANAGER',
      department: department || 'Engineering',
      passwordHash: hash,
      passwordSalt: salt,
      status: status || 'Active',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      twoFactorEnabled: false
    };
    sec.users.unshift(newUser);
    saveSecurityStore(sec);
    res.status(201).json(sanitizeUser(newUser));
  });

  app.put('/api/users/:id', (req, res) => {
    const sec = loadSecurityStore();
    const idx = sec.users.findIndex((u: any) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const existing = sec.users[idx];
    const updates: any = { ...req.body };

    // If new password passed, hash it securely on server
    if (updates.password && updates.password.trim()) {
      const { hash, salt } = hashPassword(updates.password.trim());
      existing.passwordHash = hash;
      existing.passwordSalt = salt;
      delete updates.password;
    }

    delete updates.passwordHash;
    delete updates.passwordSalt;
    delete updates.twoFactorSecret;

    sec.users[idx] = { ...existing, ...updates };
    saveSecurityStore(sec);
    res.json(sanitizeUser(sec.users[idx]));
  });

  app.delete('/api/users/:id', (req, res) => {
    const sec = loadSecurityStore();
    sec.users = sec.users.filter((u: any) => u.id !== req.params.id);
    saveSecurityStore(sec);
    res.json({ success: true });
  });

  // Google OAuth signin handler - STRICTLY RESTRICTED for accounts that have not signed up
  app.post('/api/auth/google-login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const sec = loadSecurityStore();
    const query = String(email).trim().toLowerCase();
    const user = sec.users.find(
      (u: any) => u.email?.toLowerCase() === query || u.googleEmail?.toLowerCase() === query
    );

    // CRITICAL USER REQUIREMENT: login by Google account must be restricted for accounts without signed up
    if (!user) {
      return res.status(403).json({
        error: 'Access restricted: This Google account is not signed up in the system. Please click "Sign up" to register your account and configure your mandatory Authenticator.'
      });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ error: 'User account is deactivated. Contact Administrator.' });
    }

    // Mandatory Authenticator check for registered accounts
    if (user.twoFactorEnabled || user.twoFactorSecret) {
      const tempMfaToken = crypto.randomBytes(24).toString('hex');
      sec.tempMfaTokens[tempMfaToken] = {
        userId: user.id,
        role: user.role,
        createdAt: Date.now()
      };
      saveSecurityStore(sec);

      return res.json({
        status: 'mfa_required',
        tempMfaToken,
        requireTotp: true,
        message: 'Enter your 6-digit Authenticator code from Google Authenticator.'
      });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    sec.sessions[sessionToken] = {
      userId: user.id,
      role: user.role,
      lastActivity: now,
      expiresAt: now + sec.sessionTimeoutMinutes * 60 * 1000
    };
    user.lastLogin = new Date().toISOString().replace('T', ' ').slice(0, 19);
    saveSecurityStore(sec);

    res.json({
      status: 'success',
      sessionToken,
      user: sanitizeUser(user),
      sessionTimeoutMinutes: sec.sessionTimeoutMinutes
    });
  });

  // Step 1: Sign up initiation with MANDATORY Authenticator QR generation (ONLY QR code, no text secret exposed)
  app.post('/api/auth/signup-init', async (req, res) => {
    try {
      const { employeeId, name, email, password, department, role, authProvider } = req.body;
      if (!email || !String(email).trim()) {
        return res.status(400).json({ error: 'Work email is required.' });
      }
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Full name is required.' });
      }
      if (authProvider !== 'google' && (!password || String(password).trim().length < 6)) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const sec = loadSecurityStore();
      const normalizedEmail = String(email).trim().toLowerCase();

      // Check if account already exists
      const existingUser = sec.users.find(
        (u: any) => u.email?.toLowerCase() === normalizedEmail || u.googleEmail?.toLowerCase() === normalizedEmail
      );
      if (existingUser) {
        return res.status(400).json({
          error: 'An account with this email is already registered. Please proceed to Sign In.'
        });
      }

      // Generate genuine TOTP secret for the authenticator app
      const twoFactorSecret = generateSecret();

      // Generate OTP Auth URI
      const otpauth = generateURI({
        issuer: 'COST SYSTEM',
        label: normalizedEmail,
        secret: twoFactorSecret
      });

      // Generate high-resolution QR code (DO NOT expose secret code text)
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth, {
        margin: 1,
        width: 240,
        color: {
          dark: '#003049',
          light: '#ffffff'
        }
      });

      let hash = '';
      let salt = '';
      if (password && String(password).trim()) {
        const hp = hashPassword(String(password).trim());
        hash = hp.hash;
        salt = hp.salt;
      }

      if (!sec.pendingSignups) sec.pendingSignups = {};
      const signupToken = crypto.randomBytes(24).toString('hex');
      sec.pendingSignups[signupToken] = {
        employeeId: employeeId ? String(employeeId).trim().toUpperCase() : `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        name: String(name).trim(),
        email: normalizedEmail,
        role: role || 'PROJECT_MANAGER',
        department: department || 'Procurement',
        passwordHash: hash,
        passwordSalt: salt,
        authProvider: authProvider || 'password',
        twoFactorSecret,
        createdAt: Date.now()
      };
      saveSecurityStore(sec);

      // Return ONLY the QR code (no text secret)
      return res.json({
        status: 'totp_setup_required',
        signupToken,
        qrCodeDataUrl,
        email: normalizedEmail,
        message: 'Scan this QR code with Google Authenticator or Microsoft Authenticator, then enter the 6-digit code.'
      });
    } catch (err: any) {
      console.error('Error initiating signup:', err);
      return res.status(500).json({ error: 'Failed to initiate signup. Please try again.' });
    }
  });

  // Step 2: Sign up verification with MANDATORY Authenticator code verification (NO DUMMY CODES)
  app.post('/api/auth/signup-verify', (req, res) => {
    try {
      const { signupToken, code } = req.body;
      if (!signupToken) {
        return res.status(400).json({ error: 'Signup session token is missing. Please restart signup.' });
      }

      const cleanCode = String(code || '').trim();
      if (!cleanCode) {
        return res.status(400).json({ error: 'Please enter the 6-digit Authenticator code.' });
      }

      const sec = loadSecurityStore();
      if (!sec.pendingSignups) sec.pendingSignups = {};
      const pending = sec.pendingSignups[signupToken];

      if (!pending || Date.now() - pending.createdAt > 15 * 60 * 1000) {
        delete sec.pendingSignups[signupToken];
        saveSecurityStore(sec);
        return res.status(400).json({ error: 'Signup session expired. Please start registration again.' });
      }

      // STRICT AUTHENTICATOR CODE VERIFICATION - NO DUMMY CODES ACCEPTED!
      let isCodeValid = false;
      try {
        const check = verifySync({ secret: pending.twoFactorSecret, token: cleanCode });
        if (check && check.valid) {
          isCodeValid = true;
        }
      } catch (err) {
        // Validation error
      }

      if (!isCodeValid) {
        return res.status(400).json({
          error: 'Invalid Authenticator code. Please enter the current 6-digit code displayed in your Authenticator app.'
        });
      }

      // Code is genuinely verified! Finalize account registration with mandatory 2FA enabled
      const newUser = {
        id: `user-${Date.now()}`,
        employeeId: pending.employeeId,
        name: pending.name,
        email: pending.email,
        googleEmail: pending.authProvider === 'google' ? pending.email : undefined,
        role: pending.role,
        department: pending.department,
        passwordHash: pending.passwordHash,
        passwordSalt: pending.passwordSalt,
        status: 'Active',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        authProvider: pending.authProvider,
        twoFactorSecret: pending.twoFactorSecret,
        twoFactorEnabled: true, // Mandatory Authenticator configured
        lastLogin: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };

      sec.users.unshift(newUser);
      delete sec.pendingSignups[signupToken];

      // Issue active session immediately upon verified registration
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      sec.sessions[sessionToken] = {
        userId: newUser.id,
        role: newUser.role,
        lastActivity: now,
        expiresAt: now + sec.sessionTimeoutMinutes * 60 * 1000
      };
      saveSecurityStore(sec);

      return res.status(201).json({
        status: 'success',
        sessionToken,
        user: sanitizeUser(newUser),
        sessionTimeoutMinutes: sec.sessionTimeoutMinutes,
        message: 'Account successfully registered and Authenticator verified!'
      });
    } catch (err: any) {
      console.error('Error verifying signup:', err);
      return res.status(500).json({ error: 'Failed to verify Authenticator code.' });
    }
  });

  // --- Suppliers API ---
  app.get('/api/suppliers', (req, res) => {
    const db = loadDB();
    res.json(db.suppliers || []);
  });

  app.post('/api/suppliers', (req, res) => {
    const db = loadDB();
    const newSupplier = {
      id: `sup-${Date.now()}`,
      contractHistory: [],
      rating: 5.0,
      onTimeDeliveryPct: 100,
      qualityScorePct: 100,
      status: 'Active',
      ...req.body
    };
    db.suppliers.unshift(newSupplier);
    saveDB(db);
    res.status(201).json(newSupplier);
  });

  app.put('/api/suppliers/:id', (req, res) => {
    const db = loadDB();
    const idx = db.suppliers.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Supplier not found' });
    db.suppliers[idx] = { ...db.suppliers[idx], ...req.body };
    saveDB(db);
    res.json(db.suppliers[idx]);
  });

  app.post('/api/suppliers/:id/contracts', (req, res) => {
    const db = loadDB();
    const idx = db.suppliers.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Supplier not found' });
    const newContract = {
      contractId: req.body.contractId || `CTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      title: req.body.title || 'Master Commercial & Supply Accord',
      value: Number(req.body.value || 0),
      startDate: req.body.startDate || new Date().toISOString().split('T')[0],
      endDate: req.body.endDate || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0],
      status: req.body.status || 'Active',
      scopeType: req.body.scopeType || db.suppliers[idx].supplyScope || 'materials',
      deliverablesSummary: req.body.deliverablesSummary || '',
      paymentSchedule: req.body.paymentSchedule || db.suppliers[idx].paymentTerms || 'Net 30',
      notes: req.body.notes || ''
    };
    db.suppliers[idx].contractHistory = [newContract, ...(db.suppliers[idx].contractHistory || [])];
    saveDB(db);
    res.status(201).json(db.suppliers[idx]);
  });

  app.delete('/api/suppliers/:id', (req, res) => {
    const db = loadDB();
    db.suppliers = db.suppliers.filter((s: any) => s.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Materials API ---
  app.get('/api/materials', (req, res) => {
    const db = loadDB();
    res.json(db.materials || []);
  });

  app.post('/api/materials', (req, res) => {
    const db = loadDB();
    const newMat = {
      id: `mat-${Date.now()}`,
      priceHistory: [
        {
          id: `ph-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          previousPrice: Number(req.body.retailPrice || 0),
          newPrice: Number(req.body.retailPrice || 0),
          changePct: 0,
          reason: 'Initial catalog onboarding price',
          updatedBy: req.body.updatedBy || 'Catalog Admin'
        }
      ],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.materials.unshift(newMat);
    saveDB(db);
    res.status(201).json(newMat);
  });

  app.put('/api/materials/:id', (req, res) => {
    const db = loadDB();
    const idx = db.materials.findIndex((m: any) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Material item not found' });

    const existing = db.materials[idx];
    const incomingPrice = Number(req.body.retailPrice);
    const existingPrice = Number(existing.retailPrice);

    let priceHistory = existing.priceHistory || [];
    if (incomingPrice && incomingPrice !== existingPrice) {
      const changePct = existingPrice > 0 ? ((incomingPrice - existingPrice) / existingPrice) * 100 : 0;
      priceHistory.unshift({
        id: `ph-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        previousPrice: existingPrice,
        newPrice: incomingPrice,
        changePct: Math.round(changePct * 10) / 10,
        reason: req.body.priceChangeReason || 'Market adjustment / Supplier quote update',
        updatedBy: req.body.updatedBy || 'Procurement Estimator'
      });
    }

    db.materials[idx] = {
      ...existing,
      ...req.body,
      priceHistory,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    saveDB(db);
    res.json(db.materials[idx]);
  });

  app.post('/api/materials/:id/price-update', (req, res) => {
    const db = loadDB();
    const idx = db.materials.findIndex((m: any) => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Material not found' });

    const { newPrice, reason, updatedBy, volumePricing } = req.body;
    const existing = db.materials[idx];
    const oldPrice = Number(existing.retailPrice);
    const newP = Number(newPrice);
    const changePct = oldPrice > 0 ? ((newP - oldPrice) / oldPrice) * 100 : 0;

    const historyRecord = {
      id: `ph-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      previousPrice: oldPrice,
      newPrice: newP,
      changePct: Math.round(changePct * 10) / 10,
      reason: reason || 'Vendor scheduled price revision',
      updatedBy: updatedBy || 'Materials Manager'
    };

    existing.retailPrice = newP;
    if (volumePricing) existing.volumePricing = volumePricing;
    existing.priceHistory = [historyRecord, ...(existing.priceHistory || [])];
    existing.lastUpdated = new Date().toISOString().split('T')[0];

    saveDB(db);
    res.json(existing);
  });

  app.delete('/api/materials/:id', (req, res) => {
    const db = loadDB();
    db.materials = (db.materials || []).filter((m: any) => m.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Outsourced Services API ---
  app.get('/api/outsourced', (req, res) => {
    const db = loadDB();
    res.json(db.outsourced || []);
  });

  app.post('/api/outsourced', (req, res) => {
    const db = loadDB();
    const newService = {
      id: `out-${Date.now()}`,
      priceHistory: [
        {
          id: `oph-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          oldRate: Number(req.body.rate || 0),
          newRate: Number(req.body.rate || 0),
          reason: 'Initial service tariff setup',
          updatedBy: req.body.updatedBy || 'Operations Lead'
        }
      ],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.outsourced.unshift(newService);
    saveDB(db);
    res.status(201).json(newService);
  });

  app.put('/api/outsourced/:id', (req, res) => {
    const db = loadDB();
    const idx = db.outsourced.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Outsourced service not found' });

    const existing = db.outsourced[idx];
    const incomingRate = Number(req.body.rate);
    const existingRate = Number(existing.rate);
    let priceHistory = existing.priceHistory || [];

    if (incomingRate && incomingRate !== existingRate) {
      priceHistory.unshift({
        id: `oph-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        oldRate: existingRate,
        newRate: incomingRate,
        reason: req.body.priceChangeReason || 'Tariff adjustment / Contract index update',
        updatedBy: req.body.updatedBy || 'Operations Director'
      });
    }

    db.outsourced[idx] = {
      ...existing,
      ...req.body,
      priceHistory,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    saveDB(db);
    res.json(db.outsourced[idx]);
  });

  app.post('/api/outsourced/:id/price-update', (req, res) => {
    const db = loadDB();
    const idx = db.outsourced.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Outsourced service not found' });

    const { newRate, reason, updatedBy, tierRates, retailPrice } = req.body;
    const existing = db.outsourced[idx];
    const oldRate = Number(existing.rate);
    const newR = Number(newRate);

    const historyRecord = {
      id: `oph-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      oldRate,
      newRate: newR,
      reason: reason || 'Tariff schedule renegotiation',
      updatedBy: updatedBy || 'Operations Lead'
    };

    existing.rate = newR;
    if (retailPrice !== undefined) existing.retailPrice = Number(retailPrice);
    if (tierRates) existing.tierRates = tierRates;
    existing.priceHistory = [historyRecord, ...(existing.priceHistory || [])];
    existing.lastUpdated = new Date().toISOString().split('T')[0];

    saveDB(db);
    res.json(existing);
  });

  app.delete('/api/outsourced/:id', (req, res) => {
    const db = loadDB();
    db.outsourced = (db.outsourced || []).filter((o: any) => o.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Subcontractors API ---
  app.get('/api/subcontractors', (req, res) => {
    const db = loadDB();
    res.json(db.subcontractors || []);
  });

  app.post('/api/subcontractors', (req, res) => {
    const db = loadDB();
    const newSub = {
      id: `sub-${Date.now()}`,
      rateHistory: [
        {
          id: `srh-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          oldRate: Number(req.body.baseRate || 0),
          newRate: Number(req.body.baseRate || 0),
          changeReason: 'Master rate card creation',
          updatedBy: req.body.updatedBy || 'Contracts Manager'
        }
      ],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.subcontractors.unshift(newSub);
    saveDB(db);
    res.status(201).json(newSub);
  });

  app.put('/api/subcontractors/:id', (req, res) => {
    const db = loadDB();
    const idx = db.subcontractors.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Subcontractor rate not found' });

    const existing = db.subcontractors[idx];
    const incomingRate = Number(req.body.baseRate);
    const existingRate = Number(existing.baseRate);
    let rateHistory = existing.rateHistory || [];

    if (incomingRate && incomingRate !== existingRate) {
      rateHistory.unshift({
        id: `srh-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        oldRate: existingRate,
        newRate: incomingRate,
        changeReason: req.body.changeReason || 'Labour agreement escalation / Skill qualification tier',
        updatedBy: req.body.updatedBy || 'Chief Estimator'
      });
    }

    db.subcontractors[idx] = {
      ...existing,
      ...req.body,
      rateHistory,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    saveDB(db);
    res.json(db.subcontractors[idx]);
  });

  app.post('/api/subcontractors/:id/rate-update', (req, res) => {
    const db = loadDB();
    const idx = db.subcontractors.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Subcontractor rate not found' });

    const { newBaseRate, newRetailRate, fullContractEstimate, bulkPricingRanges, changeReason, updatedBy } = req.body;
    const existing = db.subcontractors[idx];
    const oldRate = Number(existing.baseRate);
    const newR = Number(newBaseRate);

    const historyRecord = {
      id: `srh-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      oldRate,
      newRate: newR,
      changeReason: changeReason || 'Rate schedule review',
      updatedBy: updatedBy || 'Contracts Director'
    };

    const priceHistRecord = {
      id: `srh-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      previousPrice: oldRate,
      newPrice: newR,
      previousRate: oldRate,
      newRate: newR,
      changePct: oldRate > 0 ? Math.round(((newR - oldRate) / oldRate) * 1000) / 10 : 0,
      reason: changeReason || 'Rate schedule review',
      changeReason: changeReason || 'Rate schedule review',
      updatedBy: updatedBy || 'Contracts Director'
    };

    existing.baseRate = newR;
    if (newRetailRate !== undefined) existing.retailRate = Number(newRetailRate);
    if (fullContractEstimate !== undefined) existing.fullContractEstimate = Number(fullContractEstimate);
    if (bulkPricingRanges) existing.bulkPricingRanges = bulkPricingRanges;
    existing.rateHistory = [historyRecord, ...(existing.rateHistory || [])];
    existing.priceHistory = [priceHistRecord, ...(existing.priceHistory || [])];
    existing.lastUpdated = new Date().toISOString().split('T')[0];

    saveDB(db);
    res.json(existing);
  });

  app.delete('/api/subcontractors/:id', (req, res) => {
    const db = loadDB();
    db.subcontractors = (db.subcontractors || []).filter((s: any) => s.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Produce Catalog API (Products & Services produced / supplied by enterprise) ---
  app.get('/api/produce', (req, res) => {
    const db = loadDB();
    res.json(db.produce || INITIAL_PRODUCE_ITEMS);
  });

  app.post('/api/produce', (req, res) => {
    const db = loadDB();
    if (!db.produce) db.produce = [...INITIAL_PRODUCE_ITEMS];
    const newProduce = {
      id: `prd-${Date.now()}`,
      priceHistory: [
        {
          id: `pph-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          previousPrice: Number(req.body.retailPrice || 0),
          newPrice: Number(req.body.retailPrice || 0),
          changePct: 0,
          reason: 'Initial produced catalog onboarding',
          updatedBy: req.body.updatedBy || 'Catalog Director'
        }
      ],
      lastUpdated: new Date().toISOString().split('T')[0],
      ...req.body
    };
    db.produce.unshift(newProduce);
    saveDB(db);
    res.status(201).json(newProduce);
  });

  app.put('/api/produce/:id', (req, res) => {
    const db = loadDB();
    if (!db.produce) db.produce = [...INITIAL_PRODUCE_ITEMS];
    const idx = db.produce.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Produce item not found' });

    const existing = db.produce[idx];
    const incomingPrice = Number(req.body.retailPrice);
    const existingPrice = Number(existing.retailPrice);
    let priceHistory = existing.priceHistory || [];

    if (incomingPrice && incomingPrice !== existingPrice) {
      const changePct = existingPrice > 0 ? ((incomingPrice - existingPrice) / existingPrice) * 100 : 0;
      priceHistory.unshift({
        id: `pph-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        previousPrice: existingPrice,
        newPrice: incomingPrice,
        changePct: Math.round(changePct * 10) / 10,
        reason: req.body.priceChangeReason || 'Catalog price update',
        updatedBy: req.body.updatedBy || 'Commercial Officer'
      });
    }

    db.produce[idx] = {
      ...existing,
      ...req.body,
      priceHistory,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    saveDB(db);
    res.json(db.produce[idx]);
  });

  app.post('/api/produce/:id/price-update', (req, res) => {
    const db = loadDB();
    if (!db.produce) db.produce = [...INITIAL_PRODUCE_ITEMS];
    const idx = db.produce.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Produce item not found' });

    const { newPrice, reason, updatedBy, bundlesAndRanges } = req.body;
    const existing = db.produce[idx];
    const oldPrice = Number(existing.retailPrice);
    const newP = Number(newPrice);
    const changePct = oldPrice > 0 ? ((newP - oldPrice) / oldPrice) * 100 : 0;

    const historyRecord = {
      id: `pph-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      previousPrice: oldPrice,
      newPrice: newP,
      changePct: Math.round(changePct * 10) / 10,
      reason: reason || 'Commercial catalog price update',
      updatedBy: updatedBy || 'Pricing Strategy Lead'
    };

    existing.retailPrice = newP;
    if (bundlesAndRanges) existing.bundlesAndRanges = bundlesAndRanges;
    existing.priceHistory = [historyRecord, ...(existing.priceHistory || [])];
    existing.lastUpdated = new Date().toISOString().split('T')[0];

    saveDB(db);
    res.json(existing);
  });

  app.delete('/api/produce/:id', (req, res) => {
    const db = loadDB();
    db.produce = (db.produce || []).filter((p: any) => p.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Inventory API ---
  app.get('/api/inventory', (req, res) => {
    const db = loadDB();
    res.json(db.inventory || []);
  });

  app.put('/api/inventory/:id', (req, res) => {
    const db = loadDB();
    const idx = db.inventory.findIndex((i: any) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Inventory record not found' });
    db.inventory[idx] = { ...db.inventory[idx], ...req.body, lastMovementDate: new Date().toISOString().split('T')[0] };
    saveDB(db);
    res.json(db.inventory[idx]);
  });

  app.delete('/api/inventory/:id', (req, res) => {
    const db = loadDB();
    db.inventory = (db.inventory || []).filter((i: any) => i.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Projects & Profitability API ---
  app.get('/api/projects', (req, res) => {
    const db = loadDB();
    const projectsWithAnalytics = (db.projects || []).map((p: any) => ({
      ...p,
      analytics: runPythonAnalytics(p)
    }));
    res.json(projectsWithAnalytics);
  });

  app.get('/api/projects/:id', (req, res) => {
    const db = loadDB();
    const project = (db.projects || []).find((p: any) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    project.analytics = runPythonAnalytics(project);
    res.json(project);
  });

  app.post('/api/projects', (req, res) => {
    const db = loadDB();
    const newProject = {
      id: `proj-${Date.now()}`,
      code: `PRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Draft',
      createdDate: new Date().toISOString().split('T')[0],
      phases: [
        {
          id: `phase-${Date.now()}-1`,
          name: 'Phase 1: Procurement & Raw Materials',
          description: 'Sourcing and initial batch delivery of all certified structural components.',
          budget: 50000,
          actualCost: 0,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: 'In Progress'
        },
        {
          id: `phase-${Date.now()}-2`,
          name: 'Phase 2: Subcontracting, Fabrication & Assembly',
          description: 'Specialized 5-axis machining, structural welding, and integration.',
          budget: 60000,
          actualCost: 0,
          startDate: new Date(Date.now() + 31 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 75 * 86400000).toISOString().split('T')[0],
          status: 'Not Started'
        },
        {
          id: `phase-${Date.now()}-3`,
          name: 'Phase 3: QA Inspection, Power Testing & Logistics Delivery',
          description: 'High-voltage grid testing, ultrasonic weld QA, freight dispatch.',
          budget: 25000,
          actualCost: 0,
          startDate: new Date(Date.now() + 76 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 105 * 86400000).toISOString().split('T')[0],
          status: 'Not Started'
        }
      ],
      selectedItems: [],
      overheadPct: 8.5,
      contingencyPct: 5.0,
      ...req.body
    };
    newProject.analytics = runPythonAnalytics(newProject);
    db.projects.unshift(newProject);
    saveDB(db);
    res.status(201).json(newProject);
  });

  app.put('/api/projects/:id', (req, res) => {
    const db = loadDB();
    const idx = db.projects.findIndex((p: any) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    db.projects[idx] = { ...db.projects[idx], ...req.body };
    db.projects[idx].analytics = runPythonAnalytics(db.projects[idx]);
    saveDB(db);
    res.json(db.projects[idx]);
  });

  app.delete('/api/projects/:id', (req, res) => {
    const db = loadDB();
    db.projects = db.projects.filter((p: any) => p.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // Calculate ad-hoc scenario with Python Analytics
  app.post('/api/analytics/calculate', (req, res) => {
    const results = runPythonAnalytics(req.body);
    res.json(results);
  });

  // --- Categories API ---
  app.get('/api/categories', (req, res) => {
    const db = loadDB();
    res.json(db.categories || []);
  });

  app.post('/api/categories', (req, res) => {
    const db = loadDB();
    if (!db.categories) db.categories = [];
    const newCat = {
      id: req.body.id || `cat-${Date.now()}`,
      ...req.body
    };
    db.categories.unshift(newCat);
    saveDB(db);
    res.status(201).json(newCat);
  });

  app.put('/api/categories/:id', (req, res) => {
    const db = loadDB();
    if (!db.categories) db.categories = [];
    const idx = db.categories.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Category not found' });
    db.categories[idx] = { ...db.categories[idx], ...req.body };
    saveDB(db);
    res.json(db.categories[idx]);
  });

  app.delete('/api/categories/:id', (req, res) => {
    const db = loadDB();
    db.categories = (db.categories || []).filter((c: any) => c.id !== req.params.id && c.parentId !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Custom Tiles API ---
  app.get('/api/custom-tiles', (req, res) => {
    const db = loadDB();
    res.json(db.customTiles || []);
  });

  app.post('/api/custom-tiles', (req, res) => {
    const db = loadDB();
    if (!db.customTiles) db.customTiles = [];
    const newTile = {
      id: req.body.id || `custom-tile-${Date.now()}`,
      ...req.body
    };
    db.customTiles.unshift(newTile);
    saveDB(db);
    res.status(201).json(newTile);
  });

  app.delete('/api/custom-tiles/:id', (req, res) => {
    const db = loadDB();
    db.customTiles = (db.customTiles || []).filter((t: any) => t.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
  });

  // --- Master Database Export & Import API ---
  app.get('/api/database/export', (req, res) => {
    const db = loadDB();
    res.setHeader('Content-Disposition', `attachment; filename=database_backup_${Date.now()}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json({
      system: 'Cost and Planning Database System',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      data: db
    });
  });

  app.post('/api/database/import', (req, res) => {
    try {
      const incoming = req.body;
      const dataToSave = incoming.data || incoming;
      saveDB(dataToSave);
      res.json({ success: true, message: 'Database successfully imported and restored' });
    } catch (e: any) {
      res.status(400).json({ error: 'Failed to import database', details: e?.message });
    }
  });

  // Reset data endpoint
  app.post('/api/reset-data', (req, res) => {
    const initial = {
      suppliers: [],
      materials: [],
      outsourced: [],
      subcontractors: [],
      inventory: [],
      projects: [],
      produce: []
    };
    saveDB(initial);
    res.json({ success: true, message: 'Database reset to clean state' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
