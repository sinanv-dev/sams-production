export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'owner' | 'customer';
  phoneNumber: string;
  createdAt: number;
  status: 'active' | 'suspended';
  themePreference?: 'light' | 'dark' | 'system';
  phoneVerified?: boolean;
  emailVerified?: boolean;
  photoUrl?: string;
  dob?: string;
  emergencyContact?: string;
  address?: string;
  businessInfo?: string;
  
  // Custom SAMS customer management properties
  gender?: string;
  nationality?: string;
  bloodGroup?: string;
  parentDetails?: string; // parent/guardian details
  collegeCompany?: string; // college / company
  occupation?: string;
  lastLogin?: number;

  // Lease metadata
  leaseAgreementNumber?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseMonthlyRent?: number;
  leaseSecurityDeposit?: number;
  leaseElectricityRate?: number;
  leaseSpecialConditions?: string;
  leaseStatus?: 'active' | 'terminated' | 'expired' | 'pending';
  leaseFileUrl?: string;
  ownerId?: string;
  apartmentId?: string;
  roomId?: string;
  leaseId?: string;
}

export interface Apartment {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
  imageUrl: string;
  images: string[];         // Cloudinary secure_urls (gallery)
  amenities: string[];
  totalRooms: number;
  createdAt: number;
  updatedAt?: number;
  ownerId?: string;
  ownerName?: string;
  floors?: number;
  rentMin?: number;
  rentMax?: number;
  securityDeposit?: number;
  status?: 'active' | 'archived';
  googleMapsLink?: string;
  latitude?: string;
  longitude?: string;
  rules?: string;
  additionalImages?: string[];
  coverImage?: string;
  galleryImages?: string[];
  electricityRatePerUnit?: number;
  defaultRentAmount?: number;
}

export interface Room {
  id: string;
  apartmentId: string;
  ownerId: string;
  roomNumber: string;
  floor: number;
  rent: number;
  deposit: number;
  electricityRate: number;
  maintenanceCharge: number;
  status: 'vacant' | 'occupied' | 'reserved' | 'maintenance' | 'cleaning';
  gender: 'male' | 'female' | 'unisex' | 'any';
  sharingType: 'single' | 'double' | 'triple' | 'quad' | 'other';
  description: string;
  amenities: string[];
  coverPhoto?: string;
  photos: string[];
  availableFrom?: string;
  createdAt: number;
  updatedAt?: number;
  currentCustomerId?: string | null;
  
  // Compatibility fields for SAMS pages
  rentAmount: number;
  securityDeposit: number;
  size?: string;
  electricityMeterId?: string;
  wing?: string;
  roomType?: string;
  electricityBillingType?: 'metered' | 'flat';
  features?: string[];
  images?: string[];
  documents?: string[];
  assignedCustomerId?: string | null;
}

export interface ApartmentRequest {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  apartmentId: string;
  apartmentName?: string;
  preferredVisitDate: string;
  preferredVisitTime?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'scheduled';
  notes: string;
  createdAt: number;
  approvedAt: number | null;
  assignedRoomId: string | null;
  scheduledDate?: string;
  assignedOwnerId?: string;
  updatedAt?: number;
  cancelledAt?: number | null;
  visitNotes?: string;
  rejectedAt?: number | null;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName?: string;
  roomId: string;
  roomNumber?: string;
  apartmentId: string;
  apartmentName?: string;
  amount: number;
  type: 'rent' | 'electricity';
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  paidAt: number | null;
  billingMonth: string;
  lateFeeApplied?: number;
  notes?: string;
}

export interface ElectricityBill {
  id: string;
  customerId: string;
  customerName?: string;
  roomId: string;
  roomNumber?: string;
  apartmentId: string;
  apartmentName?: string;
  billingMonth: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePerUnit: number;
  totalAmount: number;
  status: 'unpaid' | 'paid';
  dueDate: string;
  paidAt: number | null;
  notes?: string;
}

export interface Complaint {
  id: string;
  customerId: string;
  customerName?: string;
  roomId: string;
  roomNumber?: string;
  apartmentId: string;
  apartmentName?: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electricity' | 'noise' | 'maintenance' | 'other';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'open' | 'in-progress' | 'resolved' | 'rejected';
  createdAt: number;
  resolvedAt: number | null;
  ownerNotes: string;
  adminNotes: string;
  rejectedAt?: number | null;
  assignedOwnerId?: string;
  assignedOwnerName?: string;
  staffNotes?: string;
  emergencyFlag?: boolean;
}

export interface VerificationDocument {
  id: string;
  userId: string; // can represent customerId or ownerId, or empty if room document
  userName?: string;
  title: string;
  fileUrl: string;
  type: 'lease' | 'id_proof' | 'passport' | 'visa' | 'college_id' | 'admission_letter' | 'police_verification' | 'receipt' | 'pan' | 'gst' | 'bank_doc' | 'property_doc' | 'license' | 'insurance' | 'inspection' | 'inventory' | 'maintenance' | 'invoice' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  expiryDate?: string;
  apartmentId?: string;
  roomId?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
  type: 'request' | 'bill' | 'complaint' | 'system' | 'maintenance' | 'announcement' | 'emergency';
  targetRole?: 'all' | 'owner' | 'customer';
  apartmentId?: string;
  link?: string;
  sentByAdminId?: string;
}

export interface SystemSettings {
  electricityRatePerKWh: number;
  lateFeeRate: number;
  lateFeeGraceDays: number;
  contactPhone: string;
  contactEmail: string;
  platformName?: string;
  currency?: string;
  taxRate?: number;
  rentDueDay?: number;
  maintenanceMode?: boolean;
  defaultSecurityDeposit?: number;
  website?: string;
  address?: string;
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  firebaseAuthDomain?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  welcomeEmailSubject?: string;
  welcomeEmailBody?: string;
  rentDueSubject?: string;
  rentDueBody?: string;
  complaintResolvedSubject?: string;
  complaintResolvedBody?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  entityType: 'user' | 'apartment' | 'room' | 'payment' | 'complaint' | 'request' | 'notification' | 'system';
  entityId?: string;
  entityName?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: number;
}

// ==========================================
// ADMIN MANAGEMENT TYPES
// ==========================================

export type AdminRole =
  | 'super_admin'
  | 'platform_admin'
  | 'finance_admin'
  | 'customer_support'
  | 'owner_support'
  | 'operations'
  | 'read_only';

export type Permission =
  | 'apartments.read' | 'apartments.write' | 'apartments.delete'
  | 'rooms.read' | 'rooms.write' | 'rooms.delete'
  | 'customers.read' | 'customers.write' | 'customers.delete'
  | 'owners.read' | 'owners.write' | 'owners.delete'
  | 'billing.read' | 'billing.write'
  | 'electricity.read' | 'electricity.write'
  | 'complaints.read' | 'complaints.write'
  | 'documents.read' | 'documents.write'
  | 'analytics.read'
  | 'notifications.send'
  | 'audit.read'
  | 'settings.manage'
  | 'admins.manage'
  | 'export.all';

export interface LoginRecord {
  timestamp: number;
  ipAddress: string;
  browser?: string;
  device?: string;
  success: boolean;
}

export interface AdminProfile {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  department?: string;
  permissions: Permission[];
  status: 'active' | 'suspended' | 'invited';
  lastLogin?: number;
  ipAddress?: string;
  twoFAEnabled: boolean;
  emailVerified: boolean;
  photoUrl?: string;
  createdAt: number;
  notes?: string;
  loginHistory?: LoginRecord[];
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  finance_admin: 'Finance Admin',
  customer_support: 'Customer Support',
  owner_support: 'Owner Support',
  operations: 'Operations',
  read_only: 'Read Only',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  platform_admin: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  finance_admin: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  customer_support: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  owner_support: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  operations: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  read_only: 'bg-muted text-muted-foreground border-border',
};

export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ['apartments.read','apartments.write','apartments.delete','rooms.read','rooms.write','rooms.delete','customers.read','customers.write','customers.delete','owners.read','owners.write','owners.delete','billing.read','billing.write','electricity.read','electricity.write','complaints.read','complaints.write','documents.read','documents.write','analytics.read','notifications.send','audit.read','settings.manage','admins.manage','export.all'],
  platform_admin: ['apartments.read','apartments.write','rooms.read','rooms.write','customers.read','customers.write','owners.read','owners.write','billing.read','electricity.read','complaints.read','complaints.write','documents.read','analytics.read','notifications.send','audit.read','export.all'],
  finance_admin: ['billing.read','billing.write','electricity.read','electricity.write','customers.read','analytics.read','export.all'],
  customer_support: ['customers.read','customers.write','complaints.read','complaints.write','documents.read','notifications.send'],
  owner_support: ['owners.read','owners.write','apartments.read','rooms.read','billing.read'],
  operations: ['apartments.read','rooms.read','rooms.write','complaints.read','complaints.write','documents.read'],
  read_only: ['apartments.read','rooms.read','customers.read','owners.read','billing.read','analytics.read'],
};

