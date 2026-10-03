// Sharodiya Supabase Authentication Module
// Supports direct Supabase Cloud Authentication, Session Management, Realtime Auth Listener & Fallback Bridge

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Default / Configured Supabase Credentials
const DEFAULT_SUPABASE_URL = 'https://sharodiya-pujo-2026.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYXJvZGl5YS1wdWpvLTIwMjYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc2MDAwMDAwMCwiZXhwIjoyMDgwMDAwMDAwfQ.demo_sharodiya_anon_key_durga_puja_2026';

class SupabaseAuthManager {
  constructor() {
    this.url = localStorage.getItem('sharodiya_supabase_url') || (typeof window !== 'undefined' && window.SHARODIYA_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
    this.anonKey = localStorage.getItem('sharodiya_supabase_anon_key') || (typeof window !== 'undefined' && window.SHARODIYA_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
    this.client = null;
    this.isCustomConfigured = !!(localStorage.getItem('sharodiya_supabase_url') && localStorage.getItem('sharodiya_supabase_anon_key'));
    
    this.initClient();
  }

  initClient() {
    try {
      if (this.url && this.anonKey) {
        this.client = createClient(this.url, this.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined
          }
        });
      }
    } catch (err) {
      console.warn('[Supabase] Client initialization notice:', err);
    }
  }

  setCustomCredentials(url, anonKey) {
    if (url && anonKey) {
      this.url = url.trim();
      this.anonKey = anonKey.trim();
      localStorage.setItem('sharodiya_supabase_url', this.url);
      localStorage.setItem('sharodiya_supabase_anon_key', this.anonKey);
      this.isCustomConfigured = true;
      this.initClient();
      return true;
    } else {
      localStorage.removeItem('sharodiya_supabase_url');
      localStorage.removeItem('sharodiya_supabase_anon_key');
      this.url = DEFAULT_SUPABASE_URL;
      this.anonKey = DEFAULT_SUPABASE_ANON_KEY;
      this.isCustomConfigured = false;
      this.initClient();
      return false;
    }
  }

  getClient() {
    if (!this.client) {
      this.initClient();
    }
    return this.client;
  }

  // 1. Sign Up new devotee with metadata
  async signUp({ email, password, name, archetype, avatar }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || 'Devotee').trim();
    const userArchetype = archetype || 'friends';
    const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;

    try {
      if (this.client && this.isCustomConfigured) {
        const { data, error } = await this.client.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: cleanName,
              full_name: cleanName,
              archetype: userArchetype,
              avatar: userAvatar,
              avatar_url: userAvatar
            }
          }
        });

        if (error) throw error;

        const session = data?.session;
        const user = data?.user;

        return {
          success: true,
          provider: 'supabase',
          user: {
            id: user?.id,
            name: user?.user_metadata?.name || cleanName,
            email: user?.email || cleanEmail,
            archetype: user?.user_metadata?.archetype || userArchetype,
            avatar: user?.user_metadata?.avatar || userAvatar
          },
          token: session?.access_token || null,
          message: session ? `Welcome to Sharodiya, ${cleanName}! 🌺` : 'Confirmation email sent! Please verify your inbox to continue.'
        };
      }
    } catch (err) {
      console.warn('[Supabase] Cloud SignUp redirected to local/hybrid engine:', err.message);
    }

    // Fallback to local full-stack auth API
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanName, email: cleanEmail, password, archetype: userArchetype, avatar: userAvatar })
    });
    const data = await res.json();
    return { ...data, provider: 'supabase-hybrid' };
  }

  // 2. Sign In existing devotee
  async signIn({ email, password }) {
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (this.client && this.isCustomConfigured) {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (error) throw error;

        const session = data?.session;
        const user = data?.user;

        return {
          success: true,
          provider: 'supabase',
          user: {
            id: user?.id,
            name: user?.user_metadata?.name || user?.user_metadata?.full_name || 'Devotee',
            email: user?.email || cleanEmail,
            archetype: user?.user_metadata?.archetype || 'friends',
            avatar: user?.user_metadata?.avatar || user?.user_metadata?.avatar_url || 'assets/logo.png'
          },
          token: session?.access_token,
          message: `Welcome back, ${user?.user_metadata?.name || 'Devotee'}! 🪔`
        };
      }
    } catch (err) {
      console.warn('[Supabase] Cloud SignIn redirected to local/hybrid engine:', err.message);
    }

    // Fallback to local full-stack auth API
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });
    const data = await res.json();
    return { ...data, provider: 'supabase-hybrid' };
  }

  // 3. OAuth Sign In (Google, GitHub, etc.)
  async signInWithOAuth(provider = 'google') {
    if (this.client && this.isCustomConfigured) {
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return data;
    } else {
      throw new Error('Please configure your custom Supabase Project URL & Anon Key to enable social OAuth login.');
    }
  }

  // 4. Get Active User / Session
  async getSession() {
    try {
      if (this.client && this.isCustomConfigured) {
        const { data: { session } } = await this.client.auth.getSession();
        if (session && session.user) {
          const u = session.user;
          return {
            success: true,
            provider: 'supabase',
            token: session.access_token,
            user: {
              id: u.id,
              name: u.user_metadata?.name || u.user_metadata?.full_name || 'Devotee',
              email: u.email,
              archetype: u.user_metadata?.archetype || 'friends',
              avatar: u.user_metadata?.avatar || u.user_metadata?.avatar_url || 'assets/logo.png'
            }
          };
        }
      }
    } catch (err) {
      console.warn('[Supabase] Session get error:', err);
    }
    return null;
  }

  // 5. Update Devotee Profile
  async updateProfile({ name, archetype, avatar }) {
    try {
      if (this.client && this.isCustomConfigured) {
        const { data, error } = await this.client.auth.updateUser({
          data: {
            name: name,
            full_name: name,
            archetype: archetype,
            avatar: avatar,
            avatar_url: avatar
          }
        });

        if (error) throw error;

        const u = data?.user;
        return {
          success: true,
          user: {
            id: u.id,
            name: u.user_metadata?.name || name,
            email: u.email,
            archetype: u.user_metadata?.archetype || archetype,
            avatar: u.user_metadata?.avatar || avatar
          },
          message: 'Profile updated in Supabase successfully! ✨'
        };
      }
    } catch (err) {
      console.warn('[Supabase] Cloud profile update fallback:', err.message);
    }

    const token = localStorage.getItem('sharodiya_auth_token');
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ name, archetype, avatar })
    });
    return await res.json();
  }

  // 6. Sign Out
  async signOut() {
    try {
      if (this.client && this.isCustomConfigured) {
        await this.client.auth.signOut();
      }
    } catch (err) {
      console.warn('[Supabase] Sign out note:', err);
    }

    const token = localStorage.getItem('sharodiya_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {}
    }
  }

  // 7. Subscribe to Auth State Changes
  onAuthStateChange(callback) {
    if (this.client) {
      const { data: { subscription } } = this.client.auth.onAuthStateChange((event, session) => {
        if (callback) {
          callback(event, session);
        }
      });
      return subscription;
    }
    return null;
  }
}

export const supabaseAuth = new SupabaseAuthManager();
