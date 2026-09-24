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
  linkUserToBusinessIfEmailMatches,
  checkIsSuperAdmin,
  grantSuperAdminRole,
  resolvePendingBusinessAssignment,
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

// ─── helpers ───────────────────────────────────────────────────────────────
function clearAuthCache() {
  try {
    localStorage.removeItem('menuestro_cached_profile');
    localStorage.removeItem('menuestro_cached_business');
    localStorage.removeItem('menuestro_cached_is_admin');
  } catch {}
}

/** Validate that a cached business actually belongs to the given user. */
function isCachedBizValidForUser(cached: Business | null, uid: string, emailLower: string): boolean {
  if (!cached) return false;
  if (cached.ownerId === uid) return true;
  if (emailLower && cached.ownerEmail?.toLowerCase().trim() === emailLower) return true;
  if (emailLower && cached.managerEmail?.toLowerCase().trim() === emailLower) return true;
  return false;
}

// ─── Provider ──────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always start with null — never trust localStorage on initial render.
  // The correct values are loaded via onAuthStateChanged → loadUserData.
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
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

  /**
   * Fully resolves the authenticated user's profile and business from Firestore.
   * This is the single authoritative source of truth — never uses localStorage
   * as a substitute for Firestore data.
   */
  const loadUserData = async (currentUser: User) => {
    const emailLower = currentUser.email?.toLowerCase().trim() || '';

    try {
      // ── A. Super-admin check ───────────────────────────────────────────
      const isSuper = await checkIsSuperAdmin(currentUser.uid, emailLower);
      setIsSuperAdmin(isSuper);
      try { localStorage.setItem('menuestro_cached_is_admin', isSuper ? 'true' : 'false'); } catch {}

      // ── B. Load or create the user profile ────────────────────────────
      let userProf = await getUserProfile(currentUser.uid);
      if (!userProf) {
        userProf = {
          userId: currentUser.uid,
          businessId: '',
          name: currentUser.displayName || emailLower.split('@')[0] || (isSuper ? 'Super Admin' : 'Restaurant Owner'),
          email: currentUser.email || '',
          role: isSuper ? 'super_admin' : 'owner',
          createdAt: new Date().toISOString(),
        };
        await createUserProfile(userProf);
      } else {
        // Enforce correct role (never allow self-escalation to super_admin)
        const targetRole = isSuper ? 'super_admin' : (userProf.role === 'super_admin' ? 'owner' : userProf.role);
        if (userProf.role !== targetRole) {
          userProf = { ...userProf, role: targetRole };
          await updateUserProfile(currentUser.uid, { role: targetRole });
        }
      }

      setProfile(userProf);
      try { localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf)); } catch {}

      // ── C. Resolve the business ────────────────────────────────────────
      // Priority order (highest confidence → lowest):
      // 1. users/{uid}.businessId — profile-linked business
      // 2. pendingAssignments/{email} — pre-login admin assignment
      // 3. linkUserToBusinessIfEmailMatches — email-keyed lookup against businesses collection
      // 4. getBusinessByOwner — ownerId match (user created via onboarding)
      // After each step, we validate the found business actually matches this user.

      // Step 1: profile-linked businessId
      if (userProf.businessId) {
        const biz = await getBusiness(userProf.businessId);
        if (biz && isCachedBizValidForUser(biz, currentUser.uid, emailLower)) {
          setBusiness(biz);
          return;
        }
        // businessId is stale — clear it
        await updateUserProfile(currentUser.uid, { businessId: '' }).catch(() => {});
        userProf = { ...userProf, businessId: '' };
      }

      // Step 2: pendingAssignments/{email} — set by Super Admin when creating a restaurant
      if (emailLower) {
        const assignedBiz = await resolvePendingBusinessAssignment(emailLower, currentUser.uid, currentUser.displayName || '');
        if (assignedBiz) {
          userProf = { ...userProf, businessId: assignedBiz.id };
          setProfile({ ...userProf, businessId: assignedBiz.id });
          setBusiness(assignedBiz);
          await updateUserProfile(currentUser.uid, { businessId: assignedBiz.id }).catch(() => {});
          try {
            localStorage.setItem('menuestro_cached_profile', JSON.stringify({ ...userProf, businessId: assignedBiz.id }));
          } catch {}
          return;
        }
      }

      // Step 3: email-keyed lookup against businesses.ownerEmail / managerEmail
      if (currentUser.email) {
        const matchedBiz = await linkUserToBusinessIfEmailMatches(
          currentUser.uid,
          currentUser.email,
          currentUser.displayName || ''
        );
        if (matchedBiz) {
          userProf = { ...userProf, businessId: matchedBiz.id };
          setProfile({ ...userProf, businessId: matchedBiz.id });
          setBusiness(matchedBiz);
          try {
            localStorage.setItem('menuestro_cached_profile', JSON.stringify({ ...userProf, businessId: matchedBiz.id }));
          } catch {}
          return;
        }
      }

      // Step 4: ownerId match (restaurant created via self-onboarding flow)
      const ownedBiz = await getBusinessByOwner(currentUser.uid);
      if (ownedBiz) {
        userProf = { ...userProf, businessId: ownedBiz.id };
        setProfile({ ...userProf, businessId: ownedBiz.id });
        setBusiness(ownedBiz);
        await updateUserProfile(currentUser.uid, { businessId: ownedBiz.id }).catch(() => {});
        return;
      }

      // No business found — user will see OnboardingWizard
      setBusiness(null);

    } catch (err) {
      console.error('[AuthContext] loadUserData error:', err);
      setBusiness(null);
    }
  };

  // ── onAuthStateChanged ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          // Immediately clear any previous user's cached business from state.
          // The correct business will be set by loadUserData below.
          setBusinessState(null);
          setProfile(null);

          try {
            await loadUserData(currentUser);
          } catch (e) {
            console.warn('[AuthContext] loadUserData fallback:', e);
            setBusiness(null);
          }
        } else {
          // Signed out — clear everything
          setUser(null);
          setProfile(null);
          setBusinessState(null);
          setIsSuperAdmin(false);
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

  // ── Public API ─────────────────────────────────────────────────────────

  const refreshBusiness = async () => {
    if (!user) return;
    await loadUserData(user);
  };

  const signIn = async (email: string, pass: string) => {
    // Clear everything before signing in so stale state never leaks
    setUser(null);
    setProfile(null);
    setBusinessState(null);
    clearAuthCache();

    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await loadUserData(cred.user);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setUser(null);
    setProfile(null);
    setBusinessState(null);
    clearAuthCache();

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    // Let loadUserData handle profile creation and business resolution
    await loadUserData(cred.user);
  };

  const signInWithGoogle = async () => {
    setUser(null);
    setProfile(null);
    setBusinessState(null);
    clearAuthCache();

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
    setBusinessState(null);
    setIsSuperAdmin(false);
    clearAuthCache();
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
