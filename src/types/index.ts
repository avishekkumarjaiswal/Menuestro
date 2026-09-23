/**
 * Menuestro Multi-Tenant Data Models and Type Definitions
 * Centrally Managed Super Admin Platform & High-Scale Architecture
 */

export type UserRole = 'super_admin' | 'content_admin' | 'support_admin' | 'owner' | 'manager' | 'staff';
export type PlatformAdminRole = 'super_admin' | 'content_admin' | 'support_admin';
export type BusinessRole = 'owner' | 'manager' | 'staff';

export interface AdminUserRecord {
  userId: string;
  email: string;
  name?: string;
  role: PlatformAdminRole;
  active: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface UserProfile {
  userId: string;
  businessId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface BusinessMember {
  userId: string;
  businessId: string;
  email: string;
  name: string;
  role: BusinessRole;
  invitedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SlugMapping {
  businessId: string;
  ownerId: string;
  slug: string;
  createdAt: string;
}

export type ReviewPhraseCategory = 'overall' | 'food' | 'service' | 'ambience' | 'value' | 'general';
export type ContentStatus = 'draft' | 'active' | 'disabled';

export interface ReviewPhrase {
  id: string;
  text: string;
  category: ReviewPhraseCategory;
  active: boolean;
  status?: ContentStatus;
  sortOrder: number;
  version?: number;
  businessId?: string; // If undefined, it is a global Super Admin library phrase.
  sentiment?: 'positive' | 'neutral' | 'constructive';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTemplate {
  id: string;
  title: string;
  templateText: string;
  placeholders: string[]; // e.g. ['{food}', '{service}', '{ambience}']
  status: ContentStatus;
  active: boolean;
  sortOrder: number;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackQuestion {
  id: string;
  text: string;
  category: ReviewPhraseCategory;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type CTAPlacement = 'menu_bottom' | 'review_page' | 'banner' | 'modal';

export interface CTAMessage {
  id: string;
  text: string;
  placement: CTAPlacement;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAssistantSettings {
  enabled: boolean;
  googleReviewUrl?: string;
  maximumPhraseSelections: number;
}

export type BusinessStatus = 'active' | 'suspended' | 'archived';

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  tagline?: string;
  country?: string;
  countryCode?: string;
  currencyCode?: string;
  currencySymbol?: string;
  currency?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  phone?: string;
  address?: string;
  googleMapsUrl?: string;
  googleReviewUrl?: string;
  primaryColor?: string;
  googleRating?: number;
  ratingCount?: number;
  status?: BusinessStatus;
  ownerEmail?: string;
  managerEmail?: string;
  reviewAssistantSettings?: ReviewAssistantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessPrivateSettings {
  businessId: string;
  billingPlan: 'free' | 'starter' | 'pro' | 'enterprise';
  maxItemsLimit: number;
  maxQRsLimit: number;
  internalNotes?: string;
  updatedAt: string;
}

export interface BusinessStats {
  totalScans: number;
  totalReviews: number;
  todayScans: number;
  todayReviews: number;
  totalSessions?: number;
  totalDrafts?: number;
  lastDate: string; // e.g. "2026-09-23"
  dailyScans: Record<string, number>;
  dailyReviews: Record<string, number>;
  dailySessions?: Record<string, number>;
  dailyDrafts?: Record<string, number>;
  updatedAt: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MenuItemTag = 'Bestseller' | 'Chef\'s Special' | 'Vegetarian' | 'Vegan' | 'Spicy' | 'Gluten-Free' | 'New';

export interface MenuItem {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  sortOrder: number;
  tags?: MenuItemTag[];
  ingredients?: string[];
  createdAt: string;
  updatedAt: string;
}

export type QRCodeType = 'menu' | 'review' | 'combined';

export interface QRCodeItem {
  id: string;
  businessId: string;
  type: QRCodeType;
  label: string;
  targetUrl: string;
  tableNumber?: string;
  scans: number;
  color?: string;
  createdAt: string;
}

export type AnalyticsEventType =
  | 'menu_scan'
  | 'menu_view'
  | 'item_view'
  | 'review_page_visit'
  | 'review_draft_created'
  | 'google_review_click'
  | 'private_feedback_submitted'
  | 'review_assistant_opened'
  | 'review_feedback_started'
  | 'review_draft_generated'
  | 'review_draft_edited'
  | 'review_copy_clicked'
  | 'google_review_clicked';

export interface PrivateFeedback {
  id: string;
  businessId: string;
  rating: number;
  message: string;
  customerName?: string;
  customerContact?: string;
  createdAt: string;
  status?: 'unread' | 'read' | 'resolved';
}

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: string;
  qrId?: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  userAgent: string;
  itemId?: string;
  itemName?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export type DashboardTimeFilter = 'today' | '7d' | '30d' | '90d' | 'all';

export type ActivityEntityType =
  | 'restaurant'
  | 'menu_item'
  | 'category'
  | 'review_phrase'
  | 'review_template'
  | 'feedback_question'
  | 'cta_message'
  | 'qr_code'
  | 'settings';

export interface AdminActivityLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  entityType: ActivityEntityType;
  entityId: string;
  businessId?: string;
  businessName?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PlatformOverviewMetrics {
  totalRestaurants: number;
  activeRestaurants: number;
  suspendedRestaurants: number;
  archivedRestaurants: number;
  totalMenuItems: number;
  totalMenuScans: number;
  totalGoogleReviewClicks: number;
  totalReviewAssistantSessions: number;
  totalReviewDraftsGenerated: number;
}
