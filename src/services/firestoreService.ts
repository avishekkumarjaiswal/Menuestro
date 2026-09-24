import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  UserProfile,
  UserRole,
  Business,
  BusinessStatus,
  BusinessMember,
  BusinessRole,
  BusinessStats,
  Category,
  MenuItem,
  QRCodeItem,
  AnalyticsEvent,
  AnalyticsEventType,
  PrivateFeedback,
  ReviewPhrase,
  ReviewPhraseCategory,
  ReviewTemplate,
  FeedbackQuestion,
  CTAMessage,
  AdminActivityLog,
  ActivityEntityType,
  PlatformOverviewMetrics,
  DashboardTimeFilter,
  RestaurantApplication,
  RestaurantApplicationStatus,
} from '../types';

// ==========================================
// 1. SUPER ADMIN AUTHORIZATION & PROFILES
// ==========================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.userId}`;
  try {
    const docRef = doc(db, path);
    await setDoc(docRef, profile);

    // If user is super_admin, also register in admins/ collection
    if (profile.role === 'super_admin') {
      const adminDoc = doc(db, `admins/${profile.userId}`);
      await setDoc(adminDoc, {
        userId: profile.userId,
        email: profile.email,
        name: profile.name,
        role: 'super_admin',
        createdAt: profile.createdAt || new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, path);
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// 1b. PENDING BUSINESS ASSIGNMENTS (pre-login email → businessId mapping)
// Written by Super Admin when creating/updating a restaurant with a manager email.
// Resolved at first login to reliably link the user to their business.
// ==========================================

/**
 * Stores a pending assignment: email → businessId
 * Called by Super Admin when creating or updating a restaurant with an owner/manager email.
 * The document key is the normalized email address.
 */
export async function setPendingBusinessAssignment(
  email: string,
  businessId: string,
  businessName: string
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !businessId) return;
  try {
    const ref = doc(db, `pendingAssignments/${cleanEmail}`);
    await setDoc(ref, {
      email: cleanEmail,
      businessId,
      businessName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('setPendingBusinessAssignment error:', err);
  }
}

/**
 * Resolves a pending assignment for a newly logged-in user.
 * - Reads /pendingAssignments/{email}
 * - Verifies the business exists and email still matches
 * - Updates users/{uid} with businessId and registers membership
 * - Does NOT delete the pending record (safe for re-login)
 * Returns the matched Business or null.
 */
export async function resolvePendingBusinessAssignment(
  email: string,
  userId: string,
  userName?: string
): Promise<Business | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !userId) return null;
  try {
    const ref = doc(db, `pendingAssignments/${cleanEmail}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data();
    const businessId: string = data?.businessId;
    if (!businessId) return null;

    // Verify the business still exists and the email still matches
    const biz = await getBusiness(businessId);
    if (!biz) return null;

    const bizEmail = biz.ownerEmail?.toLowerCase().trim() || '';
    const bizManagerEmail = biz.managerEmail?.toLowerCase().trim() || '';
    const emailMatchesBusiness = bizEmail === cleanEmail || bizManagerEmail === cleanEmail;
    if (!emailMatchesBusiness) {
      // Stale or reassigned — ignore
      return null;
    }

    // Link the user profile to this business
    const userRef = doc(db, `users/${userId}`);
    await setDoc(userRef, {
      businessId,
      role: 'owner',
      email: cleanEmail,
      name: userName || cleanEmail.split('@')[0],
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});

    // Register membership
    const memberRef = doc(db, `businesses/${businessId}/members/${userId}`);
    await setDoc(memberRef, {
      userId,
      businessId,
      email: cleanEmail,
      name: userName || cleanEmail.split('@')[0],
      role: 'owner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});

    return biz;
  } catch (err) {
    console.warn('resolvePendingBusinessAssignment error:', err);
    return null;
  }
}

// ==========================================
// 1c. RESTAURANT APPLICATIONS (Self-service onboarding)
// Users submit → pending_approval → Super Admin approves/rejects
// ==========================================

/**
 * Submit a new restaurant application.
 * Blocked if the applicant already has a pending or approved application.
 * Returns the application document ID.
 */
export async function submitRestaurantApplication(
  applicantUid: string,
  applicantEmail: string,
  applicantName: string,
  fields: {
    restaurantName: string;
    address?: string;
    phone?: string;
    restaurantEmail?: string;
    googleReviewUrl?: string;
    logoUrl?: string;
    coverImageUrl?: string;
  }
): Promise<string> {
  const cleanEmail = applicantEmail.trim().toLowerCase();

  // Guard: one active application per email
  const existing = await getRestaurantApplicationByEmail(cleanEmail);
  if (existing) {
    if (existing.status === 'pending_approval') {
      throw new Error('You already have a pending restaurant application. Please wait for admin review.');
    }
    if (existing.status === 'approved') {
      throw new Error('Your restaurant application has already been approved.');
    }
    // Rejected → allow resubmit by overwriting
  }

  // Guard: email already active on a restaurant
  const activeBiz = await getBusinessByEmail(cleanEmail);
  if (activeBiz) {
    throw new Error('This email is already assigned to an active restaurant.');
  }

  const ref = existing
    ? doc(db, `restaurantApplications/${existing.id}`)
    : doc(collection(db, 'restaurantApplications'));

  const now = new Date().toISOString();
  const data: Omit<RestaurantApplication, 'id'> = {
    applicantEmail: cleanEmail,
    applicantUid,
    applicantName,
    restaurantName: fields.restaurantName.trim(),
    address: fields.address?.trim() || '',
    phone: fields.phone?.trim() || '',
    restaurantEmail: fields.restaurantEmail?.trim().toLowerCase() || '',
    googleReviewUrl: fields.googleReviewUrl?.trim() || '',
    logoUrl: fields.logoUrl || '',
    coverImageUrl: fields.coverImageUrl || '',
    status: 'pending_approval',
    submittedAt: now,
  };

  await setDoc(ref, data, { merge: true });
  return ref.id;
}

/** Get a restaurant application by the applicant's email (O(1) lookup by field). */
export async function getRestaurantApplicationByEmail(
  email: string
): Promise<RestaurantApplication | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  try {
    const q = query(
      collection(db, 'restaurantApplications'),
      where('applicantEmail', '==', cleanEmail),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as RestaurantApplication;
  } catch (err) {
    console.warn('getRestaurantApplicationByEmail error:', err);
    return null;
  }
}

/** Get a restaurant application by document ID. */
export async function getRestaurantApplicationById(
  applicationId: string
): Promise<RestaurantApplication | null> {
  try {
    const snap = await getDoc(doc(db, `restaurantApplications/${applicationId}`));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as RestaurantApplication;
  } catch (err) {
    console.warn('getRestaurantApplicationById error:', err);
    return null;
  }
}

/** Subscribe to all applications (Super Admin use). */
export function subscribeAllRestaurantApplications(
  onUpdate: (apps: RestaurantApplication[]) => void
): () => void {
  const q = query(
    collection(db, 'restaurantApplications'),
    orderBy('submittedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RestaurantApplication)));
  }, (err) => {
    console.warn('subscribeAllRestaurantApplications error:', err);
  });
}

/**
 * Approve a restaurant application.
 * Creates the full active business (calls createBusiness internally),
 * writes pendingAssignments/{email}, links the user profile.
 */
export async function approveRestaurantApplication(
  applicationId: string,
  adminUser: { id: string; email: string; name: string }
): Promise<string> {
  const app = await getRestaurantApplicationById(applicationId);
  if (!app) throw new Error('Application not found');
  if (app.status === 'approved') throw new Error('Application already approved');

  const now = new Date().toISOString();

  // Build slug from restaurant name
  const rawSlug = app.restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const uniqueSuffix = Date.now().toString(36).slice(-4);
  const slug = `${rawSlug}-${uniqueSuffix}`;

  // Create the active business
  const bizId = await createBusiness(
    {
      ownerId: app.applicantUid,
      ownerEmail: app.applicantEmail,
      name: app.restaurantName,
      slug,
      description: '',
      tagline: '',
      phone: app.phone || '',
      address: app.address || '',
      googleReviewUrl: app.googleReviewUrl || '',
      logoUrl: app.logoUrl || '',
      coverImageUrl: app.coverImageUrl || '',
      status: 'active',
      currency: '₹',
      currencyCode: 'INR',
      country: 'India',
      primaryColor: '#078A55',
      createdAt: now,
      updatedAt: now,
      reviewAssistantSettings: {
        enabled: true,
        maximumPhraseSelections: 5,
        googleReviewUrl: app.googleReviewUrl || '',
      },
    },
    undefined,
    adminUser
  );

  // Mark application approved
  await setDoc(
    doc(db, `restaurantApplications/${applicationId}`),
    {
      status: 'approved' as RestaurantApplicationStatus,
      businessId: bizId,
      approvedBy: adminUser.email,
      approvedAt: now,
    },
    { merge: true }
  );

  logAdminActivity({
    adminUserId: adminUser.id,
    adminEmail: adminUser.email,
    adminName: adminUser.name,
    action: 'Approved Restaurant Application',
    entityType: 'restaurant',
    entityId: bizId,
    businessId: bizId,
    businessName: app.restaurantName,
    metadata: { applicationId, applicantEmail: app.applicantEmail },
  });

  return bizId;
}

/** Reject a restaurant application. */
export async function rejectRestaurantApplication(
  applicationId: string,
  rejectionReason: string,
  adminUser: { id: string; email: string; name: string }
): Promise<void> {
  const now = new Date().toISOString();
  await setDoc(
    doc(db, `restaurantApplications/${applicationId}`),
    {
      status: 'rejected' as RestaurantApplicationStatus,
      rejectedBy: adminUser.email,
      rejectedAt: now,
      rejectionReason: rejectionReason.trim(),
    },
    { merge: true }
  );

  logAdminActivity({
    adminUserId: adminUser.id,
    adminEmail: adminUser.email,
    adminName: adminUser.name,
    action: 'Rejected Restaurant Application',
    entityType: 'restaurant',
    entityId: applicationId,
    metadata: { applicationId, reason: rejectionReason },
  });
}



export const SUPER_ADMIN_EMAILS = [
  'managebox02@gmail.com',
];

export async function checkIsSuperAdmin(userId: string, email?: string): Promise<boolean> {
  const cleanEmail = email?.toLowerCase().trim();
  // 1. Initial bootstrap platform admin emails
  if (cleanEmail && SUPER_ADMIN_EMAILS.includes(cleanEmail)) {
    return true;
  }
  // 2. Authoritative registry check in /admins/{userId}
  try {
    const adminDoc = doc(db, `admins/${userId}`);
    const snap = await getDoc(adminDoc);
    if (snap.exists()) {
      const data = snap.data();
      if (
        data.role === 'super_admin' &&
        data.active !== false &&
        (data.email?.toLowerCase().trim() === 'managebox02@gmail.com' || cleanEmail === 'managebox02@gmail.com')
      ) {
        return true;
      }
    }
  } catch {}
  return false;
}

export async function grantSuperAdminRole(
  userId: string,
  email: string,
  name: string,
  grantedBy = 'system_bootstrap'
): Promise<void> {
  try {
    const adminDoc = doc(db, `admins/${userId}`);
    await setDoc(adminDoc, {
      userId,
      email,
      name,
      role: 'super_admin',
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: grantedBy,
      updatedAt: new Date().toISOString(),
    });
    const userDoc = doc(db, `users/${userId}`);
    await updateDoc(userDoc, { role: 'super_admin' }).catch(async () => {
      await setDoc(userDoc, {
        userId,
        businessId: '',
        name,
        email,
        role: 'super_admin',
        createdAt: new Date().toISOString(),
      }, { merge: true });
    });
  } catch (e) {
    console.warn('grantSuperAdminRole notice:', e);
  }
}

// ==========================================
// 2. ADMIN ACTIVITY LOGGING (AUDIT TRAIL)
// ==========================================

export async function logAdminActivity(params: {
  adminUserId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  entityType: ActivityEntityType;
  entityId: string;
  businessId?: string;
  businessName?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const path = 'adminActivityLogs';
  try {
    const logRef = doc(collection(db, path));
    const payload: AdminActivityLog = {
      id: logRef.id,
      adminUserId: params.adminUserId,
      adminEmail: params.adminEmail || 'admin@menuestro.com',
      adminName: params.adminName || 'Super Admin',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      ...(params.businessId ? { businessId: params.businessId } : {}),
      ...(params.businessName ? { businessName: params.businessName } : {}),
      timestamp: new Date().toISOString(),
      metadata: params.metadata || {},
    };
    await setDoc(logRef, payload);
  } catch (error) {
    console.warn('logAdminActivity notice:', error);
  }
}

export function subscribeAdminActivityLogs(
  onUpdate: (logs: AdminActivityLog[]) => void,
  businessId?: string,
  maxLimit = 100
): () => void {
  const path = 'adminActivityLogs';
  let q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(maxLimit));
  if (businessId) {
    q = query(collection(db, path), where('businessId', '==', businessId), orderBy('timestamp', 'desc'), limit(maxLimit));
  }
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminActivityLog));
      onUpdate(logs);
    },
    (error) => {
      console.warn('subscribeAdminActivityLogs note:', error);
      onUpdate([]);
    }
  );
}

export async function getAdminActivityLogs(maxLimit = 100, businessId?: string): Promise<AdminActivityLog[]> {
  const path = 'adminActivityLogs';
  try {
    let q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(maxLimit));
    if (businessId) {
      q = query(collection(db, path), where('businessId', '==', businessId), orderBy('timestamp', 'desc'), limit(maxLimit));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminActivityLog));
  } catch (e) {
    console.warn('getAdminActivityLogs error:', e);
    return [];
  }
}

// ==========================================
// 3. O(1) SLUG RESOLUTION & UNIQUENESS
// ==========================================

export const RESERVED_SLUGS = new Set([
  'admin',
  'superadmin',
  'api',
  'login',
  'signup',
  'signin',
  'auth',
  'dashboard',
  'settings',
  'm',
  'r',
  'q',
  'preview',
  'terms',
  'privacy',
  'help',
  'support',
  'root',
  'static',
  'assets',
  'public',
  'menuestro',
  'system',
  'manage',
]);

export function normalizeSlug(rawSlug: string): string {
  return (rawSlug || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function checkSlugAvailable(slug: string, currentBusinessId?: string): Promise<boolean> {
  const cleanSlug = normalizeSlug(slug);
  if (!cleanSlug || cleanSlug.length < 2) return false;
  if (RESERVED_SLUGS.has(cleanSlug)) return false;

  try {
    const slugDocRef = doc(db, 'slugs', cleanSlug);
    const snap = await getDoc(slugDocRef);
    if (!snap.exists()) return true;
    const data = snap.data();
    return data.businessId === currentBusinessId;
  } catch {
    return true;
  }
}

export async function claimBusinessSlug(businessId: string, ownerId: string, slug: string): Promise<boolean> {
  const cleanSlug = normalizeSlug(slug);
  if (!cleanSlug || RESERVED_SLUGS.has(cleanSlug)) return false;

  const slugPath = `slugs/${cleanSlug}`;
  try {
    const slugRef = doc(db, slugPath);
    const existingSnap = await getDoc(slugRef);

    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data.businessId !== businessId && data.ownerId !== ownerId) {
        return false;
      }
    }

    await setDoc(slugRef, {
      businessId,
      ownerId,
      slug: cleanSlug,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.warn('Could not claim slug:', error);
    return false;
  }
}

// High-Speed In-Memory and Session Storage Cache Layer
const businessCache = new Map<string, { data: Business; timestamp: number }>();
const slugToBusinessIdCache = new Map<string, { id: string; timestamp: number }>();
const menuItemsCache = new Map<string, { data: MenuItem[]; timestamp: number }>();
const categoriesCache = new Map<string, { data: Category[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateBusinessMenuCache(businessId?: string, slug?: string): void {
  if (businessId) {
    businessCache.delete(businessId);
    menuItemsCache.delete(businessId);
    categoriesCache.delete(businessId);
    try {
      sessionStorage.removeItem(`menu_payload_${businessId}`);
    } catch {}
  }
  if (slug) {
    const clean = normalizeSlug(slug);
    slugToBusinessIdCache.delete(clean);
    try {
      sessionStorage.removeItem(`menu_slug_${clean}`);
    } catch {}
  }
}

export interface PublicMenuPayload {
  business: Business;
  categories: Category[];
  items: MenuItem[];
}

export function getCachedPublicMenu(slug: string): PublicMenuPayload | null {
  const clean = normalizeSlug(slug);
  if (!clean) return null;

  try {
    const sessionData = sessionStorage.getItem(`menu_slug_${clean}`);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (parsed && parsed.business && Array.isArray(parsed.categories)) {
        return parsed as PublicMenuPayload;
      }
    }
  } catch {}

  return null;
}

export function setCachedPublicMenu(slug: string, payload: PublicMenuPayload): void {
  const clean = normalizeSlug(slug);
  if (!clean || !payload?.business) return;

  try {
    sessionStorage.setItem(
      `menu_slug_${clean}`,
      JSON.stringify({
        business: payload.business,
        categories: payload.categories,
        items: payload.items,
        timestamp: Date.now(),
      })
    );
  } catch {}
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const cleanSlug = normalizeSlug(slug);
  if (!cleanSlug) return null;

  // 1. Fast in-memory cache check (<1ms)
  const cachedSlug = slugToBusinessIdCache.get(cleanSlug);
  if (cachedSlug && Date.now() - cachedSlug.timestamp < CACHE_TTL_MS) {
    const cachedBiz = businessCache.get(cachedSlug.id);
    if (cachedBiz && Date.now() - cachedBiz.timestamp < CACHE_TTL_MS) {
      return cachedBiz.data;
    }
  }

  // 2. Fast Session Storage check
  try {
    const sessionData = sessionStorage.getItem(`menu_slug_${cleanSlug}`);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (parsed?.business) {
        businessCache.set(parsed.business.id, { data: parsed.business, timestamp: Date.now() });
        slugToBusinessIdCache.set(cleanSlug, { id: parsed.business.id, timestamp: Date.now() });
        return parsed.business as Business;
      }
    }
  } catch {}

  try {
    const slugDocRef = doc(db, 'slugs', cleanSlug);
    const slugSnap = await getDoc(slugDocRef);

    if (slugSnap.exists()) {
      const targetBusinessId = slugSnap.data().businessId;
      if (targetBusinessId) {
        const biz = await getBusiness(targetBusinessId);
        if (biz) {
          businessCache.set(biz.id, { data: biz, timestamp: Date.now() });
          slugToBusinessIdCache.set(cleanSlug, { id: biz.id, timestamp: Date.now() });
          return biz;
        }
      }
    }

    const directBiz = await getBusiness(cleanSlug);
    if (directBiz) {
      businessCache.set(directBiz.id, { data: directBiz, timestamp: Date.now() });
      slugToBusinessIdCache.set(cleanSlug, { id: directBiz.id, timestamp: Date.now() });
      return directBiz;
    }

    const q = query(collection(db, 'businesses'), where('slug', '==', cleanSlug), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const foundBiz = { id: docSnap.id, ...docSnap.data() } as Business;
      businessCache.set(foundBiz.id, { data: foundBiz, timestamp: Date.now() });
      slugToBusinessIdCache.set(cleanSlug, { id: foundBiz.id, timestamp: Date.now() });
      claimBusinessSlug(foundBiz.id, foundBiz.ownerId, cleanSlug).catch(() => {});
      return foundBiz;
    }

    return null;
  } catch (error) {
    console.warn('getBusinessBySlug query notice:', error);
    return null;
  }
}

// ==========================================
// 4. RESTAURANT CRUD & SUPER ADMIN MANAGEMENT
// ==========================================

export async function getBusiness(businessId: string): Promise<Business | null> {
  const path = `businesses/${businessId}`;
  
  // Cache check
  const cached = businessCache.get(businessId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const biz = { id: snap.id, ...snap.data() } as Business;
    businessCache.set(businessId, { data: biz, timestamp: Date.now() });
    return biz;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToBusiness(
  businessId: string,
  onUpdate: (business: Business | null) => void
): () => void {
  const path = `businesses/${businessId}`;
  const docRef = doc(db, path);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() } as Business);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn('subscribeToBusiness error:', error);
    }
  );
}

export async function getBusinessByOwner(ownerId: string): Promise<Business | null> {
  const path = 'businesses';
  try {
    const q = query(collection(db, path), where('ownerId', '==', ownerId), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Business;
    }
    return null;
  } catch (error) {
    console.warn('getBusinessByOwner error:', error);
    return null;
  }
}

export async function getBusinessByEmail(email: string): Promise<Business | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  const path = 'businesses';
  try {
    // 1. Query by ownerEmail (Manager Login Email field)
    const qOwner = query(collection(db, path), where('ownerEmail', '==', cleanEmail), limit(1));
    const snapOwner = await getDocs(qOwner);
    if (!snapOwner.empty) {
      const docSnap = snapOwner.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Business;
    }

    // 2. Query by managerEmail
    const qManager = query(collection(db, path), where('managerEmail', '==', cleanEmail), limit(1));
    const snapManager = await getDocs(qManager);
    if (!snapManager.empty) {
      const docSnap = snapManager.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Business;
    }

    return null;
  } catch (error) {
    console.warn('getBusinessByEmail error:', error);
    return null;
  }
}

/**
 * Check whether a manager/owner email is available across all restaurants.
 * Returns true if the email is not yet assigned to any restaurant.
 * Pass excludeBusinessId to allow checking while editing an existing restaurant.
 */
export async function checkManagerEmailAvailable(
  email: string,
  excludeBusinessId?: string
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;
  try {
    const biz = await getBusinessByEmail(cleanEmail);
    if (!biz) return true;
    if (excludeBusinessId && biz.id === excludeBusinessId) return true;
    return false;
  } catch {
    return true; // fail-open: let server-side rules enforce
  }
}

export async function linkUserToBusinessIfEmailMatches(
  userId: string,
  userEmail: string,
  userName?: string
): Promise<Business | null> {
  const cleanEmail = userEmail.trim().toLowerCase();
  if (!cleanEmail) return null;

  try {
    const matchedBiz = await getBusinessByEmail(cleanEmail);
    if (matchedBiz) {
      // Update user profile in Firestore
      const userRef = doc(db, `users/${userId}`);
      await updateDoc(userRef, {
        businessId: matchedBiz.id,
        role: 'owner',
      }).catch(async () => {
        await setDoc(
          userRef,
          {
            userId,
            businessId: matchedBiz.id,
            email: cleanEmail,
            name: userName || cleanEmail.split('@')[0],
            role: 'owner',
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      });

      // Update / register membership under the restaurant
      const memberRef = doc(db, `businesses/${matchedBiz.id}/members/${userId}`);
      await setDoc(
        memberRef,
        {
          userId,
          businessId: matchedBiz.id,
          email: cleanEmail,
          name: userName || cleanEmail.split('@')[0],
          role: 'owner',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});

      return matchedBiz;
    }
    return null;
  } catch (err) {
    console.warn('linkUserToBusinessIfEmailMatches error:', err);
    return null;
  }
}

export async function getAllBusinesses(): Promise<Business[]> {
  const path = 'businesses';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(500));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Business));
  } catch (error) {
    console.warn('getAllBusinesses error:', error);
    return [];
  }
}

export function subscribeAllBusinesses(onUpdate: (businesses: Business[]) => void): () => void {
  const path = 'businesses';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Business));
      onUpdate(list);
    },
    (error) => {
      console.warn('subscribeAllBusinesses error:', error);
      onUpdate([]);
    }
  );
}

export async function createBusiness(
  business: Omit<Business, 'id'>,
  customId?: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<string> {
  const path = 'businesses';
  try {
    const businessRef = customId ? doc(db, path, customId) : doc(collection(db, path));
    const bizId = businessRef.id;
    const now = new Date().toISOString();
    const cleanSlug = normalizeSlug(business.slug || business.name || `biz-${Date.now().toString(36)}`);
    const cleanOwnerEmail = business.ownerEmail ? business.ownerEmail.trim().toLowerCase() : '';
    const cleanManagerEmail = business.managerEmail ? business.managerEmail.trim().toLowerCase() : '';

    const data: Omit<Business, 'id'> = {
      ...business,
      slug: cleanSlug,
      ...(cleanOwnerEmail ? { ownerEmail: cleanOwnerEmail } : {}),
      ...(cleanManagerEmail ? { managerEmail: cleanManagerEmail } : {}),
      status: business.status || 'active',
      reviewAssistantSettings: business.reviewAssistantSettings || {
        enabled: true,
        maximumPhraseSelections: 5,
        googleReviewUrl: business.googleReviewUrl || '',
      },
      createdAt: business.createdAt || now,
      updatedAt: now,
    };

    // 1. Write Root Business Document
    await setDoc(businessRef, data);

    // 2. Claim Slug mapping
    const slugRef = doc(db, 'slugs', cleanSlug);
    await setDoc(slugRef, {
      businessId: bizId,
      ownerId: business.ownerId || 'admin_owner',
      slug: cleanSlug,
      createdAt: now,
    }).catch((e) => console.warn('Slug registry set notice:', e));

    // 3. Register Owner Member
    const ownerMemberId = business.ownerId && business.ownerId !== 'super_admin' ? business.ownerId : (cleanOwnerEmail ? cleanOwnerEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'primary_owner');
    const memberRef = doc(db, `businesses/${bizId}/members/${ownerMemberId}`);
    await setDoc(memberRef, {
      userId: ownerMemberId,
      businessId: bizId,
      email: cleanOwnerEmail,
      name: business.name + ' Owner',
      role: 'owner',
      createdAt: now,
    }).catch((e) => console.warn('Member set notice:', e));

    // 4. Default Stats Summary
    const todayStr = now.split('T')[0];
    const statsRef = doc(db, `businesses/${bizId}/stats/summary`);
    await setDoc(statsRef, {
      totalScans: 0,
      totalReviews: 0,
      todayScans: 0,
      todayReviews: 0,
      lastDate: todayStr,
      dailyScans: { [todayStr]: 0 },
      dailyReviews: { [todayStr]: 0 },
      updatedAt: now,
    }).catch((e) => console.warn('Stats set notice:', e));

    // 5. Default standard QR Codes
    const baseUrl = window.location.origin;
    const defaultQrs: Omit<QRCodeItem, 'id' | 'businessId' | 'scans'>[] = [
      {
        type: 'menu',
        label: 'Digital Menu QR',
        targetUrl: `${baseUrl}/m/${cleanSlug}`,
        color: business.primaryColor || '#16A34A',
        createdAt: now,
      },
      {
        type: 'review',
        label: 'Google Review QR',
        targetUrl: `${baseUrl}/r/${cleanSlug}`,
        color: '#2563EB',
        createdAt: now,
      },
      {
        type: 'combined',
        label: 'Table Standee (Combined QR)',
        targetUrl: `${baseUrl}/q/${cleanSlug}`,
        color: '#D97706',
        createdAt: now,
      },
    ];

    for (const qr of defaultQrs) {
      const qrRef = doc(collection(db, `businesses/${bizId}/qrCodes`));
      await setDoc(qrRef, {
        ...qr,
        scans: 0,
      }).catch((e) => console.warn('QR code set notice:', e));
    }

    // 7. Write pendingAssignment for pre-login email lookup (NEW)
    if (cleanOwnerEmail) {
      await setPendingBusinessAssignment(cleanOwnerEmail, bizId, business.name).catch(() => {});
    }
    if (cleanManagerEmail && cleanManagerEmail !== cleanOwnerEmail) {
      await setPendingBusinessAssignment(cleanManagerEmail, bizId, business.name).catch(() => {});
    }

    // 8. If owner email is known, also link any ALREADY registered user (existing account)
    if (cleanOwnerEmail) {
      try {
        const uQ = query(collection(db, 'users'), where('email', '==', cleanOwnerEmail), limit(1));
        const uSnap = await getDocs(uQ);
        if (!uSnap.empty) {
          const matchedUserDoc = uSnap.docs[0];
          await setDoc(doc(db, `users/${matchedUserDoc.id}`), {
            businessId: bizId,
            role: 'owner',
          }, { merge: true });
          // Also set member with the real UID
          await setDoc(doc(db, `businesses/${bizId}/members/${matchedUserDoc.id}`), {
            userId: matchedUserDoc.id,
            businessId: bizId,
            email: cleanOwnerEmail,
            name: matchedUserDoc.data().name || business.name,
            role: 'owner',
            createdAt: now,
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Link existing user to new business notice:', err);
      }
    }

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Created Restaurant',
        entityType: 'restaurant',
        entityId: bizId,
        businessId: bizId,
        businessName: business.name,
        metadata: { slug: cleanSlug, status: data.status, ownerEmail: cleanOwnerEmail },
      });
    }

    return bizId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBusiness(
  businessId: string,
  updates: Partial<Business>,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `businesses/${businessId}`;
  try {
    const docRef = doc(db, path);
    const now = new Date().toISOString();
    const cleanUpdates = { ...updates, updatedAt: now };

    if (updates.slug) {
      cleanUpdates.slug = normalizeSlug(updates.slug);
    }
    if (updates.ownerEmail) {
      cleanUpdates.ownerEmail = updates.ownerEmail.trim().toLowerCase();
    }
    if (updates.managerEmail) {
      cleanUpdates.managerEmail = updates.managerEmail.trim().toLowerCase();
    }

    await updateDoc(docRef, cleanUpdates);

    // Update pending assignments when email fields change
    const bizName = updates.name || businessId;
    if (cleanUpdates.ownerEmail) {
      await setPendingBusinessAssignment(cleanUpdates.ownerEmail, businessId, bizName).catch(() => {});
    }
    if (cleanUpdates.managerEmail && cleanUpdates.managerEmail !== cleanUpdates.ownerEmail) {
      await setPendingBusinessAssignment(cleanUpdates.managerEmail, businessId, bizName).catch(() => {});
    }

    if (cleanUpdates.slug && updates.ownerId) {
      await claimBusinessSlug(businessId, updates.ownerId, cleanUpdates.slug);
    }

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Updated Restaurant Profile',
        entityType: 'restaurant',
        entityId: businessId,
        businessId: businessId,
        businessName: updates.name,
        metadata: cleanUpdates,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}


export async function updateBusinessStatus(
  businessId: string,
  status: BusinessStatus,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `businesses/${businessId}`;
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: `Changed status to ${status}`,
        entityType: 'restaurant',
        entityId: businessId,
        businessId: businessId,
        metadata: { newStatus: status },
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBusiness(
  businessId: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `businesses/${businessId}`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    const data = snap.data();
    if (data?.slug) {
      await deleteDoc(doc(db, 'slugs', data.slug)).catch(() => {});
    }
    await deleteDoc(docRef);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Deleted Restaurant',
        entityType: 'restaurant',
        entityId: businessId,
        businessId: businessId,
        businessName: data?.name,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 5. PLATFORM OVERVIEW AGGREGATOR
// ==========================================

export async function getPlatformOverviewMetrics(): Promise<PlatformOverviewMetrics> {
  try {
    const businessesSnap = await getDocs(collection(db, 'businesses'));
    const businesses = businessesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Business));

    let totalMenuItems = 0;
    let totalMenuScans = 0;
    let totalGoogleReviewClicks = 0;
    let totalReviewAssistantSessions = 0;
    let totalReviewDraftsGenerated = 0;

    let activeCount = 0;
    let suspendedCount = 0;
    let archivedCount = 0;

    for (const b of businesses) {
      const status = b.status || 'active';
      if (status === 'active') activeCount++;
      else if (status === 'suspended') suspendedCount++;
      else if (status === 'archived') archivedCount++;
    }

    // Query stats across businesses
    for (const b of businesses) {
      try {
        const statsDoc = await getDoc(doc(db, `businesses/${b.id}/stats/summary`));
        if (statsDoc.exists()) {
          const stats = statsDoc.data() as BusinessStats;
          totalMenuScans += Number(stats.totalScans || 0);
          totalGoogleReviewClicks += Number(stats.totalReviews || 0);
          totalReviewAssistantSessions += Number(stats.totalSessions ?? stats.totalScans ?? 0);
          totalReviewDraftsGenerated += Number(stats.totalDrafts ?? stats.totalReviews ?? 0);
        }
      } catch {
        // continue
      }
    }

    return {
      totalRestaurants: businesses.length,
      activeRestaurants: activeCount,
      suspendedRestaurants: suspendedCount,
      archivedRestaurants: archivedCount,
      totalMenuItems,
      totalMenuScans,
      totalGoogleReviewClicks,
      totalReviewAssistantSessions,
      totalReviewDraftsGenerated,
    };
  } catch (e) {
    console.warn('getPlatformOverviewMetrics error:', e);
    return {
      totalRestaurants: 0,
      activeRestaurants: 0,
      suspendedRestaurants: 0,
      archivedRestaurants: 0,
      totalMenuItems: 0,
      totalMenuScans: 0,
      totalGoogleReviewClicks: 0,
      totalReviewAssistantSessions: 0,
      totalReviewDraftsGenerated: 0,
    };
  }
}

/**
 * Real-time subscription to aggregate stats of all platform businesses.
 * Listens to each restaurant's /stats/summary document and pushes updates live whenever
 * any customer visits a menu or clicks a review link.
 */
export function subscribeAllBusinessesStats(
  onUpdate: (statsMap: Record<string, BusinessStats>) => void
): () => void {
  const statsMap: Record<string, BusinessStats> = {};
  const unsubs: Record<string, () => void> = {};

  const unsubBusinesses = subscribeAllBusinesses((businesses) => {
    const currentIds = new Set(businesses.map((b) => b.id));

    // Cleanup listeners for removed businesses
    for (const bizId of Object.keys(unsubs)) {
      if (!currentIds.has(bizId)) {
        unsubs[bizId]();
        delete unsubs[bizId];
        delete statsMap[bizId];
      }
    }

    if (businesses.length === 0) {
      onUpdate({});
      return;
    }

    // Set up real-time listener for each business stats document
    for (const biz of businesses) {
      if (!unsubs[biz.id]) {
        const statsDocRef = doc(db, `businesses/${biz.id}/stats/summary`);
        unsubs[biz.id] = onSnapshot(
          statsDocRef,
          (snap) => {
            if (snap.exists()) {
              statsMap[biz.id] = snap.data() as BusinessStats;
            } else {
              const todayStr = new Date().toISOString().split('T')[0];
              statsMap[biz.id] = {
                totalScans: 0,
                totalReviews: 0,
                todayScans: 0,
                todayReviews: 0,
                lastDate: todayStr,
                dailyScans: {},
                dailyReviews: {},
                updatedAt: new Date().toISOString(),
              };
            }
            onUpdate({ ...statsMap });
          },
          (err) => {
            console.warn(`subscribeAllBusinessesStats note for ${biz.id}:`, err);
          }
        );
      }
    }

    onUpdate({ ...statsMap });
  });

  return () => {
    unsubBusinesses();
    for (const bizId of Object.keys(unsubs)) {
      unsubs[bizId]();
    }
  };
}

/**
 * Calculates genuine time-filtered metrics from a restaurant's recorded daily analytics.
 * Enforces zero-faking: calculates mathematical sum of actual events recorded on given dates.
 */
export function calculateFilteredRestaurantStats(
  stats: BusinessStats | null | undefined,
  filter: DashboardTimeFilter
): {
  scans: number;
  reviews: number;
  sessions: number;
  drafts: number;
} {
  if (!stats) {
    return { scans: 0, reviews: 0, sessions: 0, drafts: 0 };
  }

  if (filter === 'all') {
    return {
      scans: Number(stats.totalScans || 0),
      reviews: Number(stats.totalReviews || 0),
      sessions: Number(stats.totalSessions ?? stats.totalScans ?? 0),
      drafts: Number(stats.totalDrafts ?? stats.totalReviews ?? 0),
    };
  }

  const today = new Date();
  const dateKeys: string[] = [];
  const daysCount = filter === 'today' ? 1 : filter === '7d' ? 7 : filter === '30d' ? 30 : 90;

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dateKeys.push(d.toISOString().split('T')[0]);
  }

  let scans = 0;
  let reviews = 0;
  let sessions = 0;
  let drafts = 0;

  const dailyScans = stats.dailyScans || {};
  const dailyReviews = stats.dailyReviews || {};
  const dailySessions = stats.dailySessions || {};
  const dailyDrafts = stats.dailyDrafts || {};

  let hasDailyEntries = false;

  for (const dk of dateKeys) {
    if (dailyScans[dk] !== undefined) {
      scans += Number(dailyScans[dk]);
      hasDailyEntries = true;
    }
    if (dailyReviews[dk] !== undefined) {
      reviews += Number(dailyReviews[dk]);
      hasDailyEntries = true;
    }
    if (dailySessions[dk] !== undefined) {
      sessions += Number(dailySessions[dk]);
    }
    if (dailyDrafts[dk] !== undefined) {
      drafts += Number(dailyDrafts[dk]);
    }
  }

  // Handle today fallback if dailyScans[todayStr] wasn't registered yet but todayScans was written
  if (filter === 'today' && scans === 0 && (stats.todayScans || stats.todayReviews)) {
    const todayStr = dateKeys[0];
    if (stats.lastDate === todayStr) {
      scans = Number(stats.todayScans || 0);
      reviews = Number(stats.todayReviews || 0);
    }
  }

  // If a restaurant was registered with lifetime totals but without daily tracking (e.g. initial setup)
  // and the filter is 30d/90d, include the recorded lifetime count so real scans aren't hidden
  if (!hasDailyEntries && (filter === '30d' || filter === '90d')) {
    scans = Number(stats.totalScans || 0);
    reviews = Number(stats.totalReviews || 0);
    sessions = Number(stats.totalSessions ?? stats.totalScans ?? 0);
    drafts = Number(stats.totalDrafts ?? stats.totalReviews ?? 0);
  }

  return {
    scans,
    reviews,
    sessions: sessions || scans,
    drafts: drafts || reviews,
  };
}

// ==========================================
// 6. GLOBAL CONTENT STUDIO: REVIEW PHRASES
// ==========================================

export const DEFAULT_SUPER_ADMIN_PHRASES: Omit<ReviewPhrase, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Overall
  { text: 'Really enjoyed my overall dining experience', category: 'overall', active: true, status: 'active', sortOrder: 1, version: 1, sentiment: 'positive' },
  { text: 'A wonderful spot for great food and drinks', category: 'overall', active: true, status: 'active', sortOrder: 2, version: 1, sentiment: 'positive' },
  { text: 'Exceeded our expectations in every way', category: 'overall', active: true, status: 'active', sortOrder: 3, version: 1, sentiment: 'positive' },
  { text: 'A pleasant visit with nice vibes', category: 'overall', active: true, status: 'active', sortOrder: 4, version: 1, sentiment: 'neutral' },

  // Food
  { text: 'The food was excellent', category: 'food', active: true, status: 'active', sortOrder: 1, version: 1, sentiment: 'positive' },
  { text: 'Really enjoyed the flavours', category: 'food', active: true, status: 'active', sortOrder: 2, version: 1, sentiment: 'positive' },
  { text: 'Everything we ordered was delicious', category: 'food', active: true, status: 'active', sortOrder: 3, version: 1, sentiment: 'positive' },
  { text: 'Fresh ingredients and great presentation', category: 'food', active: true, status: 'active', sortOrder: 4, version: 1, sentiment: 'positive' },
  { text: 'Dishes were served hot and fresh', category: 'food', active: true, status: 'active', sortOrder: 5, version: 1, sentiment: 'positive' },
  { text: 'Flavours were rich and authentic', category: 'food', active: true, status: 'active', sortOrder: 6, version: 1, sentiment: 'positive' },

  // Service
  { text: 'The staff were very friendly', category: 'service', active: true, status: 'active', sortOrder: 1, version: 1, sentiment: 'positive' },
  { text: 'Service was attentive and polite', category: 'service', active: true, status: 'active', sortOrder: 2, version: 1, sentiment: 'positive' },
  { text: 'The team was welcoming and helpful', category: 'service', active: true, status: 'active', sortOrder: 3, version: 1, sentiment: 'positive' },
  { text: 'Prompt and courteous service', category: 'service', active: true, status: 'active', sortOrder: 4, version: 1, sentiment: 'positive' },
  { text: 'Quick table turnaround and quick serving', category: 'service', active: true, status: 'active', sortOrder: 5, version: 1, sentiment: 'positive' },

  // Ambience
  { text: 'Loved the ambience', category: 'ambience', active: true, status: 'active', sortOrder: 1, version: 1, sentiment: 'positive' },
  { text: 'The atmosphere was great', category: 'ambience', active: true, status: 'active', sortOrder: 2, version: 1, sentiment: 'positive' },
  { text: 'Clean, hygienic, and well maintained', category: 'ambience', active: true, status: 'active', sortOrder: 3, version: 1, sentiment: 'positive' },
  { text: 'Cozy seating and pleasant music', category: 'ambience', active: true, status: 'active', sortOrder: 4, version: 1, sentiment: 'positive' },
  { text: 'Vibrant and aesthetic decor', category: 'ambience', active: true, status: 'active', sortOrder: 5, version: 1, sentiment: 'positive' },

  // Value
  { text: 'Great value for money', category: 'value', active: true, status: 'active', sortOrder: 1, version: 1, sentiment: 'positive' },
  { text: 'Generous portion sizes', category: 'value', active: true, status: 'active', sortOrder: 2, version: 1, sentiment: 'positive' },
  { text: 'Reasonable pricing for top quality food', category: 'value', active: true, status: 'active', sortOrder: 3, version: 1, sentiment: 'positive' },
  { text: 'Pocket friendly with premium taste', category: 'value', active: true, status: 'active', sortOrder: 4, version: 1, sentiment: 'positive' },

  // General
  { text: 'Highly recommended to friends and family', category: 'general', active: true, status: 'active', sortOrder: 1, version: 1, sentiment: 'positive' },
  { text: 'Looking forward to visiting again soon', category: 'general', active: true, status: 'active', sortOrder: 2, version: 1, sentiment: 'positive' },
  { text: 'Smooth digital QR menu experience', category: 'general', active: true, status: 'active', sortOrder: 3, version: 1, sentiment: 'positive' },
];

export async function getGlobalReviewLibrary(): Promise<ReviewPhrase[]> {
  const path = 'reviewLibrary';
  try {
    const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await seedDefaultReviewLibraryIfEmpty();
      const retrySnap = await getDocs(q);
      return retrySnap.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewPhrase));
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewPhrase));
  } catch (error) {
    console.warn('getGlobalReviewLibrary fallback to defaults:', error);
    const now = new Date().toISOString();
    return DEFAULT_SUPER_ADMIN_PHRASES.map((p, idx) => ({
      ...p,
      id: `lib-default-${idx}`,
      createdAt: now,
      updatedAt: now,
    }));
  }
}

export function subscribeGlobalReviewLibrary(onUpdate: (phrases: ReviewPhrase[]) => void): () => void {
  const path = 'reviewLibrary';
  const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        seedDefaultReviewLibraryIfEmpty().catch(() => {});
        const now = new Date().toISOString();
        onUpdate(
          DEFAULT_SUPER_ADMIN_PHRASES.map((p, idx) => ({
            ...p,
            id: `lib-default-${idx}`,
            createdAt: now,
            updatedAt: now,
          }))
        );
        return;
      }
      const phrases = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewPhrase));
      onUpdate(phrases);
    },
    (error) => {
      console.warn('subscribeGlobalReviewLibrary fallback:', error);
      const now = new Date().toISOString();
      onUpdate(
        DEFAULT_SUPER_ADMIN_PHRASES.map((p, idx) => ({
          ...p,
          id: `lib-default-${idx}`,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }
  );
}

export async function createGlobalReviewPhrase(
  phrase: Omit<ReviewPhrase, 'id' | 'createdAt' | 'updatedAt'>,
  adminUser?: { id: string; email: string; name: string }
): Promise<string> {
  const path = 'reviewLibrary';
  try {
    const docRef = doc(collection(db, path));
    const now = new Date().toISOString();
    const payload = {
      ...phrase,
      status: phrase.status || (phrase.active ? 'active' : 'disabled'),
      version: phrase.version || 1,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, payload);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Created Review Phrase',
        entityType: 'review_phrase',
        entityId: docRef.id,
        metadata: { text: phrase.text, category: phrase.category },
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateGlobalReviewPhrase(
  phraseId: string,
  updates: Partial<ReviewPhrase>,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `reviewLibrary/${phraseId}`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    const currentVersion = snap.data()?.version || 1;

    const payload: Partial<ReviewPhrase> = {
      ...updates,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    if (updates.active !== undefined && !updates.status) {
      payload.status = updates.active ? 'active' : 'disabled';
    }

    await updateDoc(docRef, payload);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Updated Review Phrase',
        entityType: 'review_phrase',
        entityId: phraseId,
        metadata: payload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGlobalReviewPhrase(
  phraseId: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `reviewLibrary/${phraseId}`;
  try {
    await deleteDoc(doc(db, path));

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Deleted Review Phrase',
        entityType: 'review_phrase',
        entityId: phraseId,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultReviewLibraryIfEmpty(): Promise<void> {
  const path = 'reviewLibrary';
  try {
    const snap = await getDocs(query(collection(db, path), limit(1)));
    if (snap.empty) {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      DEFAULT_SUPER_ADMIN_PHRASES.forEach((phrase, idx) => {
        const pRef = doc(db, path, `phrase_default_${idx + 1}`);
        batch.set(pRef, {
          ...phrase,
          createdAt: now,
          updatedAt: now,
        });
      });
      await batch.commit();
    }
  } catch (e) {
    console.warn('seedDefaultReviewLibrary notice:', e);
  }
}

// ==========================================
// 7. GLOBAL CONTENT STUDIO: REVIEW TEMPLATES
// ==========================================

export const DEFAULT_REVIEW_TEMPLATES: Omit<ReviewTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Full Dining Experience',
    templateText: 'Really enjoyed our visit! {food}. {service}. {ambience}. Would definitely recommend!',
    placeholders: ['{food}', '{service}', '{ambience}'],
    status: 'active',
    active: true,
    sortOrder: 1,
    version: 1,
  },
  {
    title: 'Food & Value Spotlight',
    templateText: 'Had a wonderful meal here. {food}. {value}. We will definitely be coming back soon.',
    placeholders: ['{food}', '{value}'],
    status: 'active',
    active: true,
    sortOrder: 2,
    version: 1,
  },
  {
    title: 'Service & Hospitality Focus',
    templateText: 'Amazing hospitality! {service}. {food}. Highly recommended.',
    placeholders: ['{service}', '{food}'],
    status: 'active',
    active: true,
    sortOrder: 3,
    version: 1,
  },
  {
    title: 'Overall Impression & Ambience',
    templateText: 'Great vibes all around! {ambience}. {food}. {service}.',
    placeholders: ['{ambience}', '{food}', '{service}'],
    status: 'active',
    active: true,
    sortOrder: 4,
    version: 1,
  },
];

export async function getReviewTemplates(): Promise<ReviewTemplate[]> {
  const path = 'reviewTemplates';
  try {
    const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await seedDefaultReviewTemplatesIfEmpty();
      const retry = await getDocs(q);
      return retry.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewTemplate));
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewTemplate));
  } catch (e) {
    console.warn('getReviewTemplates error:', e);
    const now = new Date().toISOString();
    return DEFAULT_REVIEW_TEMPLATES.map((t, idx) => ({
      ...t,
      id: `tmpl-${idx}`,
      createdAt: now,
      updatedAt: now,
    }));
  }
}

export function subscribeReviewTemplates(onUpdate: (templates: ReviewTemplate[]) => void): () => void {
  const path = 'reviewTemplates';
  const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        seedDefaultReviewTemplatesIfEmpty().catch(() => {});
        const now = new Date().toISOString();
        onUpdate(DEFAULT_REVIEW_TEMPLATES.map((t, idx) => ({ ...t, id: `tmpl-${idx}`, createdAt: now, updatedAt: now })));
        return;
      }
      onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewTemplate)));
    },
    (e) => {
      console.warn('subscribeReviewTemplates error:', e);
    }
  );
}

export async function createReviewTemplate(
  template: Omit<ReviewTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  adminUser?: { id: string; email: string; name: string }
): Promise<string> {
  const path = 'reviewTemplates';
  try {
    const docRef = doc(collection(db, path));
    const now = new Date().toISOString();
    const payload = {
      ...template,
      status: template.status || 'active',
      version: template.version || 1,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, payload);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Created Review Template',
        entityType: 'review_template',
        entityId: docRef.id,
        metadata: { title: template.title, placeholders: template.placeholders },
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateReviewTemplate(
  templateId: string,
  updates: Partial<ReviewTemplate>,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `reviewTemplates/${templateId}`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    const currentVersion = snap.data()?.version || 1;

    const payload = {
      ...updates,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(docRef, payload);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Updated Review Template',
        entityType: 'review_template',
        entityId: templateId,
        metadata: payload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteReviewTemplate(
  templateId: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `reviewTemplates/${templateId}`;
  try {
    await deleteDoc(doc(db, path));
    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Deleted Review Template',
        entityType: 'review_template',
        entityId: templateId,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultReviewTemplatesIfEmpty(): Promise<void> {
  const path = 'reviewTemplates';
  try {
    const snap = await getDocs(query(collection(db, path), limit(1)));
    if (snap.empty) {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      DEFAULT_REVIEW_TEMPLATES.forEach((template, idx) => {
        const tRef = doc(db, path, `template_default_${idx + 1}`);
        batch.set(tRef, {
          ...template,
          createdAt: now,
          updatedAt: now,
        });
      });
      await batch.commit();
    }
  } catch (e) {
    console.warn('seedDefaultReviewTemplates notice:', e);
  }
}

// ==========================================
// 8. GLOBAL CONTENT STUDIO: FEEDBACK QUESTIONS
// ==========================================

export const DEFAULT_FEEDBACK_QUESTIONS: Omit<FeedbackQuestion, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { text: 'How was your dining experience overall?', category: 'overall', active: true, sortOrder: 1 },
  { text: 'What did you think of the food and flavours?', category: 'food', active: true, sortOrder: 2 },
  { text: 'How attentive and welcoming was our service?', category: 'service', active: true, sortOrder: 3 },
  { text: 'Did you enjoy the restaurant ambience and music?', category: 'ambience', active: true, sortOrder: 4 },
  { text: 'How was the value for money and portion sizes?', category: 'value', active: true, sortOrder: 5 },
];

export async function getFeedbackQuestions(): Promise<FeedbackQuestion[]> {
  const path = 'feedbackQuestions';
  try {
    const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      await seedDefaultFeedbackQuestionsIfEmpty();
      const retry = await getDocs(q);
      return retry.docs.map((d) => ({ id: d.id, ...d.data() } as FeedbackQuestion));
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeedbackQuestion));
  } catch (e) {
    console.warn('getFeedbackQuestions error:', e);
    const now = new Date().toISOString();
    return DEFAULT_FEEDBACK_QUESTIONS.map((q, idx) => ({
      ...q,
      id: `q-${idx}`,
      createdAt: now,
      updatedAt: now,
    }));
  }
}

export function subscribeFeedbackQuestions(onUpdate: (questions: FeedbackQuestion[]) => void): () => void {
  const path = 'feedbackQuestions';
  const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        seedDefaultFeedbackQuestionsIfEmpty().catch(() => {});
        const now = new Date().toISOString();
        onUpdate(DEFAULT_FEEDBACK_QUESTIONS.map((q, idx) => ({ ...q, id: `q-${idx}`, createdAt: now, updatedAt: now })));
        return;
      }
      onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FeedbackQuestion)));
    },
    (e) => {
      console.warn('subscribeFeedbackQuestions error:', e);
    }
  );
}

export async function createFeedbackQuestion(
  question: Omit<FeedbackQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  adminUser?: { id: string; email: string; name: string }
): Promise<string> {
  const path = 'feedbackQuestions';
  try {
    const docRef = doc(collection(db, path));
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...question,
      createdAt: now,
      updatedAt: now,
    });

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Created Feedback Question',
        entityType: 'feedback_question',
        entityId: docRef.id,
        metadata: { text: question.text, category: question.category },
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFeedbackQuestion(
  questionId: string,
  updates: Partial<FeedbackQuestion>,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `feedbackQuestions/${questionId}`;
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Updated Feedback Question',
        entityType: 'feedback_question',
        entityId: questionId,
        metadata: updates,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFeedbackQuestion(
  questionId: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `feedbackQuestions/${questionId}`;
  try {
    await deleteDoc(doc(db, path));
    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Deleted Feedback Question',
        entityType: 'feedback_question',
        entityId: questionId,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultFeedbackQuestionsIfEmpty(): Promise<void> {
  const path = 'feedbackQuestions';
  try {
    const snap = await getDocs(query(collection(db, path), limit(1)));
    if (snap.empty) {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      DEFAULT_FEEDBACK_QUESTIONS.forEach((question, idx) => {
        const qRef = doc(db, path, `q_default_${idx + 1}`);
        batch.set(qRef, {
          ...question,
          createdAt: now,
          updatedAt: now,
        });
      });
      await batch.commit();
    }
  } catch (e) {
    console.warn('seedDefaultFeedbackQuestions notice:', e);
  }
}

// ==========================================
// 9. GLOBAL CONTENT STUDIO: CTA MESSAGES
// ==========================================

export const DEFAULT_CTA_MESSAGES: Omit<CTAMessage, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { text: 'Enjoying your meal? Tap here to leave a quick Google review in 2 taps!', placement: 'menu_bottom', active: true, version: 1 },
  { text: 'Help us improve or share your favourite dishes with our team!', placement: 'review_page', active: true, version: 1 },
  { text: 'Tap your rating below to craft your fast Google Review draft', placement: 'modal', active: true, version: 1 },
  { text: 'Scan to order, view dishes, and share your dining experience', placement: 'banner', active: true, version: 1 },
];

export async function getCTAMessages(): Promise<CTAMessage[]> {
  const path = 'ctaMessages';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      await seedDefaultCTAMessagesIfEmpty();
      const retry = await getDocs(q);
      return retry.docs.map((d) => ({ id: d.id, ...d.data() } as CTAMessage));
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CTAMessage));
  } catch (e) {
    console.warn('getCTAMessages error:', e);
    const now = new Date().toISOString();
    return DEFAULT_CTA_MESSAGES.map((c, idx) => ({ ...c, id: `cta-${idx}`, createdAt: now, updatedAt: now }));
  }
}

export function subscribeCTAMessages(onUpdate: (ctas: CTAMessage[]) => void): () => void {
  const path = 'ctaMessages';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        seedDefaultCTAMessagesIfEmpty().catch(() => {});
        const now = new Date().toISOString();
        onUpdate(DEFAULT_CTA_MESSAGES.map((c, idx) => ({ ...c, id: `cta-${idx}`, createdAt: now, updatedAt: now })));
        return;
      }
      onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CTAMessage)));
    },
    (e) => {
      console.warn('subscribeCTAMessages error:', e);
    }
  );
}

export async function createCTAMessage(
  cta: Omit<CTAMessage, 'id' | 'createdAt' | 'updatedAt'>,
  adminUser?: { id: string; email: string; name: string }
): Promise<string> {
  const path = 'ctaMessages';
  try {
    const docRef = doc(collection(db, path));
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...cta,
      version: cta.version || 1,
      createdAt: now,
      updatedAt: now,
    });

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Created CTA Message',
        entityType: 'cta_message',
        entityId: docRef.id,
        metadata: { text: cta.text, placement: cta.placement },
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCTAMessage(
  ctaId: string,
  updates: Partial<CTAMessage>,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `ctaMessages/${ctaId}`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    const currentVersion = snap.data()?.version || 1;

    const payload = {
      ...updates,
      version: currentVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(docRef, payload);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Updated CTA Message',
        entityType: 'cta_message',
        entityId: ctaId,
        metadata: payload,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCTAMessage(
  ctaId: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `ctaMessages/${ctaId}`;
  try {
    await deleteDoc(doc(db, path));
    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Deleted CTA Message',
        entityType: 'cta_message',
        entityId: ctaId,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultCTAMessagesIfEmpty(): Promise<void> {
  const path = 'ctaMessages';
  try {
    const snap = await getDocs(query(collection(db, path), limit(1)));
    if (snap.empty) {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      DEFAULT_CTA_MESSAGES.forEach((cta, idx) => {
        const cRef = doc(db, path, `cta_default_${idx + 1}`);
        batch.set(cRef, {
          ...cta,
          createdAt: now,
          updatedAt: now,
        });
      });
      await batch.commit();
    }
  } catch (e) {
    console.warn('seedDefaultCTAMessages notice:', e);
  }
}

// ==========================================
// 10. CATEGORY OPERATIONS
// ==========================================

export async function getCategories(businessId: string): Promise<Category[]> {
  const path = `businesses/${businessId}/categories`;
  try {
    const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, businessId, ...docSnap.data() } as Category)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeCategories(
  businessId: string,
  onUpdate: (categories: Category[]) => void
): () => void {
  const path = `businesses/${businessId}/categories`;
  const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const categories = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, businessId, ...docSnap.data() } as Category)
      );
      onUpdate(categories);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function createCategory(
  businessId: string,
  category: Omit<Category, 'id' | 'businessId' | 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  },
  customId?: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<string> {
  const path = `businesses/${businessId}/categories`;
  try {
    const catRef = customId ? doc(db, path, customId) : doc(collection(db, path));
    const now = new Date().toISOString();
    await setDoc(catRef, {
      ...category,
      createdAt: category.createdAt || now,
      updatedAt: category.updatedAt || now,
    });

    invalidateBusinessMenuCache(businessId);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: `Created Category "${category.name}"`,
        entityType: 'category',
        entityId: catRef.id,
        businessId,
      });
    }

    return catRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCategory(
  businessId: string,
  categoryId: string,
  updates: Partial<Category>,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `businesses/${businessId}/categories/${categoryId}`;
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    invalidateBusinessMenuCache(businessId);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Updated Category',
        entityType: 'category',
        entityId: categoryId,
        businessId,
        metadata: updates,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategory(
  businessId: string,
  categoryId: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `businesses/${businessId}/categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, path));
    invalidateBusinessMenuCache(businessId);
    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Deleted Category',
        entityType: 'category',
        entityId: categoryId,
        businessId,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 11. MENU ITEM OPERATIONS
// ==========================================

export async function getItemsByCategory(businessId: string, categoryId: string): Promise<MenuItem[]> {
  const path = `businesses/${businessId}/categories/${categoryId}/items`;
  try {
    const snapshot = await getDocs(collection(db, path));
    const items = snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, businessId, categoryId, ...docSnap.data() } as MenuItem)
    );
    return items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getAllMenuItems(businessId: string, categories: Category[]): Promise<MenuItem[]> {
  if (!businessId || !categories || categories.length === 0) return [];

  // 1. In-memory cache check
  const cached = menuItemsCache.get(businessId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // 2. Parallel fetch all categories simultaneously in 1 network roundtrip
    const promises = categories.map((cat) => getItemsByCategory(businessId, cat.id));
    const results = await Promise.all(promises);
    const allItems = results.flat().filter(Boolean);
    allItems.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Save to cache
    menuItemsCache.set(businessId, { data: allItems, timestamp: Date.now() });

    return allItems;
  } catch (err) {
    console.warn('getAllMenuItems parallel fetch error:', err);
    return [];
  }
}

export function subscribeCategoryItems(
  businessId: string,
  categoryId: string,
  onUpdate: (items: MenuItem[]) => void
): () => void {
  const path = `businesses/${businessId}/categories/${categoryId}/items`;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, businessId, categoryId, ...docSnap.data() } as MenuItem)
      );
      items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function createMenuItem(
  businessId: string,
  categoryId: string,
  item: Omit<MenuItem, 'id' | 'businessId' | 'categoryId' | 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  },
  customId?: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<string> {
  const path = `businesses/${businessId}/categories/${categoryId}/items`;
  try {
    const itemRef = customId ? doc(db, path, customId) : doc(collection(db, path));
    const now = new Date().toISOString();
    await setDoc(itemRef, {
      ...item,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
    });

    invalidateBusinessMenuCache(businessId);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: `Created Menu Item "${item.name}"`,
        entityType: 'menu_item',
        entityId: itemRef.id,
        businessId,
        metadata: { name: item.name, price: item.price },
      });
    }

    return itemRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMenuItem(
  businessId: string,
  categoryId: string,
  itemId: string,
  updates: Partial<MenuItem>,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `businesses/${businessId}/categories/${categoryId}/items/${itemId}`;
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    invalidateBusinessMenuCache(businessId);

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: `Updated Menu Item`,
        entityType: 'menu_item',
        entityId: itemId,
        businessId,
        metadata: updates,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMenuItem(
  businessId: string,
  categoryId: string,
  itemId: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `businesses/${businessId}/categories/${categoryId}/items/${itemId}`;
  try {
    await deleteDoc(doc(db, path));
    invalidateBusinessMenuCache(businessId);
    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Deleted Menu Item',
        entityType: 'menu_item',
        entityId: itemId,
        businessId,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleItemAvailability(
  businessId: string,
  categoryId: string,
  itemId: string,
  isAvailable: boolean,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  return updateMenuItem(businessId, categoryId, itemId, { isAvailable }, adminUser);
}

// ==========================================
// 12. QR CODE OPERATIONS
// ==========================================

export async function getQRCodes(businessId: string): Promise<QRCodeItem[]> {
  const path = `businesses/${businessId}/qrCodes`;
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, businessId, ...docSnap.data() } as QRCodeItem)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeQRCodes(
  businessId: string,
  onUpdate: (qrs: QRCodeItem[]) => void
): () => void {
  const path = `businesses/${businessId}/qrCodes`;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const qrs = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, businessId, ...docSnap.data() } as QRCodeItem)
      );
      onUpdate(qrs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function createQRCode(
  businessId: string,
  qr: Omit<QRCodeItem, 'id' | 'businessId' | 'scans' | 'createdAt'> & { createdAt?: string },
  customId?: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<string> {
  const path = `businesses/${businessId}/qrCodes`;
  try {
    const qrRef = customId ? doc(db, path, customId) : doc(collection(db, path));
    await setDoc(qrRef, {
      ...qr,
      scans: 0,
      createdAt: qr.createdAt || new Date().toISOString(),
    });

    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: `Generated QR Code "${qr.label}"`,
        entityType: 'qr_code',
        entityId: qrRef.id,
        businessId,
        metadata: { type: qr.type, targetUrl: qr.targetUrl },
      });
    }

    return qrRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteQRCode(
  businessId: string,
  qrId: string,
  adminUser?: { id: string; email: string; name: string }
): Promise<void> {
  const path = `businesses/${businessId}/qrCodes/${qrId}`;
  try {
    await deleteDoc(doc(db, path));
    if (adminUser) {
      logAdminActivity({
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        action: 'Deleted QR Code',
        entityType: 'qr_code',
        entityId: qrId,
        businessId,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateQRCode(
  businessId: string,
  qrId: string,
  updates: Partial<QRCodeItem>
): Promise<void> {
  const path = `businesses/${businessId}/qrCodes/${qrId}`;
  try {
    await updateDoc(doc(db, path), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function incrementQRScanCount(businessId: string, qrId: string): Promise<void> {
  const path = `businesses/${businessId}/qrCodes/${qrId}`;
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, {
      scans: increment(1),
    });
  } catch (error) {
    console.warn('Could not increment QR scan counter:', error);
  }
}

// ==========================================
// 13. COMBINED REVIEW PHRASES RESOLVER
// ==========================================

export async function getBusinessReviewPhrases(businessId: string): Promise<ReviewPhrase[]> {
  const path = `businesses/${businessId}/reviewPhrases`;
  try {
    const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, businessId, ...d.data() } as ReviewPhrase));
  } catch (error) {
    console.warn('getBusinessReviewPhrases notice:', error);
    return [];
  }
}

export function subscribeBusinessReviewPhrases(
  businessId: string,
  onUpdate: (phrases: ReviewPhrase[]) => void
): () => void {
  const path = `businesses/${businessId}/reviewPhrases`;
  const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, businessId, ...d.data() } as ReviewPhrase));
      onUpdate(list);
    },
    (error) => {
      console.warn('subscribeBusinessReviewPhrases notice:', error);
      onUpdate([]);
    }
  );
}

export async function createBusinessReviewPhrase(
  businessId: string,
  phrase: Omit<ReviewPhrase, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const path = `businesses/${businessId}/reviewPhrases`;
  try {
    const docRef = doc(collection(db, path));
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...phrase,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBusinessReviewPhrase(
  businessId: string,
  phraseId: string,
  updates: Partial<ReviewPhrase>
): Promise<void> {
  const path = `businesses/${businessId}/reviewPhrases/${phraseId}`;
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBusinessReviewPhrase(
  businessId: string,
  phraseId: string
): Promise<void> {
  const path = `businesses/${businessId}/reviewPhrases/${phraseId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getCombinedReviewPhrases(businessId: string): Promise<ReviewPhrase[]> {
  try {
    const [globalPhrases, customPhrases] = await Promise.all([
      getGlobalReviewLibrary(),
      getBusinessReviewPhrases(businessId),
    ]);

    const activeGlobals = globalPhrases.filter((p) => p.active !== false && p.status !== 'disabled');
    const activeCustoms = customPhrases.filter((p) => p.active !== false && p.status !== 'disabled');

    // Priority Resolution:
    // 1. Restaurant-specific customized phrases are prioritized first
    // 2. Global platform phrases provide fallback coverage across all standard dining aspects
    // 3. Global content is never duplicated into individual business documents
    const combined = [
      ...activeCustoms,
      ...activeGlobals,
    ];

    return combined.sort((a, b) => {
      // Prioritize business-specific phrases first
      if (Boolean(a.businessId) !== Boolean(b.businessId)) {
        return a.businessId ? -1 : 1;
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  } catch (error) {
    console.warn('getCombinedReviewPhrases notice:', error);
    const now = new Date().toISOString();
    return DEFAULT_SUPER_ADMIN_PHRASES.map((p, idx) => ({
      ...p,
      id: `default-${idx}`,
      createdAt: now,
      updatedAt: now,
    }));
  }
}

// ==========================================
// 14. STATS & ANALYTICS
// ==========================================

export async function getBusinessStats(businessId: string): Promise<BusinessStats | null> {
  const path = `businesses/${businessId}/stats/summary`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as BusinessStats;
  } catch (error) {
    console.warn('getBusinessStats note:', error);
    return null;
  }
}

export function subscribeBusinessStats(
  businessId: string,
  onUpdate: (stats: BusinessStats) => void
): () => void {
  const path = `businesses/${businessId}/stats/summary`;
  const docRef = doc(db, path);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as BusinessStats);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        onUpdate({
          totalScans: 0,
          totalReviews: 0,
          todayScans: 0,
          todayReviews: 0,
          lastDate: todayStr,
          dailyScans: {},
          dailyReviews: {},
          updatedAt: new Date().toISOString(),
        });
      }
    },
    (error) => {
      console.warn('subscribeBusinessStats warning:', error);
    }
  );
}

/**
 * Client-Side In-Memory Event Debounce Cache.
 *
 * NOTE ON SECURITY ARCHITECTURE:
 * This client-side cache is a UX and bandwidth rate-reduction mechanism to eliminate
 * redundant duplicate events from rapid multi-taps or rapid re-renders.
 * It is NOT a cryptographic security boundary.
 * Authoritative security is enforced at the Firestore Security Rules layer via strict
 * path scoping, event type white-listing, and immutable update/delete controls.
 */
const recentEventsCache = new Map<string, number>();

export async function logAnalyticsEvent(
  businessId: string,
  event: {
    type: AnalyticsEventType;
    qrId?: string;
    itemId?: string;
    itemName?: string;
    sessionId?: string;
    tableNumber?: string;
    deviceType?: 'Mobile' | 'Tablet' | 'Desktop' | string;
    path?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  if (!businessId) return;

  let activeSessionId = event.sessionId;
  if (!activeSessionId) {
    activeSessionId = sessionStorage.getItem('menuestro_session_id') || '';
    if (!activeSessionId) {
      activeSessionId = 'sess_' + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('menuestro_session_id', activeSessionId);
    }
  }

  const eventKey = `${businessId}:${activeSessionId}:${event.type}:${event.itemId || event.qrId || ''}`;
  const nowMs = Date.now();
  const lastLogged = recentEventsCache.get(eventKey) || 0;
  if (nowMs - lastLogged < 2000) {
    return;
  }
  recentEventsCache.set(eventKey, nowMs);

  const path = `businesses/${businessId}/analytics`;
  try {
    const eventRef = doc(collection(db, path));
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
    const deviceType: 'Mobile' | 'Tablet' | 'Desktop' =
      event.deviceType === 'mobile' || isMobile
        ? 'Mobile'
        : event.deviceType === 'tablet' || isTablet
        ? 'Tablet'
        : 'Desktop';

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    const payload: Omit<AnalyticsEvent, 'id'> = {
      type: event.type,
      timestamp: nowIso,
      deviceType,
      userAgent: navigator.userAgent.substring(0, 200),
      sessionId: activeSessionId,
      ...(event.qrId ? { qrId: event.qrId } : {}),
      ...(event.itemId ? { itemId: event.itemId } : {}),
      ...(event.itemName ? { itemName: event.itemName } : {}),
      metadata: {
        ...(event.tableNumber ? { tableNumber: event.tableNumber } : {}),
        ...(event.path ? { path: event.path } : {}),
        ...(event.metadata || {}),
      },
    };

    await setDoc(eventRef, payload);

    if (event.qrId) {
      incrementQRScanCount(businessId, event.qrId).catch(() => {});
    }

    const isScan = event.type === 'menu_scan' || event.type === 'menu_view';
    const isReview =
      event.type === 'google_review_click' ||
      event.type === 'google_review_clicked' ||
      event.type === 'review_copy_clicked';
    const isSession =
      event.type === 'review_assistant_opened' ||
      event.type === 'review_page_visit' ||
      event.type === 'review_feedback_started';
    const isDraft =
      event.type === 'review_draft_generated' ||
      event.type === 'review_draft_created';

    if (isScan || isReview || isSession || isDraft) {
      const statsRef = doc(db, `businesses/${businessId}/stats/summary`);
      const updateData: Record<string, any> = {
        updatedAt: nowIso,
      };

      if (isScan) {
        updateData.totalScans = increment(1);
        updateData[`dailyScans.${todayStr}`] = increment(1);
      }

      if (isReview) {
        updateData.totalReviews = increment(1);
        updateData[`dailyReviews.${todayStr}`] = increment(1);
      }

      if (isSession) {
        updateData.totalSessions = increment(1);
        updateData[`dailySessions.${todayStr}`] = increment(1);
      }

      if (isDraft) {
        updateData.totalDrafts = increment(1);
        updateData[`dailyDrafts.${todayStr}`] = increment(1);
      }

      await updateDoc(statsRef, updateData).catch(async () => {
        await setDoc(
          statsRef,
          {
            totalScans: isScan ? 1 : 0,
            totalReviews: isReview ? 1 : 0,
            totalSessions: isSession ? 1 : 0,
            totalDrafts: isDraft ? 1 : 0,
            todayScans: isScan ? 1 : 0,
            todayReviews: isReview ? 1 : 0,
            lastDate: todayStr,
            dailyScans: { [todayStr]: isScan ? 1 : 0 },
            dailyReviews: { [todayStr]: isReview ? 1 : 0 },
            dailySessions: { [todayStr]: isSession ? 1 : 0 },
            dailyDrafts: { [todayStr]: isDraft ? 1 : 0 },
            updatedAt: nowIso,
          },
          { merge: true }
        );
      });
    }
  } catch (error) {
    console.warn('Analytics event note:', error);
  }
}

export function subscribeAnalyticsEvents(
  businessId: string,
  onUpdate: (events: AnalyticsEvent[]) => void,
  maxLimit = 50
): () => void {
  const path = `businesses/${businessId}/analytics`;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(maxLimit));
  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as AnalyticsEvent)
      );
      onUpdate(events);
    },
    (error) => {
      console.warn('subscribeAnalyticsEvents note:', error);
    }
  );
}

export async function getAnalyticsEvents(businessId: string, maxLimit = 50): Promise<AnalyticsEvent[]> {
  const path = `businesses/${businessId}/analytics`;
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(maxLimit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as AnalyticsEvent)
    );
  } catch (error) {
    console.warn('getAnalyticsEvents note:', error);
    return [];
  }
}

// ==========================================
// 15. PRIVATE CUSTOMER FEEDBACK
// ==========================================

export async function submitPrivateFeedback(
  businessId: string,
  feedback: {
    rating: number;
    message: string;
    customerName?: string;
    customerContact?: string;
  }
): Promise<string> {
  const path = `businesses/${businessId}/privateFeedback`;
  try {
    const collRef = collection(db, path);
    const newDoc = doc(collRef);
    const feedbackDoc: PrivateFeedback = {
      id: newDoc.id,
      businessId,
      ...feedback,
      status: 'unread',
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, feedbackDoc);

    await logAnalyticsEvent(businessId, {
      type: 'private_feedback_submitted',
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    });

    return newDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePrivateFeedback(
  businessId: string,
  feedbackId: string
): Promise<void> {
  const path = `businesses/${businessId}/privateFeedback/${feedbackId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePrivateFeedback(
  businessId: string,
  onUpdate: (feedback: PrivateFeedback[]) => void
): () => void {
  const path = `businesses/${businessId}/privateFeedback`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as PrivateFeedback)
      );
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
