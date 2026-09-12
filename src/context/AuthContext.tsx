import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const ADMIN_EMAIL = 'evelynfestus7@gmail.com';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  role: 'reader' | 'admin';
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  signup: (email: string, pass: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<'reader' | 'admin'>('reader');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Defensive timeout to prevent infinite spinning circle on slow network
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    let isMounted = true;

    // 1. Supabase Auth Listener (Primary when configured)
    if (isSupabaseConfigured()) {
      const initSupabaseAuth = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            await handleSupabaseUser(session.user);
          } else if (isMounted) {
            checkFirebaseFallback();
          }
        } catch {
          if (isMounted) checkFirebaseFallback();
        }
      };

      initSupabaseAuth();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          await handleSupabaseUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setRole('reader');
          setIsAdmin(false);
          localStorage.removeItem('nive_logged_in');
          localStorage.removeItem('nive_admin_logged_in');
          setLoading(false);
        } else if (event === 'INITIAL_SESSION' && !session) {
          checkFirebaseFallback();
        }
      });

    // 2. Setup deep link listener for native app (OAuth redirects back via com.nive.app://...)
    let appUrlPluginHandle: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async (data) => {
        console.log('[Auth] Deep link URL received:', data.url);
        if (data.url.includes('access_token') || data.url.includes('refresh_token')) {
          const hashIdx = data.url.indexOf('#');
          if (hashIdx !== -1) {
            const hash = data.url.substring(hashIdx + 1);
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token && isSupabaseConfigured()) {
              try {
                const { data: sessionData } = await supabase.auth.setSession({
                  access_token,
                  refresh_token
                });
                if (sessionData?.user && isMounted) {
                  await handleSupabaseUser(sessionData.user);
                }
              } catch (e) {
                console.warn('[Auth] Error setting Supabase session from deep link:', e);
              }
            }
          }
        } else if (data.url.includes('code=') && isSupabaseConfigured()) {
          try {
            const urlObj = new URL(data.url);
            const code = urlObj.searchParams.get('code');
            if (code) {
              const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
              if (sessionData?.user && isMounted) {
                await handleSupabaseUser(sessionData.user);
              }
            }
          } catch (e) {
            console.warn('[Auth] Error exchanging code from deep link:', e);
          }
        }
      }).then((handle) => {
        appUrlPluginHandle = handle;
      }).catch((e) => {
        console.warn('[Auth] Could not attach appUrlOpen listener:', e);
      });
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (subscription) subscription.unsubscribe();
      if (appUrlPluginHandle) appUrlPluginHandle.remove();
    };
  } else {
    checkFirebaseFallback();
    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }
}, []);

  const handleSupabaseUser = async (sbUser: any) => {
    const userEmail = sbUser.email || '';
    const isEmailAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    let userRole: 'reader' | 'admin' = isEmailAdmin ? 'admin' : 'reader';

    const displayName = sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      sbUser.user_metadata?.username ||
      userEmail.split('@')[0] ||
      'Reader';

    const photoURL = sbUser.user_metadata?.avatar_url ||
      sbUser.user_metadata?.picture ||
      sbUser.user_metadata?.avatar ||
      'assets/avatars/avatar1.png';

    try {
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', sbUser.id).single();
      if (dbUser) {
        if (dbUser.role === 'admin' || isEmailAdmin) {
          userRole = 'admin';
        }
      } else {
        // Auto-create new user record in Supabase users table on first Google login
        await supabase.from('users').upsert({
          id: sbUser.id,
          username: displayName,
          email: userEmail,
          avatar: photoURL,
          role: isEmailAdmin ? 'admin' : 'reader',
          coins: 100,
          level: 1,
          xp: 0,
          created_at: new Date().toISOString()
        });
      }
    } catch {}

    const authUserObj: AuthUser = {
      uid: sbUser.id,
      email: userEmail,
      displayName,
      photoURL
    };

    setCurrentUser(authUserObj);
    setRole(userRole);
    setIsAdmin(userRole === 'admin');
    localStorage.setItem('nive_logged_in', 'true');
    if (userRole === 'admin') {
      localStorage.setItem('nive_admin_logged_in', 'true');
    }
    setLoading(false);
  };

  const checkFirebaseFallback = () => {
    return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        const isEmailAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        let firestoreRole: 'reader' | 'admin' = isEmailAdmin ? 'admin' : 'reader';
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'admin' || data.isAdmin === true || isEmailAdmin) {
              firestoreRole = 'admin';
            }
          }
        } catch (e) {
          console.warn('Error fetching user role:', e);
        }

        const authUserObj: AuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Reader',
          photoURL: user.photoURL || 'assets/avatars/avatar1.png'
        };

        setCurrentUser(authUserObj);
        setRole(firestoreRole);
        setIsAdmin(firestoreRole === 'admin');
        localStorage.setItem('nive_logged_in', 'true');
        if (firestoreRole === 'admin') {
          localStorage.setItem('nive_admin_logged_in', 'true');
        }
      } else {
        setCurrentUser(null);
        setRole('reader');
        setIsAdmin(false);
        localStorage.removeItem('nive_logged_in');
        localStorage.removeItem('nive_admin_logged_in');
      }
      setLoading(false);
    });
  };

  const login = async (email: string, pass: string) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        await signInWithEmailAndPassword(auth, email, pass);
      } else if (data.user) {
        handleSupabaseUser(data.user);
      }
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  };

  const signup = async (email: string, pass: string, username?: string) => {
    const isEmailAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const finalUsername = username || email.split('@')[0] || 'Reader';

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { username: finalUsername }
        }
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from('users').upsert({
          id: data.user.id,
          username: finalUsername,
          email: email,
          role: isEmailAdmin ? 'admin' : 'reader',
          coins: 100,
          level: 1,
          xp: 0,
          avatar: 'assets/avatars/avatar1.png',
          created_at: new Date().toISOString()
        });
        handleSupabaseUser(data.user);
      }
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, 'users', cred.user.uid), {
        username: finalUsername,
        email: email,
        role: isEmailAdmin ? 'admin' : 'reader',
        isAdmin: isEmailAdmin,
        coins: 100,
        level: 1,
        xp: 0,
        premium: false,
        avatar: 'assets/avatars/avatar1.png',
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
  };

  const loginWithGoogle = async () => {
    if (isSupabaseConfigured()) {
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative ? 'com.nive.app://home' : `${window.location.origin}/home`;
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: isNative
          }
        });
        if (error) {
          console.warn('[Auth] Supabase OAuth error, trying Firebase popup fallback:', error);
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        } else if (isNative && data?.url) {
          window.open(data.url, '_system');
        }
      } catch (err) {
        console.warn('[Auth] Supabase OAuth exception, trying Firebase popup fallback:', err);
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } else {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    }
  };

  const loginWithApple = async () => {
    if (isSupabaseConfigured()) {
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative ? 'com.nive.app://home' : `${window.location.origin}/home`;
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo,
            skipBrowserRedirect: isNative
          }
        });
        if (error) {
          const provider = new OAuthProvider('apple.com');
          await signInWithPopup(auth, provider);
        } else if (isNative && data?.url) {
          window.open(data.url, '_system');
        }
      } catch (err) {
        const provider = new OAuthProvider('apple.com');
        await signInWithPopup(auth, provider);
      }
    } else {
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    try {
      await firebaseSignOut(auth);
    } catch {}
    setCurrentUser(null);
    setRole('reader');
    setIsAdmin(false);
    localStorage.removeItem('nive_logged_in');
    localStorage.removeItem('nive_admin_logged_in');
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        await sendPasswordResetEmail(auth, email);
      }
    } else {
      await sendPasswordResetEmail(auth, email);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      role, 
      isAdmin, 
      loading, 
      login, 
      loginWithGoogle, 
      loginWithApple, 
      signup, 
      logout, 
      resetPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
