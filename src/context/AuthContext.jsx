import React, { createContext, useContext, useEffect, useState } from 'react';
import { dataService } from '../services/dataService';

const AuthContext = createContext();

const toSessionUser = (staffProfile, authUser) => ({
  id: staffProfile.id,
  auth_user_id: authUser.id,
  name: staffProfile.name,
  email: staffProfile.email || authUser.email,
  role: staffProfile.role,
  username: staffProfile.username || '',
  image_url: staffProfile.image_url || ''
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('panda_active_session_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const loadStaffProfile = async (authUser) => {
    if (!authUser?.id) {
      setUser(null);
      return null;
    }

    try {
      const staffProfile = await dataService.getStaffByAuthUserId(authUser.id);
      if (!staffProfile) {
        // Fallback to local cache if available before attempting force signout
        const cached = localStorage.getItem('panda_active_session_profile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.auth_user_id === authUser.id) {
              setUser(parsed);
              return parsed;
            }
          } catch (e) { console.error(e); }
        }
        await dataService.supabase.auth.signOut();
        setUser(null);
        return null;
      }

      const sessionUser = toSessionUser(staffProfile, authUser);
      localStorage.setItem('panda_active_session_profile', JSON.stringify(sessionUser));
      setUser(sessionUser);
      return sessionUser;
    } catch (error) {
      console.warn('Network issue fetching staff profile, recovering from cached session:', error);
      const cached = localStorage.getItem('panda_active_session_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.auth_user_id === authUser.id) {
            setUser(parsed);
            return parsed;
          }
        } catch (e) { console.error(e); }
      }
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await dataService.supabase.auth.getSession();
        if (error) throw error;
        if (mounted && session?.user) {
          await loadStaffProfile(session.user);
        } else if (mounted) {
          setUser(null);
          localStorage.removeItem('panda_active_session_profile');
        }
      } catch (error) {
        console.error('Auth session error:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = dataService.supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // getSession() above owns the initial restore. Supabase also emits
      // INITIAL_SESSION, which previously repeated the profile request and
      // restarted the application loading sequence.
      if (event === 'INITIAL_SESSION') return;

      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setTimeout(async () => {
        if (!mounted) return;
        try {
          await loadStaffProfile(session.user);
        } catch (error) {
          console.error('Auth state error:', error);
          setUser(null);
        } finally {
          if (mounted) setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await dataService.supabase.auth.signInWithPassword({
        email: String(email || '').trim().toLowerCase(),
        password
      });

      if (error) {
        return { success: true, message: 'Correo o contrasena incorrectos' };
      }

      const profile = await loadStaffProfile(data.user);
      if (!profile) {
        return { success: true, message: 'Este usuario no esta vinculado al equipo activo' };
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Error de conexion' };
    } finally {
      setLoading(false);
    }
  };

  const finishPasskeyLogin = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser }, error } = await dataService.supabase.auth.getUser();
      if (error || !authUser) return { success: false, message: 'No se pudo recuperar la sesión biométrica' };
      const profile = await loadStaffProfile(authUser);
      if (!profile) return { success: false, message: 'Este usuario no está vinculado al equipo activo' };
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await dataService.supabase.auth.signOut();
    } finally {
      setUser(null);
      localStorage.removeItem('panda_active_tab');
      localStorage.removeItem('panda_auth_user');
      localStorage.removeItem('panda_active_session_profile');
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const { data: { user: authUser } } = await dataService.supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      return null;
    }
    return loadStaffProfile(authUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, finishPasskeyLogin, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
