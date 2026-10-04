// Sharodiya Main Application Engine
import { PANDALS_DATA, EATERIES_DATA, RITUAL_SCHEDULE, COMPANION_ARCHETYPES, INITIAL_PARIKRAMA, METRO_STATIONS_DATA } from './data.js';
import { ShiuliParticleSystem } from './flowers.js';
import { DhakAudioEngine } from './audio.js';
import { supabaseAuth } from './supabase.js';

// Bounding Box for Kolkata & Outskirts Metropolitan Region (Barrackpore/Kalyani to Baruipur/Sonarpur & Howrah to New Town/Barasat)
const KOLKATA_OUTSKIRTS_BOUNDS = [
  [22.28, 88.08], // South-West (Budge Budge / Uluberia / Diamond Harbour Road)
  [22.88, 88.62]  // North-East (Barrackpore / Kalyani / Barasat / Rajarhat)
];

class SharodiyaApp {
  constructor() {
    this.currentView = 'landing';
    this.pandals = [...PANDALS_DATA];
    this.eateries = [...EATERIES_DATA];
    this.metroStations = [...METRO_STATIONS_DATA];
    this.supabaseAuth = supabaseAuth;
    
    // Multi-Plan Architecture (Multiple plans for any single day, default day: Maha Sasthi)
    this.plans = this.loadPlans();
    this.activePlanId = localStorage.getItem('sharodiya_active_plan_id') || (this.plans[0] ? this.plans[0].id : null);
    if (!this.plans.some(p => p.id === this.activePlanId)) {
      this.activePlanId = this.plans[0] ? this.plans[0].id : null;
    }
    this.currentDay = this.getActivePlan().day || 'Maha Sasthi';
    
    // Pandal Filters & State
    this.activeZoneFilter = 'all'; // 'all', 'north', 'south', 'central', 'saltlake'
    this.activePandalFilter = 'all'; // 'all', 'popular', 'traditional', 'theme'
    this.pandalSearchQuery = '';
    this.pandalPageSize = 18;
    this.pandalCurrentLimit = 18;

    // Permanent Festive Dark Theme
    this.currentTheme = 'dark';

    // Dedicated Master Puja Map State
    this.masterMap = null;
    this.masterTileLayer = null;
    this.masterLayers = { pandals: null, eateries: null, trail: null, foodLines: null };
    this.activeLayers = { pandals: true, eateries: true, trail: true };
    this.selectedMapPandalId = null;
    this.isPlanMapMode = false; // Only true when explicitly opened from a Plan
    this.mapZoneFilter = 'all';
    this.mapSearchQuery = '';
    this.mapPandalMarkers = new Map();
    this.mapEateryMarkers = new Map();
    this.mapTrailPolyline = null;
    this.mapTrailCasing = null;
    this.mapTrailMarkers = [];
    this.mapRoadCoordinates = [];
    this._trailReqToken = 0;
    this.userLocationMarker = null;

    // Dedicated Kolkata Puja Metro Network State
    this.metroMap = null;
    this.metroTileLayer = null;
    this.metroLayers = { lines: null, stations: null, interchanges: null };
    this.metroActiveLineFilter = 'all'; // 'all', 'Blue', 'Green', 'Purple', 'Orange', 'interchange'
    this.metroSearchQuery = '';
    this.selectedMetroStationId = null;
    this.metroStationMarkers = new Map();
    this.metroRoutePlanner = { startStationId: null, destStationId: null, selectedPandalIds: [], day: 'Maha Sasthi' };

    // Eatery Filters & State
    this.activeEateryFilter = 'all';
    this.eaterySearchQuery = '';
    this.eateryPageSize = 24;
    this.eateryCurrentLimit = 24;
    this.selectedScheduleDay = 'Maha Sasthi';
    this.selectedArchetype = 'friends';

    this.audioEngine = new DhakAudioEngine();
    this.flowerSystem = null;

    // Devotee Authentication State
    this.currentUser = null;
    this.authToken = localStorage.getItem('sharodiya_auth_token') || null;
    this.authActiveTab = 'signin';

    this.init();
  }

  // Dynamic accessor for active plan's items so all existing features work seamlessly
  get parikrama() {
    return this.getActivePlan().items;
  }
  set parikrama(val) {
    this.getActivePlan().items = val;
  }

  getActivePlan() {
    let plan = this.plans.find(p => p.id === this.activePlanId);
    if (!plan) {
      if (this.plans.length === 0) {
        plan = {
          id: 'plan_' + Date.now(),
          name: 'My Puja Plan 1',
          day: 'Maha Sasthi', // by default Maha Sasthi will be selected!
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: []
        };
        this.plans.push(plan);
      } else {
        plan = this.plans[0];
      }
      this.activePlanId = plan.id;
    }
    if (!plan.day) plan.day = 'Maha Sasthi';
    if (!Array.isArray(plan.items)) plan.items = [];
    return plan;
  }

  async apiFetch(endpoint, options = {}) {
    try {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (this.authToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      const res = await fetch(endpoint, {
        ...options,
        headers
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, error: errorData.error || `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err) {
      console.warn(`[API] Network call to ${endpoint} failed, continuing with local engine:`, err.message);
      return { success: false, error: err.message };
    }
  }

  async syncBackendData() {
    try {
      const pandalsRes = await this.apiFetch('/api/pandals');
      if (pandalsRes && pandalsRes.success && Array.isArray(pandalsRes.pandals) && pandalsRes.pandals.length > 0) {
        this.pandals = pandalsRes.pandals;
        this.renderPandals(false);
      }
      const eateriesRes = await this.apiFetch('/api/eateries');
      if (eateriesRes && eateriesRes.success && Array.isArray(eateriesRes.eateries) && eateriesRes.eateries.length > 0) {
        this.eateries = eateriesRes.eateries;
        this.renderEateries();
      }
      const metroRes = await this.apiFetch('/api/metro');
      if (metroRes && metroRes.success && Array.isArray(metroRes.metroStations) && metroRes.metroStations.length > 0) {
        this.metroStations = metroRes.metroStations;
        if (this.metroMap) {
          this.updateMetroNetworkMap();
        }
        this.renderMetroStationInfoPanel();
      }
      if (this.masterMap) {
        this.updateMasterMap();
      }
    } catch (e) {
      console.warn('[Sync] Fallback to local dataset active');
    }
  }

  // ==========================================
  // DEVOTEE AUTHENTICATION & PROFILE ENGINE (SUPABASE)
  // ==========================================
  async initAuth() {
    this.updateAuthUI();

    // 1. Listen to Supabase Auth State Changes in Real-Time
    if (this.supabaseAuth) {
      this.supabaseAuth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          if (session && session.user) {
            const u = session.user;
            this.currentUser = {
              id: u.id,
              name: u.user_metadata?.name || u.user_metadata?.full_name || 'Devotee',
              email: u.email,
              archetype: u.user_metadata?.archetype || 'friends',
              avatar: u.user_metadata?.avatar || u.user_metadata?.avatar_url || 'assets/logo.png'
            };
            this.authToken = session.access_token;
            localStorage.setItem('sharodiya_auth_token', session.access_token);
            this.updateAuthUI();
          }
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.authToken = null;
          localStorage.removeItem('sharodiya_auth_token');
          this.updateAuthUI();
        }
      });
    }

    // 2. Check Active Supabase Session or Bearer Token
    if (this.supabaseAuth) {
      const sbSession = await this.supabaseAuth.getSession();
      if (sbSession && sbSession.user) {
        this.currentUser = sbSession.user;
        this.authToken = sbSession.token;
        if (sbSession.user.archetype) {
          this.selectedArchetype = sbSession.user.archetype;
        }
        this.updateAuthUI();
        return;
      }
    }

    // 3. Fallback verification with local/hybrid backend
    if (this.authToken) {
      try {
        const res = await this.apiFetch('/api/auth/me');
        if (res && res.success && res.user) {
          this.currentUser = res.user;
          localStorage.setItem('sharodiya_user_session', JSON.stringify(res.user));
          if (res.user.archetype) {
            this.selectedArchetype = res.user.archetype;
          }
          this.updateAuthUI();
        } else {
          // Check cached user session before clearing
          const cachedUser = localStorage.getItem('sharodiya_user_session');
          if (cachedUser) {
            try {
              this.currentUser = JSON.parse(cachedUser);
              this.updateAuthUI();
              return;
            } catch (e) {}
          }
          this.authToken = null;
          this.currentUser = null;
          localStorage.removeItem('sharodiya_auth_token');
          localStorage.removeItem('sharodiya_user_session');
          this.updateAuthUI();
        }
      } catch (err) {
        console.warn('[Auth] Session verification note:', err);
        const cachedUser = localStorage.getItem('sharodiya_user_session');
        if (cachedUser) {
          try {
            this.currentUser = JSON.parse(cachedUser);
            this.updateAuthUI();
          } catch (e) {}
        }
      }
    }
  }

  updateAuthUI() {
    const navSigninBtn = document.getElementById('nav-signin-btn');
    const navUserProfile = document.getElementById('nav-user-profile');
    const navUserAvatar = document.getElementById('nav-user-avatar');
    const navUserName = document.getElementById('nav-user-name');

    const dropdownAvatar = document.getElementById('dropdown-user-avatar');
    const dropdownName = document.getElementById('dropdown-user-name');
    const dropdownEmail = document.getElementById('dropdown-user-email');
    const dropdownArchetype = document.getElementById('dropdown-user-archetype');

    const mobileAvatar = document.getElementById('mobile-user-avatar');
    const mobileName = document.getElementById('mobile-user-name');
    const mobileStatus = document.getElementById('mobile-user-status');
    const mobileActionBtn = document.getElementById('mobile-auth-action-btn');

    const archetypeLabels = {
      friends: 'Friends Adda',
      family: 'Family & Elders',
      foodies: 'Foodies & Bhog',
      photographers: 'Visual Seekers',
      heritage: 'Heritage & Bonedi',
      couple: 'Romantic Strolls'
    };

    if (this.currentUser) {
      // User is logged in
      if (navSigninBtn) navSigninBtn.classList.add('hidden');
      if (navUserProfile) navUserProfile.classList.remove('hidden');

      const avatarSrc = this.currentUser.avatar || 'assets/logo.png';
      const displayName = this.currentUser.name || 'Devotee';
      const archetypeText = archetypeLabels[this.currentUser.archetype] || 'Devotee';

      if (navUserAvatar) navUserAvatar.src = avatarSrc;
      if (navUserName) navUserName.textContent = displayName;

      if (dropdownAvatar) dropdownAvatar.src = avatarSrc;
      if (dropdownName) dropdownName.textContent = displayName;
      if (dropdownEmail) dropdownEmail.textContent = this.currentUser.email || '';
      if (dropdownArchetype) dropdownArchetype.textContent = 'Clan Devotee';

      if (mobileAvatar) mobileAvatar.src = avatarSrc;
      if (mobileName) mobileName.textContent = displayName;
      if (mobileStatus) mobileStatus.textContent = 'Verified Devotee';
      if (mobileActionBtn) {
        mobileActionBtn.textContent = 'Profile';
        mobileActionBtn.className = 'px-3.5 py-1.5 rounded-full bg-surface-container-high border border-primary/40 text-white font-bold text-xs shadow-md';
      }
    } else {
      // Logged out
      if (navSigninBtn) navSigninBtn.classList.remove('hidden');
      if (navUserProfile) navUserProfile.classList.add('hidden');

      const dropdown = document.getElementById('nav-user-dropdown');
      if (dropdown) dropdown.classList.add('hidden');

      if (mobileAvatar) mobileAvatar.src = 'assets/logo.png';
      if (mobileName) mobileName.textContent = 'Devotee Guest';
      if (mobileStatus) mobileStatus.textContent = 'Sign in to sync parikramas';
      if (mobileActionBtn) {
        mobileActionBtn.textContent = 'Sign In';
        mobileActionBtn.className = 'px-3.5 py-1.5 rounded-full bg-primary text-black font-bold text-xs shadow-md';
      }
    }
  }

  isAuthenticated() {
    return !!(this.currentUser && this.authToken);
  }

  requireAuth(actionName = 'access this feature') {
    if (this.isAuthenticated()) {
      return true;
    }
    this.showToast(`🔒 Sign in is mandatory to ${actionName}.`);
    this.openAuthModal('signin', true);
    return false;
  }

  openAuthModal(tab = 'signin', isMandatory = null) {
    this.authActiveTab = tab;
    this.hideAuthAlert();
    this.switchAuthTab(tab);

    const emailInput = document.getElementById('signin-email');
    if (emailInput && !emailInput.value) {
      const lastEmail = localStorage.getItem('sharodiya_last_email');
      if (lastEmail) emailInput.value = lastEmail;
    }

    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('close-auth-modal-btn');
    const notice = document.getElementById('auth-mandatory-notice');
    const mandatory = isMandatory !== null ? isMandatory : !this.isAuthenticated();

    if (modal) {
      if (mandatory) {
        modal.classList.add('mandatory-auth');
        document.body.classList.add('auth-locked');
        if (closeBtn) closeBtn.classList.add('hidden');
        if (notice) notice.classList.remove('hidden');
      } else {
        modal.classList.remove('mandatory-auth');
        if (closeBtn) closeBtn.classList.remove('hidden');
        if (notice) notice.classList.add('hidden');
      }
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeAuthModal(force = false) {
    if (!force && !this.isAuthenticated()) {
      this.showAuthAlert('Devotee sign-in is mandatory to access Sharodiya. Please sign in or create an account.');
      return;
    }
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('mandatory-auth');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    if (this.isAuthenticated()) {
      document.body.classList.remove('auth-locked');
    }
    this.hideAuthAlert();
  }

  switchAuthTab(tab) {
    this.authActiveTab = tab;
    this.hideAuthAlert();

    const signinTabBtn = document.getElementById('auth-tab-signin-btn');
    const signupTabBtn = document.getElementById('auth-tab-signup-btn');
    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const modalTitle = document.getElementById('auth-modal-title');

    if (tab === 'signin') {
      if (signinTabBtn) {
        signinTabBtn.className = 'flex-1 py-2.5 rounded-xl transition-all duration-200 text-white bg-primary shadow-md flex items-center justify-center gap-1.5';
      }
      if (signupTabBtn) {
        signupTabBtn.className = 'flex-1 py-2.5 rounded-xl transition-all duration-200 text-on-surface-variant hover:text-white flex items-center justify-center gap-1.5';
      }
      if (signinForm) signinForm.classList.remove('hidden');
      if (signupForm) signupForm.classList.add('hidden');
      if (modalTitle) modalTitle.textContent = 'Person Sign In';
    } else {
      if (signinTabBtn) {
        signinTabBtn.className = 'flex-1 py-2.5 rounded-xl transition-all duration-200 text-on-surface-variant hover:text-white flex items-center justify-center gap-1.5';
      }
      if (signupTabBtn) {
        signupTabBtn.className = 'flex-1 py-2.5 rounded-xl transition-all duration-200 text-white bg-primary shadow-md flex items-center justify-center gap-1.5';
      }
      if (signinForm) signinForm.classList.add('hidden');
      if (signupForm) signupForm.classList.remove('hidden');
      if (modalTitle) modalTitle.textContent = 'Join Clan (Supabase)';
    }
  }

  showAuthAlert(message, type = 'error') {
    const alertEl = document.getElementById('auth-alert-banner');
    const iconEl = document.getElementById('auth-alert-icon');
    const msgEl = document.getElementById('auth-alert-message');
    if (!alertEl || !msgEl) return;

    alertEl.className = type === 'error'
      ? 'p-3.5 rounded-2xl border text-xs font-semibold items-center gap-2.5 auth-alert-error flex'
      : 'p-3.5 rounded-2xl border text-xs font-semibold items-center gap-2.5 auth-alert-success flex';

    if (iconEl) iconEl.textContent = type === 'error' ? 'error' : 'check_circle';
    msgEl.textContent = message;
    alertEl.classList.remove('hidden');
  }

  hideAuthAlert() {
    const alertEl = document.getElementById('auth-alert-banner');
    if (alertEl) alertEl.classList.add('hidden');
  }

  async handleSignIn(email, password) {
    if (!email || !password) {
      this.showAuthAlert('Please enter both email and password.');
      return;
    }

    try {
      const res = await this.supabaseAuth.signIn({ email, password });

      if (res && res.success && res.user) {
        this.authToken = res.token;
        this.currentUser = res.user;
        if (res.token) {
          localStorage.setItem('sharodiya_auth_token', res.token);
        }
        localStorage.setItem('sharodiya_user_session', JSON.stringify(res.user));
        localStorage.setItem('sharodiya_last_email', email.trim().toLowerCase());
        if (res.user.archetype) {
          this.selectedArchetype = res.user.archetype;
        }
        document.body.classList.remove('auth-locked');
        this.updateAuthUI();
        this.closeAuthModal(true);
        this.handleRoute();
        this.showToast(res.message || `Welcome back, ${res.user.name}! 🪔`);
      } else {
        this.showAuthAlert(res?.error || 'Invalid credentials. Please verify your email & password.');
      }
    } catch (err) {
      this.showAuthAlert(err.message || 'Login failed. Please check your credentials.');
    }
  }

  async handleSignUp(name, email, password, archetype) {
    if (!name || name.trim().length < 2) {
      this.showAuthAlert('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!email || !email.includes('@')) {
      this.showAuthAlert('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      this.showAuthAlert('Password must be at least 6 characters long.');
      return;
    }

    try {
      const res = await this.supabaseAuth.signUp({ name, email, password, archetype });

      if (res && res.success && res.user) {
        this.authToken = res.token;
        this.currentUser = res.user;
        if (res.token) {
          localStorage.setItem('sharodiya_auth_token', res.token);
        }
        localStorage.setItem('sharodiya_user_session', JSON.stringify(res.user));
        localStorage.setItem('sharodiya_last_email', email.trim().toLowerCase());
        if (res.user.archetype) {
          this.selectedArchetype = res.user.archetype;
        }
        document.body.classList.remove('auth-locked');
        this.updateAuthUI();
        this.closeAuthModal(true);
        this.handleRoute();
        this.showToast(res.message || `Welcome to Sharodiya, ${res.user.name}! 🌺`);
      } else {
        this.showAuthAlert(res?.error || 'Registration failed. Please try a different email.');
      }
    } catch (err) {
      this.showAuthAlert(err.message || 'Registration failed. Please try again.');
    }
  }

  async handleSignOut() {
    if (this.supabaseAuth) {
      try {
        await this.supabaseAuth.signOut();
      } catch (e) {}
    }
    if (this.authToken) {
      try {
        await this.apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
    }
    this.authToken = null;
    this.currentUser = null;
    localStorage.removeItem('sharodiya_auth_token');
    localStorage.removeItem('sharodiya_user_session');

    const dropdown = document.getElementById('nav-user-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    document.body.classList.add('auth-locked');
    this.updateAuthUI();
    this.openAuthModal('signin', true);
    this.showToast('🌸 Signed out successfully. Shubho Sharodiya!');
  }

  async quickDemoLogin() {
    const demoEmail = 'devotee.kolkata@sharodiya.in';
    const demoPassword = 'pujopassword123';

    // Try logging in via Supabase / local bridge
    let res = await this.supabaseAuth.signIn({ email: demoEmail, password: demoPassword });

    if (!res || !res.success) {
      res = await this.supabaseAuth.signUp({
        name: 'Shounak Sen (Demo Devotee)',
        email: demoEmail,
        password: demoPassword,
        archetype: 'friends',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SharodiyaVIP'
      });
    }

    if (res && res.success && res.user) {
      this.authToken = res.token;
      this.currentUser = res.user;
      if (res.token) {
        localStorage.setItem('sharodiya_auth_token', res.token);
      }
      document.body.classList.remove('auth-locked');
      this.updateAuthUI();
      this.closeAuthModal(true);
      this.handleRoute();
      this.showToast(`🪔 Logged in as ${res.user.name}! (Supabase Auth)`);
    } else {
      this.showAuthAlert('Demo login unavailable. Please create an account.');
    }
  }

  openProfileEditModal() {
    if (!this.currentUser) {
      this.openAuthModal('signin', true);
      return;
    }

    const nameInput = document.getElementById('profile-edit-name');
    const archetypeSelect = document.getElementById('profile-edit-archetype');
    const avatarPreview = document.getElementById('profile-modal-avatar-preview');
    const modal = document.getElementById('profile-edit-modal');

    if (nameInput) nameInput.value = this.currentUser.name || '';
    if (archetypeSelect) archetypeSelect.value = this.currentUser.archetype || 'friends';
    if (avatarPreview) avatarPreview.src = this.currentUser.avatar || 'assets/logo.png';

    const dropdown = document.getElementById('nav-user-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeProfileEditModal() {
    const modal = document.getElementById('profile-edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  async handleProfileUpdate(name, archetype) {
    if (!name || name.trim().length < 2) {
      this.showToast('Please enter a valid name.');
      return;
    }

    try {
      const res = await this.supabaseAuth.updateProfile({ name: name.trim(), archetype });

      if (res && res.success && res.user) {
        this.currentUser = res.user;
        this.updateAuthUI();
        this.closeProfileEditModal();
        this.showToast('✨ Profile updated successfully!');
      } else {
        this.showToast(`Error: ${res?.error || 'Could not update profile'}`);
      }
    } catch (err) {
      this.showToast(`Error: ${err.message}`);
    }
  }

  async handleDeleteAccount() {
    if (!this.currentUser) return;
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to permanently delete your Sharodiya account (${this.currentUser.email || this.currentUser.name})?\n\nThis will remove your saved profile, credentials, and cloud data. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const email = this.currentUser.email;
      if (this.supabaseAuth) {
        await this.supabaseAuth.deleteAccount(email);
      }
      this.authToken = null;
      this.currentUser = null;
      localStorage.removeItem('sharodiya_auth_token');
      localStorage.removeItem('sharodiya_user_session');
      localStorage.removeItem('sharodiya_last_email');

      this.closeProfileEditModal();
      document.body.classList.add('auth-locked');
      this.updateAuthUI();
      this.showToast('🗑️ Your Sharodiya account has been permanently deleted.');
      this.openAuthModal('signin', true);
    } catch (err) {
      this.showToast(`Error deleting account: ${err.message}`);
    }
  }

  setupAuthEventListeners() {
    // 1. Sign In Header Button
    document.getElementById('nav-signin-btn')?.addEventListener('click', () => {
      this.openAuthModal('signin');
    });

    // 2. Mobile Auth Action Button
    document.getElementById('mobile-auth-action-btn')?.addEventListener('click', () => {
      const mobileDrawer = document.getElementById('mobile-menu-drawer');
      if (mobileDrawer) mobileDrawer.classList.add('hidden');
      if (this.currentUser) {
        this.openProfileEditModal();
      } else {
        this.openAuthModal('signin', true);
      }
    });

    // 3. User Avatar Pill Dropdown Toggle
    const navUserBtn = document.getElementById('nav-user-btn');
    const navDropdown = document.getElementById('nav-user-dropdown');

    if (navUserBtn && navDropdown) {
      navUserBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navDropdown.classList.toggle('hidden');
      });

      // Close dropdown on click outside
      document.addEventListener('click', (e) => {
        if (!navDropdown.classList.contains('hidden') && !navUserBtn.contains(e.target) && !navDropdown.contains(e.target)) {
          navDropdown.classList.add('hidden');
        }
      });
    }

    // 4. Dropdown Menu Items
    document.getElementById('dropdown-my-plans-btn')?.addEventListener('click', () => {
      navDropdown?.classList.add('hidden');
      this.navigateTo('planned');
    });

    document.getElementById('dropdown-my-squad-btn')?.addEventListener('click', () => {
      navDropdown?.classList.add('hidden');
      this.navigateTo('people');
    });

    document.getElementById('dropdown-edit-profile-btn')?.addEventListener('click', () => {
      this.openProfileEditModal();
    });

    document.getElementById('dropdown-signout-btn')?.addEventListener('click', () => {
      this.handleSignOut();
    });

    // 5. Auth Modal Controls
    document.getElementById('close-auth-modal-btn')?.addEventListener('click', () => {
      if (!this.isAuthenticated()) {
        this.showAuthAlert('Devotee sign-in is mandatory to access Sharodiya.');
        return;
      }
      this.closeAuthModal();
    });

    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
          if (!this.isAuthenticated()) {
            this.showAuthAlert('Devotee sign-in is mandatory to access Sharodiya.');
          } else {
            this.closeAuthModal();
          }
        }
      });
    }

    document.getElementById('auth-tab-signin-btn')?.addEventListener('click', () => {
      this.switchAuthTab('signin');
    });

    document.getElementById('auth-tab-signup-btn')?.addEventListener('click', () => {
      this.switchAuthTab('signup');
    });

    // 6. Form Submissions
    document.getElementById('auth-signin-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email')?.value?.trim();
      const password = document.getElementById('signin-password')?.value;
      this.handleSignIn(email, password);
    });

    document.getElementById('auth-signup-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name')?.value?.trim();
      const email = document.getElementById('signup-email')?.value?.trim();
      const password = document.getElementById('signup-password')?.value;
      const archetype = document.getElementById('signup-archetype')?.value || 'friends';
      this.handleSignUp(name, email, password, archetype);
    });

    // 6.1 Supabase Custom Project Configuration
    const supabaseUrlInput = document.getElementById('supabase-custom-url-input');
    const supabaseKeyInput = document.getElementById('supabase-custom-key-input');
    const saveSupabaseBtn = document.getElementById('save-supabase-keys-btn');
    const resetSupabaseBtn = document.getElementById('reset-supabase-keys-btn');
    const supabaseBadge = document.getElementById('supabase-status-badge');

    if (supabaseUrlInput && supabaseKeyInput) {
      supabaseUrlInput.value = localStorage.getItem('sharodiya_supabase_url') || '';
      supabaseKeyInput.value = localStorage.getItem('sharodiya_supabase_anon_key') || '';
      if (this.supabaseAuth.isCustomConfigured && supabaseBadge) {
        supabaseBadge.textContent = 'Connected (Custom)';
        supabaseBadge.className = 'px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/30 text-emerald-200 border border-emerald-400 font-bold';
      }
    }

    if (saveSupabaseBtn) {
      saveSupabaseBtn.addEventListener('click', () => {
        const urlVal = supabaseUrlInput?.value?.trim();
        const keyVal = supabaseKeyInput?.value?.trim();
        if (!urlVal || !keyVal) {
          this.showToast('⚠️ Please provide both Supabase URL and Anon Key.');
          return;
        }
        this.supabaseAuth.setCustomCredentials(urlVal, keyVal);
        if (supabaseBadge) {
          supabaseBadge.textContent = 'Connected (Custom)';
          supabaseBadge.className = 'px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/30 text-emerald-200 border border-emerald-400 font-bold';
        }
        this.showToast('⚡ Custom Supabase project credentials saved!');
      });
    }

    if (resetSupabaseBtn) {
      resetSupabaseBtn.addEventListener('click', () => {
        this.supabaseAuth.setCustomCredentials('', '');
        if (supabaseUrlInput) supabaseUrlInput.value = '';
        if (supabaseKeyInput) supabaseKeyInput.value = '';
        if (supabaseBadge) {
          supabaseBadge.textContent = 'Active (Default)';
          supabaseBadge.className = 'px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        }
        this.showToast('🔄 Supabase config reset to default.');
      });
    }

    // 7. Profile Edit Modal Controls
    document.getElementById('close-profile-modal-btn')?.addEventListener('click', () => {
      this.closeProfileEditModal();
    });
    document.getElementById('close-profile-modal-cancel-btn')?.addEventListener('click', () => {
      this.closeProfileEditModal();
    });

    const profileModal = document.getElementById('profile-edit-modal');
    if (profileModal) {
      profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) this.closeProfileEditModal();
      });
    }

    document.getElementById('profile-edit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('profile-edit-name')?.value?.trim();
      const archetype = this.currentUser?.archetype || 'friends';
      this.handleProfileUpdate(name, archetype);
    });

    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
      this.handleDeleteAccount();
    });
  }

  async init() {
    // 0. Initialize & Sync Theme
    this.initTheme();

    // 0.1 Initialize Devotee Authentication & Session
    await this.initAuth();
    this.setupAuthEventListeners();

    // Check mandatory authentication immediately
    if (!this.isAuthenticated()) {
      document.body.classList.add('auth-locked');
      this.openAuthModal('signin', true);
    } else {
      document.body.classList.remove('auth-locked');
    }

    // 1. Initialize Visual Effects (Flower system strictly initialized for landing container)
    try {
      this.flowerSystem = new ShiuliParticleSystem('particle-container', 22);
    } catch (e) {
      console.warn('Particle system init note:', e);
    }

    // 2. Setup Navigation & Routing
    this.setupRouting();

    // 3. Setup Countdown Timer (Target: Maha Sasthi 2026)
    this.initCountdownTimer();

    // 4. Render All Views
    this.renderAllViews();

    // 5. Setup Event Listeners
    this.setupEventListeners();

    // 6. Handle initial route based on URL hash (if authenticated)
    if (this.isAuthenticated()) {
      this.handleRoute();
    }

    // 7. Sync with Full-Stack Backend
    this.syncBackendData();
  }

  // ==========================================
  // PERMANENT FESTIVE DARK MODE ENGINE
  // ==========================================
  initTheme() {
    this.applyTheme('dark', false);
  }

  toggleTheme() {
    // Permanent dark mode enforced
    this.applyTheme('dark', false);
  }

  applyTheme(theme = 'dark', showNotification = false) {
    this.currentTheme = 'dark';
    try {
      localStorage.setItem('sharodiya_theme', 'dark');
    } catch (e) {}

    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';

    // Synchronize Map Layers
    this.updateMapTheme();
    this.updateMetroMapTheme();
  }

  updateMapTheme() {
    if (!this.masterMap || typeof window.L === 'undefined') return;

    // Official OpenStreetMap Tile Server - 100% Free, Zero API Key, Zero Watermarks
    const osmTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    if (this.masterTileLayer) {
      try {
        this.masterMap.removeLayer(this.masterTileLayer);
      } catch (e) {}
    }

    try {
      this.masterTileLayer = window.L.tileLayer(osmTileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11, // Highest zoom out strictly restricted to Kolkata outskirts
        maxZoom: 19,
        crossOrigin: true
      });

      this.masterTileLayer.addTo(this.masterMap);
      this.masterTileLayer.bringToBack();
    } catch (e) {
      console.warn('[Puja Map] Tile layer note:', e);
    }
  }

  renderAllViews() {
    this.renderPandals();
    this.renderEateries();
    this.renderParikrama();
    this.renderArchetypes();
    this.renderSchedule();
    this.renderMetroStationInfoPanel();
    this.updateParikramaBadge();
  }

  // ==========================================
  // MULTI-PLAN STORAGE & MANAGEMENT ENGINE
  // ==========================================
  loadPlans() {
    try {
      const saved = localStorage.getItem('sharodiya_plans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => ({
            id: p.id || `plan_${Date.now()}_${idx}`,
            name: p.name || `My Puja Plan ${idx + 1}`,
            day: p.day || 'Maha Sasthi', // by default Maha Sasthi is selected!
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
            items: Array.isArray(p.items) ? p.items : []
          }));
        }
      }
      
      // Legacy storage fallback/migration
      const legacy = localStorage.getItem('sharodiya_parikrama');
      const initialItems = legacy ? JSON.parse(legacy) : [];
      return [{
        id: 'plan_default_1',
        name: 'My Puja Plan 1',
        day: 'Maha Sasthi', // by default Maha Sasthi is selected!
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: Array.isArray(initialItems) ? initialItems : []
      }];
    } catch (e) {
      return [{
        id: 'plan_default_1',
        name: 'My Puja Plan 1',
        day: 'Maha Sasthi',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: []
      }];
    }
  }

  savePlans(showToastMsg = null) {
    try {
      localStorage.setItem('sharodiya_plans', JSON.stringify(this.plans));
      if (this.activePlanId) {
        localStorage.setItem('sharodiya_active_plan_id', this.activePlanId);
      }
      localStorage.setItem('sharodiya_parikrama', JSON.stringify(this.parikrama));

      this.renderParikrama();
      this.updateParikramaBadge();
      if (this.masterMap) {
        this.updateMapTrail();
      }
      if (showToastMsg) {
        this.showToast(showToastMsg);
      }
    } catch (e) {
      console.error('Error saving plans:', e);
    }
  }

  saveParikrama() {
    this.savePlans();
  }

  // Explicit Save Action for the Save Button
  async saveActivePlan() {
    const activePlan = this.getActivePlan();
    const titleInput = document.getElementById('active-plan-title-input');
    if (titleInput && titleInput.value.trim()) {
      activePlan.name = titleInput.value.trim();
    }
    activePlan.updatedAt = new Date().toISOString();

    this.savePlans();

    // Button visual feedback animation
    const saveBtn = document.getElementById('save-plan-btn');
    const saveBtnText = document.getElementById('save-plan-btn-text');
    if (saveBtnText) saveBtnText.textContent = '✓ Saved!';
    if (saveBtn) {
      saveBtn.classList.remove('bg-primary', 'text-black');
      saveBtn.classList.add('bg-green-400', 'text-black', 'scale-105');
      setTimeout(() => {
        if (saveBtnText) saveBtnText.textContent = 'Save Plan';
        if (saveBtn) {
          saveBtn.classList.add('bg-primary', 'text-black');
          saveBtn.classList.remove('bg-green-400', 'scale-105');
        }
      }, 2000);
    }

    // Sync to Python backend server
    this.apiFetch('/api/plans', {
      method: 'POST',
      body: JSON.stringify({
        id: activePlan.id,
        name: activePlan.name,
        day: activePlan.day,
        squad: this.selectedArchetype,
        items: activePlan.items,
        updatedAt: activePlan.updatedAt
      })
    });

    if (activePlan.day) {
      this.showToast(`💾 Plan "${activePlan.name}" saved for ${activePlan.day}! ✨`);
    } else {
      this.showToast(`💾 Plan "${activePlan.name}" saved as Draft! (Select a Puja Day above to schedule it)`);
    }
  }

  // Create a New Plan (Default: Maha Sasthi Selected)
  createNewPlan(name = null, day = null, activate = true) {
    const planNumber = this.plans.length + 1;
    const currentActiveDay = (this.plans.find(p => p.id === this.activePlanId)?.day) || this.currentDay || 'Maha Sasthi';
    const chosenDay = day !== undefined && day !== null ? day : currentActiveDay;
    const newPlan = {
      id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name || (chosenDay ? `My ${chosenDay} Plan` : `My Puja Plan ${planNumber}`),
      day: chosenDay,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: []
    };

    this.plans.push(newPlan);
    if (activate) {
      this.activePlanId = newPlan.id;
      if (chosenDay) this.currentDay = chosenDay;
    }
    this.savePlans();

    // Sync to backend
    this.apiFetch('/api/plans', {
      method: 'POST',
      body: JSON.stringify(newPlan)
    });

    if (newPlan.day) {
      this.showToast(`✨ Created new plan "${newPlan.name}" for ${newPlan.day}!`);
    } else {
      this.showToast(`✨ Created "${newPlan.name}".`);
    }
    return newPlan;
  }

  // Duplicate Plan
  duplicatePlan(planId) {
    const source = this.plans.find(p => p.id === planId) || this.getActivePlan();
    if (!source) return;

    const copyPlan = {
      id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: `${source.name} (Copy)`,
      day: source.day || 'Maha Sasthi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: JSON.parse(JSON.stringify(source.items || []))
    };

    this.plans.push(copyPlan);
    this.activePlanId = copyPlan.id;
    this.savePlans();
    this.showToast(`📋 Duplicated "${source.name}" as "${copyPlan.name}"!`);
  }

  // Delete Plan
  deletePlan(planId) {
    const idx = this.plans.findIndex(p => p.id === planId);
    if (idx < 0) return;
    const targetName = this.plans[idx].name;

    if (this.plans.length <= 1) {
      this.plans[0].items = [];
      this.plans[0].name = 'My Puja Plan 1';
      this.plans[0].day = 'Maha Sasthi';
      this.savePlans();
      this.showToast(`Reset plan "${targetName}" to empty.`);
      return;
    }

    this.plans.splice(idx, 1);
    if (this.activePlanId === planId) {
      this.activePlanId = this.plans[0].id;
    }
    this.savePlans();

    // Sync deletion to backend
    this.apiFetch(`/api/plans/${planId}`, { method: 'DELETE' });

    this.showToast(`🗑️ Deleted plan "${targetName}".`);
  }

  // Select Puja Day in Planner: switches to that day's plan or creates a fresh isolated plan for that day
  selectDayInPlanner(day) {
    this.currentDay = day || 'Maha Sasthi';

    // 1. Look for an existing plan dedicated to this day
    const existingPlan = this.plans.find(p => (day ? p.day === day : !p.day));

    if (existingPlan) {
      this.activePlanId = existingPlan.id;
      this.savePlans();
      if (day) {
        this.showToast(`📅 Switched to "${existingPlan.name}" for ${day}!`);
      } else {
        this.showToast(`Switched to draft plan "${existingPlan.name}".`);
      }
    } else {
      // 2. No plan exists for this day yet -> Create a new, fresh isolated plan for this day!
      const planName = day ? `My ${day} Plan` : `My Draft Plan ${this.plans.length + 1}`;
      const newPlan = {
        id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: planName,
        day: day,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [] // Isolated fresh items list for the new day
      };
      this.plans.push(newPlan);
      this.activePlanId = newPlan.id;
      this.savePlans();

      // Sync to backend
      this.apiFetch('/api/plans', {
        method: 'POST',
        body: JSON.stringify(newPlan)
      });

      if (day) {
        this.showToast(`✨ Created a fresh new plan for ${day}! Add stops to plan your route.`);
      } else {
        this.showToast(`✨ Created a fresh unassigned draft plan!`);
      }
    }

    this.renderParikrama();
  }

  // Backward compatibility alias
  assignActivePlanDay(day) {
    this.selectDayInPlanner(day);
  }

  // Render All Saved Plans Overview Modal
  renderAllPlansModal() {
    const modal = document.getElementById('all-plans-modal');
    const container = document.getElementById('all-plans-list-container');
    if (!modal || !container) return;

    const daysOrder = ['Maha Sasthi', 'Maha Saptami', 'Maha Ashtami', 'Maha Navami', 'Bijoya Dashami', null];
    const dayDisplayNames = {
      'Maha Sasthi': '📅 Maha Sasthi (Oct 16, 2026)',
      'Maha Saptami': '📅 Maha Saptami (Oct 17, 2026)',
      'Maha Ashtami': '📅 Maha Ashtami (Oct 18, 2026)',
      'Maha Navami': '📅 Maha Navami (Oct 19, 2026)',
      'Bijoya Dashami': '📅 Bijoya Dashami (Oct 20, 2026)',
      'null': '📝 Unassigned Plans (Drafts / Any Day)'
    };

    let html = '';

    daysOrder.forEach(dayKey => {
      const plansForDay = this.plans.filter(p => (dayKey === null ? !p.day : p.day === dayKey));
      if (plansForDay.length === 0) return;

      const groupTitle = dayDisplayNames[String(dayKey)];

      html += `
        <div class="space-y-3">
          <div class="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 class="font-headline text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>${groupTitle}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/10 text-tertiary font-bold">${plansForDay.length} plan${plansForDay.length > 1 ? 's' : ''}</span>
            </h4>
          </div>

          <div class="grid grid-cols-1 gap-3">
            ${plansForDay.map(plan => {
              const isActive = plan.id === this.activePlanId;
              const stopCount = (plan.items || []).length;
              const pCount = (plan.items || []).filter(i => i.type === 'pandal').length;
              const eCount = (plan.items || []).filter(i => i.type === 'eatery').length;

              return `
                <div class="p-4 rounded-2xl bg-surface-container ${isActive ? 'border-2 border-primary bg-primary/5' : 'border border-white/10 hover:border-white/20'} transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div class="space-y-1 flex-1">
                    <div class="flex items-center gap-2">
                      <h5 class="font-headline font-bold text-base text-white">${plan.name}</h5>
                      ${isActive ? '<span class="px-2 py-0.5 rounded-full bg-primary text-black font-bold text-[10px] font-mono uppercase">Active Plan</span>' : ''}
                    </div>
                    <p class="text-xs text-on-surface-variant font-mono">
                      ✦ ${stopCount} total stops (${pCount} pandals, ${eCount} food joints) • ~${(stopCount * 2.5).toFixed(1)} km
                    </p>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <button class="modal-map-plan-btn px-3 py-1.5 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 text-xs font-bold transition-all flex items-center gap-1 shadow-sm hover:scale-105" data-id="${plan.id}" title="View this plan route on Puja Map">
                      <span class="material-symbols-outlined text-[16px]">map</span>
                      <span>Map</span>
                    </button>
                    ${!isActive ? `
                      <button class="modal-switch-plan-btn px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs shadow hover:scale-105 transition-transform" data-id="${plan.id}">
                        Switch to Plan
                      </button>
                    ` : `
                      <span class="px-3 py-1.5 rounded-xl bg-primary/20 text-primary font-bold text-xs border border-primary/30">
                        Currently Open
                      </span>
                    `}
                    <button class="modal-dup-plan-btn p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-tertiary transition-colors" data-id="${plan.id}" title="Duplicate">
                      <span class="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                    <button class="modal-del-plan-btn p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" data-id="${plan.id}" title="Delete">
                      <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    if (!html) {
      html = `
        <div class="p-8 text-center text-on-surface-variant italic">
          No saved plans found. Click "Create New Plan" to get started!
        </div>
      `;
    }

    container.innerHTML = html;

    // Bind modal actions
    container.querySelectorAll('.modal-map-plan-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        this.openPlanInMap(id);
      });
    });

    container.querySelectorAll('.modal-switch-plan-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.activePlanId = id;
        this.savePlans();
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        this.navigateTo('planned');
        this.showToast(`Switched to active plan "${this.getActivePlan().name}"!`);
      });
    });

    container.querySelectorAll('.modal-dup-plan-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.duplicatePlan(id);
        this.renderAllPlansModal();
      });
    });

    container.querySelectorAll('.modal-del-plan-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.deletePlan(id);
        this.renderAllPlansModal();
      });
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  updateParikramaBadge() {
    const badge = document.getElementById('parikrama-count-badge');
    const mobileBadge = document.getElementById('mobile-parikrama-count-badge');
    const count = this.parikrama.length;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (mobileBadge) {
      mobileBadge.textContent = count;
      mobileBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  // Robust SPA Routing Logic
  setupRouting() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('popstate', () => this.handleRoute());

    // Bind all data-path links (Navbar, Bento, Buttons, Footer, Drawer)
    document.querySelectorAll('[data-path]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const path = el.getAttribute('data-path');
        if (path === 'map') {
          // Explicit click on Puja Map link in navbar / bento -> Normal Mode (show all 141 pandals & 250 eateries)
          this.isPlanMapMode = false;
        }
        this.navigateTo(path);
      });
    });
  }

  navigateTo(path) {
    if (!path) return;
    if (!this.isAuthenticated()) {
      this.showToast('🔒 Please sign in to explore Sharodiya.');
      this.openAuthModal('signin', true);
      return;
    }
    const currentHash = window.location.hash.replace('#', '').trim();
    if (currentHash === path) {
      this.handleRoute();
    } else {
      window.location.hash = `#${path}`;
    }
  }

  handleRoute() {
    if (!this.isAuthenticated()) {
      document.body.classList.add('auth-locked');
      this.openAuthModal('signin', true);
      return;
    }
    document.body.classList.remove('auth-locked');

    const rawHash = window.location.hash.replace('#', '').trim();
    const validViews = ['landing', 'pandals', 'eateries', 'planned', 'people', 'map', 'metro'];
    this.currentView = validViews.includes(rawHash) ? rawHash : 'landing';

    // Toggle active view visibility
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active-view');
      view.style.display = 'none';
    });

    const targetView = document.getElementById(`view-${this.currentView}`);
    if (targetView) {
      targetView.classList.add('active-view');
      targetView.style.display = 'block';
    }

    // Shiuli falling flower animation: ONLY ACTIVE ON LANDING PAGE
    if (this.flowerSystem) {
      this.flowerSystem.toggle(this.currentView === 'landing');
    }

    // Update Nav link active highlights
    document.querySelectorAll('[data-path]').forEach(link => {
      if (link.getAttribute('data-path') === this.currentView) {
        link.classList.add('active');
        link.classList.add('text-primary');
        link.classList.remove('text-on-surface-variant');
      } else {
        link.classList.remove('active');
        link.classList.remove('text-primary');
        link.classList.add('text-on-surface-variant');
      }
    });

    // Close mobile drawer if open
    const mobileMenu = document.getElementById('mobile-menu-drawer');
    if (mobileMenu) mobileMenu.classList.add('hidden');

    // Re-render specific view to ensure fresh DOM
    if (this.currentView === 'landing') this.renderSchedule();
    if (this.currentView === 'pandals') this.renderPandals();
    if (this.currentView === 'eateries') this.renderEateries();
    if (this.currentView === 'planned') this.renderParikrama();
    if (this.currentView === 'people') this.renderArchetypes();
    if (this.currentView === 'map') {
      this.syncPlanMapModeUI();
      if (!this.masterMap) {
        this.initMasterMap();
      } else {
        this.masterMap.invalidateSize();
        this.updateMasterMap();
      }
    }
    if (this.currentView === 'metro') {
      this.renderMetroStationInfoPanel();
      if (!this.metroMap) {
        this.initMetroNetworkMap();
      } else {
        setTimeout(() => {
          if (this.metroMap) {
            this.metroMap.invalidateSize();
            this.updateMetroNetworkMap();
          }
        }, 100);
      }
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Live Durga Puja 2026 Countdown Timer (Target: Maha Sasthi - Oct 16, 2026 at 06:00 AM IST)
  initCountdownTimer() {
    const puja2026MahaSasthi = new Date('2026-10-16T06:00:00+05:30').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = Math.max(0, puja2026MahaSasthi - now);

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const dEl = document.getElementById('timer-days');
      const hEl = document.getElementById('timer-hours');
      const mEl = document.getElementById('timer-minutes');
      const sEl = document.getElementById('timer-seconds');

      if (dEl) dEl.textContent = String(days).padStart(2, '0');
      if (hEl) hEl.textContent = String(hours).padStart(2, '0');
      if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
      if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
    };

    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // Helper to match pandal IDs seamlessly (exact match or slug / name fallback)
  findPandal(id, name = null) {
    if (!id && !name) return null;
    const idClean = id ? String(id).toLowerCase().trim() : '';
    const nameClean = name ? String(name).toLowerCase().replace(/[^a-z0-9]/g, '') : (id ? idClean.replace(/[^a-z0-9]/g, '') : '');
    
    return this.pandals.find(p => {
      if (id && (p.id === id || p.id.toLowerCase() === idClean)) return true;
      if (id && (p.id.startsWith(id + '-') || id.startsWith(p.id + '-'))) return true;
      const pNameClean = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (nameClean && (pNameClean === nameClean || pNameClean.includes(nameClean) || nameClean.includes(pNameClean))) return true;
      return false;
    }) || null;
  }

  // Helper to match eatery IDs seamlessly (exact match or slug / name fallback)
  findEatery(id, name = null) {
    if (!id && !name) return null;
    const idClean = id ? String(id).toLowerCase().trim() : '';
    const nameClean = name ? String(name).toLowerCase().replace(/[^a-z0-9]/g, '') : (id ? idClean.replace(/[^a-z0-9]/g, '') : '');

    return this.eateries.find(e => {
      if (id && (e.id === id || e.id.toLowerCase() === idClean)) return true;
      if (id && (e.id.startsWith(id + '-') || id.startsWith(e.id + '-'))) return true;
      const eNameClean = e.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (nameClean && (eNameClean === nameClean || eNameClean.includes(nameClean) || nameClean.includes(eNameClean))) return true;
      return false;
    }) || null;
  }

  isPandalBookmarked(id) {
    return this.parikrama.some(item => {
      if (item.type !== 'pandal') return false;
      return item.itemId === id || 
             (item.itemId && (item.itemId.startsWith(id) || id.startsWith(item.itemId)));
    });
  }

  togglePandalBookmark(id) {
    if (!this.requireAuth('save pandal to your plan')) return;
    const p = this.findPandal(id);
    if (!p) return;

    const existingIndex = this.parikrama.findIndex(item =>
      item.type === 'pandal' && (
        item.itemId === p.id ||
        (item.itemId && (item.itemId.startsWith(id) || id.startsWith(item.itemId)))
      )
    );

    const activePlan = this.getActivePlan();

    if (existingIndex >= 0) {
      this.parikrama.splice(existingIndex, 1);
      this.showToast(`Removed "${p.name}" from active plan "${activePlan.name}".`);
    } else {
      this.parikrama.push({
        id: 'item_' + Date.now(),
        type: 'pandal',
        itemId: p.id,
        name: p.name,
        zone: p.zone || p.location,
        timeSlot: p.bestTime ? p.bestTime.slice(0, 18) : '06:00 PM - 07:30 PM',
        distanceFromPrev: '1.8 km',
        duration: '75 mins',
        notes: `Theme: ${p.theme || 'Traditional'}. Metro: ${p.nearestMetro}.`
      });
      this.showToast(`Added "${p.name}" to active plan "${activePlan.name}"! 🏛️`);
    }

    this.savePlans();
    this.renderPandals();
    this.updateParikramaBadge();
  }

  // PANDALS RENDERER (Supports all 141 Pandals, 4 Zones, Subcategories & Search)
  renderPandals(resetLimit = false) {
    const grid = document.getElementById('pandal-grid');
    const resultCountEl = document.getElementById('pandal-results-count');
    const loadMoreContainer = document.getElementById('pandal-load-more-container');
    const loadMoreBtn = document.getElementById('pandal-load-more-btn');
    if (!grid) return;

    if (resetLimit) {
      this.pandalCurrentLimit = this.pandalPageSize;
    }

    let filtered = this.pandals;

    // 1. Zone Filter
    if (this.activeZoneFilter !== 'all') {
      filtered = filtered.filter(p => p.zoneKey === this.activeZoneFilter);
    }

    // 2. Category Filter
    if (this.activePandalFilter !== 'all') {
      filtered = filtered.filter(p => p.category.includes(this.activePandalFilter));
    }

    // 3. Search Filter
    if ((this.pandalSearchQuery || '').trim()) {
      const q = String(this.pandalSearchQuery).toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.zone.toLowerCase().includes(q) ||
        p.theme.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.nearestMetro.toLowerCase().includes(q) ||
        p.artisan.toLowerCase().includes(q) ||
        (p.tag && p.tag.toLowerCase().includes(q))
      );
    }

    // Update Result Summary Indicator
    const zoneLabels = {
      'all': 'across 4 zones',
      'north': 'in 🟡 North Kolkata',
      'south': 'in 🔴 South Kolkata',
      'central': 'in 🔵 Central & East Kolkata',
      'saltlake': 'in 🟣 Salt Lake & New Town'
    };
    if (resultCountEl) {
      resultCountEl.textContent = `Showing ${filtered.length} pandals ${zoneLabels[this.activeZoneFilter] || ''}`;
    }

    // Zone Badge classes & styles
    const zoneBadgeStyles = {
      'north': 'zone-badge-north',
      'south': 'zone-badge-south',
      'central': 'zone-badge-central',
      'saltlake': 'zone-badge-saltlake'
    };

    const zoneDotStyles = {
      'north': 'bg-tertiary',
      'south': 'bg-primary',
      'central': 'bg-secondary',
      'saltlake': 'bg-purple-400'
    };

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full p-12 text-center glass-card rounded-3xl flex flex-col items-center gap-4">
          <span class="material-symbols-outlined text-5xl text-tertiary">search_off</span>
          <h3 class="font-headline text-2xl font-bold text-white">No Pandals Found</h3>
          <p class="text-on-surface-variant max-w-md text-sm">No pandals matched your search query or filters. Try adjusting your region or filter settings.</p>
          <button class="px-6 py-2.5 rounded-full bg-primary text-black font-bold text-xs shadow-lg" onclick="window.sharodiyaApp.resetPandalFilters()">
            Reset All Filters
          </button>
        </div>
      `;
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';
      return;
    }

    // Slice for performance
    const visiblePandals = filtered.slice(0, this.pandalCurrentLimit);

    grid.innerHTML = visiblePandals.map((pandal) => {
      const isBookmarked = this.isPandalBookmarked(pandal.id);
      const isFeatured = pandal.isFeatured;
      const zoneBadgeClass = zoneBadgeStyles[pandal.zoneKey] || 'bg-surface-container';

      if (isFeatured && this.activePandalFilter === 'all' && this.activeZoneFilter === 'all' && !this.pandalSearchQuery && visiblePandals.indexOf(pandal) === 0) {
        return `
          <!-- Featured Flagship Large Card -->
          <article class="pandal-card group relative flex flex-col rounded-2xl overflow-hidden bg-surface-container-low shadow-2xl shadow-background hover:shadow-[0_10px_40px_rgba(211,16,24,0.25)] transition-all duration-700 lg:col-span-2 min-h-[440px] border border-white/10" data-id="${pandal.id}">
            <div class="absolute inset-0 w-full h-full">
              <img src="${pandal.image}" alt="${pandal.name}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" loading="lazy"/>
              <div class="absolute inset-0 bg-gradient-to-t from-surface via-surface/85 to-transparent"></div>
              <div class="absolute inset-0 bg-gradient-to-r from-surface/95 via-surface/50 to-transparent hidden lg:block"></div>
            </div>
            
            <div class="absolute top-6 left-6 flex items-center gap-2 z-10">
              <span class="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-black/60 backdrop-blur-md text-tertiary border border-tertiary/30 shadow-lg">
                Est. ${pandal.estYear}
              </span>
              <span class="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold ${zoneBadgeClass}">
                ${pandal.zone}
              </span>
            </div>

            <div class="relative z-10 flex flex-col justify-end h-full p-6 lg:p-10 lg:w-3/4 gap-4 mt-auto">
              <div>
                <h2 class="font-headline text-3xl lg:text-4xl text-white font-bold mb-2 group-hover:text-primary transition-colors leading-tight">${pandal.name}</h2>
                <p class="text-sm lg:text-base text-on-surface-variant line-clamp-2">${pandal.description}</p>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-xs font-mono">
                <span class="flex items-center gap-1.5 text-secondary bg-surface-container/70 px-3 py-1.5 rounded-lg border border-white/5">
                  <span class="material-symbols-outlined text-[18px]">directions_subway</span> Nearest Metro: ${pandal.nearestMetro}
                </span>
                <span class="flex items-center gap-1.5 text-tertiary bg-surface-container/70 px-3 py-1.5 rounded-lg border border-white/5">
                  <span class="material-symbols-outlined text-[18px]">history_edu</span> Est. ${pandal.estYear}
                </span>
                <span class="flex items-center gap-1.5 text-white/90 bg-surface-container/70 px-3 py-1.5 rounded-lg border border-white/5">
                  <span class="material-symbols-outlined text-[18px]">schedule</span> ${pandal.bestTime}
                </span>
              </div>

              <div class="flex flex-wrap gap-3 pt-2">
                <button class="bookmark-pandal-btn px-6 py-2.5 rounded-xl ${isBookmarked ? 'bg-primary text-black' : 'bg-primary-container text-white'} font-bold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95" data-id="${pandal.id}">
                  <span class="material-symbols-outlined text-[18px]">${isBookmarked ? 'bookmark_added' : 'add_task'}</span>
                  ${isBookmarked ? 'In Parikrama' : 'Add to Plan'}
                </button>
                <button class="view-pandal-details-btn px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-white font-bold text-xs transition-all flex items-center gap-1.5" data-id="${pandal.id}">
                  Details &amp; History <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <button class="locate-pandal-map-btn px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/30 font-bold text-xs transition-all flex items-center gap-1.5" data-id="${pandal.id}">
                  <span class="material-symbols-outlined text-[16px]">map</span> View on Map
                </button>
              </div>
            </div>
          </article>
        `;
      }

      return `
        <!-- Standard Card Layout -->
        <article class="pandal-card group relative flex flex-col rounded-2xl overflow-hidden bg-surface-container-low shadow-xl shadow-background hover:-translate-y-1.5 transition-all duration-500 border border-white/5 hover:border-white/20" data-id="${pandal.id}">
          <div class="relative h-52 w-full overflow-hidden">
            <img src="${pandal.image}" alt="${pandal.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy"/>
            <div class="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent"></div>
            
            <!-- Zone Pill on Top Left -->
            <span class="absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-md ${zoneBadgeClass}">
              ${pandal.zone}
            </span>

            <!-- Established Year on Top Right -->
            <span class="absolute top-3.5 right-3.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono text-tertiary border border-tertiary/30 font-bold">
              Est. ${pandal.estYear}
            </span>
          </div>

          <div class="p-5 relative z-10 flex flex-col gap-3 flex-grow bg-surface-container-low">
            <div>
              <h3 class="font-headline text-xl font-bold text-white group-hover:text-primary transition-colors truncate" title="${pandal.name}">${pandal.name}</h3>
              
              <!-- Nearest Metro Station -->
              <p class="text-xs text-secondary flex items-center gap-1.5 mt-1.5 font-mono font-medium">
                <span class="material-symbols-outlined text-[16px]">directions_subway</span>
                <span class="truncate">Nearest Metro: <strong>${pandal.nearestMetro}</strong></span>
              </p>
            </div>

            <!-- Authentic Short Overview -->
            <p class="text-xs text-on-surface line-clamp-2 leading-relaxed">${pandal.description}</p>

            <!-- Best Time to Visit -->
            <div class="flex items-center justify-between text-[11px] font-mono text-on-surface-variant pt-1 border-t border-white/5">
              <span class="flex items-center gap-1 text-tertiary">
                <span class="material-symbols-outlined text-[14px]">history_edu</span> Est. ${pandal.estYear}
              </span>
              <span class="flex items-center gap-1 text-on-surface">
                <span class="material-symbols-outlined text-[14px] text-primary">schedule</span> ${pandal.bestTime}
              </span>
            </div>

            <div class="mt-auto pt-2 flex items-center gap-2">
              <button class="bookmark-pandal-btn flex-1 py-2 rounded-lg ${isBookmarked ? 'bg-primary text-black' : 'bg-surface-container-highest text-primary hover:bg-primary hover:text-black'} font-bold text-xs transition-all flex items-center justify-center gap-1.5" data-id="${pandal.id}">
                <span class="material-symbols-outlined text-[16px]">${isBookmarked ? 'bookmark_added' : 'bookmark_add'}</span>
                <span>${isBookmarked ? 'In Plan' : 'Plan Visit'}</span>
              </button>
              <button class="view-pandal-details-btn p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-white transition-colors" data-id="${pandal.id}" title="Inspect Details & History">
                <span class="material-symbols-outlined text-[18px]">info</span>
              </button>
              <button class="locate-pandal-map-btn p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary transition-colors" data-id="${pandal.id}" title="Open in Puja Map">
                <span class="material-symbols-outlined text-[18px]">map</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Update Load More Button Visibility
    if (loadMoreContainer && loadMoreBtn) {
      if (this.pandalCurrentLimit >= filtered.length) {
        loadMoreContainer.style.display = 'none';
      } else {
        loadMoreContainer.style.display = 'flex';
        const remaining = filtered.length - this.pandalCurrentLimit;
        const textSpan = loadMoreBtn.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = `Show More (${remaining} remaining)`;
      }
    }

    // Reattach card event listeners
    grid.querySelectorAll('.bookmark-pandal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.togglePandalBookmark(id);
      });
    });

    grid.querySelectorAll('.view-pandal-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.openPandalModal(id);
      });
    });

    grid.querySelectorAll('.locate-pandal-map-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.focusPandalOnMap(id);
      });
    });
  }

  // Reset Filters Helper
  resetPandalFilters() {
    this.activeZoneFilter = 'all';
    this.activePandalFilter = 'all';
    this.pandalSearchQuery = '';
    const searchInput = document.getElementById('pandal-search-input');
    if (searchInput) searchInput.value = '';

    // Reset Zone buttons
    document.querySelectorAll('#pandal-zone-filters .zone-filter-btn').forEach(b => {
      b.className = 'zone-filter-btn px-5 py-2.5 rounded-full bg-surface-container text-on-surface-variant hover:text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all';
    });
    const allZoneBtn = document.querySelector('#pandal-zone-filters [data-zone="all"]');
    if (allZoneBtn) allZoneBtn.className = 'zone-filter-btn px-5 py-2.5 rounded-full zone-btn-active-all text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all';

    // Reset Category buttons
    document.querySelectorAll('#pandal-filters .filter-btn').forEach(b => {
      b.classList.remove('bg-primary', 'text-black');
      b.classList.add('bg-surface-container-high', 'text-on-surface-variant');
    });
    const allCatBtn = document.querySelector('#pandal-filters [data-filter="all"]');
    if (allCatBtn) {
      allCatBtn.classList.add('bg-primary', 'text-black');
      allCatBtn.classList.remove('bg-surface-container-high', 'text-on-surface-variant');
    }

    this.renderPandals(true);
  }

  // EXACT DETAILS MODAL IMPLEMENTATION
  openPandalModal(id) {
    if (!this.requireAuth('view pandal details')) return;
    const p = this.findPandal(id);
    if (!p) return;

    const modal = document.getElementById('pandal-modal');
    const content = document.getElementById('pandal-modal-content');
    if (!modal || !content) return;

    const isBookmarked = this.isPandalBookmarked(p.id);

    content.innerHTML = `
      <div class="relative w-full h-64 rounded-t-3xl overflow-hidden">
        <img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover"/>
        <div class="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
        
        <button id="close-modal-btn" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-20">
          <span class="material-symbols-outlined">close</span>
        </button>

        <div class="absolute bottom-5 left-6 right-6 z-10">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs uppercase tracking-widest text-tertiary font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">${p.zone}</span>
            <span class="font-mono text-xs uppercase tracking-widest text-primary font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">Est. ${p.estYear}</span>
          </div>
          <h2 class="font-headline text-3xl md:text-4xl text-white font-black mt-2 leading-tight">${p.name}</h2>
        </div>
      </div>

      <div class="p-6 md:p-8 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div class="bg-surface-container p-4 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
              <span class="material-symbols-outlined text-2xl">history_edu</span>
            </div>
            <div>
              <span class="text-[11px] font-mono uppercase text-on-surface-variant block font-semibold">Established Year</span>
              <span class="font-bold text-sm text-white">${p.estYear}</span>
            </div>
          </div>

          <div class="bg-surface-container p-4 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined text-2xl">directions_subway</span>
            </div>
            <div>
              <span class="text-[11px] font-mono uppercase text-on-surface-variant block font-semibold">Nearest Metro</span>
              <span class="font-bold text-sm text-white">${p.nearestMetro}</span>
            </div>
          </div>

          <div class="bg-surface-container p-4 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <span class="material-symbols-outlined text-2xl">schedule</span>
            </div>
            <div>
              <span class="text-[11px] font-mono uppercase text-on-surface-variant block font-semibold">Best Time to Visit</span>
              <span class="font-bold text-xs text-white">${p.bestTime}</span>
            </div>
          </div>
        </div>

        <div class="bg-surface-container-high/40 p-5 rounded-2xl border border-white/10 space-y-2">
          <div class="flex items-center gap-2 text-tertiary">
            <span class="material-symbols-outlined text-[20px]">auto_stories</span>
            <h4 class="text-xs font-mono uppercase tracking-wider font-bold">A Short History</h4>
          </div>
          <p class="text-on-surface text-sm md:text-base leading-relaxed">${p.history}</p>
        </div>

        <div class="bg-surface-container-high/60 p-5 rounded-2xl flex items-start gap-3.5 border-l-4 border-primary">
          <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <span class="material-symbols-outlined text-2xl">location_on</span>
          </div>
          <div class="space-y-1">
            <h4 class="text-xs font-mono uppercase tracking-wider font-bold text-white">Location &amp; Landmark</h4>
            <p class="text-sm md:text-base text-white font-medium">${p.location}</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10">
          <button id="modal-add-plan-btn" class="flex-1 py-3.5 px-6 rounded-full ${isBookmarked ? 'bg-primary text-black' : 'bg-primary-container text-white hover:bg-primary-container/80'} font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all">
            <span class="material-symbols-outlined">${isBookmarked ? 'bookmark_added' : 'bookmark_add'}</span>
            ${isBookmarked ? 'In Parikrama Plan' : 'Add to Puja Parikrama'}
          </button>
          <button id="modal-locate-map-btn" class="py-3.5 px-6 rounded-full bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/30 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all">
            <span class="material-symbols-outlined">map</span>
            <span>View on Puja Map</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('close-modal-btn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    document.getElementById('modal-add-plan-btn')?.addEventListener('click', () => {
      this.togglePandalBookmark(p.id);
      this.openPandalModal(p.id);
    });

    document.getElementById('modal-locate-map-btn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      this.focusPandalOnMap(p.id);
    });
  }

  // Helper: Geodesic Haversine Distance in Meters
  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dphi = ((lat2 - lat1) * Math.PI) / 180;
    const dlambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ==========================================
  // DEDICATED MASTER PUJA & FOOD MAP ENGINE
  // ==========================================
  initMasterMap() {
    const mapContainer = document.getElementById('master-osm-map');
    if (!mapContainer || typeof window.L === 'undefined') return;

    if (this.masterMap) {
      setTimeout(() => {
        if (this.masterMap) {
          this.masterMap.invalidateSize();
          this.updateMasterMap();
        }
      }, 150);
      return;
    }

    try {
      // Center covering all zones of Kolkata with strict zoom out limits & bounds locking
      this.masterMap = window.L.map('master-osm-map', {
        center: [22.5650, 88.3650],
        zoom: 12,
        minZoom: 11, // Highest zoom out strictly restricted to Greater Kolkata Outskirts
        maxZoom: 19, // Deep zoom into pandal streets
        maxBounds: KOLKATA_OUTSKIRTS_BOUNDS, // Prevent panning outside Kolkata metropolitan region
        maxBoundsViscosity: 1.0, // Hard boundary elasticity to keep map locked inside Kolkata
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Apply initial theme tiles (Dark Matter or Voyager - Free, Zero API Key needed)
      this.updateMapTheme();

      // Initialize layer groups and add to map (Metro removed from Pujo Map, foodLines added)
      this.masterLayers.pandals = window.L.layerGroup().addTo(this.masterMap);
      this.masterLayers.foodLines = window.L.layerGroup().addTo(this.masterMap);
      this.masterLayers.eateries = window.L.layerGroup().addTo(this.masterMap);
      this.masterLayers.trail = window.L.layerGroup().addTo(this.masterMap);

      // Deselect pandal food focus if user clicks outside on map canvas
      this.masterMap.on('click', (e) => {
        const isMarkerClick = e.originalEvent && (e.originalEvent.target.closest('.leaflet-marker-icon') || e.originalEvent.target.closest('.leaflet-popup'));
        if (!isMarkerClick && this.selectedMapPandalId) {
          this.clearPandalFoodFocus();
        }
      });

      // Clear pandal focus pill button
      document.getElementById('map-clear-pandal-focus-btn')?.addEventListener('click', () => {
        this.clearPandalFoodFocus();
      });

      this.updateMasterMap();

      setTimeout(() => {
        if (this.masterMap) this.masterMap.invalidateSize();
      }, 200);

    } catch (err) {
      console.error('Master OpenStreetMap initialization error:', err);
    }
  }

  // Synchronizes UI elements for Normal Map Mode vs Plan Route Map Mode
  syncPlanMapModeUI() {
    const trailToggle = document.getElementById('layer-toggle-trail');
    const trailZoomBtn = document.getElementById('master-map-trail-zoom-btn');
    const planBanner = document.getElementById('map-plan-mode-banner');
    const planTitle = document.getElementById('map-plan-mode-title');
    const planDay = document.getElementById('map-plan-mode-day');
    const planSubtitle = document.getElementById('map-plan-mode-subtitle');
    const zoneFiltersContainer = document.getElementById('master-map-zone-filters-container');
    const modeBtnPlan = document.getElementById('mode-btn-plan');
    const modeBtnAll = document.getElementById('mode-btn-all');
    const modePlanBtnText = document.getElementById('mode-plan-btn-text');

    const plan = this.getActivePlan();
    const plannedPandals = (plan.items || []).filter(i => i.type === 'pandal');
    const plannedEateries = (plan.items || []).filter(i => i.type === 'eatery');
    const stopCount = (plan.items || []).length;

    if (modePlanBtnText) {
      modePlanBtnText.textContent = `My Planned Route (${stopCount} stops)`;
    }

    if (this.isPlanMapMode) {
      if (modeBtnPlan) {
        modeBtnPlan.className = 'px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 bg-primary text-black shadow-md';
      }
      if (modeBtnAll) {
        modeBtnAll.className = 'px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 text-on-surface-variant hover:text-white bg-transparent';
      }

      if (trailToggle) trailToggle.classList.remove('hidden');
      if (trailZoomBtn) trailZoomBtn.classList.remove('hidden');
      if (planBanner) planBanner.classList.remove('hidden');
      if (zoneFiltersContainer) zoneFiltersContainer.classList.add('hidden');

      if (planTitle) planTitle.textContent = `Plan Route: ${plan.name}`;
      if (planDay) planDay.textContent = plan.day || 'Maha Sasthi';
      if (planSubtitle) planSubtitle.textContent = `Showing ${plannedPandals.length} planned pandals, ${plannedEateries.length} planned eateries & your custom Parikrama trail.`;
    } else {
      if (modeBtnPlan) {
        modeBtnPlan.className = 'px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 text-on-surface-variant hover:text-white bg-transparent';
      }
      if (modeBtnAll) {
        modeBtnAll.className = 'px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 bg-primary text-black shadow-md';
      }

      if (trailToggle) trailToggle.classList.add('hidden');
      if (trailZoomBtn) trailZoomBtn.classList.add('hidden');
      if (planBanner) planBanner.classList.add('hidden');
      if (zoneFiltersContainer) zoneFiltersContainer.classList.remove('hidden');
    }
  }

  // Opens a specific plan (or active plan) directly on the Puja Map in Plan Route Mode
  openPlanInMap(planId = null, focusItemId = null) {
    if (planId && this.plans.some(p => p.id === planId)) {
      this.activePlanId = planId;
      this.savePlans();
    }
    const plan = this.getActivePlan();
    this.isPlanMapMode = true;
    this.activeLayers.trail = true;

    // Navigate to map view
    this.navigateTo('map');

    setTimeout(() => {
      this.syncPlanMapModeUI();
      if (!this.masterMap) {
        this.initMasterMap();
      } else {
        this.masterMap.invalidateSize();
        this.updateMasterMap();
      }
      setTimeout(() => {
        if (focusItemId) {
          const item = (plan.items || []).find(i => i.id === focusItemId || i.itemId === focusItemId);
          if (item) {
            let coords = null;
            if (item.type === 'pandal') {
              const p = this.findPandal(item.itemId || item.id, item.name);
              if (p && p.coordinates) coords = p.coordinates;
            } else if (item.type === 'eatery') {
              const e = this.findEatery(item.itemId || item.id, item.name);
              if (e && e.coordinates) coords = e.coordinates;
            }
            if (coords && this.masterMap) {
              this.masterMap.flyTo([coords.lat, coords.lng], 16, { duration: 1.0 });
              return;
            }
          }
        }
        this.fitMapToTrail();
      }, 350);
    }, 120);

    const stopCount = (plan.items || []).length;
    this.showToast(`🗺️ Viewing "${plan.name}" (${stopCount} stops) Parikrama Trail on Puja Map!`);
  }

  // Exits Plan Route Mode back to full 141 Pandals & 250 Eateries map
  exitPlanMapMode() {
    this.isPlanMapMode = false;
    this.activeLayers.trail = false;
    this.syncPlanMapModeUI();
    this.updateMasterMap();
    if (this.masterMap) {
      this.masterMap.flyTo([22.5650, 88.3650], 12, { duration: 1.0 });
    }
    this.showToast('🌐 Returned to Full Kolkata Map (141 Pandals & 250 Eateries)');
  }

  updateMasterMap() {
    if (!this.masterMap) return;

    this.syncPlanMapModeUI();
    this.updateMapPandals();
    this.updateMapEateries();
    this.updateMapTrail();

    // Update Counter Badges
    const pandalStat = document.getElementById('map-stat-pandals');
    const eateryStat = document.getElementById('map-stat-eateries');
    if (pandalStat) {
      if (this.isPlanMapMode) {
        const pCount = this.parikrama.filter(i => i.type === 'pandal').length;
        pandalStat.textContent = `${pCount} Planned`;
      } else {
        pandalStat.textContent = this.pandals.length;
      }
    }
    if (eateryStat) {
      if (this.isPlanMapMode) {
        const eCount = this.parikrama.filter(i => i.type === 'eatery').length;
        eateryStat.textContent = `${eCount} Planned`;
      } else {
        eateryStat.textContent = this.eateries.length;
      }
    }
  }

  updateMapPandals() {
    if (!this.masterLayers.pandals) return;
    this.masterLayers.pandals.clearLayers();
    this.mapPandalMarkers.clear();

    if (!this.activeLayers.pandals) return;

    let filtered = this.pandals;

    // In Plan Map Mode: Show ONLY the exact planned pandals from the active plan
    if (this.isPlanMapMode) {
      const plannedPandalObjs = this.parikrama
        .filter(i => i.type === 'pandal')
        .map(i => this.findPandal(i.itemId || i.id, i.name))
        .filter(Boolean);
      const exactPandalIds = new Set(plannedPandalObjs.map(p => p.id));
      filtered = filtered.filter(p => exactPandalIds.has(p.id));
    } else if (this.mapZoneFilter !== 'all') {
      filtered = filtered.filter(p => p.zoneKey === this.mapZoneFilter);
    }

    filtered.forEach(pandal => {
      if (!pandal.coordinates) return;

      const isSelected = pandal.id === this.selectedMapPandalId;
      const pinClass = `pandal-pin-${pandal.zoneKey || 'north'}`;
      const customIcon = window.L.divIcon({
        className: 'custom-pandal-pin-container',
        html: `
          <div class="pandal-map-pin ${pinClass} ${isSelected ? 'selected-pandal-pin' : ''}" title="${pandal.name}">
            <span class="material-symbols-outlined text-[16px]">temple_hindu</span>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16]
      });

      const isBookmarked = this.isPandalBookmarked(pandal.id);

      const marker = window.L.marker([pandal.coordinates.lat, pandal.coordinates.lng], { icon: customIcon });

      // Click on pandal selects it and displays its nearest food joints
      marker.on('click', () => {
        this.selectPandalOnMasterMap(pandal.id, true);
      });

      // Quick hover tooltip
      marker.bindTooltip(`
        <div class="p-1 font-mono text-xs font-bold text-white flex items-center gap-1">
          <span>🛕</span> <span>${pandal.name}</span>
        </div>
      `, {
        direction: 'top',
        offset: [0, -15],
        className: 'glass-card border border-white/20 text-white rounded-xl shadow-lg'
      });

      this.masterLayers.pandals.addLayer(marker);
      this.mapPandalMarkers.set(pandal.id, marker);
    });
  }

  selectPandalOnMasterMap(pandalId, autoZoom = true) {
    this.selectedMapPandalId = pandalId;
    const p = this.findPandal(pandalId);
    if (!p || !p.coordinates) return;

    // 1. Calculate distance from this pandal to all food joints & sort ascending
    const sortedEateries = this.eateries.map(e => {
      if (!e.coordinates) return null;
      const d = this.calculateDistanceMeters(p.coordinates.lat, p.coordinates.lng, e.coordinates.lat, e.coordinates.lng);
      return {
        ...e,
        distanceMeters: Math.round(d),
        distanceText: d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`,
        walkMinutes: Math.max(1, Math.round(d / 80)),
        walkText: `${Math.max(1, Math.round(d / 80))} min walk`
      };
    }).filter(Boolean).sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Pick top 4-6 closest food joints
    const nearestEateries = sortedEateries.slice(0, 5);

    // 2. Clear old lines and eateries
    if (this.masterLayers.foodLines) this.masterLayers.foodLines.clearLayers();
    if (this.masterLayers.eateries) this.masterLayers.eateries.clearLayers();
    this.mapEateryMarkers.clear();

    // 3. Render ONLY these nearest food joints on the map
    nearestEateries.forEach(eatery => {
      const foodIcon = window.L.divIcon({
        className: 'custom-osm-pin-container',
        html: `
          <div class="food-map-pin nearest-food-pin" title="${eatery.name} (${eatery.cuisine || 'Food'}) - ${eatery.distanceText}">
            <span class="material-symbols-outlined text-[16px]">restaurant</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -17]
      });

      const isBookmarked = this.parikrama.some(item => item.itemId === eatery.id);

      const eateryPopup = `
        <div class="w-64 overflow-hidden rounded-2xl bg-[#1e2024] font-body text-white shadow-2xl">
          <div class="h-28 w-full bg-cover bg-center relative" style="background-image: url('${eatery.image}')">
            <div class="absolute inset-0 bg-gradient-to-t from-[#1e2024] via-[#1e2024]/40 to-transparent"></div>
            <span class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] font-mono text-tertiary font-bold">★ ${eatery.rating}</span>
            <span class="absolute bottom-2 left-2 text-[10px] font-mono uppercase text-secondary font-bold truncate max-w-[170px]">${eatery.tag || eatery.cuisine}</span>
          </div>
          <div class="p-3 space-y-2">
            <h4 class="font-headline text-sm font-bold text-white leading-tight">${eatery.name}</h4>
            <div class="text-xs text-yellow-300 font-mono font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">directions_walk</span>
              <span>📍 ${eatery.distanceText} · ${eatery.walkText}</span>
            </div>
            <div class="text-[11px] text-on-surface-variant font-mono">
              <strong>Must-Try:</strong> ${(eatery.mustTry || []).slice(0, 2).join(', ')}
            </div>
            <div class="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <button onclick="window.sharodiyaApp.openEateryModal('${eatery.id}')" class="px-2.5 py-1 rounded-xl bg-surface-container-high hover:bg-white/15 text-white text-[11px] font-bold transition-all">
                Details
              </button>
              <a href="https://www.google.com/maps/dir/?api=1&origin=${p.coordinates.lat},${p.coordinates.lng}&destination=${eatery.coordinates.lat},${eatery.coordinates.lng}&travelmode=walking" target="_blank" rel="noopener" class="px-2.5 py-1 rounded-xl bg-secondary/20 text-secondary border border-secondary/30 text-[11px] font-bold transition-all flex items-center gap-1">
                <span>Walk Route</span>
                <span class="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const marker = window.L.marker([eatery.coordinates.lat, eatery.coordinates.lng], { icon: foodIcon })
        .bindPopup(eateryPopup, { maxWidth: 280, className: 'dark-pandal-food-popup' });

      marker.bindTooltip(`
        <div class="p-1 font-mono text-xs font-bold text-white">
          🍽️ ${eatery.name}<br/>
          <span class="text-yellow-300 text-[10px]">📍 ${eatery.distanceText} · ${eatery.walkText}</span>
        </div>
      `, {
        direction: 'top',
        offset: [0, -16],
        className: 'glass-card border border-white/20 text-white rounded-xl'
      });

      this.masterLayers.eateries.addLayer(marker);
      this.mapEateryMarkers.set(eatery.id, marker);

      // 4. Draw glowing dashed connector line from pandal to this eatery
      const connectorLine = window.L.polyline([
        [p.coordinates.lat, p.coordinates.lng],
        [eatery.coordinates.lat, eatery.coordinates.lng]
      ], {
        color: '#00e0ff',
        weight: 2.5,
        opacity: 0.75,
        dashArray: '6, 6',
        className: 'pandal-food-connector-line'
      });

      connectorLine.bindTooltip(`📍 ${eatery.distanceText} walk to ${eatery.name}`, { sticky: true, className: 'font-mono text-[10px]' });
      this.masterLayers.foodLines.addLayer(connectorLine);
    });

    // 5. Update selected pandal pin style
    document.querySelectorAll('.pandal-map-pin').forEach(pin => pin.classList.remove('selected-pandal-pin'));
    const pandalMarker = this.mapPandalMarkers.get(p.id);
    if (pandalMarker && pandalMarker._icon) {
      const pinEl = pandalMarker._icon.querySelector('.pandal-map-pin');
      if (pinEl) pinEl.classList.add('selected-pandal-pin');
    }

    // 6. Build Rich Pandal Popup with Nearest Food Joints list
    const isBookmarked = this.isPandalBookmarked(p.id);
    const popupContent = `
      <div class="w-72 overflow-hidden rounded-2xl bg-[#1a1c1e] font-body text-white shadow-2xl">
        <div class="h-32 w-full bg-cover bg-center relative" style="background-image: url('${p.image}')">
          <div class="absolute inset-0 bg-gradient-to-t from-[#1a1c1e] via-[#1a1c1e]/40 to-transparent"></div>
          <span class="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-surface/80 text-[10px] font-mono text-tertiary font-bold">Est. ${p.estYear}</span>
          <span class="absolute bottom-2 left-3 text-[11px] font-mono uppercase text-secondary font-bold truncate max-w-[190px]">${p.zone}</span>
        </div>
        <div class="p-3.5 space-y-3">
          <div>
            <h4 class="font-headline text-base font-bold text-white leading-tight">${p.name}</h4>
            <div class="text-[11px] font-mono text-tertiary flex items-center gap-1 mt-0.5">
              <span class="material-symbols-outlined text-[14px]">schedule</span> ${p.bestTime}
            </div>
          </div>

          <!-- Nearest Food Joints List -->
          <div class="space-y-2 pt-2 border-t border-white/10">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-mono uppercase text-secondary font-bold flex items-center gap-1">
                <span>🍽️</span> Nearest Food Joints (${nearestEateries.length})
              </span>
              <span class="text-[9px] font-mono text-on-surface-variant">Walking Distance</span>
            </div>

            <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              ${nearestEateries.map(e => `
                <div class="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between gap-2 cursor-pointer" onclick="window.sharodiyaApp.openEateryModal('${e.id}')">
                  <div class="overflow-hidden">
                    <div class="text-xs font-bold text-white truncate hover:text-secondary">${e.name}</div>
                    <div class="text-[10px] text-yellow-300 font-mono flex items-center gap-1">
                      <span>📍 ${e.distanceText}</span>
                      <span class="text-white/30">•</span>
                      <span>${e.walkText}</span>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-tertiary shrink-0">★ ${e.rating}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <button onclick="window.sharodiyaApp.openPandalModal('${p.id}')" class="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-white/15 text-white text-[11px] font-bold transition-all">
              Details &amp; History
            </button>
            <button onclick="window.sharodiyaApp.togglePandalBookmark('${p.id}')" class="px-3 py-1.5 rounded-xl ${isBookmarked ? 'bg-primary text-black' : 'bg-primary-container text-white'} text-[11px] font-bold transition-all">
              ${isBookmarked ? 'In Plan' : '+ Add'}
            </button>
          </div>
        </div>
      </div>
    `;

    if (pandalMarker) {
      pandalMarker.bindPopup(popupContent, { maxWidth: 300, className: 'dark-pandal-food-popup' });
      pandalMarker.openPopup();
    }

    // 7. Update floating focus pill on map
    const focusPill = document.getElementById('map-pandal-food-focus-pill');
    const focusPandalName = document.getElementById('map-focused-pandal-name');
    if (focusPill && focusPandalName) {
      focusPandalName.textContent = p.name;
      focusPill.classList.remove('hidden');
    }

    // 8. Smoothly fly camera to encompass pandal and its closest eateries
    if (autoZoom && this.masterMap) {
      const allCoords = [[p.coordinates.lat, p.coordinates.lng], ...nearestEateries.map(e => [e.coordinates.lat, e.coordinates.lng])];
      const bounds = window.L.latLngBounds(allCoords);
      this.masterMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 1.0 });
    }
  }

  clearPandalFoodFocus() {
    this.selectedMapPandalId = null;
    if (this.masterLayers.foodLines) this.masterLayers.foodLines.clearLayers();

    const focusPill = document.getElementById('map-pandal-food-focus-pill');
    if (focusPill) focusPill.classList.add('hidden');

    document.querySelectorAll('.pandal-map-pin').forEach(pin => pin.classList.remove('selected-pandal-pin'));
    this.updateMapPandals();
    this.updateMapEateries();
  }

  updateMapEateries() {
    if (!this.masterLayers.eateries) return;

    // If a specific pandal is selected, maintain its nearest food joints
    if (this.selectedMapPandalId) {
      this.selectPandalOnMasterMap(this.selectedMapPandalId, false);
      return;
    }

    this.masterLayers.eateries.clearLayers();
    this.mapEateryMarkers.clear();

    if (!this.activeLayers.eateries) return;

    let filtered = this.eateries;

    // In Plan Map Mode: Show ONLY the exact planned eateries from the active plan
    if (this.isPlanMapMode) {
      const plannedEateryObjs = this.parikrama
        .filter(i => i.type === 'eatery')
        .map(i => this.findEatery(i.itemId || i.id, i.name))
        .filter(Boolean);
      const exactEateryIds = new Set(plannedEateryObjs.map(e => e.id));
      filtered = filtered.filter(e => exactEateryIds.has(e.id));
    }

    filtered.forEach(eatery => {
      if (!eatery.coordinates) return;

      // Single unified icon for all food joint types with calm, non-glare finish
      const customIcon = window.L.divIcon({
        className: 'custom-osm-pin-container',
        html: `
          <div class="food-map-pin" title="${eatery.name} (${eatery.cuisine || eatery.tag || 'Food'})">
            <span class="material-symbols-outlined text-[16px]">restaurant</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -15]
      });

      const isBookmarked = this.parikrama.some(item => item.itemId === eatery.id);

      const popupContent = `
        <div class="w-64 overflow-hidden rounded-xl bg-surface-container font-body">
          <div class="h-28 w-full bg-cover bg-center relative" style="background-image: url('${eatery.image}')">
            <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent"></div>
            <span class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-surface/80 text-[10px] font-mono text-tertiary font-bold">★ ${eatery.rating}</span>
            <span class="absolute bottom-2 left-2 text-[10px] font-mono uppercase text-secondary font-bold">${eatery.tag}</span>
          </div>
          <div class="p-3 space-y-2">
            <h4 class="font-headline text-base font-bold text-white leading-tight">${eatery.name}</h4>
            <p class="text-xs text-on-surface-variant line-clamp-2">${eatery.description}</p>
            <div class="text-[11px] font-mono text-tertiary">
              <strong>Must-Try:</strong> ${(eatery.mustTry || []).slice(0, 2).join(', ')}
            </div>
            <div class="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <button onclick="window.sharodiyaApp.openEateryModal('${eatery.id}')" class="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-white text-[10px] font-bold transition-all">
                Details
              </button>
              <button onclick="window.sharodiyaApp.toggleEateryBookmark('${eatery.id}')" class="px-2.5 py-1 rounded ${isBookmarked ? 'bg-primary text-black' : 'bg-primary-container text-white'} text-[10px] font-bold transition-all">
                ${isBookmarked ? 'In Plan' : '+ Add'}
              </button>
            </div>
          </div>
        </div>
      `;

      const marker = window.L.marker([eatery.coordinates.lat, eatery.coordinates.lng], { icon: customIcon })
        .bindPopup(popupContent, { maxWidth: 280, className: 'dark-food-popup' });

      this.masterLayers.eateries.addLayer(marker);
      this.mapEateryMarkers.set(eatery.id, marker);
    });
  }

  async updateMapTrail() {
    if (!this.masterLayers.trail) return;
    this.masterLayers.trail.clearLayers();
    this.mapTrailMarkers = [];
    this.mapRoadCoordinates = [];

    const statsBadge = document.getElementById('master-map-road-stats');
    const statsText = document.getElementById('master-map-road-stats-text');

    if (!this.isPlanMapMode || !this.activeLayers.trail || this.parikrama.length === 0) {
      if (statsBadge) statsBadge.classList.add('hidden');
      return;
    }

    const waypoints = [];

    this.parikrama.forEach((item, idx) => {
      let coords = null;
      if (item.type === 'pandal') {
        const p = this.findPandal(item.itemId || item.id, item.name);
        if (p && p.coordinates) coords = p.coordinates;
      } else if (item.type === 'eatery') {
        const e = this.findEatery(item.itemId || item.id, item.name);
        if (e && e.coordinates) coords = e.coordinates;
      }

      if (coords) {
        waypoints.push({ lat: coords.lat, lng: coords.lng, name: item.name });

        const customBadgeIcon = window.L.divIcon({
          className: 'custom-waypoint-badge-container',
          html: `
            <div class="parikrama-waypoint-pin" title="Stop ${idx + 1}: ${item.name}">
              ${idx + 1}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16]
        });

        const popupContent = `
          <div class="w-56 p-3 rounded-xl bg-surface-container font-body space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary text-[10px] font-mono font-bold">Stop ${idx + 1}</span>
              <span class="text-[10px] font-mono text-on-surface-variant">${item.timeSlot}</span>
            </div>
            <h4 class="font-headline text-sm font-bold text-white">${item.name}</h4>
            <p class="text-[11px] text-on-surface-variant">${item.notes || ''}</p>
          </div>
        `;

        const marker = window.L.marker([coords.lat, coords.lng], { icon: customBadgeIcon })
          .bindPopup(popupContent, { maxWidth: 240, className: 'dark-pandal-popup' });

        this.masterLayers.trail.addLayer(marker);
        this.mapTrailMarkers.push(marker);
      }
    });

    if (waypoints.length > 1) {
      this._trailReqToken = (this._trailReqToken || 0) + 1;
      const currentToken = this._trailReqToken;

      if (statsBadge && statsText) {
        statsBadge.classList.remove('hidden');
        statsText.textContent = `Calculating street route (${waypoints.length} stops)...`;
      }

      try {
        const routeRes = await this.apiFetch('/api/route', {
          method: 'POST',
          body: JSON.stringify({ waypoints: waypoints.map(w => ({ lat: w.lat, lng: w.lng })), mode: 'driving' })
        });

        if (currentToken !== this._trailReqToken) return;

        let roadPoints = [];
        let totalDist = 0;
        let totalMins = 0;

        if (routeRes && routeRes.success && Array.isArray(routeRes.coordinates) && routeRes.coordinates.length > 0) {
          roadPoints = routeRes.coordinates;
          totalDist = routeRes.totalDistanceKm || 0;
          totalMins = routeRes.totalDurationMins || 0;
        } else {
          roadPoints = waypoints.map(w => [w.lat, w.lng]);
        }

        this.mapRoadCoordinates = roadPoints;

        // Render multi-layered glowing real road polyline
        this.mapTrailCasing = window.L.polyline(roadPoints, {
          color: '#d31018',
          weight: 7,
          opacity: 0.4,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'parikrama-road-glow'
        });

        this.mapTrailPolyline = window.L.polyline(roadPoints, {
          color: '#ffb4ab',
          weight: 3.5,
          opacity: 0.95,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round',
          className: 'parikrama-road-path'
        });

        if (totalDist > 0) {
          const tooltipMsg = `🛣️ Real-Road Route: ${totalDist} km • ~${Math.round(totalMins)} mins drive (${waypoints.length} stops)`;
          this.mapTrailPolyline.bindTooltip(tooltipMsg, {
            sticky: true,
            className: 'parikrama-route-tooltip'
          });

          if (statsBadge && statsText) {
            statsBadge.classList.remove('hidden');
            statsText.textContent = `${totalDist} km Real Road • ~${Math.round(totalMins)} mins`;
          }
        }

        this.masterLayers.trail.addLayer(this.mapTrailCasing);
        this.masterLayers.trail.addLayer(this.mapTrailPolyline);

      } catch (err) {
        console.warn('[Map Trail] Road route error, falling back:', err);
        const simpleCoords = waypoints.map(w => [w.lat, w.lng]);
        this.mapRoadCoordinates = simpleCoords;
        this.mapTrailPolyline = window.L.polyline(simpleCoords, {
          color: '#ffb4ab',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
          lineCap: 'round',
          className: 'parikrama-trail-polyline'
        });
        this.masterLayers.trail.addLayer(this.mapTrailPolyline);
      }
    } else {
      if (statsBadge) statsBadge.classList.add('hidden');
    }
  }

  openOnMasterMap(lat, lng, zoom = 15, entityType = null, entityId = null) {
    this.navigateTo('map');

    setTimeout(() => {
      if (!this.masterMap) {
        this.initMasterMap();
      }

      setTimeout(() => {
        if (this.masterMap) {
          this.masterMap.invalidateSize();

          if (entityType === 'pandal' && entityId) {
            this.selectPandalOnMasterMap(entityId, true);
          } else {
            this.masterMap.flyTo([lat, lng], zoom, { duration: 1.2 });
            setTimeout(() => {
              if (entityType === 'eatery') {
                const marker = this.mapEateryMarkers.get(entityId);
                if (marker) marker.openPopup();
              }
            }, 700);
          }
        }
      }, 200);
    }, 100);
  }

  focusPandalOnMap(id) {
    this.isPlanMapMode = false;
    const p = this.findPandal(id);
    if (!p || !p.coordinates) return;
    this.openOnMasterMap(p.coordinates.lat, p.coordinates.lng, 16, 'pandal', p.id);
  }

  focusEateryOnMap(id) {
    this.isPlanMapMode = false;
    const e = this.findEatery(id);
    if (!e || !e.coordinates) return;
    this.openOnMasterMap(e.coordinates.lat, e.coordinates.lng, 16, 'eatery', e.id);
  }

  fitMapToTrail() {
    if (!this.masterMap) return;
    if (this.mapTrailMarkers.length === 0 && (!this.mapRoadCoordinates || this.mapRoadCoordinates.length === 0)) {
      this.showToast('No planned stops in your Parikrama to zoom into.');
      return;
    }

    if (this.mapRoadCoordinates && this.mapRoadCoordinates.length > 0) {
      const bounds = window.L.latLngBounds(this.mapRoadCoordinates);
      this.masterMap.fitBounds(bounds.pad(0.15), { duration: 1.0 });
    } else {
      const group = window.L.featureGroup(this.mapTrailMarkers);
      this.masterMap.fitBounds(group.getBounds().pad(0.2), { duration: 1.0 });
    }
    this.showToast(`🎯 Zoomed to fit complete ${this.mapTrailMarkers.length}-stop street route!`);
  }

  locateUserOnMap() {
    if (!navigator.geolocation) {
      this.showToast('Geolocation is not supported by your browser.');
      return;
    }

    this.showToast('📡 Finding your location in Kolkata...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (this.masterMap) {
          if (this.userLocationMarker) {
            this.userLocationMarker.remove();
          }

          const userIcon = window.L.divIcon({
            className: 'custom-gps-pin-container',
            html: `
              <div class="user-gps-pin">
                <span class="material-symbols-outlined text-[16px]">my_location</span>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          this.userLocationMarker = window.L.marker([latitude, longitude], { icon: userIcon })
            .addTo(this.masterMap)
            .bindPopup('<div class="p-2 text-xs font-bold text-white">📍 You are here</div>')
            .openPopup();

          this.masterMap.flyTo([latitude, longitude], 15, { duration: 1.2 });
          this.showToast('📍 Located you on the Puja Map!');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        if (this.masterMap) {
          this.masterMap.flyTo([22.5650, 88.3650], 13);
        }
        this.showToast('Could not fetch GPS location. Centered on Kolkata.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  toggleMapFullscreen() {
    const mapContainer = document.getElementById('master-osm-map')?.parentElement;
    if (!mapContainer) return;

    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // EATERY MODAL IMPLEMENTATION
  openEateryModal(id) {
    if (!this.requireAuth('view food joint details')) return;
    const eatery = this.eateries.find(e => e.id === id || (e.id && (e.id.startsWith(id) || id.startsWith(e.id))));
    if (!eatery) return;

    const modal = document.getElementById('eatery-modal');
    const content = document.getElementById('eatery-modal-content');
    if (!modal || !content) return;

    const isBookmarked = this.parikrama.some(item => item.itemId === eatery.id);

    content.innerHTML = `
      <div class="relative w-full h-64 rounded-t-3xl overflow-hidden">
        <img src="${eatery.image}" alt="${eatery.name}" class="w-full h-full object-cover"/>
        <div class="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
        
        <button id="close-eatery-modal-btn" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-20">
          <span class="material-symbols-outlined">close</span>
        </button>

        <div class="absolute bottom-5 left-6 right-6 z-10">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs uppercase tracking-widest text-secondary font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">${eatery.tag}</span>
            <span class="font-mono text-xs uppercase tracking-widest text-tertiary font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">★ ${eatery.rating}</span>
          </div>
          <h2 class="font-headline text-3xl md:text-4xl text-white font-black mt-2 leading-tight">${eatery.name}</h2>
        </div>
      </div>

      <div class="p-6 md:p-8 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div class="bg-surface-container p-4 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <span class="material-symbols-outlined text-2xl">restaurant</span>
            </div>
            <div>
              <span class="text-[11px] font-mono uppercase text-on-surface-variant block font-semibold">Cuisine</span>
              <span class="font-bold text-xs text-white">${eatery.cuisine}</span>
            </div>
          </div>

          <div class="bg-surface-container p-4 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
              <span class="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <span class="text-[11px] font-mono uppercase text-on-surface-variant block font-semibold">Avg Price</span>
              <span class="font-bold text-sm text-white">${eatery.avgPrice}</span>
            </div>
          </div>

          <div class="bg-surface-container p-4 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-sm">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined text-2xl">schedule</span>
            </div>
            <div>
              <span class="text-[11px] font-mono uppercase text-on-surface-variant block font-semibold">Timings</span>
              <span class="font-bold text-xs text-white">${eatery.timings || '11:00 AM - 11:30 PM'}</span>
            </div>
          </div>
        </div>

        <div class="bg-surface-container-high/40 p-5 rounded-2xl border border-white/10 space-y-2">
          <div class="flex items-center gap-2 text-secondary">
            <span class="material-symbols-outlined text-[20px]">menu_book</span>
            <h4 class="text-xs font-mono uppercase tracking-wider font-bold">Must-Try Specialties</h4>
          </div>
          <div class="flex flex-wrap gap-2">
            ${(eatery.mustTry || []).map(dish => `
              <span class="px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-mono font-bold">${dish}</span>
            `).join('')}
          </div>
        </div>

        <div class="bg-surface-container-high/60 p-5 rounded-2xl flex items-start gap-3.5 border-l-4 border-secondary">
          <div class="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
            <span class="material-symbols-outlined text-2xl">location_on</span>
          </div>
          <div class="space-y-1">
            <h4 class="text-xs font-mono uppercase tracking-wider font-bold text-white">Location &amp; Outlets</h4>
            <p class="text-sm md:text-base text-white font-medium">${eatery.location || eatery.outlet}</p>
            <p class="text-xs text-on-surface-variant">${eatery.description}</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10">
          <button id="modal-eatery-plan-btn" class="flex-1 py-3.5 px-6 rounded-full ${isBookmarked ? 'bg-primary text-black' : 'bg-primary-container text-white hover:bg-primary-container/80'} font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all">
            <span class="material-symbols-outlined">${isBookmarked ? 'bookmark_added' : 'bookmark_add'}</span>
            ${isBookmarked ? 'In Parikrama Plan' : 'Add to Food Trail'}
          </button>
          <button id="modal-eatery-locate-map-btn" class="py-3.5 px-6 rounded-full bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/30 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all">
            <span class="material-symbols-outlined">map</span>
            <span>View on Puja Map</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('close-eatery-modal-btn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    document.getElementById('modal-eatery-plan-btn')?.addEventListener('click', () => {
      this.toggleEateryBookmark(eatery.id);
      this.openEateryModal(eatery.id);
    });

    document.getElementById('modal-eatery-locate-map-btn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      this.focusEateryOnMap(eatery.id);
    });
  }

  // PANDAL PROXIMITY & EATERY HELPERS
  getPlannedPandals() {
    const plannedPandalIds = new Set(
      this.parikrama
        .filter(item => item.type === 'pandal')
        .map(item => item.itemId)
    );
    return this.pandals.filter(p => plannedPandalIds.has(p.id) || this.parikrama.some(item => item.itemId === p.id || (item.itemId && (item.itemId.startsWith(p.id) || p.id.startsWith(item.itemId)))));
  }

  getHaversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getNearestEateriesToSelectedPandals() {
    const plannedPandals = this.getPlannedPandals();
    if (plannedPandals.length === 0) {
      return [];
    }

    return this.eateries.map(eatery => {
      let minDistance = Infinity;
      let closestPandal = null;

      plannedPandals.forEach(pandal => {
        if (pandal.coordinates && eatery.coordinates) {
          const dist = this.getHaversineDistance(
            pandal.coordinates.lat, pandal.coordinates.lng,
            eatery.coordinates.lat, eatery.coordinates.lng
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestPandal = pandal;
          }
        }
      });

      return {
        ...eatery,
        minDistance: Math.round(minDistance * 10) / 10,
        nearestPandalName: closestPandal ? closestPandal.name : 'Planned Pandal'
      };
    }).sort((a, b) => a.minDistance - b.minDistance);
  }

  toggleEateryBookmark(id) {
    if (!this.requireAuth('save eatery to your plan')) return;
    const eatery = this.eateries.find(e => e.id === id || (e.id && (e.id.startsWith(id) || id.startsWith(e.id))));
    if (!eatery) return;

    const existingIndex = this.parikrama.findIndex(item => 
      item.itemId === eatery.id || 
      (item.itemId && (item.itemId.startsWith(id) || id.startsWith(item.itemId)))
    );

    if (existingIndex >= 0) {
      this.parikrama.splice(existingIndex, 1);
      this.showToast(`Removed "${eatery.name}" from Parikrama plan.`);
    } else {
      this.parikrama.push({
        id: 'item_' + Date.now(),
        type: 'eatery',
        itemId: eatery.id,
        name: eatery.name,
        zone: eatery.location || eatery.outlet,
        timeSlot: eatery.timings ? eatery.timings.slice(0, 18) : '01:00 PM - 02:30 PM',
        distanceFromPrev: '1.2 km',
        duration: '60 mins',
        notes: `Must-Try: ${(eatery.mustTry || []).slice(0, 2).join(', ')} | ${eatery.avgPrice}`
      });
      this.showToast(`Added "${eatery.name}" to Parikrama plan! 🍽️`);
    }

    this.saveParikrama();
    this.renderEateries();
    this.updateParikramaBadge();
  }

  // EATERIES RENDERER
  renderEateries(query = '') {
    let filtered = this.eateries;
    const plannedPandals = this.getPlannedPandals();
    const nearestBanner = document.getElementById('nearest-pandals-info-banner');

    if (this.activeEateryFilter === 'nearest') {
      if (plannedPandals.length > 0) {
        filtered = this.getNearestEateriesToSelectedPandals();
        if (nearestBanner) {
          nearestBanner.classList.remove('hidden');
          const headline = document.getElementById('nearest-banner-headline');
          const subtext = document.getElementById('nearest-banner-subtext');
          if (headline) headline.textContent = `📍 Food Joints Nearest to Your ${plannedPandals.length} Planned Pandals`;
          if (subtext) subtext.textContent = `Matching proximity to: ${plannedPandals.map(p => p.name).slice(0, 3).join(', ')}${plannedPandals.length > 3 ? ' +' + (plannedPandals.length - 3) + ' more' : ''}.`;
        }
      } else {
        filtered = [];
        if (nearestBanner) nearestBanner.classList.add('hidden');
      }
    } else {
      if (nearestBanner) nearestBanner.classList.add('hidden');
      if (this.activeEateryFilter !== 'all') {
        filtered = filtered.filter(e => e.category === this.activeEateryFilter);
      }
    }

    const searchInput = document.getElementById('eatery-search-input');
    const activeQuery = String(query || (searchInput && searchInput.value) || '');
    if (activeQuery.trim() && filtered.length > 0) {
      const q = activeQuery.toLowerCase().trim();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.cuisine.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.outlet.toLowerCase().includes(q) ||
        e.tag.toLowerCase().includes(q) ||
        (e.mustTry && e.mustTry.some(dish => dish.toLowerCase().includes(q)))
      );
    }

    // Render Trending Highlights
    this.renderTrendingEateries();

    // Render Full Eateries Directory
    const fullGrid = document.getElementById('eateries-full-grid');
    const loadMoreContainer = document.getElementById('eatery-load-more-container');
    const loadMoreBtn = document.getElementById('eatery-load-more-btn');

    if (fullGrid) {
      if (filtered.length === 0) {
        if (this.activeEateryFilter === 'nearest' && plannedPandals.length === 0) {
          fullGrid.innerHTML = `
            <div class="col-span-full text-center py-12 px-4 space-y-4 glass-card rounded-2xl">
              <span class="material-symbols-outlined text-4xl text-secondary animate-bounce">temple_hindu</span>
              <h4 class="font-headline text-lg text-white font-bold">No Planned Pandals Yet</h4>
              <p class="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">Select and bookmark pandals in the <strong>Pandals Radar</strong>, then return here to discover the closest restaurants, cafes, and street food stalls right beside your route!</p>
              <button onclick="window.sharodiyaApp.navigateTo('pandals')" class="px-5 py-2.5 rounded-full bg-primary text-black font-bold text-xs shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">explore</span> Select Pandals First
              </button>
            </div>
          `;
        } else {
          fullGrid.innerHTML = `
            <div class="col-span-full text-center py-12 px-4 space-y-3 glass-card rounded-2xl">
              <span class="material-symbols-outlined text-4xl text-on-surface-variant">no_food</span>
              <p class="text-sm text-on-surface-variant font-medium">No eateries found matching your criteria.</p>
              <button onclick="document.getElementById('eatery-search-input').value=''; window.sharodiyaApp.renderEateries();" class="text-xs text-secondary font-bold underline">Reset Search</button>
            </div>
          `;
        }
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        return;
      }

      const visibleEateries = filtered.slice(0, this.eateryCurrentLimit);

      fullGrid.innerHTML = visibleEateries.map(eatery => {
        const isBookmarked = this.parikrama.some(item => item.itemId === eatery.id);

        return `
          <article class="eatery-card group relative flex flex-col rounded-2xl overflow-hidden bg-surface-container-low shadow-xl shadow-background hover:-translate-y-1.5 transition-all duration-500 border border-white/5 hover:border-secondary/40" data-id="${eatery.id}">
            <div class="relative h-48 w-full overflow-hidden">
              <img src="${eatery.image}" alt="${eatery.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy"/>
              <div class="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent"></div>
              
              <span class="absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-md bg-black/60 text-secondary border border-secondary/30">
                ${eatery.tag}
              </span>

              <span class="absolute top-3.5 right-3.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono text-tertiary border border-tertiary/30 font-bold">
                ★ ${eatery.rating}
              </span>
            </div>

            <div class="p-5 relative z-10 flex flex-col gap-3 flex-grow bg-surface-container-low">
              <div>
                <h3 class="font-headline text-lg font-bold text-white group-hover:text-secondary transition-colors truncate" title="${eatery.name}">${eatery.name}</h3>
                <p class="text-xs text-on-surface-variant font-mono truncate mt-0.5">${eatery.outlet}</p>
              </div>

              <p class="text-xs text-on-surface line-clamp-2 leading-relaxed">${eatery.description}</p>

              <div class="flex items-center justify-between text-[11px] font-mono text-on-surface-variant pt-1 border-t border-white/5">
                <span class="text-tertiary font-bold">${eatery.avgPrice}</span>
                <span class="text-on-surface">${eatery.waitTime}</span>
              </div>

              <div class="mt-auto pt-2 flex items-center gap-2">
                <button class="bookmark-eatery-btn flex-1 py-2 rounded-lg ${isBookmarked ? 'bg-primary text-black' : 'bg-surface-container-highest text-secondary hover:bg-secondary hover:text-black'} font-bold text-xs transition-all flex items-center justify-center gap-1.5" data-id="${eatery.id}">
                  <span class="material-symbols-outlined text-[16px]">${isBookmarked ? 'bookmark_added' : 'bookmark_add'}</span>
                  <span>${isBookmarked ? 'In Plan' : 'Plan Visit'}</span>
                </button>
                <button class="view-eatery-details-btn p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-white transition-colors" data-id="${eatery.id}" title="Inspect Details">
                  <span class="material-symbols-outlined text-[18px]">info</span>
                </button>
                <button class="locate-eatery-map-btn p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary transition-colors" data-id="${eatery.id}" title="Open in Puja Map">
                  <span class="material-symbols-outlined text-[18px]">map</span>
                </button>
              </div>
            </div>
          </article>
        `;
      }).join('');

      if (loadMoreContainer && loadMoreBtn) {
        if (this.eateryCurrentLimit >= filtered.length) {
          loadMoreContainer.style.display = 'none';
        } else {
          loadMoreContainer.style.display = 'flex';
          const remaining = filtered.length - this.eateryCurrentLimit;
          const textSpan = loadMoreBtn.querySelector('span:last-child');
          if (textSpan) textSpan.textContent = `Show More (${remaining} remaining)`;
        }
      }

      fullGrid.querySelectorAll('.bookmark-eatery-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleEateryBookmark(btn.getAttribute('data-id'));
        });
      });

      fullGrid.querySelectorAll('.view-eatery-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openEateryModal(btn.getAttribute('data-id'));
        });
      });

      fullGrid.querySelectorAll('.locate-eatery-map-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.focusEateryOnMap(btn.getAttribute('data-id'));
        });
      });
    }
  }

  renderTrendingEateries() {
    const container = document.getElementById('trending-eateries-grid');
    if (!container) return;

    const tagEl = document.getElementById('trending-category-tag');
    const categoryLabels = {
      'all': 'Curated Festival Highlights',
      'nearest': 'Closest Food Joints to Your Planned Pandals',
      'finedine': '5-Star Luxury & Haute Cuisine',
      'traditional': 'Heirloom Zamindari & Royal Feasts',
      'midnight': 'Midnight Biryani & Night Hotspots',
      'street': 'Century-Old Cabins & Fritters',
      'cafes': 'Artisanal Roasteries & Heritage Sweets'
    };
    if (tagEl) {
      tagEl.textContent = categoryLabels[this.activeEateryFilter] || 'Trending Highlights';
    }

    let candidates = this.eateries;
    if (this.activeEateryFilter === 'nearest') {
      const nearestList = this.getNearestEateriesToSelectedPandals();
      candidates = nearestList.length > 0 ? nearestList : this.eateries;
    } else if (this.activeEateryFilter !== 'all') {
      candidates = candidates.filter(e => e.category === this.activeEateryFilter);
    }

    // Sort to prioritize featured, trending, and highest rating
    const sorted = [...candidates].sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      return b.rating - a.rating;
    });

    if (sorted.length === 0) return;

    const hero = sorted[0];
    const stack1 = sorted[1] || sorted[0];
    const stack2 = sorted[2] || sorted[1] || sorted[0];
    const spotlights = sorted.slice(3, 6);

    const isHeroBookmarked = this.parikrama.some(item => item.itemId === hero.id);
    const isStack1Bookmarked = this.parikrama.some(item => item.itemId === stack1.id);
    const isStack2Bookmarked = this.parikrama.some(item => item.itemId === stack2.id);

    let html = `
      <!-- Featured Large Hero Card -->
      <div class="md:col-span-8 group relative rounded-2xl overflow-hidden bg-surface-container min-h-[380px] shadow-xl isolate cursor-pointer border border-white/5 hover:border-secondary/50 transition-all" onclick="window.sharodiyaApp.focusEateryOnMap('${hero.id}')">
        <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style="background-image: url('${hero.image}')"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"></div>
        <div class="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between z-10">
          <div class="flex justify-between items-start">
            <span class="bg-tertiary text-black font-mono text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">local_fire_department</span> ${hero.badge}
            </span>
            <span class="bg-surface/80 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold text-tertiary flex items-center gap-1 border border-white/10">
              ★ ${hero.rating} <span class="text-[10px] text-on-surface-variant font-normal">(${hero.reviews ? hero.reviews.toLocaleString() : '5,000+'})</span>
            </span>
          </div>
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs text-secondary font-bold uppercase tracking-wider">${hero.tag}</span>
              <span class="w-1.5 h-1.5 rounded-full bg-white/40"></span>
              <span class="font-mono text-xs text-on-surface-variant">${hero.outlet}</span>
            </div>
            <h3 class="font-headline text-2xl sm:text-3xl text-white font-bold group-hover:text-primary transition-colors">${hero.name}</h3>
            <p class="text-xs sm:text-sm text-on-surface-variant max-w-lg line-clamp-2">${hero.description}</p>
            <div class="text-xs font-mono text-tertiary pt-1">
              <strong>Must-Try:</strong> ${(hero.mustTry || []).slice(0, 3).join(', ')}
            </div>
            <div class="flex items-center justify-between pt-2">
              <span class="text-xs font-mono text-white/80 bg-white/10 px-3 py-1 rounded-lg border border-white/10">${hero.avgPrice} • ${hero.waitTime}</span>
              <button onclick="event.stopPropagation(); window.sharodiyaApp.toggleEateryBookmark('${hero.id}')" class="${isHeroBookmarked ? 'bg-primary text-black' : 'bg-primary-container text-white'} text-xs font-bold px-5 py-2 rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">${isHeroBookmarked ? 'bookmark_added' : 'add_task'}</span>
                ${isHeroBookmarked ? 'In Parikrama' : 'Add to Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Vertical Stack Cards -->
      <div class="md:col-span-4 flex flex-col gap-6">
        <!-- Stack 1 -->
        <div class="flex-1 bg-surface-container-high rounded-2xl p-4 flex gap-4 hover:bg-surface-container-highest transition-all shadow-md border border-white/5 hover:border-secondary/40 group relative overflow-hidden cursor-pointer" onclick="window.sharodiyaApp.focusEateryOnMap('${stack1.id}')">
          <div class="w-24 h-24 rounded-xl bg-cover bg-center shrink-0 shadow-md" style="background-image: url('${stack1.image}')"></div>
          <div class="flex flex-col justify-between flex-1 min-w-0">
            <div>
              <div class="flex justify-between items-start mb-0.5">
                <h4 class="font-headline text-base font-bold text-white truncate group-hover:text-primary transition-colors">${stack1.name}</h4>
                <span class="text-tertiary text-xs font-mono font-bold shrink-0">★ ${stack1.rating}</span>
              </div>
              <span class="font-mono text-[10px] text-secondary uppercase tracking-wider font-bold">${stack1.tag}</span>
              <p class="text-xs text-on-surface-variant mt-1 line-clamp-2">${(stack1.mustTry || []).slice(0, 2).join(', ')}</p>
            </div>
            <div class="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
              <span class="text-[10px] font-mono text-on-surface-variant truncate">${stack1.outlet}</span>
              <button onclick="event.stopPropagation(); window.sharodiyaApp.toggleEateryBookmark('${stack1.id}')" class="${isStack1Bookmarked ? 'text-primary' : 'text-secondary hover:text-white'} flex items-center gap-1 text-xs font-bold">
                <span class="material-symbols-outlined text-[16px]">${isStack1Bookmarked ? 'bookmark_added' : 'bookmark_add'}</span>
                ${isStack1Bookmarked ? 'IN PLAN' : 'ADD'}
              </button>
            </div>
          </div>
        </div>

        <!-- Stack 2 -->
        <div class="flex-1 bg-surface-container-high rounded-2xl p-4 flex gap-4 hover:bg-surface-container-highest transition-all shadow-md border border-white/5 hover:border-secondary/40 group relative overflow-hidden cursor-pointer" onclick="window.sharodiyaApp.focusEateryOnMap('${stack2.id}')">
          <div class="w-24 h-24 rounded-xl bg-cover bg-center shrink-0 shadow-md" style="background-image: url('${stack2.image}')"></div>
          <div class="flex flex-col justify-between flex-1 min-w-0">
            <div>
              <div class="flex justify-between items-start mb-0.5">
                <h4 class="font-headline text-base font-bold text-white truncate group-hover:text-primary transition-colors">${stack2.name}</h4>
                <span class="text-tertiary text-xs font-mono font-bold shrink-0">★ ${stack2.rating}</span>
              </div>
              <span class="font-mono text-[10px] text-tertiary uppercase tracking-wider font-bold">${stack2.tag}</span>
              <p class="text-xs text-on-surface-variant mt-1 line-clamp-2">${(stack2.mustTry || []).slice(0, 2).join(', ')}</p>
            </div>
            <div class="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
              <span class="text-[10px] font-mono text-on-surface-variant truncate">${stack2.outlet}</span>
              <button onclick="event.stopPropagation(); window.sharodiyaApp.toggleEateryBookmark('${stack2.id}')" class="${isStack2Bookmarked ? 'text-primary' : 'text-secondary hover:text-white'} flex items-center gap-1 text-xs font-bold">
                <span class="material-symbols-outlined text-[16px]">${isStack2Bookmarked ? 'bookmark_added' : 'bookmark_add'}</span>
                ${isStack2Bookmarked ? 'IN PLAN' : 'ADD'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (spotlights.length >= 3) {
      html += `
        <div class="md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          ${spotlights.map(eatery => {
            const isSpotlightBookmarked = this.parikrama.some(item => item.itemId === eatery.id);
            return `
              <div class="bg-surface-container rounded-2xl p-4 flex flex-col justify-between border border-white/5 hover:border-secondary/40 transition-all group cursor-pointer shadow-lg relative overflow-hidden" onclick="window.sharodiyaApp.focusEateryOnMap('${eatery.id}')">
                <div class="h-32 rounded-xl bg-cover bg-center relative mb-3 overflow-hidden shadow-inner" style="background-image: url('${eatery.image}')">
                  <div class="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"></div>
                  <span class="absolute top-2 right-2 bg-surface/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-mono font-bold text-tertiary">★ ${eatery.rating}</span>
                  <span class="absolute bottom-2 left-2 font-mono text-[10px] uppercase font-bold text-secondary bg-surface/80 backdrop-blur-md px-2 py-0.5 rounded-md">${eatery.badge}</span>
                </div>
                <div class="space-y-1.5 flex-1">
                  <div class="flex items-center justify-between">
                    <h4 class="font-headline text-base font-bold text-white truncate group-hover:text-primary transition-colors">${eatery.name}</h4>
                  </div>
                  <p class="text-[11px] font-mono text-on-surface-variant truncate">${eatery.outlet}</p>
                  <p class="text-xs text-on-surface-variant line-clamp-2">${eatery.description}</p>
                </div>
                <div class="pt-3 mt-3 border-t border-white/5 flex items-center justify-between">
                  <span class="text-xs font-mono text-tertiary font-bold">${eatery.avgPrice}</span>
                  <button onclick="event.stopPropagation(); window.sharodiyaApp.toggleEateryBookmark('${eatery.id}')" class="px-3 py-1.5 rounded-lg ${isSpotlightBookmarked ? 'bg-primary text-black' : 'bg-primary-container text-white'} text-[11px] font-bold shadow hover:scale-105 transition-transform flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">${isSpotlightBookmarked ? 'bookmark_added' : 'add'}</span>
                    ${isSpotlightBookmarked ? 'In Plan' : 'Add'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // PARIKRAMA (PLANNED) MULTI-PLAN RENDERER
  renderParikrama() {
    const timeline = document.getElementById('parikrama-timeline');
    const metricPandals = document.getElementById('metric-pandals');
    const metricEateries = document.getElementById('metric-eateries');
    const metricDistance = document.getElementById('metric-distance');
    const metricDuration = document.getElementById('metric-duration');
    const totalPlansCountEl = document.getElementById('total-plans-count');
    const planSelector = document.getElementById('plan-selector-dropdown');
    const planTitleInput = document.getElementById('active-plan-title-input');
    const dayStatusPill = document.getElementById('plan-day-status-pill');
    const dayStatusText = document.getElementById('plan-day-status-text');

    const activePlan = this.getActivePlan();
    const items = activePlan.items || [];

    // 1. Update total plans count in badge
    if (totalPlansCountEl) {
      totalPlansCountEl.textContent = this.plans.length;
    }

    // 2. Populate Plan Selector Dropdown
    if (planSelector) {
      planSelector.innerHTML = this.plans.map(p => {
        const isSelected = p.id === activePlan.id;
        const dayLabel = p.day ? `[${p.day}]` : '[No Day Selected]';
        const stopCount = (p.items || []).length;
        return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${p.name} • ${dayLabel} (${stopCount} stops)</option>`;
      }).join('');
    }

    // 3. Update Title Input
    if (planTitleInput && document.activeElement !== planTitleInput) {
      planTitleInput.value = activePlan.name || '';
    }

    // 4. Update Day Status Pill & Day Selector Buttons (DEFAULT: NO DAY SELECTED)
    if (dayStatusPill && dayStatusText) {
      if (activePlan.day) {
        dayStatusPill.className = 'self-start sm:self-auto px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-green-500/15 border border-green-500/30 text-green-400 flex items-center gap-1.5';
        dayStatusText.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-400"></span> Assigned: <strong>${activePlan.day}</strong>`;
      } else {
        dayStatusPill.className = 'self-start sm:self-auto px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center gap-1.5';
        dayStatusText.innerHTML = `<span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span> No Puja Day Assigned (Draft)`;
      }
    }

    // Update Day Buttons Highlight
    document.querySelectorAll('#parikrama-days-bar .day-assign-btn').forEach(btn => {
      const btnDay = btn.getAttribute('data-day');
      if (activePlan.day === btnDay) {
        btn.className = 'day-assign-btn px-4 py-2 rounded-full bg-primary text-black font-bold text-xs whitespace-nowrap transition-all border border-primary shadow-md';
      } else {
        btn.className = 'day-assign-btn px-4 py-2 rounded-full bg-surface-container text-on-surface-variant hover:text-white text-xs font-semibold whitespace-nowrap transition-all border border-white/5';
      }
    });

    // 5. Update Metrics
    const pandalsCount = items.filter(i => i.type === 'pandal').length;
    const eateriesCount = items.filter(i => i.type === 'eatery').length;
    const totalEstKm = (items.length * 2.5).toFixed(1);
    const totalMinutes = items.reduce((acc, i) => acc + parseInt(i.duration || '60'), 0);
    const estHours = (totalMinutes / 60).toFixed(1);

    if (metricPandals) metricPandals.textContent = String(pandalsCount).padStart(2, '0');
    if (metricEateries) metricEateries.textContent = String(eateriesCount).padStart(2, '0');
    if (metricDistance) metricDistance.textContent = totalEstKm;
    if (metricDuration) metricDuration.textContent = estHours;

    if (!timeline) return;

    if (items.length === 0) {
      timeline.innerHTML = `
        <div class="p-12 text-center glass-card rounded-2xl flex flex-col items-center gap-4">
          <span class="material-symbols-outlined text-5xl text-tertiary animate-bounce">route</span>
          <h3 class="font-headline text-2xl font-bold text-white">This Plan has No Stops Yet</h3>
          <p class="text-on-surface-variant max-w-md text-sm">Explore 141 Pandals &amp; 250 Eateries and click "Add to Plan" to add stops to <strong>${activePlan.name}</strong>.</p>
          <div class="flex flex-wrap justify-center gap-3 pt-2">
            <button class="px-6 py-2.5 rounded-full bg-primary text-black font-bold text-sm shadow-lg hover:scale-105 transition-transform" onclick="window.sharodiyaApp.navigateTo('pandals')">Explore 141 Pandals</button>
            <button class="px-6 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/30 font-bold text-sm shadow-lg hover:scale-105 transition-transform" onclick="window.sharodiyaApp.navigateTo('eateries')">Explore Eateries</button>
          </div>
        </div>
      `;
      return;
    }

    timeline.innerHTML = items.map((item, idx) => {
      const isPandal = item.type === 'pandal';
      const icon = isPandal ? 'temple_hindu' : 'restaurant';
      const colorClass = isPandal ? 'text-primary border-primary/30 bg-primary/10' : 'text-secondary border-secondary/30 bg-secondary/10';

      return `
        <div class="relative flex items-start gap-4 md:gap-6 group" data-item-id="${item.id}">
          <div class="flex flex-col items-center">
            <div class="w-10 h-10 rounded-full border ${colorClass} flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(255,180,171,0.2)]">
              ${idx + 1}
            </div>
            ${idx < items.length - 1 ? '<div class="w-0.5 h-full min-h-[60px] bg-gradient-to-b from-white/20 to-white/5 my-2"></div>' : ''}
          </div>

          <div class="flex-1 glass-card rounded-2xl p-5 md:p-6 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group-hover:border-white/20 transition-all">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] ${isPandal ? 'text-primary' : 'text-secondary'}">${icon}</span>
                <span class="text-xs font-mono uppercase tracking-wider text-on-surface-variant">${item.zone}</span>
              </div>
              <h4 class="font-headline text-xl font-bold text-white">${item.name}</h4>
              <p class="text-xs text-on-surface-variant">${item.notes || 'Curated stop'}</p>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <span class="px-3 py-1 rounded-full bg-surface-container text-xs font-mono text-tertiary border border-white/5">
                ${item.timeSlot}
              </span>
              <div class="flex items-center gap-1">
                <button class="stop-locate-map-btn p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary border border-secondary/20 transition-all hover:scale-105" data-id="${item.itemId || item.id}" title="Focus this stop on Plan Route Map">
                  <span class="material-symbols-outlined text-[18px]">map</span>
                </button>
                ${idx > 0 ? `<button class="move-up-btn p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface" data-idx="${idx}" title="Move Up"><span class="material-symbols-outlined text-[18px]">arrow_upward</span></button>` : ''}
                ${idx < items.length - 1 ? `<button class="move-down-btn p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface" data-idx="${idx}" title="Move Down"><span class="material-symbols-outlined text-[18px]">arrow_downward</span></button>` : ''}
                <button class="delete-item-btn p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400" data-idx="${idx}" title="Remove"><span class="material-symbols-outlined text-[18px]">delete</span></button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    timeline.querySelectorAll('.stop-locate-map-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.openPlanInMap(null, id);
      });
    });

    timeline.querySelectorAll('.move-up-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (idx > 0) {
          const temp = items[idx];
          items[idx] = items[idx - 1];
          items[idx - 1] = temp;
          this.savePlans();
        }
      });
    });

    timeline.querySelectorAll('.move-down-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (idx < items.length - 1) {
          const temp = items[idx];
          items[idx] = items[idx + 1];
          items[idx + 1] = temp;
          this.savePlans();
        }
      });
    });

    timeline.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        const removed = items.splice(idx, 1);
        this.savePlans();
        if (removed[0]) {
          this.showToast(`Removed "${removed[0].name}" from plan.`);
        }
      });
    });
  }

  // ==========================================
  // PUJA METRO NETWORK ENGINE (OFFICIAL TRANSIT & PANDAL DISCOVERY LAYER)
  // ==========================================
  initMetroNetworkMap() {
    const mapContainer = document.getElementById('metro-network-osm-map');
    if (!mapContainer || typeof window.L === 'undefined') return;

    if (this.metroMap) {
      setTimeout(() => {
        if (this.metroMap) {
          this.metroMap.invalidateSize();
          this.updateMetroNetworkMap();
        }
      }, 150);
      return;
    }

    try {
      // Center focused on Kolkata Metro span (North-South & East-West corridor)
      this.metroMap = window.L.map('metro-network-osm-map', {
        center: [22.5650, 88.3650],
        zoom: 12,
        minZoom: 11,
        maxZoom: 19,
        maxBounds: KOLKATA_OUTSKIRTS_BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Synchronize tile layer with current theme
      this.updateMetroMapTheme();

      // Initialize Metro Leaflet Layer Groups
      this.metroLayers.lines = window.L.layerGroup().addTo(this.metroMap);
      this.metroLayers.stations = window.L.layerGroup().addTo(this.metroMap);
      this.metroLayers.interchanges = window.L.layerGroup().addTo(this.metroMap);

      // Draw permanent Metro Track Geometries
      this.drawMetroLineTracks();

      // Render Stations and Interchanges
      this.updateMetroNetworkMap();

      setTimeout(() => {
        if (this.metroMap) this.metroMap.invalidateSize();
      }, 200);

    } catch (err) {
      console.error('Metro Network OpenStreetMap initialization error:', err);
    }
  }

  updateMetroMapTheme() {
    if (!this.metroMap || typeof window.L === 'undefined') return;
    const osmTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    if (this.metroTileLayer) {
      try {
        this.metroMap.removeLayer(this.metroTileLayer);
      } catch (e) {}
    }

    try {
      this.metroTileLayer = window.L.tileLayer(osmTileUrl, {
        crossOrigin: true
      });
      this.metroTileLayer.addTo(this.metroMap);
      this.metroTileLayer.bringToBack();
    } catch (e) {
      console.warn('[Metro Map] Tile layer note:', e);
    }
  }

  drawMetroLineTracks(filter = 'all') {
    if (!this.metroMap || !this.metroLayers.lines) return;
    this.metroLayers.lines.clearLayers();

    // Official Real Operational Kolkata Metro Track Geometry (Exact Geodesic Station Alignment)
    const METRO_LINE_TRACKS = {
      Blue: [
        [22.6534, 88.3575], // Dakshineswar
        [22.6417, 88.3688], // Baranagar
        [22.6375, 88.3888], // Noapara
        [22.6217, 88.3934], // Dum Dum
        [22.6067, 88.3850], // Belgachia
        [22.6022, 88.3711], // Shyambazar
        [22.5982, 88.3662], // Shobhabazar Sutanuti
        [22.5857, 88.3607], // Girish Park
        [22.5815, 88.3605], // Mahatma Gandhi Road
        [22.5684, 88.3607], // Central
        [22.5658, 88.3562], // Chandni Chowk
        [22.5639, 88.3516], // Esplanade (Interchange with Green Line)
        [22.5539, 88.3513], // Park Street
        [22.5463, 88.3496], // Maidan
        [22.5401, 88.3483], // Rabindra Sadan
        [22.5350, 88.3477], // Netaji Bhavan
        [22.5273, 88.3471], // Jatin Das Park
        [22.5186, 88.3458], // Kalighat
        [22.5085, 88.3457], // Rabindra Sarobar
        [22.4988, 88.3454], // Mahanayak Uttam Kumar
        [22.4891, 88.3468], // Netaji
        [22.4789, 88.3503], // Masterda Surya Sen
        [22.4705, 88.3572], // Gitanjali
        [22.4632, 88.3697], // Kavi Nazrul
        [22.4630, 88.3842], // Shahid Khudiram
        [22.4634, 88.3976]  // Kavi Subhash (Interchange with Orange Line)
      ],
      Green: [
        [22.5878, 88.3308], // Howrah Maidan
        [22.5855, 88.3426], // Howrah Railway Station
        [22.5714, 88.3486], // Mahakaran
        [22.5639, 88.3516], // Esplanade (Interchange with Blue Line)
        [22.5675, 88.3712], // Sealdah (Direct Corridor Connection to Esplanade)
        [22.5714, 88.3905], // Phoolbagan
        [22.5694, 88.4057], // Salt Lake Stadium
        [22.5768, 88.4019], // Bengal Chemical
        [22.5898, 88.4069], // City Centre
        [22.5901, 88.4137], // Central Park
        [22.5867, 88.4208], // Karunamoyee
        [22.5802, 88.4357]  // Salt Lake Sector V
      ],
      Purple: [
        [22.4497, 88.3039], // Joka
        [22.4619, 88.3082], // Thakurpukur
        [22.4754, 88.3128], // Sakherbazar
        [22.4867, 88.3168], // Behala Chowrasta
        [22.4972, 88.3204], // Behala Bazar
        [22.5118, 88.3242], // Taratala
        [22.5205, 88.3283]  // Majerhat
      ],
      Orange: [
        [22.4634, 88.3976], // Kavi Subhash (Interchange with Blue Line)
        [22.4795, 88.3989], // Satyajit Ray
        [22.4950, 88.4005], // Jyotirindra Nandi
        [22.5065, 88.4018], // Kavi Sukanta
        [22.5161, 88.4032]  // Hemanta Mukhopadhyay (Ruby Crossing)
      ]
    };

    let LINE_CONFIG = [
      { key: 'Blue', coords: METRO_LINE_TRACKS.Blue, color: '#0057B7', name: 'Blue Line (Dakshineswar ↔ Kavi Subhash North-South Corridor)' },
      { key: 'Green', coords: METRO_LINE_TRACKS.Green, color: '#009A44', name: 'Green Line (Howrah Maidan ↔ Esplanade ↔ Sealdah ↔ Salt Lake Sector V)' },
      { key: 'Purple', coords: METRO_LINE_TRACKS.Purple, color: '#7F2B87', name: 'Purple Line (Joka ↔ Majerhat Corridor)' },
      { key: 'Orange', coords: METRO_LINE_TRACKS.Orange, color: '#FF7300', name: 'Orange Line (Kavi Subhash ↔ Hemanta Mukhopadhyay Ruby Corridor)' }
    ];

    // Filter tracks: When any line is selected, all others disappear
    if (filter && filter !== 'all' && filter !== 'interchange') {
      LINE_CONFIG = LINE_CONFIG.filter(cfg => cfg.key === filter);
    }

    LINE_CONFIG.forEach(cfg => {
      // Outer Casing Glow Track
      window.L.polyline(cfg.coords, {
        color: '#000000',
        weight: 9,
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.metroLayers.lines);

      // Core Official Color Metro Track
      const linePoly = window.L.polyline(cfg.coords, {
        color: cfg.color,
        weight: 5.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.metroLayers.lines);

      linePoly.bindTooltip(cfg.name, {
        sticky: true,
        className: 'font-mono text-xs font-bold'
      });
    });
  }

  updateMetroNetworkMap() {
    if (!this.metroMap || typeof window.L === 'undefined') return;

    const filter = this.metroActiveLineFilter;
    const query = (this.metroSearchQuery || '').toLowerCase().trim();

    // Redraw line tracks: When a line is selected, all other tracks disappear
    this.drawMetroLineTracks(filter);

    // Clear dynamic station and interchange layers
    if (this.metroLayers.stations) this.metroLayers.stations.clearLayers();
    if (this.metroLayers.interchanges) this.metroLayers.interchanges.clearLayers();

    this.metroStationMarkers.clear();

    // 1. Filter operational stations strictly for this selected line
    const operationalStations = this.metroStations.filter(s => {
      if (s.operationalStatus !== 'operational') return false;

      // Line Filter: Only show stations belonging to the selected line
      if (filter === 'interchange') {
        if (!s.interchange) return false;
      } else if (filter !== 'all') {
        if (Array.isArray(s.line)) {
          if (!s.line.includes(filter)) return false;
        } else if (s.line !== filter) {
          return false;
        }
      }

      // Search Query Filter
      if (query) {
        const nameMatch = (s.stationName || s.name || '').toLowerCase().includes(query);
        const landmarkMatch = (s.landmark || '').toLowerCase().includes(query);
        const pandalMatch = (s.nearbyPandals || []).some(p => (p.pandalName || p.name || '').toLowerCase().includes(query));
        if (!nameMatch && !landmarkMatch && !pandalMatch) return false;
      }

      return true;
    });

    // 2. Render Station & Interchange Markers
    operationalStations.forEach(st => {
      const isSelected = st.id === this.selectedMetroStationId;
      const isInterchange = st.interchange === true;

      let iconHtml = '';
      let markerClass = 'metro-station-node';

      if (isInterchange) {
        const isOrange = Array.isArray(st.line) && st.line.includes('Orange');
        const interchangeTypeClass = isOrange ? 'metro-interchange-node-orange' : 'metro-interchange-node-green';
        markerClass = `metro-interchange-node ${interchangeTypeClass} ${isSelected ? 'selected-station-node' : ''}`;
        iconHtml = `<div class="${markerClass}" title="${st.stationName} (Metro Interchange Hub)">
          <span class="material-symbols-outlined text-[15px] text-yellow-300 font-bold">swap_horiz</span>
        </div>`;
      } else {
        const lineKey = typeof st.line === 'string' ? st.line.toLowerCase() : 'blue';
        markerClass = `metro-station-node metro-station-node-${lineKey} ${isSelected ? 'selected-station-node' : ''}`;
        iconHtml = `<div class="${markerClass}" title="${st.stationName} (Operational Station)">
          <span class="material-symbols-outlined text-[13px] text-white">train</span>
        </div>`;
      }

      const icon = window.L.divIcon({
        className: 'custom-metro-node-wrapper',
        html: iconHtml,
        iconSize: isInterchange ? [38, 38] : [28, 28],
        iconAnchor: isInterchange ? [19, 19] : [14, 14]
      });

      const marker = window.L.marker([st.coordinates.lat, st.coordinates.lng], { icon });

      // Station Click Handler
      marker.on('click', () => {
        this.selectMetroStation(st.id, true);
      });

      // Tooltip
      const lineNameBadge = Array.isArray(st.line) ? st.line.join(' ↔ ') + ' Line' : `${st.line} Line`;
      marker.bindTooltip(`
        <div class="p-1.5 font-mono text-xs">
          <div class="font-bold text-white flex items-center gap-1">
            <span>🚇</span> <span>${st.stationName}</span>
          </div>
          <div class="text-[10px] text-cyan-300 font-semibold">${isInterchange ? '⚡ METRO INTERCHANGE' : lineNameBadge}</div>
          <div class="text-[10px] text-on-surface-variant">${(st.nearbyPandals || []).length} Connected Pandals</div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -14],
        className: 'glass-card border border-white/20 p-0 text-white rounded-xl shadow-xl'
      });

      if (isInterchange) {
        marker.addTo(this.metroLayers.interchanges);
      } else {
        marker.addTo(this.metroLayers.stations);
      }

      this.metroStationMarkers.set(st.id, marker);
    });
  }

  selectMetroStation(stationId, zoom = true) {
    this.selectedMetroStationId = stationId;
    const station = this.metroStations.find(s => s.id === stationId);
    if (!station) return;

    // Update map markers
    this.updateMetroNetworkMap();

    // Pan / Zoom map smoothly to station
    if (zoom && this.metroMap) {
      this.metroMap.flyTo([station.coordinates.lat, station.coordinates.lng], 14.5, { duration: 1 });
    }

    // Render Right Information Panel
    this.renderMetroStationInfoPanel();

    // Update bottom map hint text
    const hintText = document.getElementById('metro-map-hint-text');
    if (hintText) {
      hintText.innerHTML = `Selected <strong>${station.stationName}</strong> • ${(station.nearbyPandals || []).length} Nearest Puja Pandals Connected.`;
    }
  }

  fitMetroBounds() {
    if (!this.metroMap || typeof window.L === 'undefined') return;
    const allCoords = this.metroStations.filter(s => s.operationalStatus === 'operational').map(s => [s.coordinates.lat, s.coordinates.lng]);
    if (allCoords.length > 0) {
      const bounds = window.L.latLngBounds(allCoords);
      this.metroMap.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 1 });
    }
  }

  renderMetroStationInfoPanel() {
    const panel = document.getElementById('metro-station-info-panel');
    if (!panel) return;

    if (!this.selectedMetroStationId) {
      // Default Welcome View when no station is active
      const totalStations = this.metroStations.filter(s => s.operationalStatus === 'operational').length;
      const blueStations = this.metroStations.filter(s => s.line === 'Blue' || (Array.isArray(s.line) && s.line.includes('Blue'))).length;
      const greenStations = this.metroStations.filter(s => s.line === 'Green' || (Array.isArray(s.line) && s.line.includes('Green'))).length;
      const purpleStations = this.metroStations.filter(s => s.line === 'Purple').length;
      const orangeStations = this.metroStations.filter(s => s.line === 'Orange' || (Array.isArray(s.line) && s.line.includes('Orange'))).length;

      panel.innerHTML = `
        <div class="space-y-6">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span class="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">Metro Station Navigator</span>
            </div>
            <h3 class="font-headline text-2xl font-bold text-white">Select an Operational Station</h3>
            <p class="text-xs text-on-surface-variant leading-relaxed">
              Click any operational station marker on the map to inspect connected puja pandals, calculate walking times, and create transit circuits.
            </p>
          </div>

          <!-- Quick Metro Line Navigation Shortcuts -->
          <div class="space-y-3">
            <h4 class="text-xs font-mono uppercase text-tertiary font-bold flex items-center gap-1.5">
              <span>🚇</span> Operational Line Terminals &amp; Hubs
            </h4>
            
            <div class="space-y-2 text-xs">
              <!-- Blue Line -->
              <div class="p-3 rounded-2xl bg-surface-container border border-[#0057B7]/40 space-y-2">
                <div class="flex items-center justify-between font-bold text-[#5ba3ff]">
                  <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#0057B7]"></span> Blue Line</span>
                  <span class="font-mono text-[10px] bg-[#0057B7]/20 px-2 py-0.5 rounded-full">${blueStations} Stations</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-shyambazar')" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-[#0057B7]/30 text-white text-[11px] font-mono transition-colors">Shyambazar</button>
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-shobhabazar')" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-[#0057B7]/30 text-white text-[11px] font-mono transition-colors">Shobhabazar</button>
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-kalighat')" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-[#0057B7]/30 text-white text-[11px] font-mono transition-colors">Kalighat</button>
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-esplanade')" class="px-2.5 py-1 rounded-lg bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 text-[11px] font-mono font-bold transition-colors">⚡ Esplanade</button>
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-kavi-subhash')" class="px-2.5 py-1 rounded-lg bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 text-[11px] font-mono font-bold transition-colors">⚡ Kavi Subhash</button>
                </div>
              </div>

              <!-- Green Line -->
              <div class="p-3 rounded-2xl bg-surface-container border border-[#009A44]/40 space-y-2">
                <div class="flex items-center justify-between font-bold text-[#4ade80]">
                  <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#009A44]"></span> Green Line</span>
                  <span class="font-mono text-[10px] bg-[#009A44]/20 px-2 py-0.5 rounded-full">${greenStations} Stations</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-howrah')" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-[#009A44]/30 text-white text-[11px] font-mono transition-colors">Howrah Rly Stn</button>
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-esplanade')" class="px-2.5 py-1 rounded-lg bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 text-[11px] font-mono font-bold transition-colors">⚡ Esplanade</button>
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-sealdah')" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-[#009A44]/30 text-white text-[11px] font-mono transition-colors">Sealdah</button>
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-sector-v')" class="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-[#009A44]/30 text-white text-[11px] font-mono transition-colors">Sector V</button>
                </div>
              </div>

              <!-- Purple & Orange -->
              <div class="grid grid-cols-2 gap-2">
                <div class="p-3 rounded-2xl bg-surface-container border border-[#7F2B87]/40 space-y-2">
                  <div class="font-bold text-[#d8b4fe] flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#7F2B87]"></span> Purple Line</div>
                  <button onclick="window.sharodiyaApp.selectMetroStation('metro-behala-chowrasta')" class="w-full text-left px-2 py-1 rounded-lg bg-surface-container-high text-white text-[11px] font-mono hover:bg-[#7F2B87]/30 transition-colors truncate">Behala Chowrasta</button>
                </div>
                <div class="p-3 rounded-2xl bg-surface-container border border-[#FF7300]/40 space-y-2">
                  <div class="font-bold text-[#fdba74] flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#FF7300]"></span> Orange Line</div>
                  <div class="flex flex-col gap-1">
                    <button onclick="window.sharodiyaApp.selectMetroStation('metro-kavi-subhash')" class="w-full text-left px-2 py-1 rounded-lg bg-yellow-400/20 text-yellow-300 text-[11px] font-mono font-bold hover:bg-yellow-400/30 transition-colors truncate">⚡ Kavi Subhash</button>
                    <button onclick="window.sharodiyaApp.selectMetroStation('metro-hemanta-mukhopadhyay')" class="w-full text-left px-2 py-1 rounded-lg bg-surface-container-high text-white text-[11px] font-mono hover:bg-[#FF7300]/30 transition-colors truncate">Ruby Crossing</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-on-surface-variant flex items-center gap-3">
            <span class="material-symbols-outlined text-cyan-400 text-2xl shrink-0">info</span>
            <span>All ${totalStations} stations shown on this map are verified and in active revenue service for Durga Puja 2026.</span>
          </div>
        </div>
      `;
      return;
    }

    const station = this.metroStations.find(s => s.id === this.selectedMetroStationId);
    if (!station) return;

    const isInterchange = station.interchange === true;
    const pandals = station.nearbyPandals || [];

    // Line Badges
    let lineBadgesHtml = '';
    if (isInterchange) {
      const lines = Array.isArray(station.interchangeLines || station.line) ? (station.interchangeLines || station.line) : ['Blue', 'Green'];
      const isOrangeTransfer = lines.includes('Orange');
      const transferGradient = isOrangeTransfer
        ? 'bg-gradient-to-r from-blue-900/40 via-orange-900/30 to-yellow-900/30 border-orange-400/50'
        : 'bg-gradient-to-r from-blue-900/40 via-green-900/30 to-yellow-900/30 border-yellow-400/50';
      
      const connectionDescription = station.id === 'metro-esplanade'
        ? 'Seamless Interconnect Hub linking North-South Blue Line (Dakshineswar ↔ Kavi Subhash) with East-West Green Line (Howrah Maidan ↔ Sealdah ↔ Salt Lake Sector V).'
        : 'Key Junction linking North-South Blue Line (Dakshineswar ↔ Kavi Subhash) with EM Bypass Orange Line (Kavi Subhash ↔ Ruby Crossing).';

      lineBadgesHtml = `
        <div class="p-3.5 rounded-2xl ${transferGradient} border space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-yellow-300 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">swap_horiz</span>
              METRO INTERCHANGE HUB
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">Dual Line Transfer</span>
          </div>
          <div class="text-xs font-bold text-white flex items-center gap-2">
            ${lines.map(l => `<span class="px-2.5 py-1 rounded-lg metro-badge-${l.toLowerCase()} font-mono font-bold">${l} Line</span>`).join('<span class="text-yellow-400 font-bold">↔</span>')}
          </div>
          <div class="text-[11px] text-on-surface-variant font-mono leading-tight">
            ${connectionDescription}
          </div>
        </div>
      `;
    } else {
      const lineKey = typeof station.line === 'string' ? station.line.toLowerCase() : 'blue';
      lineBadgesHtml = `
        <div class="flex items-center gap-2">
          <span class="px-3 py-1 rounded-xl metro-badge-${lineKey} text-xs font-mono font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-[var(--metro-${lineKey})]"></span>
            ${station.lineName || `${station.line} Line`}
          </span>
          <span class="px-2.5 py-1 rounded-xl bg-surface-container border border-white/10 text-on-surface-variant text-[11px] font-mono">Operational</span>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="space-y-5 animate-fadeIn">
        
        <!-- Station Header -->
        <div class="space-y-3 border-b border-white/10 pb-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                <span>🚇</span> Operational Metro Station
              </span>
              <h3 class="font-headline text-2xl font-black text-white mt-0.5">${station.stationName}</h3>
            </div>
            <button onclick="window.sharodiyaApp.selectedMetroStationId = null; window.sharodiyaApp.updateMetroNetworkMap(); window.sharodiyaApp.renderMetroStationInfoPanel();" class="p-1.5 rounded-full bg-white/10 text-on-surface-variant hover:text-white transition-colors" title="Close Station details">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          ${lineBadgesHtml}

          <div class="text-xs text-on-surface-variant flex items-center gap-2 pt-1">
            <span class="material-symbols-outlined text-[16px] text-cyan-400 shrink-0">location_on</span>
            <span>${station.landmark || 'Kolkata Metropolitan Area'}</span>
          </div>
        </div>

        <!-- Nearest Puja Pandals List (Exclusively Closest) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-mono uppercase text-tertiary font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">temple_hindu</span>
                Closest Puja Pandals (${pandals.length})
              </h4>
              <p class="text-[10px] text-on-surface-variant font-mono">Exclusively mapped to this station (shortest walk)</p>
            </div>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 font-bold shrink-0">Closest Gateway</span>
          </div>

          ${pandals.length === 0 ? `
            <div class="p-4 rounded-2xl bg-surface-container border border-white/10 text-center space-y-1">
              <p class="text-xs text-white font-bold">No Major Pandals Closest to This Station</p>
              <p class="text-[11px] text-on-surface-variant">Pandals in this corridor are closer to adjacent stations or further along the line.</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${pandals.map(pandal => `
                <div class="p-3.5 rounded-2xl bg-surface-container border border-white/10 hover:border-yellow-400/40 transition-all space-y-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="space-y-1">
                      <h5 class="text-sm font-bold text-white flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer" onclick="window.sharodiyaApp.openPandalModal('${pandal.id}')">
                        <span>🛕</span> <span>${pandal.name || pandal.pandalName}</span>
                      </h5>
                      <div class="text-xs text-yellow-300 font-mono font-bold flex items-center gap-1">
                        <span class="material-symbols-outlined text-[15px] text-yellow-400">directions_walk</span>
                        <span>📍 ${pandal.distanceText} · ${pandal.walkText}</span>
                        <span class="text-[10px] text-green-400 font-normal ml-1">✓ Closest Stn</span>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-tertiary shrink-0">★ ${pandal.rating || '4.85'}</span>
                  </div>

                  <p class="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                    ${pandal.theme || pandal.zone || 'Authentic Durga Puja Celebration'}
                  </p>

                  <div class="flex items-center gap-2 pt-1 border-t border-white/5">
                    <button class="px-2.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-white/15 text-white text-[11px] font-bold transition-all flex items-center gap-1" onclick="window.sharodiyaApp.openPandalModal('${pandal.id}')">
                      <span class="material-symbols-outlined text-[14px] text-primary">visibility</span>
                      <span>Explore</span>
                    </button>
                    <button class="px-2.5 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-[11px] font-bold transition-all flex items-center gap-1" onclick="window.sharodiyaApp.addMetroPandalToPlan('${pandal.id}', '${station.stationName}')">
                      <span class="material-symbols-outlined text-[14px]">add</span>
                      <span>Add to Pujo Route</span>
                    </button>
                    <a href="https://www.google.com/maps/dir/?api=1&origin=${station.coordinates.lat},${station.coordinates.lng}&destination=${pandal.coordinates.lat},${pandal.coordinates.lng}&travelmode=walking" target="_blank" rel="noopener" class="px-2.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-white/15 text-cyan-300 text-[11px] font-bold transition-all flex items-center gap-1 ml-auto" title="Open Walking Directions in Google Maps">
                      <span class="material-symbols-outlined text-[14px]">directions</span>
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Station Footer Actions -->
        <div class="pt-4 border-t border-white/10 flex flex-col gap-2.5">
          <button onclick="window.sharodiyaApp.openMetroPlannerModal('${station.id}')" class="w-full py-3 rounded-2xl bg-primary text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-transform">
            <span class="material-symbols-outlined text-[18px]">alt_route</span>
            <span>Plan Pujo Route via ${station.stationName}</span>
          </button>
          <a href="https://www.google.com/maps/search/?api=1&query=${station.coordinates.lat},${station.coordinates.lng}" target="_blank" rel="noopener" class="w-full py-2.5 rounded-2xl bg-surface-container hover:bg-surface-container-high text-white text-xs font-bold text-center border border-white/10 transition-all flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-cyan-400">near_me</span>
            <span>Open Station in Google Maps</span>
          </a>
        </div>

      </div>
    `;
  }

  addMetroPandalToPlan(pandalId, fromStationName) {
    const p = this.findPandal(pandalId);
    if (!p) return;

    const activePlan = this.getActivePlan();
    const existingIndex = activePlan.items.findIndex(item => item.type === 'pandal' && item.itemId === p.id);

    if (existingIndex >= 0) {
      this.showToast(`"${p.name}" is already in active plan "${activePlan.name}".`);
      return;
    }

    activePlan.items.push({
      id: 'item_' + Date.now(),
      type: 'pandal',
      itemId: p.id,
      name: p.name,
      zone: p.zone || p.location,
      timeSlot: p.bestTime ? p.bestTime.slice(0, 18) : '06:00 PM - 07:30 PM',
      distanceFromPrev: 'Near ' + (fromStationName || p.nearestMetro),
      note: `Connected via Metro: ${fromStationName || p.nearestMetro}`,
      coordinates: p.coordinates
    });

    this.savePlans();
    this.updateParikramaBadge();
    this.showToast(`Added "${p.name}" (via ${fromStationName}) to "${activePlan.name}"! 🛕`);
  }

  openMetroPlannerModal(preselectedStationId = null) {
    if (!this.requireAuth('plan puja metro route')) return;
    const modal = document.getElementById('pujo-metro-planner-modal');
    if (!modal) return;

    const operationalStations = this.metroStations.filter(s => s.operationalStatus === 'operational');

    // Populate Start and Destination Selectors grouped by line
    const startSelect = document.getElementById('route-start-station-select');
    const destSelect = document.getElementById('route-dest-station-select');

    const lines = ['Blue', 'Green', 'Purple', 'Orange'];
    let optionsHtml = '<option value="">-- Select Station --</option>';

    lines.forEach(line => {
      const lineStations = operationalStations.filter(s => {
        if (Array.isArray(s.line)) return s.line.includes(line);
        return s.line === line;
      });
      if (lineStations.length > 0) {
        optionsHtml += `<optgroup label="${line} Line">`;
        lineStations.forEach(st => {
          const isInterchange = st.interchange ? ' ⚡ Interchange' : '';
          optionsHtml += `<option value="${st.id}">${st.stationName}${isInterchange}</option>`;
        });
        optionsHtml += `</optgroup>`;
      }
    });

    if (startSelect) {
      startSelect.innerHTML = optionsHtml;
      if (preselectedStationId) {
        startSelect.value = preselectedStationId;
      } else if (!startSelect.value) {
        startSelect.value = 'metro-shyambazar';
      }
    }

    if (destSelect) {
      destSelect.innerHTML = optionsHtml;
      if (!destSelect.value || destSelect.value === startSelect.value) {
        destSelect.value = 'metro-kalighat';
      }
    }

    // Set active day
    const daySelect = document.getElementById('route-target-day-select');
    if (daySelect) {
      daySelect.value = this.getActivePlan().day || this.currentDay || 'Maha Sasthi';
    }

    this.updateMetroPlannerRoutePreview();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeMetroPlannerModal() {
    const modal = document.getElementById('pujo-metro-planner-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  updateMetroPlannerRoutePreview() {
    const startSelect = document.getElementById('route-start-station-select');
    const destSelect = document.getElementById('route-dest-station-select');
    const pandalListContainer = document.getElementById('route-pandal-selection-list');
    const timelineContainer = document.getElementById('route-timeline-steps-list');
    const pandalCountLabel = document.getElementById('route-available-pandals-count');

    if (!startSelect || !destSelect || !timelineContainer) return;

    const startStation = this.metroStations.find(s => s.id === startSelect.value);
    const destStation = this.metroStations.find(s => s.id === destSelect.value);

    if (!startStation || !destStation) {
      timelineContainer.innerHTML = '<div class="text-on-surface-variant italic p-3">Select starting and destination metro stations to generate route.</div>';
      return;
    }

    // Gather available pandals near start station, dest station, and interchange if applicable
    const availablePandals = [];
    const seenPandalIds = new Set();

    (startStation.nearbyPandals || []).forEach(p => {
      if (!seenPandalIds.has(p.id)) {
        seenPandalIds.add(p.id);
        availablePandals.push({ ...p, nearStation: startStation.stationName, stationRole: 'start' });
      }
    });

    (destStation.nearbyPandals || []).forEach(p => {
      if (!seenPandalIds.has(p.id)) {
        seenPandalIds.add(p.id);
        availablePandals.push({ ...p, nearStation: destStation.stationName, stationRole: 'dest' });
      }
    });

    if (pandalCountLabel) {
      pandalCountLabel.textContent = `${availablePandals.length} pandals available along stations`;
    }

    // Render Pandal checkboxes
    if (pandalListContainer) {
      if (availablePandals.length === 0) {
        pandalListContainer.innerHTML = '<div class="col-span-2 text-xs text-on-surface-variant italic p-2">No direct pandals registered at selected terminals.</div>';
      } else {
        // Retain selected pandals in state
        const selectedIds = new Set(this.metroRoutePlanner.selectedPandalIds || []);

        pandalListContainer.innerHTML = availablePandals.map(p => {
          const isChecked = selectedIds.has(p.id);
          return `
            <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/10 cursor-pointer transition-colors">
              <input type="checkbox" class="metro-pandal-checkbox rounded text-primary focus:ring-primary h-4 w-4 bg-surface-container-highest border-white/20" value="${p.id}" ${isChecked ? 'checked' : ''} />
              <div class="overflow-hidden">
                <div class="text-xs font-bold text-white truncate">🛕 ${p.name || p.pandalName}</div>
                <div class="text-[10px] text-yellow-300 font-mono">📍 ${p.distanceText} · ${p.walkText} (Near ${p.nearStation})</div>
              </div>
            </label>
          `;
        }).join('');

        // Bind checkbox changes
        pandalListContainer.querySelectorAll('.metro-pandal-checkbox').forEach(chk => {
          chk.addEventListener('change', () => {
            const checkedBoxes = pandalListContainer.querySelectorAll('.metro-pandal-checkbox:checked');
            this.metroRoutePlanner.selectedPandalIds = Array.from(checkedBoxes).map(c => c.value);
            this.renderMetroRouteTimeline(startStation, destStation);
          });
        });
      }
    }

    this.renderMetroRouteTimeline(startStation, destStation);
  }

  renderMetroRouteTimeline(startStation, destStation) {
    const timelineContainer = document.getElementById('route-timeline-steps-list');
    if (!timelineContainer) return;

    const startLine = Array.isArray(startStation.line) ? startStation.line[0] : startStation.line;
    const destLine = Array.isArray(destStation.line) ? destStation.line[0] : destStation.line;
    const isTransferNeeded = startLine !== destLine;

    // Detect genuine operational interchange
    let interchangeStation = null;
    if (isTransferNeeded) {
      if ((startLine === 'Blue' && destLine === 'Green') || (startLine === 'Green' && destLine === 'Blue')) {
        interchangeStation = this.metroStations.find(s => s.id === 'metro-esplanade');
      } else if ((startLine === 'Blue' && destLine === 'Orange') || (startLine === 'Orange' && destLine === 'Blue')) {
        interchangeStation = this.metroStations.find(s => s.id === 'metro-kavi-subhash');
      }
    }

    const selectedPandalIds = new Set(this.metroRoutePlanner.selectedPandalIds || []);
    const selectedPandalsNearStart = (startStation.nearbyPandals || []).filter(p => selectedPandalIds.has(p.id));
    const selectedPandalsNearDest = (destStation.nearbyPandals || []).filter(p => selectedPandalIds.has(p.id));

    let timelineHtml = `
      <!-- Step 1: Start Station -->
      <div class="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container border border-white/5">
        <span class="w-7 h-7 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center text-xs font-bold shrink-0">1</span>
        <div class="space-y-0.5">
          <div class="text-xs font-bold text-white flex items-center gap-2">
            <span>🚇 Board Metro at ${startStation.stationName}</span>
            <span class="px-2 py-0.2 rounded metro-badge-${startLine.toLowerCase()} text-[10px]">${startLine} Line</span>
          </div>
          <div class="text-[11px] text-on-surface-variant font-mono">Platform 1 / 2 • Operational Revenue Service</div>
        </div>
      </div>
    `;

    // Start Station Connected Pandals
    if (selectedPandalsNearStart.length > 0) {
      selectedPandalsNearStart.forEach(p => {
        timelineHtml += `
          <div class="flex items-start gap-3 p-2.5 rounded-xl bg-yellow-950/30 border border-yellow-400/20 ml-4">
            <span class="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-300 flex items-center justify-center text-xs shrink-0">🚶</span>
            <div class="space-y-0.5">
              <div class="text-xs font-bold text-yellow-300">🛕 Visit: ${p.name || p.pandalName}</div>
              <div class="text-[10px] text-on-surface-variant font-mono">📍 ${p.distanceText} walk (${p.walkText}) from ${startStation.stationName} • ~45 min Darshan</div>
            </div>
          </div>
        `;
      });
    }

    // Metro Transit / Transfer Step
    if (isTransferNeeded && interchangeStation) {
      timelineHtml += `
        <!-- Interchange Transfer Step -->
        <div class="flex items-start gap-3 p-2.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-yellow-950/40 to-green-950/40 border border-yellow-400/30">
          <span class="w-7 h-7 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 flex items-center justify-center text-xs font-bold shrink-0">⚡</span>
          <div class="space-y-0.5">
            <div class="text-xs font-bold text-yellow-300 flex items-center gap-2">
              <span>Transfer at ${interchangeStation.stationName}</span>
              <span class="text-[10px] text-white">(${startLine} Line ↔ ${destLine} Line)</span>
            </div>
            <div class="text-[11px] text-on-surface-variant font-mono">~3 min Underpass Walking Transfer • Retain Ticket / Smart Card</div>
          </div>
        </div>
      `;
    } else {
      timelineHtml += `
        <!-- Direct Metro Transit -->
        <div class="flex items-start gap-3 p-2 rounded-xl bg-surface-container/50 border border-white/5 ml-4">
          <span class="material-symbols-outlined text-[18px] text-cyan-400 shrink-0">train</span>
          <div class="text-[11px] text-on-surface-variant font-mono">
            Direct transit on ${startLine} Line from ${startStation.stationName} ➔ ${destStation.stationName} (~18 mins)
          </div>
        </div>
      `;
    }

    // Destination Station Connected Pandals
    if (selectedPandalsNearDest.length > 0) {
      selectedPandalsNearDest.forEach(p => {
        timelineHtml += `
          <div class="flex items-start gap-3 p-2.5 rounded-xl bg-yellow-950/30 border border-yellow-400/20 ml-4">
            <span class="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-300 flex items-center justify-center text-xs shrink-0">🚶</span>
            <div class="space-y-0.5">
              <div class="text-xs font-bold text-yellow-300">🛕 Visit: ${p.name || p.pandalName}</div>
              <div class="text-[10px] text-on-surface-variant font-mono">📍 ${p.distanceText} walk (${p.walkText}) from ${destStation.stationName} • ~45 min Darshan</div>
            </div>
          </div>
        `;
      });
    }

    // Final Arrival Step
    timelineHtml += `
      <!-- Step 3: Destination -->
      <div class="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container border border-white/5">
        <span class="w-7 h-7 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center text-xs font-bold shrink-0">★</span>
        <div class="space-y-0.5">
          <div class="text-xs font-bold text-white flex items-center gap-2">
            <span>Alight at Destination: ${destStation.stationName}</span>
            <span class="px-2 py-0.2 rounded metro-badge-${destLine.toLowerCase()} text-[10px]">${destLine} Line</span>
          </div>
          <div class="text-[11px] text-on-surface-variant font-mono">Circuit Complete • Return via same metro network</div>
        </div>
      </div>
    `;

    timelineContainer.innerHTML = timelineHtml;
  }

  saveMetroRouteToParikrama() {
    const startSelect = document.getElementById('route-start-station-select');
    const destSelect = document.getElementById('route-dest-station-select');
    const daySelect = document.getElementById('route-target-day-select');

    if (!startSelect || !destSelect) return;

    const startStation = this.metroStations.find(s => s.id === startSelect.value);
    const destStation = this.metroStations.find(s => s.id === destSelect.value);
    const targetDay = daySelect ? daySelect.value : 'Maha Sasthi';

    if (!startStation || !destStation) {
      this.showToast('Please select valid start and destination metro stations.');
      return;
    }

    // Find or create plan for targetDay
    let targetPlan = this.plans.find(p => p.day === targetDay);
    if (!targetPlan) {
      targetPlan = {
        id: 'plan_' + Date.now(),
        name: `Metro Parikrama: ${startStation.stationName} to ${destStation.stationName}`,
        day: targetDay,
        createdDate: new Date().toISOString(),
        items: []
      };
      this.plans.push(targetPlan);
    }

    this.activePlanId = targetPlan.id;

    // Collect selected pandals
    const selectedPandalIds = this.metroRoutePlanner.selectedPandalIds || [];
    let addedCount = 0;

    selectedPandalIds.forEach(pId => {
      const p = this.findPandal(pId);
      if (p) {
        const isExisting = targetPlan.items.some(i => i.type === 'pandal' && i.itemId === p.id);
        if (!isExisting) {
          targetPlan.items.push({
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            type: 'pandal',
            itemId: p.id,
            name: p.name,
            zone: p.zone || p.location,
            timeSlot: p.bestTime ? p.bestTime.slice(0, 18) : '06:00 PM - 07:30 PM',
            distanceFromPrev: `Metro Route (${startStation.stationName} ➔ ${destStation.stationName})`,
            note: `Metro hopping via ${p.nearestMetro || startStation.stationName}`,
            coordinates: p.coordinates
          });
          addedCount++;
        }
      }
    });

    this.savePlans();
    this.updateParikramaBadge();
    this.closeMetroPlannerModal();

    this.showToast(`Saved Metro Route with ${addedCount} pandal stops to "${targetPlan.name}" (${targetDay})! 🎉`);

    // Navigate to Parikrama View
    this.navigateTo('planned');
  }

  // ==========================================
  // SMART PERSONALIZED ITINERARY GENERATOR (DAY-AWARE)
  // ==========================================
  generatePersonalizedItinerary(options = {}) {
    const activePlanDay = this.getActivePlan().day || this.currentDay || 'Maha Sasthi';
    const {
      archetype = 'friends',
      day = activePlanDay,
      timeWindow = 'midnight',
      zone = 'all',
      cuisine = 'biryani',
      pace = 'balanced'
    } = options;

    const selectedDay = day || activePlanDay || 'Maha Sasthi';

    // 1. Determine number of pandals & eateries based on pace
    let targetPandals = 5;
    let targetEateries = 2;
    if (pace === 'relaxed') {
      targetPandals = 3;
      targetEateries = 1;
    } else if (pace === 'balanced') {
      targetPandals = 5;
      targetEateries = 2;
    } else if (pace === 'intense') {
      targetPandals = 7;
      targetEateries = 2;
    }

    // 2. Filter candidate pandals by zone if specified
    let candidatePandals = this.pandals;
    if (zone !== 'all') {
      candidatePandals = candidatePandals.filter(p => p.zoneKey === zone);
    }
    if (candidatePandals.length < targetPandals) {
      candidatePandals = this.pandals;
    }

    // Day-specific theme boosts and ritual descriptors
    const dayContextMap = {
      'Maha Sasthi': {
        ritualName: 'Bodhon & Adhibas',
        themeBoostCategory: ['theme', 'popular', 'lighting'],
        zoneBoost: 'north',
        notePrefix: '🌸 [Maha Sasthi Bodhon]',
        eateryBoost: ['street', 'cafes']
      },
      'Maha Saptami': {
        ritualName: 'Nabapatrika (Kola Bou) Snan',
        themeBoostCategory: ['traditional', 'sabeki'],
        zoneBoost: 'north',
        notePrefix: '🌿 [Maha Saptami Nabapatrika]',
        eateryBoost: ['traditional', 'bengali']
      },
      'Maha Ashtami': {
        ritualName: 'Pushpanjali & Sandhi Puja',
        themeBoostCategory: ['traditional', 'sabeki', 'popular'],
        zoneBoost: 'south',
        notePrefix: '🪔 [Maha Ashtami Sandhi & Anjali]',
        eateryBoost: ['traditional', 'biryani']
      },
      'Maha Navami': {
        ritualName: 'Maha Arati & Dhunuchi Naach',
        themeBoostCategory: ['lighting', 'theme', 'popular'],
        zoneBoost: 'south',
        notePrefix: '🔥 [Maha Navami Dhunuchi & Illuminations]',
        eateryBoost: ['midnight', 'biryani', 'street']
      },
      'Bijoya Dashami': {
        ritualName: 'Sindoor Khela & Bisorjon',
        themeBoostCategory: ['traditional', 'sabeki', 'eco'],
        zoneBoost: 'central',
        notePrefix: '🌺 [Bijoya Dashami Sindoor Khela & Bisorjon]',
        eateryBoost: ['cafes', 'sweets', 'traditional']
      }
    };

    const dayCtx = dayContextMap[selectedDay] || dayContextMap['Maha Sasthi'];

    // 3. Score candidate pandals based on day context + archetype & preferences
    const scoredPandals = candidatePandals.map(pandal => {
      let score = 0;
      const cats = Array.isArray(pandal.category) ? pandal.category : [pandal.category];

      // Day-specific thematic scoring
      if (dayCtx.themeBoostCategory.some(c => cats.includes(c))) score += 4;
      if (pandal.zoneKey === dayCtx.zoneBoost) score += 3;

      // Archetype scoring
      if (archetype === 'friends') {
        if (cats.includes('theme')) score += 6;
        if (cats.includes('lighting')) score += 5;
        if (cats.includes('popular')) score += 4;
        if (pandal.crowdLevel === 'Peak' || pandal.crowdLevel === 'High') score += 3;
      } else if (archetype === 'family') {
        if (cats.includes('traditional')) score += 8;
        if (cats.includes('sabeki')) score += 6;
        if (cats.includes('eco')) score += 4;
        if (pandal.crowdLevel === 'Low' || pandal.crowdLevel === 'Moderate') score += 5;
      } else if (archetype === 'couple') {
        if (cats.includes('lighting')) score += 7;
        if (pandal.location.toLowerCase().includes('lake') || pandal.location.toLowerCase().includes('park')) score += 6;
        if (cats.includes('traditional')) score += 3;
      } else if (archetype === 'solo' || archetype === 'culture') {
        if (cats.includes('eco')) score += 6;
        if (cats.includes('theme')) score += 5;
        if (pandal.zoneKey === 'north') score += 4;
      }

      // Add deterministic day-based seed to ensure variety across days
      const daySeed = (selectedDay.length * 13 + pandal.name.length * 7) % 11;
      score += daySeed;

      return { pandal, score };
    });

    scoredPandals.sort((a, b) => b.score - a.score);
    const selectedPandals = scoredPandals.slice(0, targetPandals).map(sp => sp.pandal);

    // 4. Select candidate eateries based on cuisine preference and day context
    let candidateEateries = this.eateries;
    if (cuisine === 'biryani') {
      candidateEateries = candidateEateries.filter(e => e.category === 'midnight' || e.cuisine.toLowerCase().includes('biryani') || e.cuisine.toLowerCase().includes('mughlai'));
    } else if (cuisine === 'bengali') {
      candidateEateries = candidateEateries.filter(e => e.category === 'traditional' || e.cuisine.toLowerCase().includes('bengali') || e.cuisine.toLowerCase().includes('thali'));
    } else if (cuisine === 'street') {
      candidateEateries = candidateEateries.filter(e => e.category === 'street' || e.cuisine.toLowerCase().includes('fry') || e.cuisine.toLowerCase().includes('chop'));
    } else if (cuisine === 'sweets') {
      candidateEateries = candidateEateries.filter(e => e.category === 'cafes' || e.cuisine.toLowerCase().includes('sandesh') || e.cuisine.toLowerCase().includes('sweet'));
    } else if (cuisine === 'finedine') {
      candidateEateries = candidateEateries.filter(e => e.category === 'finedine');
    }

    if (candidateEateries.length < targetEateries) {
      candidateEateries = this.eateries;
    }

    const sortedEateries = [...candidateEateries].sort((a, b) => b.rating - a.rating);
    const selectedEateries = sortedEateries.slice(0, targetEateries);

    // 5. Build chronological timeline
    const startHourMap = {
      'morning': 8,      // 08:00 AM
      'afternoon': 13,   // 01:00 PM
      'evening': 17,     // 05:00 PM
      'midnight': 23,    // 11:00 PM
      'allday': 9        // 09:00 AM
    };
    let currentHour = startHourMap[timeWindow] || 17;
    let currentMinute = 0;

    const formatTimeSlot = (startH, startM, durationM) => {
      const endTotalM = (startH * 60 + startM + durationM) % (24 * 60);
      const endH = Math.floor(endTotalM / 60);
      const endM = endTotalM % 60;

      const formatSingle = (h, m) => {
        const period = h >= 12 && h < 24 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayM = String(m).padStart(2, '0');
        return `${String(displayH).padStart(2, '0')}:${displayM} ${period}`;
      };

      return `${formatSingle(startH, startM)} - ${formatSingle(endH, endM)}`;
    };

    const itineraryItems = [];
    let pandalIdx = 0;
    let eateryIdx = 0;
    const totalStops = selectedPandals.length + selectedEateries.length;

    const foodInsertPoints = [];
    if (selectedEateries.length === 1) {
      foodInsertPoints.push(Math.floor(selectedPandals.length / 2));
    } else if (selectedEateries.length === 2) {
      foodInsertPoints.push(2);
      foodInsertPoints.push(selectedPandals.length);
    }

    let pCount = 0;
    for (let i = 0; i < totalStops; i++) {
      if (foodInsertPoints.includes(pCount) && eateryIdx < selectedEateries.length) {
        const eatery = selectedEateries[eateryIdx++];
        const duration = 60;
        const timeSlot = formatTimeSlot(currentHour, currentMinute, duration);

        itineraryItems.push({
          id: 'gen_e_' + Date.now() + '_' + eateryIdx,
          type: 'eatery',
          itemId: eatery.id,
          name: `${eatery.name} (${eatery.outlet})`,
          zone: eatery.location,
          timeSlot: timeSlot,
          distanceFromPrev: '1.2 km (Transit / Walk)',
          duration: `${duration} mins`,
          notes: `${selectedDay} Dining: Must-try ${eatery.mustTry ? eatery.mustTry.slice(0, 2).join(', ') : 'Specialties'} (${eatery.avgPrice}).`,
          details: eatery
        });

        const newTotalM = (currentHour * 60 + currentMinute + duration + 15) % (24 * 60);
        currentHour = Math.floor(newTotalM / 60);
        currentMinute = newTotalM % 60;
      } else if (pandalIdx < selectedPandals.length) {
        const pandal = selectedPandals[pandalIdx++];
        pCount++;
        const duration = 75;
        const timeSlot = formatTimeSlot(currentHour, currentMinute, duration);

        itineraryItems.push({
          id: 'gen_p_' + Date.now() + '_' + pandalIdx,
          type: 'pandal',
          itemId: pandal.id,
          name: pandal.name,
          zone: pandal.location,
          timeSlot: timeSlot,
          distanceFromPrev: pandalIdx === 1 ? '0 km (Starting Point)' : '1.8 km (Metro / Walk)',
          duration: `${duration} mins`,
          notes: `${dayCtx.notePrefix} Theme: ${pandal.theme}. Nearest Metro: ${pandal.nearestMetro}.`,
          details: pandal
        });

        const newTotalM = (currentHour * 60 + currentMinute + duration + 20) % (24 * 60);
        currentHour = Math.floor(newTotalM / 60);
        currentMinute = newTotalM % 60;
      }
    }

    return {
      options,
      day: selectedDay,
      ritualName: dayCtx.ritualName,
      archetype,
      timeWindow,
      zone,
      cuisine,
      pace,
      items: itineraryItems,
      totalEstDistance: (itineraryItems.length * 2.2).toFixed(1),
      totalEstHours: (itineraryItems.length * 1.4).toFixed(1),
      totalPandals: selectedPandals.length,
      totalEateries: selectedEateries.length
    };
  }

  // Renders a generated itinerary with rich cards and action buttons
  renderPersonalizedItinerary(result, targetContainer, isModal = false) {
    if (!targetContainer) return;

    const archetypeTitles = {
      'friends': 'Friends Squad',
      'family': 'Family & Elders',
      'couple': 'Couple',
      'solo': 'Solo & Art Lover'
    };

    const timeWindowLabels = {
      'midnight': 'Midnight All-Nighter (11 PM - 5 AM)',
      'morning': 'Morning Devotion (7:30 AM - 12:30 PM)',
      'afternoon': 'Afternoon Culture (1:00 PM - 5:30 PM)',
      'evening': 'Evening Prime Time (5:00 PM - 10:30 PM)',
      'allday': 'Full Day Grand Tour (9:00 AM - 8:00 PM)'
    };

    targetContainer.innerHTML = `
      <div class="glass-card rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl relative">
        
        <!-- Itinerary Header Summary -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-mono font-bold uppercase tracking-wider">
                ✨ ${archetypeTitles[result.archetype] || 'Personalized'} Circuit
              </span>
              <span class="px-3.5 py-1 rounded-full bg-primary/20 text-primary font-bold text-xs font-mono border border-primary/30">
                📅 ${result.day} (${result.ritualName || 'Festive'})
              </span>
              <span class="px-3 py-1 rounded-full bg-tertiary/15 text-tertiary text-xs font-mono">
                ${timeWindowLabels[result.timeWindow] || result.timeWindow}
              </span>
            </div>
            <h3 class="font-headline text-2xl sm:text-3xl font-bold text-white">Recommended ${result.day} Itinerary</h3>
            <p class="text-xs sm:text-sm text-on-surface-variant max-w-xl">Curated specifically for <strong>${result.day}</strong> with ${result.totalPandals} heritage pandals, ${result.totalEateries} food stops, and synchronized ritual timings.</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
            <button class="apply-gen-itinerary-btn px-5 py-2.5 rounded-full bg-primary text-black font-bold text-xs shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5" title="Apply to Active Plan for ${result.day}">
              <span class="material-symbols-outlined text-[16px]">check_circle</span> Apply to Active Plan
            </button>
            <button class="new-plan-gen-itinerary-btn px-4 py-2.5 rounded-full bg-secondary text-black font-bold text-xs shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5" title="Create a New Separate Plan for ${result.day}">
              <span class="material-symbols-outlined text-[16px]">add_task</span> Save as New Plan
            </button>
            <button class="merge-gen-itinerary-btn px-4 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-1.5" title="Append to Current Plan">
              <span class="material-symbols-outlined text-[16px]">add_circle</span> Add Stops
            </button>
            <button class="share-gen-itinerary-btn px-3.5 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-1.5" title="Share via WhatsApp / Text">
              <span class="material-symbols-outlined text-[16px]">share</span> Share
            </button>
            <button class="print-gen-itinerary-btn px-3.5 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-1.5" title="Print Itinerary">
              <span class="material-symbols-outlined text-[16px]">print</span> Print
            </button>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-2xl">temple_hindu</span>
            <div>
              <span class="text-lg font-headline font-bold text-white block leading-none">${result.totalPandals}</span>
              <span class="text-[10px] font-mono uppercase text-on-surface-variant">Pandals</span>
            </div>
          </div>
          <div class="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center gap-3">
            <span class="material-symbols-outlined text-secondary text-2xl">restaurant</span>
            <div>
              <span class="text-lg font-headline font-bold text-white block leading-none">${result.totalEateries}</span>
              <span class="text-[10px] font-mono uppercase text-on-surface-variant">Food Stops</span>
            </div>
          </div>
          <div class="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center gap-3">
            <span class="material-symbols-outlined text-tertiary text-2xl">route</span>
            <div>
              <span class="text-lg font-headline font-bold text-white block leading-none">${result.totalEstDistance} km</span>
              <span class="text-[10px] font-mono uppercase text-on-surface-variant">Est. Distance</span>
            </div>
          </div>
          <div class="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center gap-3">
            <span class="material-symbols-outlined text-purple-400 text-2xl">schedule</span>
            <div>
              <span class="text-lg font-headline font-bold text-white block leading-none">${result.totalEstHours} hrs</span>
              <span class="text-[10px] font-mono uppercase text-on-surface-variant">Est. Duration</span>
            </div>
          </div>
        </div>

        <!-- Timeline Stops -->
        <div class="space-y-3 pt-2">
          <h4 class="text-xs font-mono uppercase tracking-widest text-tertiary font-bold">Step-by-Step Chronological Trail for ${result.day}</h4>
          <div class="space-y-3">
            ${result.items.map((item, idx) => {
              const isPandal = item.type === 'pandal';
              const icon = isPandal ? 'temple_hindu' : 'restaurant';
              const colorClass = isPandal ? 'text-primary bg-primary/10 border-primary/30' : 'text-secondary bg-secondary/10 border-secondary/30';
              const badgeClass = isPandal ? 'border-primary/20 text-primary' : 'border-secondary/20 text-secondary';

              return `
                <div class="flex items-start gap-3 sm:gap-4 p-4 rounded-xl bg-surface-container border border-white/5 hover:border-white/20 transition-colors">
                  <div class="w-8 h-8 rounded-full border ${colorClass} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ${idx + 1}
                  </div>
                  <div class="flex-1 space-y-1">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px] ${isPandal ? 'text-primary' : 'text-secondary'}">${icon}</span>
                        <h5 class="font-headline font-bold text-sm sm:text-base text-white">${item.name}</h5>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono border ${badgeClass}">${isPandal ? 'Pandal' : 'Food Stop'}</span>
                      </div>
                      <span class="px-2.5 py-0.5 rounded-full bg-white/5 text-xs font-mono text-tertiary border border-white/10 whitespace-nowrap">
                        ${item.timeSlot}
                      </span>
                    </div>
                    <p class="text-xs text-on-surface-variant flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[14px]">location_on</span>
                      ${item.zone}
                    </p>
                    <p class="text-xs text-on-surface font-medium pt-1">
                      ${item.notes}
                    </p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    // Bind Action Buttons
    targetContainer.querySelectorAll('.apply-gen-itinerary-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPersonalizedItinerary(result, 'replace');
        if (isModal) {
          document.getElementById('itinerary-wizard-modal')?.classList.add('hidden');
        }
      });
    });

    targetContainer.querySelectorAll('.new-plan-gen-itinerary-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPersonalizedItinerary(result, 'new_plan');
        if (isModal) {
          document.getElementById('itinerary-wizard-modal')?.classList.add('hidden');
        }
      });
    });

    targetContainer.querySelectorAll('.merge-gen-itinerary-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPersonalizedItinerary(result, 'append');
        if (isModal) {
          document.getElementById('itinerary-wizard-modal')?.classList.add('hidden');
        }
      });
    });

    targetContainer.querySelectorAll('.share-gen-itinerary-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sharePersonalizedItinerary(result);
      });
    });

    targetContainer.querySelectorAll('.print-gen-itinerary-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.print();
      });
    });
  }

  // Applies the generated itinerary into plans (with day-specific assignment)
  applyPersonalizedItinerary(result, mode = 'replace') {
    const selectedDay = result.day || 'Maha Sasthi';
    const archetypeLabel = result.archetype ? result.archetype.charAt(0).toUpperCase() + result.archetype.slice(1) : 'Festive';
    const planName = `${selectedDay} - ${archetypeLabel} Circuit`;

    if (mode === 'new_plan') {
      const newPlan = this.createNewPlan(planName, selectedDay, true);
      newPlan.items = result.items.map(item => ({
        id: item.id,
        type: item.type,
        itemId: item.itemId,
        name: item.name,
        zone: item.zone,
        timeSlot: item.timeSlot,
        distanceFromPrev: item.distanceFromPrev,
        duration: item.duration,
        notes: item.notes
      }));
      this.currentDay = selectedDay;
      this.savePlans();
      this.showToast(`✨ Created new plan "${newPlan.name}" for ${selectedDay}!`);
      this.navigateTo('planned');
      return;
    }

    const activePlan = this.getActivePlan();
    activePlan.day = selectedDay;
    this.currentDay = selectedDay;

    if (mode === 'replace') {
      activePlan.name = planName;
      this.parikrama = result.items.map(item => ({
        id: item.id,
        type: item.type,
        itemId: item.itemId,
        name: item.name,
        zone: item.zone,
        timeSlot: item.timeSlot,
        distanceFromPrev: item.distanceFromPrev,
        duration: item.duration,
        notes: item.notes
      }));
      this.savePlans();
      this.showToast(`✨ Updated "${activePlan.name}" for ${selectedDay}!`);
    } else {
      const newItems = result.items.map(item => ({
        id: item.id,
        type: item.type,
        itemId: item.itemId,
        name: item.name,
        zone: item.zone,
        timeSlot: item.timeSlot,
        distanceFromPrev: item.distanceFromPrev,
        duration: item.duration,
        notes: item.notes
      }));
      this.parikrama = [...this.parikrama, ...newItems];
      this.savePlans();
      this.showToast(`➕ Added ${newItems.length} curated stops to "${activePlan.name}"!`);
    }

    this.navigateTo('planned');
  }

  // Shares formatted itinerary text via WhatsApp or Clipboard
  sharePersonalizedItinerary(result) {
    const lines = [
      `🎉 *My Sharodiya 2026 Durga Puja Itinerary*`,
      `📅 *Day:* ${result.day} | 👥 *Squad:* ${result.archetype.toUpperCase()}`,
      `⏱️ *Est. Duration:* ${result.totalEstHours} hrs | 🚶 *Distance:* ${result.totalEstDistance} km\n`,
      `📍 *PARIKRAMA ROUTE:*`
    ];

    result.items.forEach((item, idx) => {
      const emoji = item.type === 'pandal' ? '🏛️' : '🍽️';
      lines.push(`${idx + 1}. ${emoji} *${item.name}* [${item.timeSlot}]`);
      lines.push(`   └ ${item.notes}`);
    });

    lines.push(`\n✨ Planned with Sharodiya Durga Puja Companion: http://localhost:3000/#planned`);

    const fullText = lines.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    window.open(whatsappUrl, '_blank');
    this.showToast('📋 Itinerary formatted and copied to clipboard! Opening WhatsApp...');
  }

  // SQUAD / COMPANIONSHIP RENDERER
  renderArchetypes() {
    const grid = document.getElementById('archetype-grid');
    const detailsContainer = document.getElementById('archetype-details');
    if (!grid) return;

    grid.innerHTML = COMPANION_ARCHETYPES.map(arch => {
      const isSelected = arch.id === this.selectedArchetype;

      return `
        <button class="archetype-card group relative flex flex-col w-full text-left glass-card rounded-2xl p-6 lg:p-8 overflow-hidden transition-all duration-500 hover:-translate-y-2 ${isSelected ? 'border-primary shadow-[0_0_25px_rgba(211,16,24,0.4)]' : ''}" data-archetype="${arch.id}">
          <div class="relative z-10 flex flex-col h-full">
            <div class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined text-3xl" style="font-variation-settings: 'FILL' 1; color: ${arch.accentHex}">${arch.icon}</span>
            </div>

            <h3 class="font-headline text-2xl font-bold text-white mb-2">${arch.title}</h3>
            <p class="text-xs font-mono text-tertiary mb-3">${arch.tagline}</p>
            <p class="text-sm text-on-surface-variant flex-grow leading-relaxed">${arch.description}</p>

            <div class="mt-6 flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-wider">
              <span>${isSelected ? 'Active Selection' : 'Explore Itinerary'}</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
          </div>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.archetype-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-archetype');
        this.selectedArchetype = id;
        this.renderArchetypes();
      });
    });

    if (detailsContainer) {
      const active = COMPANION_ARCHETYPES.find(a => a.id === this.selectedArchetype) || COMPANION_ARCHETYPES[0];
      
      // Auto-generate realistic personalized itinerary for active archetype
      const timeWindowMap = {
        'friends': 'midnight',
        'family': 'morning',
        'couple': 'evening',
        'solo': 'afternoon'
      };
      const cuisineMap = {
        'friends': 'biryani',
        'family': 'bengali',
        'couple': 'sweets',
        'solo': 'street'
      };

      const result = this.generatePersonalizedItinerary({
        archetype: active.id,
        day: this.getActivePlan().day || this.currentDay || 'Maha Sasthi',
        timeWindow: timeWindowMap[active.id] || 'midnight',
        zone: 'all',
        cuisine: cuisineMap[active.id] || 'biryani',
        pace: 'balanced'
      });

      this.renderPersonalizedItinerary(result, detailsContainer, false);
    }
  }

  // RITUAL SCHEDULE RENDERER (Interactive Day Selector with accurate Muhurats & Details)
  renderSchedule() {
    const tabsContainer = document.getElementById('schedule-day-tabs');
    const container = document.getElementById('ritual-schedule-container');
    if (!container) return;

    // 1. Render Interactive Day Selector Tabs
    if (tabsContainer) {
      tabsContainer.innerHTML = RITUAL_SCHEDULE.map(sch => {
        const isActive = sch.day === this.selectedScheduleDay;
        const shortName = sch.day.replace('Maha ', '').replace('Bijoya ', '');
        return `
          <button class="schedule-tab-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${isActive ? 'bg-primary text-black shadow-md' : 'bg-surface-container text-on-surface-variant hover:text-white'}" data-day="${sch.day}">
            <span>${shortName}</span>
          </button>
        `;
      }).join('');

      tabsContainer.querySelectorAll('.schedule-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedScheduleDay = btn.getAttribute('data-day');
          this.renderSchedule();
        });
      });
    }

    // 2. Find currently selected day schedule
    const active = RITUAL_SCHEDULE.find(s => s.day === this.selectedScheduleDay) || RITUAL_SCHEDULE[0];

    // 3. Render complete accurate ritual breakdown
    container.innerHTML = `
      <div class="space-y-2.5">
        <!-- Day Header Badge -->
        <div class="bg-surface-container-high/60 p-3 rounded-xl border border-white/5 space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-headline font-bold text-white text-sm">${active.day}</span>
            <span class="font-mono text-[10px] text-tertiary font-bold bg-black/40 px-2 py-0.5 rounded-md">${active.bengaliTithi}</span>
          </div>
          <p class="text-[11px] text-secondary font-mono">${active.englishDate}</p>
          <p class="text-xs text-on-surface-variant leading-relaxed pt-1 border-t border-white/5">${active.shortDesc}</p>
        </div>

        <!-- Devotee Guidelines Card -->
        <div class="bg-surface-container/80 p-2.5 rounded-xl border-l-2 border-tertiary flex items-start gap-2 text-xs">
          <span class="material-symbols-outlined text-tertiary text-[16px] shrink-0 mt-0.5">tips_and_updates</span>
          <p class="text-[11px] text-on-surface-variant leading-tight"><strong>Guideline:</strong> ${active.guidelines}</p>
        </div>

        <!-- Step-by-Step Events Timeline -->
        <div class="space-y-2 pt-1">
          ${active.events.map((evt) => `
            <div class="bg-surface-container/70 p-3 rounded-xl border border-white/5 hover:border-primary/30 transition-all space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold text-white text-xs flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  ${evt.title}
                </span>
                <span class="font-mono text-[10px] text-tertiary font-bold px-2 py-0.5 bg-black/40 rounded">${evt.time}</span>
              </div>
              <p class="text-[11px] text-on-surface leading-relaxed">${evt.desc}</p>
              ${evt.significance ? `<p class="text-[10px] text-secondary font-mono italic">✦ ${evt.significance}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Full 5-Day Ritual Calendar Modal
  openScheduleModal() {
    const modal = document.getElementById('schedule-modal');
    const content = document.getElementById('schedule-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="p-6 md:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-white/10 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-2xl">menu_book</span>
            </div>
            <div>
              <h2 class="font-headline text-2xl md:text-3xl font-black text-white">Durga Puja 2026 Complete Ritual Schedule</h2>
              <p class="text-xs font-mono text-tertiary">October 16 - October 20, 2026 • Vedic Timings &amp; Significance</p>
            </div>
          </div>
          <button id="close-schedule-modal-btn" class="w-10 h-10 rounded-full bg-surface-container text-white flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="space-y-6">
          ${RITUAL_SCHEDULE.map(day => `
            <div class="bg-surface-container-high/40 p-5 rounded-2xl border border-white/10 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 class="font-headline text-xl font-bold text-white">${day.day}</h3>
                  <p class="text-xs font-mono text-secondary">${day.englishDate} • <span class="text-tertiary">${day.bengaliTithi}</span></p>
                </div>
                <span class="text-xs text-on-surface-variant font-mono bg-surface-container px-3 py-1 rounded-full w-fit">
                  ${day.events.length} Key Rituals
                </span>
              </div>

              <p class="text-sm text-on-surface leading-relaxed">${day.shortDesc}</p>
              
              <div class="bg-surface-container p-3 rounded-xl border-l-4 border-tertiary text-xs text-on-surface-variant">
                <strong>Devotee Guidelines:</strong> ${day.guidelines}
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                ${day.events.map(e => `
                  <div class="bg-surface-container p-3.5 rounded-xl border border-white/5 space-y-1">
                    <div class="flex items-center justify-between gap-2">
                      <h4 class="font-bold text-xs text-white">${e.title}</h4>
                      <span class="text-[10px] font-mono text-tertiary font-bold bg-black/40 px-2 py-0.5 rounded">${e.time}</span>
                    </div>
                    <p class="text-xs text-on-surface-variant leading-relaxed">${e.desc}</p>
                    <p class="text-[11px] text-secondary font-mono italic pt-1">✦ ${e.significance}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="pt-4 border-t border-white/10 flex justify-end">
          <button id="dismiss-schedule-modal-btn" class="px-6 py-2.5 rounded-full bg-primary text-black font-bold text-xs shadow-lg hover:scale-105 transition-transform">
            Close Guide
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('close-schedule-modal-btn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });

    document.getElementById('dismiss-schedule-modal-btn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  // EVENT LISTENERS & CONTROLS
  setupEventListeners() {
    // 1. Audio Dhak Toggle
    const audioBtn = document.getElementById('dhak-audio-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isPlaying = this.audioEngine.toggle();
        const icon = audioBtn.querySelector('.material-symbols-outlined');
        const label = audioBtn.querySelector('.audio-label');
        if (isPlaying) {
          audioBtn.classList.add('bg-primary', 'text-black');
          audioBtn.classList.remove('bg-surface-container', 'text-tertiary');
          if (icon) icon.textContent = 'volume_up';
          if (label) label.textContent = 'Dhak Playing';
          this.showToast('Festive Dhak rhythm started! 🥁');
        } else {
          audioBtn.classList.remove('bg-primary', 'text-black');
          audioBtn.classList.add('bg-surface-container', 'text-tertiary');
          if (icon) icon.textContent = 'volume_off';
          if (label) label.textContent = 'Play Dhak';
          this.showToast('Audio paused.');
        }
      });
    }

    // 2. Zone Filter Buttons for Pandals View
    document.querySelectorAll('#pandal-zone-filters .zone-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const zone = btn.getAttribute('data-zone');
        this.activeZoneFilter = zone;

        // Update button active styles
        document.querySelectorAll('#pandal-zone-filters .zone-filter-btn').forEach(b => {
          b.className = 'zone-filter-btn px-5 py-2.5 rounded-full bg-surface-container text-on-surface-variant hover:text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all';
        });

        const activeClassMap = {
          'all': 'zone-btn-active-all',
          'north': 'zone-btn-active-north',
          'south': 'zone-btn-active-south',
          'central': 'zone-btn-active-central',
          'saltlake': 'zone-btn-active-saltlake'
        };
        btn.className = `zone-filter-btn px-5 py-2.5 rounded-full ${activeClassMap[zone] || 'zone-btn-active-all'} text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all`;

        this.renderPandals(true);
      });
    });

    // 3. Category Filter Buttons for Pandals View
    document.querySelectorAll('#pandal-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#pandal-filters .filter-btn').forEach(b => {
          b.classList.remove('bg-primary', 'text-black', 'shadow-md');
          b.classList.add('bg-surface-container-high', 'text-on-surface-variant');
        });
        btn.classList.add('bg-primary', 'text-black', 'shadow-md');
        btn.classList.remove('bg-surface-container-high', 'text-on-surface-variant');

        this.activePandalFilter = btn.getAttribute('data-filter');
        this.renderPandals(true);
      });
    });

    // 4. Pandal Search Input
    const pandalSearch = document.getElementById('pandal-search-input');
    if (pandalSearch) {
      pandalSearch.addEventListener('input', (e) => {
        this.pandalSearchQuery = e.target.value;
        this.renderPandals(true);
      });
    }

    // 5. Pandal Load More Button
    const loadMoreBtn = document.getElementById('pandal-load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.pandalCurrentLimit += this.pandalPageSize;
        this.renderPandals(false);
      });
    }

    // 6. Eatery Category Buttons
    const categoryButtons = document.querySelectorAll('#eatery-category-bar button');
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryButtons.forEach(b => {
          b.className = 'eatery-category-btn px-4 py-2.5 rounded-full border border-white/10 bg-surface-container text-on-surface hover:text-white text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap';
        });
        
        btn.className = 'eatery-category-btn px-4 py-2.5 rounded-full border-2 border-white bg-white/15 text-white text-xs font-bold transition-all whitespace-nowrap shadow-[0_0_15px_rgba(255,255,255,0.25)] flex items-center gap-2';

        this.activeEateryFilter = btn.getAttribute('data-category');
        this.eateryCurrentLimit = this.eateryPageSize;
        this.renderEateries();
      });
    });

    // 6b. Eatery Search Input
    const eaterySearch = document.getElementById('eatery-search-input');
    if (eaterySearch) {
      eaterySearch.addEventListener('input', (e) => {
        this.eateryCurrentLimit = this.eateryPageSize;
        this.renderEateries(e.target.value);
      });
    }

    // 6c. Eatery Load More Button
    const eateryLoadMoreBtn = document.getElementById('eatery-load-more-btn');
    if (eateryLoadMoreBtn) {
      eateryLoadMoreBtn.addEventListener('click', () => {
        this.eateryCurrentLimit += this.eateryPageSize;
        this.renderEateries();
      });
    }

    // ==========================================
    // 7. MASTER MAP CONTROLS & EVENT LISTENERS
    // ==========================================
    // 7a. Layer Toggles
    document.querySelectorAll('#map-layer-toggles .map-layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layer = btn.getAttribute('data-layer');
        if (!layer) return;

        this.activeLayers[layer] = !this.activeLayers[layer];
        const isActive = this.activeLayers[layer];

        const layerColorMap = {
          'pandals': { border: 'border-primary/40', bg: 'bg-primary/20', activeText: 'text-white', badge: 'bg-primary/30', icon: 'text-primary' },
          'eateries': { border: 'border-secondary/40', bg: 'bg-secondary/20', activeText: 'text-white', badge: 'bg-secondary/30', icon: 'text-secondary' },
          'metro': { border: 'border-purple-400/40', bg: 'bg-purple-400/20', activeText: 'text-white', badge: 'bg-purple-400/30', icon: 'text-purple-400' },
          'trail': { border: 'border-tertiary/40', bg: 'bg-tertiary/20', activeText: 'text-white', badge: 'bg-tertiary/30', icon: 'text-tertiary' }
        };

        const conf = layerColorMap[layer] || { border: 'border-white/20', bg: 'bg-white/10' };

        if (isActive) {
          btn.className = `map-layer-btn active px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${conf.border} ${conf.bg} text-white shadow-sm`;
        } else {
          btn.className = `map-layer-btn px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 bg-surface-container text-on-surface-variant opacity-60 hover:opacity-100`;
        }

        this.updateMasterMap();
      });
    });

    // 7b. Map Zone Quick Filters
    document.querySelectorAll('#master-map-zone-filters .map-zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const zone = btn.getAttribute('data-zone');
        this.mapZoneFilter = zone;

        document.querySelectorAll('#master-map-zone-filters .map-zone-btn').forEach(b => {
          b.className = 'map-zone-btn px-3.5 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:text-white text-xs font-bold transition-all whitespace-nowrap';
        });

        btn.className = 'map-zone-btn px-3.5 py-1.5 rounded-full bg-primary text-black text-xs font-bold transition-all whitespace-nowrap';

        this.updateMapPandals();

        // Zone Centers
        const zoneCenterMap = {
          'all': { center: [22.5650, 88.3650], zoom: 12 },
          'north': { center: [22.5980, 88.3750], zoom: 13 },
          'south': { center: [22.5180, 88.3580], zoom: 13 },
          'central': { center: [22.5680, 88.3620], zoom: 14 },
          'saltlake': { center: [22.5850, 88.4150], zoom: 13 }
        };

        const target = zoneCenterMap[zone] || zoneCenterMap['all'];
        if (this.masterMap) {
          this.masterMap.flyTo(target.center, target.zoom, { duration: 1.0 });
        }
      });
    });

    // 7c. Map Search Autocomplete
    const mapSearchInput = document.getElementById('master-map-search-input');
    const mapSearchClear = document.getElementById('master-map-search-clear');
    const mapSearchResults = document.getElementById('master-map-search-results');

    if (mapSearchInput && mapSearchResults) {
      mapSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
          mapSearchResults.classList.add('hidden');
          if (mapSearchClear) mapSearchClear.classList.add('hidden');
          return;
        }

        if (mapSearchClear) mapSearchClear.classList.remove('hidden');

        // Match Pandals and Eateries
        const matchedPandals = this.pandals.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.zone.toLowerCase().includes(query) ||
          p.theme.toLowerCase().includes(query) ||
          (p.nearestMetro && p.nearestMetro.toLowerCase().includes(query))
        ).slice(0, 6);

        const matchedEateries = this.eateries.filter(e =>
          e.name.toLowerCase().includes(query) ||
          e.cuisine.toLowerCase().includes(query) ||
          e.location.toLowerCase().includes(query) ||
          e.outlet.toLowerCase().includes(query) ||
          (e.mustTry && e.mustTry.some(d => d.toLowerCase().includes(query)))
        ).slice(0, 6);

        if (matchedPandals.length === 0 && matchedEateries.length === 0) {
          mapSearchResults.innerHTML = `
            <div class="p-3.5 text-center text-xs text-on-surface-variant italic">
              No matching locations found for "${query}"
            </div>
          `;
          mapSearchResults.classList.remove('hidden');
          return;
        }

        let html = '';

        if (matchedPandals.length > 0) {
          html += `
            <div class="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-primary font-bold bg-white/5">
              🏛️ Durga Puja Pandals
            </div>
            ${matchedPandals.map(p => `
              <div class="map-search-item px-3.5 py-2 hover:bg-white/10 cursor-pointer transition-colors flex items-center justify-between" data-type="pandal" data-id="${p.id}">
                <div>
                  <div class="text-xs font-bold text-white">${p.name}</div>
                  <div class="text-[10px] text-on-surface-variant font-mono">${p.zone}</div>
                </div>
                <span class="text-[10px] font-mono text-tertiary font-bold bg-black/40 px-2 py-0.5 rounded">Est. ${p.estYear}</span>
              </div>
            `).join('')}
          `;
        }

        if (matchedEateries.length > 0) {
          html += `
            <div class="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-secondary font-bold bg-white/5">
              🍽️ Iconic Eateries &amp; Food Joints
            </div>
            ${matchedEateries.map(e => `
              <div class="map-search-item px-3.5 py-2 hover:bg-white/10 cursor-pointer transition-colors flex items-center justify-between" data-type="eatery" data-id="${e.id}">
                <div>
                  <div class="text-xs font-bold text-white">${e.name} (${e.outlet})</div>
                  <div class="text-[10px] text-on-surface-variant font-mono">${e.cuisine} • ${e.avgPrice}</div>
                </div>
                <span class="text-[10px] font-mono text-tertiary font-bold bg-black/40 px-2 py-0.5 rounded">★ ${e.rating}</span>
              </div>
            `).join('')}
          `;
        }

        mapSearchResults.innerHTML = html;
        mapSearchResults.classList.remove('hidden');

        // Bind search result item clicks
        mapSearchResults.querySelectorAll('.map-search-item').forEach(item => {
          item.addEventListener('click', () => {
            const type = item.getAttribute('data-type');
            const id = item.getAttribute('data-id');

            mapSearchResults.classList.add('hidden');
            mapSearchInput.value = '';
            if (mapSearchClear) mapSearchClear.classList.add('hidden');

            if (type === 'pandal') {
              this.focusPandalOnMap(id);
            } else if (type === 'eatery') {
              this.focusEateryOnMap(id);
            }
          });
        });
      });
    }

    if (mapSearchClear && mapSearchInput && mapSearchResults) {
      mapSearchClear.addEventListener('click', () => {
        mapSearchInput.value = '';
        mapSearchClear.classList.add('hidden');
        mapSearchResults.classList.add('hidden');
      });
    }

    // 7d. Action Group Buttons
    document.getElementById('master-map-reset-btn')?.addEventListener('click', () => {
      if (this.masterMap) {
        this.masterMap.flyTo([22.5650, 88.3650], 12, { duration: 1.0 });
        this.showToast('🎯 Reset Puja Map to Kolkata & Outskirts view.');
      }
    });

    document.getElementById('master-map-trail-zoom-btn')?.addEventListener('click', () => {
      this.fitMapToTrail();
    });

    document.getElementById('master-map-fullscreen-btn')?.addEventListener('click', () => {
      this.toggleMapFullscreen();
    });

    document.getElementById('map-locate-me-btn')?.addEventListener('click', () => {
      this.locateUserOnMap();
    });

    document.getElementById('exit-plan-map-mode-btn')?.addEventListener('click', () => {
      this.exitPlanMapMode();
    });

    document.getElementById('mode-btn-plan')?.addEventListener('click', () => {
      this.openPlanInMap();
    });

    document.getElementById('mode-btn-all')?.addEventListener('click', () => {
      this.exitPlanMapMode();
    });

    // 8. Multi-Plan Controls & Save Option
    document.getElementById('view-plan-on-map-btn')?.addEventListener('click', () => {
      this.openPlanInMap();
    });

    document.getElementById('view-timeline-on-map-btn')?.addEventListener('click', () => {
      this.openPlanInMap();
    });

    document.getElementById('save-plan-btn')?.addEventListener('click', () => {
      this.saveActivePlan();
    });

    document.getElementById('create-new-plan-btn')?.addEventListener('click', () => {
      this.createNewPlan();
    });

    document.getElementById('modal-create-plan-btn')?.addEventListener('click', () => {
      this.createNewPlan();
      this.renderAllPlansModal();
    });

    document.getElementById('open-all-plans-modal-btn')?.addEventListener('click', () => {
      this.renderAllPlansModal();
    });

    document.getElementById('close-all-plans-modal-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('all-plans-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });

    const allPlansModal = document.getElementById('all-plans-modal');
    if (allPlansModal) {
      allPlansModal.addEventListener('click', (e) => {
        if (e.target === allPlansModal) {
          allPlansModal.classList.add('hidden');
          allPlansModal.classList.remove('flex');
        }
      });
    }

    document.getElementById('duplicate-plan-btn')?.addEventListener('click', () => {
      this.duplicatePlan(this.activePlanId);
    });

    document.getElementById('delete-plan-btn')?.addEventListener('click', () => {
      this.deletePlan(this.activePlanId);
    });

    // Plan Selector Dropdown
    document.getElementById('plan-selector-dropdown')?.addEventListener('change', (e) => {
      const newPlanId = e.target.value;
      if (newPlanId) {
        this.activePlanId = newPlanId;
        this.savePlans();
        this.showToast(`Switched to active plan "${this.getActivePlan().name}"!`);
      }
    });

    // Editable Plan Title
    const planTitleInput = document.getElementById('active-plan-title-input');
    if (planTitleInput) {
      planTitleInput.addEventListener('input', (e) => {
        const activePlan = this.getActivePlan();
        activePlan.name = e.target.value || 'Untitled Plan';
        activePlan.updatedAt = new Date().toISOString();
        // Update selector dropdown label dynamically
        const planSelector = document.getElementById('plan-selector-dropdown');
        if (planSelector) {
          const opt = planSelector.querySelector(`option[value="${activePlan.id}"]`);
          if (opt) {
            const dayLabel = activePlan.day ? `[${activePlan.day}]` : '[No Day Selected]';
            opt.textContent = `${activePlan.name} • ${dayLabel} (${(activePlan.items || []).length} stops)`;
          }
        }
      });
      planTitleInput.addEventListener('blur', () => {
        this.savePlans();
      });
    }

    // Puja Day Selection Buttons: switch to that day's plan or create a new isolated plan for that day
    document.querySelectorAll('#parikrama-days-bar .day-assign-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rawDay = btn.getAttribute('data-day');
        if (rawDay === 'null' || !rawDay) {
          this.selectDayInPlanner(null);
        } else {
          this.selectDayInPlanner(rawDay);
        }
      });
    });

    // 9. Share Parikrama
    const shareBtn = document.getElementById('share-parikrama-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const shareText = `Check out my Durga Puja Parikrama itinerary for Sharodiya (${this.parikrama.length} stops planned):\n` +
          this.parikrama.map((p, i) => `${i + 1}. ${p.name} (${p.zone})`).join('\n') +
          `\n\nPlan your divine journey at Sharodiya!`;

        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareText);
          this.showToast('Copied full itinerary text to clipboard! 📋');
        } else {
          prompt('Copy your itinerary below:', shareText);
        }
      });
    }

    // 10. Print / Export Parikrama
    const printBtn = document.getElementById('print-parikrama-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // 11. Mobile Menu Drawer Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-menu-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    if (mobileMenuBtn && mobileDrawer) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileDrawer.classList.toggle('hidden');
      });
    }
    if (closeDrawerBtn && mobileDrawer) {
      closeDrawerBtn.addEventListener('click', () => {
        mobileDrawer.classList.add('hidden');
      });
    }

    // 12. Squad Invite & Hub Controls
    const squadInviteBtn = document.getElementById('squad-invite-btn');
    const squadModal = document.getElementById('squad-room-modal');
    const closeSquadBtn = document.getElementById('close-squad-modal-btn');
    const squadInfoSec = document.getElementById('squad-info-section');

    const openSquadHub = async () => {
      let squadCode = localStorage.getItem('sharodiya_squad_code');
      const captainName = this.currentUser ? this.currentUser.name : 'You (Captain)';
      if (!squadCode) {
        squadCode = 'SHARODIYA-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        localStorage.setItem('sharodiya_squad_code', squadCode);
        await this.apiFetch('/api/squads', {
          method: 'POST',
          body: JSON.stringify({
            name: `Squad ${squadCode}`,
            archetype: this.selectedArchetype,
            captainName: captainName
          })
        });
      }

      const res = await this.apiFetch(`/api/squads/${squadCode}`);
      const squad = res?.squad || {
        code: squadCode,
        name: `Squad ${squadCode}`,
        members: [captainName],
        checkins: []
      };

      if (squadInfoSec) {
        squadInfoSec.innerHTML = `
          <div class="p-4 rounded-2xl bg-surface-container border border-white/10 text-center space-y-2">
            <span class="text-[11px] font-mono uppercase tracking-widest text-secondary font-bold">Your Squad Room Code</span>
            <div class="text-2xl font-mono font-black text-white tracking-widest bg-black/40 py-2 rounded-xl border border-secondary/30">
              ${squad.code}
            </div>
            <button id="copy-squad-code-btn" class="text-xs text-tertiary hover:underline font-bold flex items-center justify-center gap-1 mx-auto">
              <span class="material-symbols-outlined text-[16px]">content_copy</span> Copy Code for WhatsApp
            </button>
          </div>

          <div class="p-3.5 rounded-2xl bg-surface-container-high/40 border border-white/5 space-y-2">
            <span class="text-[11px] font-mono uppercase text-on-surface-variant font-bold">Join a Friend's Squad</span>
            <div class="flex gap-2">
              <input id="join-squad-code-input" type="text" placeholder="e.g. SHARODIYA-ABCDE" class="flex-1 bg-surface-container border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-mono placeholder:text-on-surface-variant focus:outline-none focus:border-secondary" />
              <button id="submit-join-squad-btn" class="px-4 py-1.5 rounded-xl bg-secondary text-black font-bold text-xs hover:scale-105 transition-transform">
                Join
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <span class="text-xs font-mono uppercase text-on-surface-variant font-bold">Active Squad Members (${squad.members.length})</span>
            <div class="flex flex-wrap gap-2">
              ${squad.members.map(m => `
                <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-green-400"></span> ${m}
                </span>
              `).join('')}
            </div>
          </div>

          <div class="space-y-2">
            <span class="text-xs font-mono uppercase text-on-surface-variant font-bold">Live Check-ins &amp; Stops (${squad.checkins.length})</span>
            <div class="space-y-2 max-h-44 overflow-y-auto pr-1">
              ${squad.checkins.length === 0 ? `
                <div class="p-3 rounded-xl bg-surface-container text-xs text-on-surface-variant text-center italic">
                  No check-ins yet. Squad members can check in at pandals in real-time!
                </div>
              ` : squad.checkins.map(chk => `
                <div class="p-2.5 rounded-xl bg-surface-container text-xs text-on-surface flex items-center justify-between border border-white/5">
                  <div>
                    <strong class="text-white">${chk.entityName}</strong>
                    <span class="block text-[10px] text-on-surface-variant">Checked in by ${chk.memberName}</span>
                  </div>
                  <span class="text-[10px] font-mono text-tertiary">${new Date(chk.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        document.getElementById('copy-squad-code-btn')?.addEventListener('click', () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(`Join my Sharodiya Puja Squad with code: ${squad.code}`);
          }
          this.showToast(`Copied squad code ${squad.code} to clipboard! 🎉`);
        });

        document.getElementById('submit-join-squad-btn')?.addEventListener('click', async () => {
          const codeVal = document.getElementById('join-squad-code-input')?.value?.trim().toUpperCase();
          if (!codeVal) return;
          const memberName = this.currentUser ? this.currentUser.name : `Friend (${Math.random().toString(36).substring(2, 5)})`;
          const joinRes = await this.apiFetch(`/api/squads/${codeVal}/join`, {
            method: 'POST',
            body: JSON.stringify({ memberName })
          });
          if (joinRes && joinRes.success) {
            localStorage.setItem('sharodiya_squad_code', codeVal);
            this.showToast(`🎉 Joined squad ${codeVal}!`);
            openSquadHub();
          } else {
            this.showToast(`❌ Squad code not found. Please check code.`);
          }
        });
      }

      if (squadModal) {
        squadModal.classList.remove('hidden');
        squadModal.classList.add('flex');
      }
    };

    if (squadInviteBtn) {
      squadInviteBtn.addEventListener('click', openSquadHub);
    }
    if (closeSquadBtn && squadModal) {
      closeSquadBtn.addEventListener('click', () => {
        squadModal.classList.add('hidden');
        squadModal.classList.remove('flex');
      });
      squadModal.addEventListener('click', (e) => {
        if (e.target === squadModal) {
          squadModal.classList.add('hidden');
          squadModal.classList.remove('flex');
        }
      });
    }

    // 12.1 People View Manual Plan Creation Controls
    const peopleManualPlanBtn = document.getElementById('people-create-manual-plan-btn');
    if (peopleManualPlanBtn) {
      peopleManualPlanBtn.addEventListener('click', () => {
        const input = document.getElementById('people-manual-plan-name');
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    const peopleManualPlanForm = document.getElementById('people-manual-plan-form');
    if (peopleManualPlanForm) {
      peopleManualPlanForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!this.requireAuth('create custom Parikrama plans')) return;
        const nameInput = document.getElementById('people-manual-plan-name');
        const daySelect = document.getElementById('people-manual-plan-day');
        const day = daySelect?.value || 'Maha Sasthi';
        const name = nameInput?.value?.trim() || `My ${day} Plan`;
        const newPlan = this.createNewPlan(name, day, true);
        if (nameInput) nameInput.value = '';
        this.showToast(`✨ Created "${newPlan.name}"! Opening Pandals to add stops.`);
        this.navigateTo('pandals');
      });
    }

    // 13. Crowd Reporting Modal Controls
    const crowdModal = document.getElementById('crowd-report-modal');
    const closeCrowdBtn = document.getElementById('close-crowd-modal-btn');
    const crowdForm = document.getElementById('crowd-report-form');
    const crowdPandalNameEl = document.getElementById('crowd-modal-pandal-name');
    const crowdPandalIdInput = document.getElementById('crowd-pandal-id');

    this.openCrowdReportModal = (pandalId) => {
      const pandal = this.findPandal(pandalId);
      if (!pandal || !crowdModal) return;
      if (crowdPandalNameEl) crowdPandalNameEl.textContent = `Reporting for: ${pandal.name}`;
      if (crowdPandalIdInput) crowdPandalIdInput.value = pandal.id;
      crowdModal.classList.remove('hidden');
      crowdModal.classList.add('flex');
    };

    if (closeCrowdBtn && crowdModal) {
      closeCrowdBtn.addEventListener('click', () => {
        crowdModal.classList.add('hidden');
        crowdModal.classList.remove('flex');
      });
      crowdModal.addEventListener('click', (e) => {
        if (e.target === crowdModal) {
          crowdModal.classList.add('hidden');
          crowdModal.classList.remove('flex');
        }
      });
    }

    if (crowdForm) {
      crowdForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pandalId = crowdPandalIdInput?.value;
        const selectedCrowd = document.querySelector('input[name="report-crowd-level"]:checked')?.value || 'Moderate';
        const waitMins = document.getElementById('report-wait-minutes')?.value || 20;
        const note = document.getElementById('report-note')?.value || '';

        await this.apiFetch(`/api/pandals/${pandalId}/crowd-report`, {
          method: 'POST',
          body: JSON.stringify({
            crowdLevel: selectedCrowd,
            waitMinutes: waitMins,
            note: note,
            reportedBy: 'Live Devotee'
          })
        });

        if (crowdModal) {
          crowdModal.classList.add('hidden');
          crowdModal.classList.remove('flex');
        }

        this.showToast(`✅ Crowd update recorded! (${selectedCrowd} rush, ~${waitMins} min queue)`);
      });
    }

    // 15. Cloud Plan Save & Share
    const shareParikramaBtn = document.getElementById('share-parikrama-btn');
    if (shareParikramaBtn) {
      shareParikramaBtn.addEventListener('click', async () => {
        const activePlan = this.getActivePlan();
        const payload = {
          id: activePlan.id,
          name: activePlan.name,
          day: activePlan.day,
          squad: this.selectedArchetype,
          items: this.parikrama
        };

        const res = await this.apiFetch('/api/plans', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        const shareUrl = res?.plan?.shareUrl ? `${window.location.origin}${res.plan.shareUrl}` : `${window.location.origin}/#planned`;
        const dayInfo = activePlan.day ? ` for ${activePlan.day}` : '';
        const shareText = `✨ Here is my Sharodiya Puja Plan "${activePlan.name}"${dayInfo} (${this.parikrama.length} stops):\n${shareUrl}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareText);
        }
        this.showToast('🌟 Plan saved to Cloud & share link copied to clipboard!');
      });
    }

    // 16. Personalized Itinerary Recommendation Wizard Controls
    const openWizardPlannedBtn = document.getElementById('open-itinerary-wizard-btn');
    const openWizardPeopleBtn = document.getElementById('open-itinerary-wizard-btn-people');
    const wizardModal = document.getElementById('itinerary-wizard-modal');
    const closeWizardBtn = document.getElementById('close-itinerary-wizard-btn');
    const wizardForm = document.getElementById('itinerary-wizard-form');
    const wizardResults = document.getElementById('wizard-results-container');

    const openWizard = (prefillArchetype = null) => {
      if (prefillArchetype) {
        const radio = document.querySelector(`input[name="wizard-archetype"][value="${prefillArchetype}"]`);
        if (radio) radio.checked = true;
      }
      const daySelect = document.getElementById('wizard-day-select');
      if (daySelect) {
        const currentActiveDay = this.getActivePlan().day || this.currentDay || 'Maha Sasthi';
        daySelect.value = currentActiveDay;
      }
      if (wizardModal) {
        wizardModal.classList.remove('hidden');
        wizardModal.classList.add('flex');
      }
    };

    const closeWizard = () => {
      if (wizardModal) {
        wizardModal.classList.add('hidden');
        wizardModal.classList.remove('flex');
      }
    };

    if (openWizardPlannedBtn) {
      openWizardPlannedBtn.addEventListener('click', () => openWizard(this.selectedArchetype));
    }
    if (openWizardPeopleBtn) {
      openWizardPeopleBtn.addEventListener('click', () => openWizard(this.selectedArchetype));
    }
    if (closeWizardBtn) {
      closeWizardBtn.addEventListener('click', closeWizard);
    }
    if (wizardModal) {
      wizardModal.addEventListener('click', (e) => {
        if (e.target === wizardModal) closeWizard();
      });
    }

    if (wizardForm) {
      wizardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedArchetypeRadio = document.querySelector('input[name="wizard-archetype"]:checked');
        const selectedPaceRadio = document.querySelector('input[name="wizard-pace"]:checked');
        const daySelect = document.getElementById('wizard-day-select');
        const timeSelect = document.getElementById('wizard-time-select');
        const zoneSelect = document.getElementById('wizard-zone-select');
        const cuisineSelect = document.getElementById('wizard-cuisine-select');

        const activeDay = this.getActivePlan().day || this.currentDay || 'Maha Sasthi';
        const options = {
          archetype: selectedArchetypeRadio ? selectedArchetypeRadio.value : (this.selectedArchetype || 'friends'),
          day: daySelect ? daySelect.value : activeDay,
          timeWindow: timeSelect ? timeSelect.value : 'midnight',
          zone: zoneSelect ? zoneSelect.value : 'all',
          cuisine: cuisineSelect ? cuisineSelect.value : 'biryani',
          pace: selectedPaceRadio ? selectedPaceRadio.value : 'balanced'
        };

        const result = this.generatePersonalizedItinerary(options);
        if (wizardResults) {
          wizardResults.classList.remove('hidden');
          this.renderPersonalizedItinerary(result, wizardResults, true);
          wizardResults.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // ==========================================
    // 8. PUJA METRO NETWORK EVENT LISTENERS
    // ==========================================
    // 8a. Line Filter Buttons
    document.querySelectorAll('#metro-line-filters .line-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const line = btn.getAttribute('data-line');
        this.metroActiveLineFilter = line;

        // Reset styling on all filter buttons
        document.querySelectorAll('#metro-line-filters .line-filter-btn').forEach(b => {
          b.className = 'line-filter-btn px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 bg-surface-container text-on-surface-variant hover:text-white border border-white/10 transition-all';
        });

        // Set active style
        const activeClassMap = {
          'all': 'line-filter-btn active-filter-all px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 bg-white text-black shadow-md border border-white/20',
          'Blue': 'line-filter-btn active-filter-blue px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 bg-[#0057B7] text-white shadow-lg border border-[#0057B7]/50',
          'Green': 'line-filter-btn active-filter-green px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 bg-[#009A44] text-white shadow-lg border border-[#009A44]/50',
          'Purple': 'line-filter-btn active-filter-purple px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 bg-[#7F2B87] text-white shadow-lg border border-[#7F2B87]/50',
          'Orange': 'line-filter-btn active-filter-orange px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 bg-[#FF7300] text-white shadow-lg border border-[#FF7300]/50',
          'interchange': 'line-filter-btn active-filter-interchange px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 text-[#ffd700] border border-yellow-400/50 shadow-lg'
        };

        btn.className = activeClassMap[line] || activeClassMap['all'];

        // If currently selected station does not belong to the newly selected line, clear selection
        if (line !== 'all' && line !== 'interchange' && this.selectedMetroStationId) {
          const currentStation = this.metroStations.find(s => s.id === this.selectedMetroStationId);
          if (currentStation) {
            const belongs = Array.isArray(currentStation.line) ? currentStation.line.includes(line) : currentStation.line === line;
            if (!belongs) {
              this.selectedMetroStationId = null;
              this.renderMetroStationInfoPanel();
            }
          }
        }

        this.updateMetroNetworkMap();

        // Smoothly fit map view to the selected line corridor
        if (this.metroMap) {
          const visibleStations = this.metroStations.filter(s => {
            if (s.operationalStatus !== 'operational') return false;
            if (line === 'all') return true;
            if (line === 'interchange') return s.interchange === true;
            return Array.isArray(s.line) ? s.line.includes(line) : s.line === line;
          });

          if (visibleStations.length > 0) {
            const bounds = window.L.latLngBounds(visibleStations.map(s => [s.coordinates.lat, s.coordinates.lng]));
            this.metroMap.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.8 });
          }
        }
      });
    });

    // 8b. Metro Network Search Input
    const metroSearchInput = document.getElementById('metro-network-search-input');
    if (metroSearchInput) {
      metroSearchInput.addEventListener('input', (e) => {
        this.metroSearchQuery = e.target.value;
        this.updateMetroNetworkMap();
      });
    }

    // 8c. Toggle Connected Pandals on Metro Map
    const togglePandalsBtn = document.getElementById('toggle-metro-pandals-btn');
    const togglePandalsLabel = document.getElementById('toggle-metro-pandals-label');
    if (togglePandalsBtn) {
      togglePandalsBtn.addEventListener('click', () => {
        this.metroShowPandals = !this.metroShowPandals;
        if (togglePandalsLabel) {
          togglePandalsLabel.textContent = this.metroShowPandals ? 'Pandals: ON' : 'Pandals: OFF';
        }
        if (this.metroShowPandals) {
          togglePandalsBtn.classList.remove('opacity-50');
          togglePandalsBtn.classList.add('bg-surface-container', 'text-white');
        } else {
          togglePandalsBtn.classList.add('opacity-50');
          togglePandalsBtn.classList.remove('bg-surface-container', 'text-white');
        }
        this.updateMetroNetworkMap();
      });
    }

    // 8d. Fit Metro Bounds Button
    document.getElementById('fit-metro-bounds-btn')?.addEventListener('click', () => {
      this.fitMetroBounds();
    });

    // 8e. Open Metro Planner Modal Buttons
    document.getElementById('open-metro-planner-btn')?.addEventListener('click', () => {
      this.openMetroPlannerModal(this.selectedMetroStationId);
    });
    document.getElementById('floating-mobile-plan-pujo-btn')?.addEventListener('click', () => {
      this.openMetroPlannerModal(this.selectedMetroStationId);
    });

    // 8f. Close Metro Planner Modal Buttons
    document.getElementById('close-metro-planner-modal-btn')?.addEventListener('click', () => {
      this.closeMetroPlannerModal();
    });
    document.getElementById('close-metro-planner-cancel-btn')?.addEventListener('click', () => {
      this.closeMetroPlannerModal();
    });

    // 8g. Planner Station Selects Change Listeners
    document.getElementById('route-start-station-select')?.addEventListener('change', () => {
      this.updateMetroPlannerRoutePreview();
    });
    document.getElementById('route-dest-station-select')?.addEventListener('change', () => {
      this.updateMetroPlannerRoutePreview();
    });

    // 8h. Save Metro Route Button
    document.getElementById('save-metro-route-plan-btn')?.addEventListener('click', () => {
      this.saveMetroRouteToParikrama();
    });
  }

  showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, 3200);
  }
}

// Boot application safely
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.sharodiyaApp = new SharodiyaApp();
    });
  } else {
    window.sharodiyaApp = new SharodiyaApp();
  }
}

export { SharodiyaApp };
