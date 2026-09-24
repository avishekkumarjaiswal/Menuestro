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
  linkUserToBusinessIfEmailMatches,
  checkIsSuperAdmin,
  grantSuperAdminRole,
  resolvePendingBusinessAssignment,
  getRestaurantApplicationByEmail,
} from '../services/firestoreService';
import { UserProfile, Business, RestaurantApplication } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  business: Business | null;
  application: RestaurantApplication | null;
  isSuperAdmin: boolean;
  /**
   * true: auth resolved + signed in + NOT super admin + no restaurant + no pending application
   * In this state the user sees the "Create Your Restaurant" screen.
   */
  isUnassigned: boolean;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
  setBusiness: (biz: Business | null) => void;
  setApplication: (app: RestaurantApplication | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── helpers ────────────────────────────────────────────────────────────────
function clearAuthCache() {
  try {
    localStorage.removeItem('menuestro_cached_profile');
    localStorage.removeItem('menuestro_cached_business');
    localStorage.removeItem('menuestro_cached_is_admin');
  } catch {}
}

function bizBelongsToEmail(biz: Business, emailLower: string): boolean {
  if (!emailLower || !biz) return false;
  return (
    biz.ownerEmail?.toLowerCase().trim() === emailLower ||
    biz.managerEmail?.toLowerCase().trim() === emailLower
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [application, setApplicationState] = useState<RestaurantApplication | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isUnassigned, setIsUnassigned] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const setBusiness = (biz: Business | null) => {
    setBusinessState(biz);
    try {
      if (biz) localStorage.setItem('menuestro_cached_business', JSON.stringify(biz));
      else localStorage.removeItem('menuestro_cached_business');
    } catch {}
  };

  const setApplication = (app: RestaurantApplication | null) => {
    setApplicationState(app);
  };

  /**
   * PRIMARY AUTH RESOLUTION
   *
   * Email is the SOLE key. Resolution order:
   *   A. Super Admin → admin panel, no restaurant
   *   B. users/{uid}.businessId validated against biz.ownerEmail
   *   C. pendingAssignments/{email} → active restaurant
   *   D. businesses where ownerEmail == email
   *   E. restaurantApplications where applicantEmail == email → show pending/rejected screen
   *   F. No match → isUnassigned = true → Create Restaurant screen
   */
  const loadUserData = async (currentUser: User) => {
    const emailLower = currentUser.email?.toLowerCase().trim() || '';

    try {
      // ── A. Super admin ────────────────────────────────────────────────
      const isSuper = await checkIsSuperAdmin(currentUser.uid, emailLower);
      setIsSuperAdmin(isSuper);
      try { localStorage.setItem('menuestro_cached_is_admin', isSuper ? 'true' : 'false'); } catch {}

      if (isSuper) {
        setIsUnassigned(false);
        setApplicationState(null);
        setBusiness(null);
        let userProf = await getUserProfile(currentUser.uid);
        if (!userProf) {
          userProf = {
            userId: currentUser.uid,
            businessId: '',
            name: currentUser.displayName || emailLower.split('@')[0] || 'Super Admin',
            email: currentUser.email || '',
            role: 'super_admin',
            createdAt: new Date().toISOString(),
          };
          await createUserProfile(userProf);
          await grantSuperAdminRole(currentUser.uid, currentUser.email || '', userProf.name);
        }
        setProfile(userProf);
        try { localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf)); } catch {}
        return;
      }

      // ── B. Load or create user profile ───────────────────────────────
      let userProf = await getUserProfile(currentUser.uid);
      if (!userProf) {
        userProf = {
          userId: currentUser.uid,
          businessId: '',
          name: currentUser.displayName || emailLower.split('@')[0] || 'Restaurant Manager',
          email: currentUser.email || '',
          role: 'owner',
          createdAt: new Date().toISOString(),
        };
        await createUserProfile(userProf);
      } else {
        if (userProf.role === 'super_admin') {
          userProf = { ...userProf, role: 'owner' };
          await updateUserProfile(currentUser.uid, { role: 'owner' });
        }
      }
      setProfile(userProf);
      try { localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf)); } catch {}

      // ── C. Resolve active business (email-only) ───────────────────────
      // Step 1: profile has a businessId — verify it still belongs to this email
      if (userProf.businessId) {
        const biz = await getBusiness(userProf.businessId);
        if (biz && biz.status === 'active' && bizBelongsToEmail(biz, emailLower)) {
          setIsUnassigned(false);
          setApplicationState(null);
          setBusiness(biz);
          return;
        }
        await updateUserProfile(currentUser.uid, { businessId: '' }).catch(() => {});
        userProf = { ...userProf, businessId: '' };
      }

      // Step 2: pendingAssignments/{email}
      if (emailLower) {
        const assignedBiz = await resolvePendingBusinessAssignment(
          emailLower,
          currentUser.uid,
          currentUser.displayName || ''
        );
        if (assignedBiz && assignedBiz.status === 'active') {
          userProf = { ...userProf, businessId: assignedBiz.id };
          setProfile({ ...userProf });
          setIsUnassigned(false);
          setApplicationState(null);
          setBusiness(assignedBiz);
          await updateUserProfile(currentUser.uid, { businessId: assignedBiz.id }).catch(() => {});
          try { localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf)); } catch {}
          return;
        }
      }

      // Step 3: direct ownerEmail query
      if (currentUser.email) {
        const matchedBiz = await linkUserToBusinessIfEmailMatches(
          currentUser.uid,
          currentUser.email,
          currentUser.displayName || ''
        );
        if (matchedBiz && matchedBiz.status === 'active') {
          userProf = { ...userProf, businessId: matchedBiz.id };
          setProfile({ ...userProf });
          setIsUnassigned(false);
          setApplicationState(null);
          setBusiness(matchedBiz);
          await updateUserProfile(currentUser.uid, { businessId: matchedBiz.id }).catch(() => {});
          try { localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf)); } catch {}
          return;
        }
      }

      // ── D. Truly unassigned ───────────────────────────────────────────
      setIsUnassigned(true);
      setBusiness(null);

    } catch (err) {
      console.error('[AuthContext] loadUserData error:', err);
      setIsUnassigned(true);
      setApplicationState(null);
      setBusiness(null);
    }
  };

  // ── onAuthStateChanged ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setBusinessState(null);
          setProfile(null);
          setApplicationState(null);
          setIsSuperAdmin(false);
          setIsUnassigned(false);

          try {
            await loadUserData(currentUser);
          } catch (e) {
            console.warn('[AuthContext] loadUserData fallback:', e);
            setIsUnassigned(true);
            setBusiness(null);
          }
        } else {
          setUser(null);
          setProfile(null);
          setBusinessState(null);
          setApplicationState(null);
          setIsSuperAdmin(false);
          setIsUnassigned(false);
          clearAuthCache();
        }
        setLoading(false);
      },
      (error) => {
        console.warn('[AuthContext] auth state error:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────

  const refreshBusiness = async () => {
    if (!user) return;
    setLoading(true);
    await loadUserData(user);
    setLoading(false);
  };

  const signIn = async (email: string, pass: string) => {
    setUser(null); setProfile(null); setBusinessState(null);
    setApplicationState(null); setIsSuperAdmin(false); setIsUnassigned(false);
    clearAuthCache();
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    setLoading(true);
    await loadUserData(cred.user);
    setLoading(false);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setUser(null); setProfile(null); setBusinessState(null);
    setApplicationState(null); setIsSuperAdmin(false); setIsUnassigned(false);
    clearAuthCache();
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) await updateProfile(cred.user, { displayName: name });
    setLoading(true);
    await loadUserData(cred.user);
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    setUser(null); setProfile(null); setBusinessState(null);
    setApplicationState(null); setIsSuperAdmin(false); setIsUnassigned(false);
    clearAuthCache();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    setLoading(true);
    await loadUserData(cred.user);
    setLoading(false);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('signOut error:', e);
    }
    setUser(null);
    setProfile(null);
    setBusinessState(null);
    setApplicationState(null);
    setIsSuperAdmin(false);
    setIsUnassigned(false);
    clearAuthCache();

    // Reset URL to '/' so user returns to the main login screen instead of lingering on /admin
    if (window.location.pathname !== '/' || window.location.hash || window.location.search) {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        business,
        application,
        isSuperAdmin,
        isUnassigned,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        sendPasswordReset,
        logout,
        refreshBusiness,
        setBusiness,
        setApplication,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
