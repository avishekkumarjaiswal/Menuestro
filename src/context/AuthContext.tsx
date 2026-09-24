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
} from '../services/firestoreService';
import { UserProfile, Business } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  business: Business | null;
  isSuperAdmin: boolean;
  /** true when auth is resolved, user is signed in, NOT super admin, and no restaurant is assigned */
  isUnassigned: boolean;
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

/**
 * Validate that a live Business document actually corresponds to the
 * authenticated user's email.  This is the security fence that prevents
 * a stale / wrong businessId from leaking across sessions.
 */
function bizBelongsToEmail(biz: Business, emailLower: string): boolean {
  if (!emailLower || !biz) return false;
  return (
    biz.ownerEmail?.toLowerCase().trim() === emailLower ||
    biz.managerEmail?.toLowerCase().trim() === emailLower
  );
}

// ─── Provider ──────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /**
   * All state starts null / false / true (loading).
   * NEVER read from localStorage on initial render — always resolve from
   * Firestore via onAuthStateChanged → loadUserData.
   */
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isUnassigned, setIsUnassigned] = useState<boolean>(false);
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
   * PRIMARY AUTH RESOLUTION
   *
   * Rule: the authenticated user's normalized email is the SOLE key that
   * determines which restaurant they can access.
   *
   * Lookup order (all use email — no ownerId / no cached businessId trust):
   *   1. users/{uid}.businessId  →  validated by checking biz.ownerEmail === email
   *   2. pendingAssignments/{email}  →  written by Super Admin at restaurant creation
   *   3. businesses where ownerEmail == email  →  direct Firestore query
   *
   * If none match → isUnassigned = true, business = null.
   * The user will see the "not assigned" screen — never a wrong restaurant.
   */
  const loadUserData = async (currentUser: User) => {
    const emailLower = currentUser.email?.toLowerCase().trim() || '';

    try {
      // ── A. Super-admin check ───────────────────────────────────────────
      const isSuper = await checkIsSuperAdmin(currentUser.uid, emailLower);
      setIsSuperAdmin(isSuper);
      try { localStorage.setItem('menuestro_cached_is_admin', isSuper ? 'true' : 'false'); } catch {}

      // Super admins are never treated as restaurant managers
      if (isSuper) {
        setIsUnassigned(false);
        setBusiness(null);
        // Still load profile for display name etc.
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

      // ── B. Load or create the user profile ────────────────────────────
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
        // Enforce correct role (never allow self-escalation to super_admin)
        if (userProf.role === 'super_admin') {
          userProf = { ...userProf, role: 'owner' };
          await updateUserProfile(currentUser.uid, { role: 'owner' });
        }
      }
      setProfile(userProf);
      try { localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf)); } catch {}

      // ── C. Resolve business strictly by email ──────────────────────────
      // Step 1: profile has a businessId — verify the business's ownerEmail
      //         still matches THIS user's email (guards against reassignment)
      if (userProf.businessId) {
        const biz = await getBusiness(userProf.businessId);
        if (biz && bizBelongsToEmail(biz, emailLower)) {
          setIsUnassigned(false);
          setBusiness(biz);
          return;
        }
        // Stale or reassigned — clear it so we don't block the next steps
        await updateUserProfile(currentUser.uid, { businessId: '' }).catch(() => {});
        userProf = { ...userProf, businessId: '' };
      }

      // Step 2: pendingAssignments/{email}
      //         Written by Super Admin at restaurant creation/update.
      //         This is the reliable pre-login bridge.
      if (emailLower) {
        const assignedBiz = await resolvePendingBusinessAssignment(
          emailLower,
          currentUser.uid,
          currentUser.displayName || ''
        );
        if (assignedBiz) {
          userProf = { ...userProf, businessId: assignedBiz.id };
          setProfile({ ...userProf });
          setIsUnassigned(false);
          setBusiness(assignedBiz);
          await updateUserProfile(currentUser.uid, { businessId: assignedBiz.id }).catch(() => {});
          try { localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf)); } catch {}
          return;
        }
      }

      // Step 3: Direct query — businesses where ownerEmail == email
      //         Handles restaurants created before pendingAssignments existed,
      //         or when Step 2 is unavailable due to rules/permissions.
      if (currentUser.email) {
        const matchedBiz = await linkUserToBusinessIfEmailMatches(
          currentUser.uid,
          currentUser.email,
          currentUser.displayName || ''
        );
        if (matchedBiz) {
          userProf = { ...userProf, businessId: matchedBiz.id };
          setProfile({ ...userProf });
          setIsUnassigned(false);
          setBusiness(matchedBiz);
          await updateUserProfile(currentUser.uid, { businessId: matchedBiz.id }).catch(() => {});
          try { localStorage.setItem('menuestro_cached_profile', JSON.stringify(userProf)); } catch {}
          return;
        }
      }

      // No restaurant assigned to this email → show "not assigned" screen
      setIsUnassigned(true);
      setBusiness(null);

    } catch (err) {
      console.error('[AuthContext] loadUserData error:', err);
      setIsUnassigned(true);
      setBusiness(null);
    }
  };

  // ── onAuthStateChanged ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          // Synchronously wipe all state so no previous user's data shows
          setUser(currentUser);
          setBusinessState(null);
          setProfile(null);
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

  // ── Public auth API ────────────────────────────────────────────────────

  const refreshBusiness = async () => {
    if (!user) return;
    await loadUserData(user);
  };

  const signIn = async (email: string, pass: string) => {
    // Eagerly wipe everything before signing in
    setUser(null);
    setProfile(null);
    setBusinessState(null);
    setIsSuperAdmin(false);
    setIsUnassigned(false);
    clearAuthCache();

    const cred = await signInWithEmailAndPassword(auth, email, pass);
    setLoading(true);
    await loadUserData(cred.user);
    setLoading(false);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setUser(null);
    setProfile(null);
    setBusinessState(null);
    setIsSuperAdmin(false);
    setIsUnassigned(false);
    clearAuthCache();

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    setLoading(true);
    await loadUserData(cred.user);
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    setUser(null);
    setProfile(null);
    setBusinessState(null);
    setIsSuperAdmin(false);
    setIsUnassigned(false);
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
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setBusinessState(null);
    setIsSuperAdmin(false);
    setIsUnassigned(false);
    clearAuthCache();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        business,
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
