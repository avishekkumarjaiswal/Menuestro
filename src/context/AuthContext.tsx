import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  getBusiness,
  getBusinessByOwner,
  getBusinessByEmail,
  linkUserToBusinessIfEmailMatches,
  checkIsSuperAdmin,
  grantSuperAdminRole,
  getAllBusinesses
} from '../services/firestoreService';
import { UserProfile, Business } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  business: Business | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
  setBusiness: (biz: Business | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('menuestro_cached_profile');
      if (cached && auth.currentUser) {
        const parsed = JSON.parse(cached);
        if (parsed?.userId === auth.currentUser.uid) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [business, setBusinessState] = useState<Business | null>(() => {
    try {
      const cached = localStorage.getItem('menuestro_cached_business');
      if (cached && auth.currentUser) {
        const parsed = JSON.parse(cached);
        const emailLower = auth.currentUser.email?.toLowerCase().trim() || '';
        const isOwner = parsed?.ownerId === auth.currentUser.uid;
        const isEmailMatch = emailLower && (parsed?.ownerEmail?.toLowerCase().trim() === emailLower || parsed?.managerEmail?.toLowerCase().trim() === emailLower);
        if (isOwner || isEmailMatch) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    try {
      if (auth.currentUser) {
        return localStorage.getItem('menuestro_cached_is_admin') === 'true';
      }
      return false;
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  const setBusiness = (biz: Business | null) => {
    setBusinessState(biz);
    try {
      if (biz) {
        localStorage.setItem('menuestro_cached_business', JSON.stringify(biz));
      } else {
        localStorage.removeItem('menuestro_cached_business');
      }
    } catch {}
  };

  const loadUserData = async (currentUser: User) => {
    try {
      const emailLower = currentUser.email?.toLowerCase() || '';
      const isSuper = await checkIsSuperAdmin(currentUser.uid, emailLower);
      setIsSuperAdmin(isSuper);
      try {
        localStorage.setItem('menuestro_cached_is_admin', isSuper ? 'true' : 'false');
      } catch {}

      let userProf = await getUserProfile(currentUser.uid);
      if (!userProf) {
        // Create initial user profile
        userProf = {
          userId: currentUser.uid,
          businessId: '',
          name: currentUser.displayName || currentUser.email?.split('@')[0] || (isSuper ? 'Super Admin' : 'Restaurant Owner'),
          email: currentUser.email || '',
          role: isSuper ? 'super_admin' : 'owner',
          createdAt: new Date().toISOString(),
        };
        await createUserProfile(userProf);
      } else {
        // Enforce strict role
        const targetRole = isSuper ? 'super_admin' : (userProf.role === 'super_admin' ? 'owner' : userProf.role);
        if (userProf.role !== targetRole) {
          userProf.role = targetRole;
          await updateUserProfile(currentUser.uid, { role: targetRole });
        }
      }
      setProfile(userProf);
      try {
        localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf));
      } catch {}

      // 1. Try to load associated business by assigned businessId
      if (userProf.businessId) {
        const biz = await getBusiness(userProf.businessId);
        if (biz) {
          setBusiness(biz);
          return;
        }
      }

      // 2. Check if this user's email matches a restaurant's ownerEmail or managerEmail
      if (currentUser.email) {
        const matchedBiz = await linkUserToBusinessIfEmailMatches(
          currentUser.uid,
          currentUser.email,
          currentUser.displayName || ''
        );
        if (matchedBiz) {
          userProf.businessId = matchedBiz.id;
          setProfile({ ...userProf, businessId: matchedBiz.id });
          setBusiness(matchedBiz);
          try {
            localStorage.setItem('menuestro_cached_profile', JSON.stringify({ ...userProf, businessId: matchedBiz.id }));
            localStorage.setItem('menuestro_cached_business', JSON.stringify(matchedBiz));
          } catch {}
          return;
        }
      }

      // 3. Fallback: check by ownerId
      const ownedBiz = await getBusinessByOwner(currentUser.uid);
      if (ownedBiz) {
        userProf.businessId = ownedBiz.id;
        setProfile({ ...userProf, businessId: ownedBiz.id });
        setBusiness(ownedBiz);
        return;
      }

      // 4. Fallback: check cached business ONLY IF it strictly belongs to this user
      try {
        const cachedBizJson = localStorage.getItem('menuestro_cached_business');
        if (cachedBizJson) {
          const cached = JSON.parse(cachedBizJson);
          const isOwner = cached?.ownerId === currentUser.uid;
          const isEmailMatch = emailLower && (cached?.ownerEmail?.toLowerCase() === emailLower || cached?.managerEmail?.toLowerCase() === emailLower);
          const isAssigned = userProf.businessId && cached?.id === userProf.businessId;

          if (cached?.id && (isOwner || isEmailMatch || isAssigned)) {
            const biz = await getBusiness(cached.id);
            if (biz) {
              setBusiness(biz);
              return;
            }
          }
        }
      } catch {}

      // 5. If no business is associated, set business to null (user will be prompted to create shop)
      setBusiness(null);
    } catch (err) {
      console.error('Error loading user/business data:', err);
      setBusiness(null);
    }
  };

  useEffect(() => {
    // Safety fallback: ensure loading state never hangs
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        clearTimeout(safetyTimer);
        setUser(currentUser);
        if (currentUser) {
          // Synchronously clear business if it doesn't belong to the newly active user
          setBusinessState((prev) => {
            if (!prev) return null;
            const emailLower = currentUser.email?.toLowerCase().trim() || '';
            const isOwner = prev.ownerId === currentUser.uid;
            const isEmailMatch = emailLower && (prev.ownerEmail?.toLowerCase().trim() === emailLower || prev.managerEmail?.toLowerCase().trim() === emailLower);
            return (isOwner || isEmailMatch) ? prev : null;
          });

          try {
            await loadUserData(currentUser);
          } catch (e) {
            console.warn('User data load fallback:', e);
          }
        } else {
          setProfile(null);
          setBusiness(null);
          setIsSuperAdmin(false);
          try {
            localStorage.removeItem('menuestro_cached_profile');
            localStorage.removeItem('menuestro_cached_business');
            localStorage.removeItem('menuestro_cached_is_admin');
          } catch {}
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Auth state error:', error);
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const refreshBusiness = async () => {
    if (!user) return;
    await loadUserData(user);
  };

  const signIn = async (email: string, pass: string) => {
    setBusiness(null);
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await loadUserData(cred.user);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setBusiness(null);
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    const isSuper = cred.user.email === 'managebox02@gmail.com';
    const userProf: UserProfile = {
      userId: cred.user.uid,
      businessId: '',
      name: name || cred.user.email?.split('@')[0] || 'User',
      email: cred.user.email || '',
      role: isSuper ? 'super_admin' : 'owner',
      createdAt: new Date().toISOString(),
    };
    await createUserProfile(userProf);
    if (isSuper) {
      await grantSuperAdminRole(cred.user.uid, cred.user.email || '', userProf.name);
    }
    setProfile(userProf);
    setIsSuperAdmin(isSuper);
    await loadUserData(cred.user);
  };

  const signInWithGoogle = async () => {
    setBusiness(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    await loadUserData(cred.user);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setBusiness(null);
    setIsSuperAdmin(false);
    try {
      localStorage.removeItem('menuestro_cached_profile');
      localStorage.removeItem('menuestro_cached_business');
      localStorage.removeItem('menuestro_cached_is_admin');
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        business,
        isSuperAdmin,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        sendPasswordReset,
        logout,
        refreshBusiness,
        setBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
