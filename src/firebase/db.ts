import { db, isFirebaseConfigured } from './config';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, addDoc, onSnapshot 
} from 'firebase/firestore';
import { uploadToCloudinary } from '../services/cloudinary';
import { 
  UserProfile, Apartment, Room, ApartmentRequest, Payment, 
  ElectricityBill, Complaint, VerificationDocument, Notification, SystemSettings, AuditLog,
  AdminProfile, Permission, AdminRole
} from '../types';

// ==========================================
// SEED DATA FOR LOCAL STORAGE SANDBOX
// ==========================================
// Real-time dynamically generated SAMS seed database (1 Super Admin, 5 Owners, 5 Buildings, 100 Rooms, 70 active Customers, 12-month payment history)

const SEED_SETTINGS: SystemSettings = {
  electricityRatePerKWh: 13.0,
  lateFeeRate: 500.00,
  lateFeeGraceDays: 5,
  contactPhone: "+91 98765 43210",
  contactEmail: "support@sams.in"
};

// ── DYNAMIC DEMO DATA GENERATION ──────────────────────────────────────────

const generateDemoData = () => {
  const users: UserProfile[] = [];
  const apartments: Apartment[] = [];
  const rooms: Room[] = [];
  const requests: ApartmentRequest[] = [];
  const payments: Payment[] = [];
  const bills: ElectricityBill[] = [];
  const complaints: Complaint[] = [];
  const notifications: Notification[] = [];
  const documents: VerificationDocument[] = [];

  const baseTime = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Super Admin
  users.push({
    uid: "admin-id",
    email: "admin@sams.in",
    displayName: "Super Admin",
    role: "admin",
    phoneNumber: "+91 99999 88888",
    createdAt: baseTime - 365 * dayMs,
    status: "active",
    phoneVerified: true,
    emailVerified: true
  });

  // 2. Owners
  const ownerNames = ["Rahul Sharma", "Amit Verma", "Priya Nair", "Arjun Menon", "Sneha Kapoor"];
  const ownerEmails = ["rahul@sams.in", "amit@sams.in", "priya@sams.in", "arjun@sams.in", "sneha@sams.in"];
  const ownerPhones = ["+91 98111 00001", "+91 98111 00002", "+91 98111 00003", "+91 98111 00004", "+91 98111 00005"];

  for (let i = 0; i < 5; i++) {
    users.push({
      uid: `owner-${i + 1}`,
      email: ownerEmails[i],
      displayName: ownerNames[i],
      role: "owner",
      phoneNumber: ownerPhones[i],
      createdAt: baseTime - 300 * dayMs,
      status: "active",
      phoneVerified: true,
      emailVerified: true
    });
  }

  // 3. Apartments
  const aptNames = ["RR Residency", "Skyline Heights", "Green Valley Apartments", "Emerald Residency", "Royal Heights"];
  const aptAddresses = [
    "Sector 62, Noida, Uttar Pradesh",
    "Gachibowli, Hyderabad, Telangana",
    "Whitefield, Bengaluru, Karnataka",
    "Koramangala, Bengaluru, Karnataka",
    "Andheri West, Mumbai, Maharashtra"
  ];
  const aptImages = [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80"
  ];

  for (let i = 0; i < 5; i++) {
    apartments.push({
      id: `apt-${i + 1}`,
      name: aptNames[i],
      address: aptAddresses[i],
      description: `Premium Indian luxury complex featuring state-of-the-art security, 24/7 power backup, fitness center, high-speed WiFi, and covered parking. Managed by ${ownerNames[i]}.`,
      imageUrl: aptImages[i],
      amenities: ["Modern Gym", "24/7 Security", "Power Backup", "Covered Parking", "Water Supply"],
      totalRooms: 20,
      createdAt: baseTime - 280 * dayMs,
      ownerId: `owner-${i + 1}`,
      ownerName: ownerNames[i],
      status: "active"
    });
  }

  // 4. Rooms (20 per apartment, total 100 rooms)
  const roomRates = [7000, 7500, 8000, 9000, 10000, 11000, 12000, 13000, 15000, 18000];
  
  for (let a = 0; a < 5; a++) {
    const aptId = `apt-${a + 1}`;
    for (let r = 101; r <= 120; r++) {
      const roomNum = String(r);
      const index = (r - 101) % roomRates.length;
      const rent = roomRates[index];
      rooms.push({
        id: `${aptId}_${roomNum}`,
        apartmentId: aptId,
        ownerId: `owner-${a + 1}`,
        roomNumber: roomNum,
        floor: Math.floor(r / 100),
        rent: rent,
        deposit: rent * 2,
        electricityRate: 13.0,
        maintenanceCharge: 1000,
        status: "vacant",
        gender: r % 3 === 0 ? 'male' : r % 3 === 1 ? 'female' : 'unisex',
        sharingType: r % 4 === 0 ? 'single' : r % 4 === 1 ? 'double' : 'triple',
        description: `Spacious, premium and well-ventilated Room ${roomNum} located at ${aptNames[a]} complex. Featuring modern amenities, power backup, and top-tier security.`,
        amenities: ["AC", "WiFi", "Attached Bathroom", "Wardrobe", "Parking", "Geyser"],
        coverPhoto: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80",
        photos: [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1560185127-6a2806647f81?w=800&auto=format&fit=crop&q=80"
        ],
        availableFrom: "2026-07-15",
        createdAt: baseTime - 250 * dayMs,
        rentAmount: rent,
        securityDeposit: rent * 2
      });
    }
  }

  // 5. Customers & Allocations (70 occupied rooms, 30 vacant rooms)
  const firstNames = ["Akhil", "Mohammed", "Neha", "Rohan", "Anjali", "Sandeep", "Vikram", "Deepak", "Priya", "Shruti", "Pooja", "Rajesh", "Amit", "Sneha", "Rahul", "Arjun", "Manoj", "Divya", "Simran", "Rohit", "Saurabh", "Gaurav", "Riya", "Ankit", "Vishal", "Jyoti", "Kavita", "Siddharth", "Yash", "Harsh", "Varun", "Ritu", "Alok", "Shreya", "Abhinav", "Abhishek", "Preeti", "Lalit", "Tanvi", "Aditya"];
  const lastNames = ["Nair", "Asif", "Sharma", "Kumar", "Das", "Verma", "Kapoor", "Menon", "Joshi", "Patel", "Singh", "Reddy", "Iyer", "Pillai", "Rao", "Choudhury", "Sen", "Gupta", "Mehta", "Trivedi"];

  const numCustomers = 70;
  for (let c = 1; c <= numCustomers; c++) {
    const fn = firstNames[c % firstNames.length];
    const ln = lastNames[(c * 3) % lastNames.length];
    const fullName = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}${c}@sams.in`;
    const phone = `+91 98222 ${String(c).padStart(5, '0')}`;
    const uid = `customer-${c}`;
    const joinOffset = (180 + (c % 180)) * dayMs; // join between 6 to 12 months ago
    const joinDate = baseTime - joinOffset;

    // Pick room to occupy (assign sequentially to first 70 rooms)
    const roomIndex = c - 1; // 0 to 69
    const roomObj = rooms[roomIndex];
    roomObj.status = "occupied";
    roomObj.currentCustomerId = uid;

    const aptObj = apartments.find(a => a.id === roomObj.apartmentId)!;

    users.push({
      uid,
      email,
      displayName: fullName,
      role: "customer",
      phoneNumber: phone,
      createdAt: joinDate,
      status: "active",
      phoneVerified: true,
      emailVerified: true,
      apartmentId: roomObj.apartmentId,
      roomId: roomObj.id,
      leaseAgreementNumber: `L-${100000 + c}`,
      leaseStartDate: new Date(joinDate).toISOString().split('T')[0],
      leaseEndDate: new Date(joinDate + 365 * dayMs).toISOString().split('T')[0],
      leaseMonthlyRent: roomObj.rentAmount,
      leaseSecurityDeposit: roomObj.securityDeposit,
      leaseElectricityRate: roomObj.electricityRate,
      leaseStatus: "active",
      ownerId: aptObj.ownerId
    });

    // 6. Generate 12 Months Payment History
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(baseTime);
      monthDate.setDate(1);
      monthDate.setMonth(monthDate.getMonth() - m);
      
      const billingMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      
      // Determine rent status (for July 2026, generate mixed unpaid, paid, or late fees)
      let status: 'paid' | 'pending' = 'paid';
      let paidAt: number | null = monthDate.getTime() + 3 * dayMs + (c % 5) * dayMs;
      let lateFee = 0;

      if (m === 0) { // July 2026
        if (c <= 40) {
          status = 'paid';
        } else if (c <= 65) {
          status = 'pending';
          paidAt = null;
        } else {
          status = 'pending';
          paidAt = null;
          lateFee = 500;
        }
      }

      payments.push({
        id: `pay-${c}-${billingMonth}`,
        customerId: uid,
        customerName: fullName,
        roomId: roomObj.id,
        roomNumber: roomObj.roomNumber,
        apartmentId: roomObj.apartmentId,
        apartmentName: aptObj.name,
        amount: roomObj.rentAmount,
        type: "rent",
        status,
        dueDate: `${billingMonth}-05`,
        paidAt,
        billingMonth,
        lateFeeApplied: lateFee > 0 ? lateFee : undefined
      });

      // 7. Generate 12 Months Electricity Bills
      const previousReading = 1000 + m * 200 + (c % 10) * 15;
      const unitsConsumed = 100 + Math.floor((c % 3) * 60) + (m % 4) * 20;
      const totalAmount = unitsConsumed * roomObj.electricityRate;

      bills.push({
        id: `elec-${c}-${billingMonth}`,
        customerId: uid,
        customerName: fullName,
        roomId: roomObj.id,
        roomNumber: roomObj.roomNumber,
        apartmentId: roomObj.apartmentId,
        apartmentName: aptObj.name,
        billingMonth,
        previousReading,
        currentReading: previousReading + unitsConsumed,
        unitsConsumed,
        ratePerUnit: roomObj.electricityRate,
        totalAmount,
        status: status === 'paid' ? 'paid' : 'unpaid',
        dueDate: `${billingMonth}-15`,
        paidAt: status === 'paid' ? paidAt : null
      });
    }

    // 8. Customer Verification Documents
    const docTypes: ('id_proof' | 'police_verification' | 'lease' | 'other')[] = ['id_proof', 'police_verification', 'lease', 'other'];
    const docNames = ['Aadhaar Card.pdf', 'Police Clearance.pdf', 'Lease Deed.pdf', 'PAN Card.pdf'];
    for (let d = 0; d < 4; d++) {
      documents.push({
        id: `doc-${c}-${d}`,
        userId: uid,
        userName: fullName,
        type: docTypes[d],
        status: c % 12 === 0 && d === 1 ? 'pending' : 'approved',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        title: docNames[d],
        createdAt: joinDate + d * dayMs
      });
    }
  }

  // 9. Complaints (Generate 30 complaints)
  const complaintTitles = [
    "Water leakage in kitchen", "Ceiling fan not working", "WiFi router connection issue",
    "AC filter cleaning", "Door lock replacement", "Bathroom plumbing jam",
    "Living room cleaning", "Electricity socket fuse", "Geyser heating slowly", "Balcony door crack"
  ];
  const complaintCats = ["plumbing", "electricity", "wifi", "maintenance", "carpentry", "plumbing", "cleaning", "electricity", "maintenance", "carpentry"];
  const complaintPriorities: ('low' | 'medium' | 'high')[] = ['medium', 'high', 'low', 'medium', 'high'];
  const complaintStatuses: ('open' | 'in-progress' | 'resolved')[] = ['resolved', 'resolved', 'in-progress', 'open', 'resolved'];

  for (let cp = 1; cp <= 30; cp++) {
    const custIndex = (cp * 2) % numCustomers + 1;
    const custId = `customer-${custIndex}`;
    const custProfile = users.find(u => u.uid === custId)!;
    const roomObj = rooms.find(r => r.currentCustomerId === custId)!;
    const aptObj = apartments.find(a => a.id === roomObj.apartmentId)!;

    const titleIndex = cp % complaintTitles.length;
    const priority = complaintPriorities[cp % complaintPriorities.length];
    const status = complaintStatuses[cp % complaintStatuses.length];

    complaints.push({
      id: `comp-${cp}`,
      customerId: custId,
      customerName: custProfile.displayName,
      roomId: roomObj.id,
      roomNumber: roomObj.roomNumber,
      apartmentId: roomObj.apartmentId,
      apartmentName: aptObj.name,
      title: complaintTitles[titleIndex],
      description: `Please look into this issue: ${complaintTitles[titleIndex]} reported on floor ${roomObj.roomNumber.charAt(0)}. Needs quick service.`,
      category: complaintCats[titleIndex] as any,
      priority,
      status,
      ownerNotes: '',
      adminNotes: '',
      createdAt: baseTime - (15 - (cp % 15)) * dayMs,
      resolvedAt: status === 'resolved' ? baseTime - (cp % 3) * dayMs : null
    });
  }

  // 10. Visitor Requests (Generate 20 visit requests)
  const visitorApts = apartments.map(a => a.name);
  const visitorNotes = ["Interested in sharing", "Need to check ventilation", "Awaiting official relocation", "Visiting with parents"];
  const visitorStatus: ('approved' | 'pending' | 'rejected')[] = ['approved', 'pending', 'rejected', 'approved'];

  for (let v = 1; v <= 20; v++) {
    const custIndex = (v * 3) % numCustomers + 1;
    const custId = `customer-${custIndex}`;
    const custProfile = users.find(u => u.uid === custId)!;
    const aptIndex = v % apartments.length;
    const apt = apartments[aptIndex];

    requests.push({
      id: `req-${v}`,
      customerId: custId,
      customerName: custProfile.displayName,
      customerEmail: custProfile.email,
      customerPhone: custProfile.phoneNumber,
      apartmentId: apt.id,
      apartmentName: apt.name,
      preferredVisitDate: new Date(baseTime + (v % 5) * dayMs).toISOString().split('T')[0],
      status: visitorStatus[v % visitorStatus.length],
      notes: visitorNotes[v % visitorNotes.length],
      createdAt: baseTime - (v % 10) * dayMs,
      approvedAt: null,
      assignedRoomId: null
    });
  }

  // 11. Notifications (Generate 50 notifications)
  const notifTitles = [
    "Rent Invoice Generated", "Electricity Bill Generated", "Late Fee Applied",
    "Payment Confirmed", "Maintenance Alert", "Festival Greetings", "Complaint Updated"
  ];
  const notifMessages = [
    "Your rent invoice has been generated. Please complete payment before the 5th.",
    "Your electricity utility bill has been generated.",
    "Late fee of ₹500 has been applied for overdue rent.",
    "We have successfully confirmed your payment. Thank you!",
    "Scheduled plumbing inspection will take place this Saturday.",
    "Happy Holi to all SAMS portal residents!",
    "Your reported complaint status has been transitioned."
  ];

  for (let n = 1; n <= 50; n++) {
    const isForAdmin = n % 10 === 0;
    const recipientId = isForAdmin ? "admin-id" : `customer-${(n % numCustomers) + 1}`;
    const index = n % notifTitles.length;

    notifications.push({
      id: `not-${n}`,
      recipientId,
      title: notifTitles[index],
      message: notifMessages[index],
      read: n % 3 === 0,
      createdAt: baseTime - (n % 10) * dayMs,
      type: "bill"
    });
  }

  return {
    users,
    apartments,
    rooms,
    requests,
    payments,
    bills,
    complaints,
    notifications,
    documents
  };
};

const demoData = generateDemoData();

const SEED_USERS = demoData.users;
const SEED_APARTMENTS = demoData.apartments;
const SEED_ROOMS = demoData.rooms;
const SEED_REQUESTS = demoData.requests;
const SEED_PAYMENTS = demoData.payments;
const SEED_ELECTRICITY_BILLS = demoData.bills;
const SEED_COMPLAINTS = demoData.complaints;
const SEED_NOTIFICATIONS = demoData.notifications;
const SEED_DOCUMENTS = demoData.documents;

// Initialize Local Storage helper
export const getStorageItem = <T>(key: string, seed: T): T => {
  const item = localStorage.getItem(`sams_${key}`);
  if (!item) {
    localStorage.setItem(`sams_${key}`, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(item);
};

export const setStorageItem = <T>(key: string, data: T): void => {
  localStorage.setItem(`sams_${key}`, JSON.stringify(data));
  // Broadcast changes to active listeners
  notifyListeners(key, data);
};

// Sandbox Publisher / Subscriber mapping
type ListenerCallback = (data: any) => void;
const activeListeners: Record<string, ListenerCallback[]> = {
  settings: [],
  users: [],
  apartments: [],
  rooms: [],
  requests: [],
  payments: [],
  electricity_bills: [],
  complaints: [],
  notifications: []
};

const notifyListeners = (key: string, data: any) => {
  if (activeListeners[key]) {
    activeListeners[key].forEach(cb => cb(data));
  }
};

// Sandbox Initialization
const initializeSandbox = () => {
  getStorageItem('users', SEED_USERS);
  getStorageItem('apartments', SEED_APARTMENTS);
  getStorageItem('rooms', SEED_ROOMS);
  getStorageItem('requests', SEED_REQUESTS);
  getStorageItem('payments', SEED_PAYMENTS);
  getStorageItem('electricity_bills', SEED_ELECTRICITY_BILLS);
  getStorageItem('complaints', SEED_COMPLAINTS);
  getStorageItem('notifications', SEED_NOTIFICATIONS);
  getStorageItem('settings', SEED_SETTINGS);
  getStorageItem('verification_documents', SEED_DOCUMENTS);
};

if (!isFirebaseConfigured) {
  const SEED_VERSION = 'v1_dynamic_70';
  if (localStorage.getItem('sams_seed_version') !== SEED_VERSION) {
    const keysToRemove = [
      'sams_users', 'sams_apartments', 'sams_rooms', 'sams_requests',
      'sams_payments', 'sams_electricity_bills', 'sams_complaints',
      'sams_notifications', 'sams_settings', 'sams_verification_documents',
      'sams_session'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('sams_seed_version', SEED_VERSION);
  }
  initializeSandbox();
}

// ==========================================
// SYSTEM SETTINGS OPERATIONS
// ==========================================

export const getSystemSettings = async (): Promise<SystemSettings> => {
  if (isFirebaseConfigured) {
    const docRef = doc(db, 'settings', 'system');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as SystemSettings;
      if (data.electricityRatePerKWh === 0.15) {
        data.electricityRatePerKWh = 12.0;
        await setDoc(docRef, data, { merge: true });
      }
      return data;
    } else {
      await setDoc(docRef, SEED_SETTINGS);
      return SEED_SETTINGS;
    }
  } else {
    const data = getStorageItem('settings', SEED_SETTINGS);
    if (data.electricityRatePerKWh === 0.15) {
      data.electricityRatePerKWh = 12.0;
      setStorageItem('settings', data);
    }
    return data;
  }
};

export const updateSystemSettings = async (settings: SystemSettings): Promise<void> => {
  if (isFirebaseConfigured) {
    const docRef = doc(db, 'settings', 'system');
    await setDoc(docRef, settings, { merge: true });
  } else {
    setStorageItem('settings', settings);
  }
};

export const subscribeToSystemSettings = (callback: (data: SystemSettings) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as SystemSettings);
      }
    });
  } else {
    const data = getStorageItem('settings', SEED_SETTINGS);
    callback(data);
    activeListeners.settings.push(callback);
    return () => {
      activeListeners.settings = activeListeners.settings.filter(cb => cb !== callback);
    };
  }
};

// ==========================================
// USER OPERATIONS
// ==========================================

export const getUsers = async (): Promise<UserProfile[]> => {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'users'));
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    return users;
  } else {
    return getStorageItem('users', SEED_USERS);
  }
};

export const getUser = async (uid: string): Promise<UserProfile | null> => {
  if (isFirebaseConfigured) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } else {
    const users = getStorageItem('users', SEED_USERS);
    return users.find(u => u.uid === uid) || null;
  }
};

export const createUserProfile = async (uid: string, profile: Partial<UserProfile>): Promise<UserProfile> => {
  const fullProfile: UserProfile = {
    uid,
    email: profile.email || '',
    displayName: profile.displayName || 'New User',
    role: profile.role || 'customer',
    phoneNumber: profile.phoneNumber || '',
    createdAt: Date.now(),
    status: 'active',
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', uid), fullProfile);
  } else {
    const users = getStorageItem('users', SEED_USERS);
    const filtered = users.filter(u => u.uid !== uid);
    filtered.push(fullProfile);
    setStorageItem('users', filtered);
  }
  return fullProfile;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>, callerRole?: string): Promise<void> => {
  // Determine the caller's role from:
  // 1. The explicit callerRole parameter (passed from React context)
  // 2. The sams_session localStorage (sandbox mode fallback)
  let effectiveRole: string | undefined = callerRole;

  if (!effectiveRole) {
    const sessionStr = localStorage.getItem('sams_session');
    if (sessionStr) {
      try {
        const sessionUser: UserProfile = JSON.parse(sessionStr);
        effectiveRole = sessionUser.role;
      } catch {}
    }
  }

  // Get all users
  let allUsers: UserProfile[] = [];
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'users'));
    const querySnapshot = await getDocs(q);
    allUsers = querySnapshot.docs.map(doc => doc.data() as UserProfile);
  } else {
    allUsers = getStorageItem('users', SEED_USERS);
  }

  const existing = allUsers.find(u => u.uid === uid);
  if (!existing) {
    throw new Error("User not found.");
  }

  const emailChanged = data.email !== undefined && data.email !== existing.email;
  const phoneChanged = data.phoneNumber !== undefined && data.phoneNumber !== existing.phoneNumber;

  if (emailChanged || phoneChanged) {
    // Only Admin can modify email and phoneNumber
    if (effectiveRole !== 'admin') {
      throw new Error("Security Violation: Only system administrators are authorized to update registered email address and phone number.");
    }

    // Uniqueness validations (admin must still respect uniqueness)
    if (emailChanged && data.email) {
      const emailExists = allUsers.some(u => u.uid !== uid && u.email.toLowerCase() === data.email!.toLowerCase());
      if (emailExists) {
        throw new Error("Validation Error: Email address is already in use by another account.");
      }
    }

    if (phoneChanged && data.phoneNumber) {
      const phoneExists = allUsers.some(u => u.uid !== uid && u.phoneNumber === data.phoneNumber);
      if (phoneExists) {
        throw new Error("Validation Error: Phone number is already in use by another account.");
      }
    }

    // Log the action in an audit log
    const logEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      adminName: effectiveRole === 'admin' ? 'System Administrator' : 'Unknown',
      userAffected: existing.displayName || existing.email,
      oldValue: `Email: ${existing.email} | Phone: ${existing.phoneNumber}`,
      newValue: `Email: ${data.email !== undefined ? data.email : existing.email} | Phone: ${data.phoneNumber !== undefined ? data.phoneNumber : existing.phoneNumber}`,
      timestamp: Date.now()
    };

    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'audit_logs'), logEntry);
      } catch (e) {
        console.error("Failed to write audit log in Firestore:", e);
      }
    } else {
      const logs = getStorageItem<any[]>('audit_logs', []);
      logs.push(logEntry);
      setStorageItem('audit_logs', logs);
    }
  }

  if (isFirebaseConfigured) {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, data as any);
  } else {
    const users = getStorageItem('users', SEED_USERS);
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      setStorageItem('users', users);
      // Sync current active session if we edited ourselves
      const sessionStr = localStorage.getItem('sams_session');
      if (sessionStr) {
        try {
          const sessionUser: UserProfile = JSON.parse(sessionStr);
          if (sessionUser.uid === uid) {
            localStorage.setItem('sams_session', JSON.stringify(users[index]));
          }
        } catch {}
      }
    }
  }
};

export const subscribeToUsers = (callback: (users: UserProfile[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      callback(users);
    });
  } else {
    const data = getStorageItem('users', SEED_USERS);
    callback(data);
    activeListeners.users.push(callback);
    return () => {
      activeListeners.users = activeListeners.users.filter(cb => cb !== callback);
    };
  }
};

// ==========================================
// APARTMENT OPERATIONS
// ==========================================

export const getApartments = async (): Promise<Apartment[]> => {
  if (isFirebaseConfigured) {
    const querySnapshot = await getDocs(collection(db, 'apartments'));
    const apartments: Apartment[] = [];
    querySnapshot.forEach((doc) => {
      apartments.push({ id: doc.id, ...doc.data() } as Apartment);
    });
    return apartments;
  } else {
    return getStorageItem('apartments', SEED_APARTMENTS);
  }
};

export const createApartment = async (apartment: Omit<Apartment, 'id' | 'createdAt'>): Promise<Apartment> => {
  const id = `apt-${Math.random().toString(36).substr(2, 9)}`;
  const newApartment: Apartment = {
    ...apartment,
    id,
    createdAt: Date.now()
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'apartments', id), newApartment);
  } else {
    const apartments = getStorageItem('apartments', SEED_APARTMENTS);
    apartments.push(newApartment);
    setStorageItem('apartments', apartments);
  }
  return newApartment;
};

export const updateApartment = async (id: string, data: Partial<Apartment>): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'apartments', id), data as any);
  } else {
    const apartments = getStorageItem<Apartment[]>('apartments', SEED_APARTMENTS);
    const index = apartments.findIndex(a => a.id === id);
    if (index !== -1) {
      apartments[index] = { ...apartments[index], ...data };
      setStorageItem('apartments', apartments);
    }
  }

  // Automatically propagate ownerId downstream to rooms & customers on assignment changes
  if (data.ownerId !== undefined) {
    const newOwnerId = data.ownerId;
    try {
      if (isFirebaseConfigured) {
        const roomsRef = collection(db, 'rooms');
        const q = query(roomsRef, where('apartmentId', '==', id));
        const qSnap = await getDocs(q);
        const customerIds: string[] = [];
        for (const rDoc of qSnap.docs) {
          await updateDoc(rDoc.ref, { ownerId: newOwnerId });
          const rData = rDoc.data();
          if (rData.currentCustomerId) {
            customerIds.push(rData.currentCustomerId);
          }
        }
        for (const cid of customerIds) {
          await updateDoc(doc(db, 'users', cid), { ownerId: newOwnerId });
        }
      } else {
        const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
        const customerIds: string[] = [];
        rooms.forEach((r, i) => {
          if (r.apartmentId === id) {
            rooms[i].ownerId = newOwnerId;
            if (r.currentCustomerId) {
              customerIds.push(r.currentCustomerId);
            }
          }
        });
        setStorageItem('rooms', rooms);

        const users = getStorageItem<UserProfile[]>('users', SEED_USERS);
        users.forEach((u, i) => {
          if (customerIds.includes(u.uid)) {
            users[i].ownerId = newOwnerId;
          }
        });
        setStorageItem('users', users);
      }
    } catch (err) {
      console.error("Failed to propagate ownerId updates: ", err);
    }
  }
};

export const deleteApartment = async (id: string): Promise<void> => {
  // 1. Fetch all rooms belonging to this apartment
  let roomsToDelete: Room[] = [];
  if (isFirebaseConfigured) {
    const qSnap = await getDocs(query(collection(db, 'rooms'), where('apartmentId', '==', id)));
    roomsToDelete = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
  } else {
    const allRooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    roomsToDelete = allRooms.filter(r => r.apartmentId === id);
  }

  // 2. Cascade delete rooms (which in turn vacates customers in them)
  for (const r of roomsToDelete) {
    await deleteRoom(r.id);
  }

  // 3. Delete the apartment itself
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'apartments', id));
  } else {
    const apartments = getStorageItem<Apartment[]>('apartments', SEED_APARTMENTS);
    const filtered = apartments.filter(a => a.id !== id);
    setStorageItem('apartments', filtered);
  }
};

export const subscribeToApartments = (callback: (apts: Apartment[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'apartments'), (snapshot) => {
      const apts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Apartment));
      callback(apts);
    });
  } else {
    const data = getStorageItem('apartments', SEED_APARTMENTS);
    callback(data);
    activeListeners.apartments.push(callback);
    return () => {
      activeListeners.apartments = activeListeners.apartments.filter(cb => cb !== callback);
    };
  }
};

// ==========================================
// ROOM OPERATIONS
// ==========================================

export const getRooms = async (): Promise<Room[]> => {
  if (isFirebaseConfigured) {
    const querySnapshot = await getDocs(collection(db, 'rooms'));
    const rooms: Room[] = [];
    querySnapshot.forEach((doc) => {
      rooms.push({ id: doc.id, ...doc.data() } as Room);
    });
    return rooms;
  } else {
    return getStorageItem('rooms', SEED_ROOMS);
  }
};

export const createRoom = async (room: Partial<Room> & { apartmentId: string; roomNumber: string; rentAmount: number }): Promise<Room> => {
  const id = `${room.apartmentId}_${room.roomNumber}`;

  // Fetch parent apartment details
  let ownerId = '';
  let electricityRate = 12;
  try {
    if (isFirebaseConfigured) {
      const aptSnap = await getDoc(doc(db, 'apartments', room.apartmentId));
      if (aptSnap.exists()) {
        const aptData = aptSnap.data();
        ownerId = aptData.ownerId || '';
        electricityRate = aptData.electricityRatePerUnit || 12;
      }
    } else {
      const apartments = getStorageItem<Apartment[]>('apartments', SEED_APARTMENTS);
      const parentApt = apartments.find(a => a.id === room.apartmentId);
      if (parentApt) {
        ownerId = parentApt.ownerId || '';
        electricityRate = parentApt.electricityRatePerUnit || 12;
      }
    }
  } catch (err) {
    console.error("Failed to lookup parent apartment during room creation: ", err);
  }

  const newRoom: Room = {
    maintenanceCharge: room.maintenanceCharge || 0,
    status: room.status || 'vacant',
    gender: room.gender || 'unisex',
    sharingType: room.sharingType || 'single',
    description: room.description || '',
    amenities: room.amenities || [],
    photos: room.photos || [],
    currentCustomerId: room.currentCustomerId || null,
    floor: room.floor || 1,
    ...room,
    id,
    ownerId: ownerId || room.ownerId || '',
    electricityRate: electricityRate || room.electricityRate || 12,
    rent: room.rentAmount || room.rent || 0,
    deposit: room.securityDeposit || room.deposit || (room.rentAmount || room.rent || 0) * 2,
    rentAmount: room.rentAmount || room.rent || 0,
    securityDeposit: room.securityDeposit || room.deposit || (room.rentAmount || room.rent || 0) * 2,
    assignedCustomerId: room.currentCustomerId || room.assignedCustomerId || null,
    createdAt: Date.now()
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'rooms', id), newRoom);
  } else {
    const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    rooms.push(newRoom);
    setStorageItem('rooms', rooms);
  }
  return newRoom;
};

export const updateRoom = async (id: string, data: Partial<Room>): Promise<void> => {
  const updatedData = { ...data };
  if (data.rentAmount !== undefined) {
    updatedData.rent = data.rentAmount;
  }
  if (data.currentCustomerId !== undefined) {
    updatedData.assignedCustomerId = data.currentCustomerId;
  }

  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'rooms', id), updatedData as any);
  } else {
    const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    const index = rooms.findIndex(r => r.id === id);
    if (index !== -1) {
      rooms[index] = { ...rooms[index], ...updatedData };
      setStorageItem('rooms', rooms);
    }
  }
};

export const deleteRoom = async (id: string): Promise<void> => {
  // 1. Fetch room details to check if there is an assigned customer
  let room: Room | null = null;
  if (isFirebaseConfigured) {
    const snap = await getDoc(doc(db, 'rooms', id));
    if (snap.exists()) {
      room = { id: snap.id, ...snap.data() } as Room;
    }
  } else {
    const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    room = rooms.find(r => r.id === id) || null;
  }

  if (room) {
    const customerId = room.currentCustomerId || room.assignedCustomerId;
    if (customerId) {
      // Vacate customer: clear lease fields
      const leaseUpdates = {
        leaseStatus: 'terminated' as const,
        roomId: '',
        apartmentId: '',
        ownerId: '',
        leaseAgreementNumber: '',
        leaseStartDate: '',
        leaseEndDate: '',
        leaseMonthlyRent: 0,
        leaseSecurityDeposit: 0,
        leaseElectricityRate: 0
      };

      if (isFirebaseConfigured) {
        await updateDoc(doc(db, 'users', customerId), leaseUpdates);
      } else {
        const users = getStorageItem<UserProfile[]>('users', SEED_USERS);
        const index = users.findIndex(u => u.uid === customerId);
        if (index !== -1) {
          users[index] = { ...users[index], ...leaseUpdates };
          setStorageItem('users', users);
        }
      }
    }
  }

  // 2. Delete the room doc
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'rooms', id));
  } else {
    const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    const filtered = rooms.filter(r => r.id !== id);
    setStorageItem('rooms', filtered);
  }
};

export const subscribeToRooms = (callback: (rooms: Room[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      callback(rooms);
    });
  } else {
    const data = getStorageItem('rooms', SEED_ROOMS);
    callback(data);
    activeListeners.rooms.push(callback);
    return () => {
      activeListeners.rooms = activeListeners.rooms.filter(cb => cb !== callback);
    };
  }
};

// ==========================================
// APARTMENT REQUEST OPERATIONS
// ==========================================

export const getRequests = async (): Promise<ApartmentRequest[]> => {
  if (isFirebaseConfigured) {
    const querySnapshot = await getDocs(collection(db, 'apartmentRequests'));
    const requests: ApartmentRequest[] = [];
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as ApartmentRequest);
    });
    return requests;
  } else {
    return getStorageItem('requests', SEED_REQUESTS);
  }
};

export const createRequest = async (
  request: Omit<ApartmentRequest, 'id' | 'createdAt' | 'status' | 'approvedAt'> & Partial<Pick<ApartmentRequest, 'status' | 'approvedAt'>>
): Promise<ApartmentRequest> => {
  const id = `req-${Math.random().toString(36).substr(2, 9)}`;
  const newRequest: ApartmentRequest = {
    ...request,
    id,
    status: request.status || 'pending',
    approvedAt: request.approvedAt || null,
    assignedRoomId: request.assignedRoomId !== undefined ? request.assignedRoomId : null,
    createdAt: Date.now()
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'apartmentRequests', id), newRequest);
  } else {
    const requests = getStorageItem('requests', SEED_REQUESTS);
    requests.push(newRequest);
    setStorageItem('requests', requests);
  }
  return newRequest;
};

export const updateRequest = async (id: string, data: Partial<ApartmentRequest>): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'apartmentRequests', id), data as any);
  } else {
    const requests = getStorageItem('requests', SEED_REQUESTS);
    const index = requests.findIndex(r => r.id === id);
    if (index !== -1) {
      requests[index] = { ...requests[index], ...data };
      setStorageItem('requests', requests);
    }
  }
};

export const subscribeToRequests = (callback: (reqs: ApartmentRequest[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'apartmentRequests'), (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApartmentRequest));
      callback(reqs);
    });
  } else {
    const data = getStorageItem('requests', SEED_REQUESTS);
    callback(data);
    activeListeners.requests.push(callback);
    return () => {
      activeListeners.requests = activeListeners.requests.filter(cb => cb !== callback);
    };
  }
};

// ==========================================
// PAYMENT OPERATIONS
// ==========================================

export const getPayments = async (): Promise<Payment[]> => {
  if (isFirebaseConfigured) {
    const querySnapshot = await getDocs(collection(db, 'payments'));
    const payments: Payment[] = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() } as Payment);
    });
    return payments;
  } else {
    return getStorageItem('payments', SEED_PAYMENTS);
  }
};

export const createPayment = async (payment: Omit<Payment, 'id'>): Promise<Payment> => {
  const id = `pay-${Math.random().toString(36).substr(2, 9)}`;
  const newPayment: Payment = {
    ...payment,
    id
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'payments', id), newPayment);
  } else {
    const payments = getStorageItem('payments', SEED_PAYMENTS);
    payments.push(newPayment);
    setStorageItem('payments', payments);
  }
  return newPayment;
};

export const updatePayment = async (id: string, data: Partial<Payment>): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'payments', id), data as any);
  } else {
    const payments = getStorageItem('payments', SEED_PAYMENTS);
    const index = payments.findIndex(p => p.id === id);
    if (index !== -1) {
      payments[index] = { ...payments[index], ...data };
      setStorageItem('payments', payments);
    }
  }
};

export const subscribeToPayments = (callback: (payments: Payment[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'payments'), (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      callback(payments);
    });
  } else {
    const data = getStorageItem('payments', SEED_PAYMENTS);
    callback(data);
    activeListeners.payments.push(callback);
    return () => {
      activeListeners.payments = activeListeners.payments.filter(cb => cb !== callback);
    };
  }
};

// ==========================================
// ELECTRICITY BILL OPERATIONS
// ==========================================

export const getElectricityBills = async (): Promise<ElectricityBill[]> => {
  let bills: ElectricityBill[] = [];
  if (isFirebaseConfigured) {
    const querySnapshot = await getDocs(collection(db, 'electricityBills'));
    querySnapshot.forEach((doc) => {
      bills.push({ id: doc.id, ...doc.data() } as ElectricityBill);
    });
  } else {
    bills = getStorageItem('electricity_bills', SEED_ELECTRICITY_BILLS);
  }

  // Migrate/Update bills if ratePerUnit is 0.15
  let updated = false;
  const migratedBills = bills.map(bill => {
    if (bill.ratePerUnit === 0.15) {
      updated = true;
      const rate = 12.0;
      const consumed = bill.currentReading - bill.previousReading;
      return {
        ...bill,
        ratePerUnit: rate,
        unitsConsumed: consumed,
        totalAmount: consumed * rate
      };
    }
    return bill;
  });

  if (updated && !isFirebaseConfigured) {
    setStorageItem('electricity_bills', migratedBills);
  }
  return migratedBills;
};

export const createElectricityBill = async (bill: Omit<ElectricityBill, 'id'>): Promise<ElectricityBill> => {
  const id = `elec-${Math.random().toString(36).substr(2, 9)}`;
  const newBill: ElectricityBill = {
    ...bill,
    id
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'electricityBills', id), newBill);
  } else {
    const bills = getStorageItem('electricity_bills', SEED_ELECTRICITY_BILLS);
    bills.push(newBill);
    setStorageItem('electricity_bills', bills);
  }
  return newBill;
};

export const updateElectricityBill = async (id: string, data: Partial<ElectricityBill>): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'electricityBills', id), data as any);
  } else {
    const bills = getStorageItem('electricity_bills', SEED_ELECTRICITY_BILLS);
    const index = bills.findIndex(b => b.id === id);
    if (index !== -1) {
      bills[index] = { ...bills[index], ...data };
      setStorageItem('electricity_bills', bills);
    }
  }
};

export const subscribeToElectricityBills = (callback: (bills: ElectricityBill[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'electricityBills'), (snapshot) => {
      const bills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ElectricityBill));
      const migratedBills = bills.map(bill => {
        if (bill.ratePerUnit === 0.15) {
          const rate = 12.0;
          const consumed = bill.currentReading - bill.previousReading;
          return {
            ...bill,
            ratePerUnit: rate,
            unitsConsumed: consumed,
            totalAmount: consumed * rate
          };
        }
        return bill;
      });
      callback(migratedBills);
    });
  } else {
    const getMigrated = () => {
      const bills = getStorageItem('electricity_bills', SEED_ELECTRICITY_BILLS);
      let updated = false;
      const migrated = bills.map(bill => {
        if (bill.ratePerUnit === 0.15) {
          updated = true;
          const rate = 12.0;
          const consumed = bill.currentReading - bill.previousReading;
          return {
            ...bill,
            ratePerUnit: rate,
            unitsConsumed: consumed,
            totalAmount: consumed * rate
          };
        }
        return bill;
      });
      if (updated) {
        setStorageItem('electricity_bills', migrated);
      }
      return migrated;
    };
    
    callback(getMigrated());
    const listenerWrapper = () => {
      callback(getMigrated());
    };
    activeListeners.electricity_bills.push(listenerWrapper);
    return () => {
      activeListeners.electricity_bills = activeListeners.electricity_bills.filter(cb => cb !== listenerWrapper);
    };
  }
};

// ==========================================
// COMPLAINT OPERATIONS
// ==========================================

export const getComplaints = async (): Promise<Complaint[]> => {
  if (isFirebaseConfigured) {
    const querySnapshot = await getDocs(collection(db, 'complaints'));
    const complaints: Complaint[] = [];
    querySnapshot.forEach((doc) => {
      complaints.push({ id: doc.id, ...doc.data() } as Complaint);
    });
    return complaints;
  } else {
    return getStorageItem('complaints', SEED_COMPLAINTS);
  }
};

export const createComplaint = async (complaint: Omit<Complaint, 'id' | 'createdAt' | 'resolvedAt' | 'ownerNotes' | 'adminNotes' | 'status'>): Promise<Complaint> => {
  const id = `comp-${Math.random().toString(36).substr(2, 9)}`;
  const newComplaint: Complaint = {
    ...complaint,
    id,
    status: 'open',
    createdAt: Date.now(),
    resolvedAt: null,
    ownerNotes: '',
    adminNotes: ''
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'complaints', id), newComplaint);
  } else {
    const complaints = getStorageItem('complaints', SEED_COMPLAINTS);
    complaints.push(newComplaint);
    setStorageItem('complaints', complaints);
  }
  return newComplaint;
};

export const updateComplaint = async (id: string, data: Partial<Complaint>): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'complaints', id), data as any);
  } else {
    const complaints = getStorageItem('complaints', SEED_COMPLAINTS);
    const index = complaints.findIndex(c => c.id === id);
    if (index !== -1) {
      complaints[index] = { ...complaints[index], ...data };
      setStorageItem('complaints', complaints);
    }
  }
};

export const subscribeToComplaints = (callback: (complaints: Complaint[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'complaints'), (snapshot) => {
      const complaints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
      callback(complaints);
    });
  } else {
    const data = getStorageItem('complaints', SEED_COMPLAINTS);
    callback(data);
    activeListeners.complaints.push(callback);
    return () => {
      activeListeners.complaints = activeListeners.complaints.filter(cb => cb !== callback);
    };
  }
};

// ==========================================
// NOTIFICATION OPERATIONS
// ==========================================

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as Notification);
    });
    return notifications;
  } else {
    const notifications = getStorageItem('notifications', SEED_NOTIFICATIONS);
    return notifications.filter(n => n.recipientId === userId || n.recipientId === 'admin-id');
  }
};

export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> => {
  const id = `not-${Math.random().toString(36).substr(2, 9)}`;
  const newNotification: Notification = {
    ...notification,
    id,
    read: false,
    createdAt: Date.now()
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'notifications', id), newNotification);
  } else {
    const notifications = getStorageItem('notifications', SEED_NOTIFICATIONS);
    notifications.push(newNotification);
    setStorageItem('notifications', notifications);
  }
  return newNotification;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } else {
    const notifications = getStorageItem('notifications', SEED_NOTIFICATIONS);
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      setStorageItem('notifications', notifications);
    }
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      callback(notifications);
    });
  } else {
    const getFiltered = () => {
      const notifications = getStorageItem('notifications', SEED_NOTIFICATIONS);
      return notifications.filter(n => n.recipientId === userId || n.recipientId === 'admin-id');
    };
    callback(getFiltered());
    
    const listenerWrapper = () => {
      callback(getFiltered());
    };
    activeListeners.notifications.push(listenerWrapper);
    
    return () => {
      activeListeners.notifications = activeListeners.notifications.filter(cb => cb !== listenerWrapper);
    };
  }
};

// ==========================================
// ROOM ASSIGNMENT OPERATIONS
// ==========================================

/**
 * Assigns a customer to a room and updates room status to occupied.
 * Also creates an audit log entry.
 */
export const assignRoomToCustomer = async (
  roomId: string,
  customerId: string,
  customerName: string,
  adminId: string,
  adminName: string
): Promise<void> => {
  // Load Room & Apartment details for Lease and initial Billing
  let room: Room | undefined;
  let apartment: Apartment | undefined;

  if (isFirebaseConfigured) {
    const rSnap = await getDoc(doc(db, 'rooms', roomId));
    if (rSnap.exists()) {
      room = { id: rSnap.id, ...rSnap.data() } as Room;
      const aSnap = await getDoc(doc(db, 'apartments', room.apartmentId));
      if (aSnap.exists()) {
        apartment = { id: aSnap.id, ...aSnap.data() } as Apartment;
      }
    }
  } else {
    const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    room = rooms.find(r => r.id === roomId);
    if (room) {
      const apartments = getStorageItem<Apartment[]>('apartments', SEED_APARTMENTS);
      apartment = apartments.find(a => a.id === room!.apartmentId);
    }
  }

  // Update Room Status and relationship fields
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'rooms', roomId), {
      currentCustomerId: customerId,
      assignedCustomerId: customerId,
      ownerId: apartment?.ownerId || '',
      status: 'occupied'
    });
  } else {
    const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx !== -1) {
      rooms[idx].currentCustomerId = customerId;
      rooms[idx].assignedCustomerId = customerId;
      rooms[idx].ownerId = apartment?.ownerId || '';
      rooms[idx].status = 'occupied';
      setStorageItem('rooms', rooms);
    }
  }

  if (room) {
    const leaseAgreementNumber = 'LSE-' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date();
    const leaseStartDate = now.toISOString().split('T')[0];
    const endLease = new Date();
    endLease.setMonth(endLease.getMonth() + 11);
    const leaseEndDate = endLease.toISOString().split('T')[0];
    const leaseMonthlyRent = room.rentAmount || 10000;
    const leaseSecurityDeposit = room.securityDeposit || room.rentAmount || 10000;
    const leaseElectricityRate = apartment?.electricityRatePerUnit || 8;

    const leaseData = {
      leaseAgreementNumber,
      leaseStartDate,
      leaseEndDate,
      leaseMonthlyRent,
      leaseSecurityDeposit,
      leaseElectricityRate,
      leaseStatus: 'active' as const,
      ownerId: apartment?.ownerId || '',
      apartmentId: room.apartmentId,
      roomId: room.id,
      leaseId: leaseAgreementNumber
    };

    // Update Customer Profile
    if (isFirebaseConfigured) {
      await updateDoc(doc(db, 'users', customerId), leaseData);
    } else {
      const users = getStorageItem<UserProfile[]>('users', SEED_USERS);
      const userIdx = users.findIndex(u => u.uid === customerId);
      if (userIdx !== -1) {
        users[userIdx] = { ...users[userIdx], ...leaseData };
        setStorageItem('users', users);
      }
    }

    // Enable Rent initial ledger invoice
    const billingMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const rentPayload = {
      customerId,
      customerName,
      roomId: room.id,
      roomNumber: room.roomNumber,
      apartmentId: room.apartmentId,
      apartmentName: apartment?.name || 'Apartment Complex',
      amount: leaseMonthlyRent,
      type: 'rent' as const,
      status: 'pending' as const,
      dueDate: `${now.toISOString().split('T')[0].substring(0, 7)}-05`,
      paidAt: null,
      billingMonth
    };

    if (isFirebaseConfigured) {
      await addDoc(collection(db, 'payments'), rentPayload);
    } else {
      const payments = getStorageItem<Payment[]>('payments', SEED_PAYMENTS);
      const newPayment = { id: 'pmt-' + Math.random().toString(36).substr(2, 9), ...rentPayload, createdAt: Date.now() };
      payments.push(newPayment);
      setStorageItem('payments', payments);
    }

    // Enable Electricity initial ledger utility bill
    const elecBillPayload = {
      customerId,
      customerName,
      roomId: room.id,
      roomNumber: room.roomNumber,
      apartmentId: room.apartmentId,
      apartmentName: apartment?.name || 'Apartment Complex',
      billingMonth,
      previousReading: 0,
      currentReading: 0,
      unitsConsumed: 0,
      ratePerUnit: leaseElectricityRate,
      totalAmount: 0,
      status: 'unpaid' as const,
      dueDate: `${now.toISOString().split('T')[0].substring(0, 7)}-15`,
      paidAt: null
    };

    if (isFirebaseConfigured) {
      await addDoc(collection(db, 'electricityBills'), elecBillPayload);
    } else {
      const bills = getStorageItem<ElectricityBill[]>('electricityBills', SEED_ELECTRICITY_BILLS);
      const newBill = { id: 'bill-' + Math.random().toString(36).substr(2, 9), ...elecBillPayload, createdAt: Date.now() };
      bills.push(newBill);
      setStorageItem('electricityBills', bills);
    }
  }

  // Audit log
  await createAuditLog({
    adminId,
    adminName,
    action: `Assigned customer "${customerName}" to room ${roomId}`,
    entityType: 'room',
    entityId: roomId,
    newValue: customerId
  });
};

/**
 * Removes a customer from a room and sets status back to vacant.
 */
export const removeRoomFromCustomer = async (
  roomId: string,
  adminId: string,
  adminName: string
): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'rooms', roomId), {
      currentCustomerId: null,
      status: 'vacant'
    });
  } else {
    const rooms = getStorageItem('rooms', SEED_ROOMS);
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx !== -1) {
      rooms[idx].currentCustomerId = null;
      rooms[idx].status = 'vacant';
      setStorageItem('rooms', rooms);
    }
  }
  await createAuditLog({
    adminId,
    adminName,
    action: `Removed customer assignment from room ${roomId}`,
    entityType: 'room',
    entityId: roomId,
    oldValue: 'occupied',
    newValue: 'vacant'
  });
};

/**
 * Transfers a customer from their current room to a new room.
 */
export const transferCustomer = async (
  customerId: string,
  newRoomId: string,
  customerName: string,
  adminId: string,
  adminName: string
): Promise<void> => {
  // Find old room and vacate it
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'rooms'), where('currentCustomerId', '==', customerId));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await updateDoc(d.ref, { currentCustomerId: null, status: 'vacant' });
    }
    await updateDoc(doc(db, 'rooms', newRoomId), {
      currentCustomerId: customerId,
      status: 'occupied'
    });
  } else {
    const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    rooms.forEach((r, i) => {
      if (r.currentCustomerId === customerId) {
        rooms[i].currentCustomerId = null;
        rooms[i].status = 'vacant';
      }
    });
    const newIdx = rooms.findIndex(r => r.id === newRoomId);
    if (newIdx !== -1) {
      rooms[newIdx].currentCustomerId = customerId;
      rooms[newIdx].status = 'occupied';
    }
    setStorageItem('rooms', rooms);
  }

  // Load new Room & Apartment details to update Lease details
  let room: Room | undefined;
  let apartment: Apartment | undefined;

  if (isFirebaseConfigured) {
    const rSnap = await getDoc(doc(db, 'rooms', newRoomId));
    if (rSnap.exists()) {
      room = { id: rSnap.id, ...rSnap.data() } as Room;
      const aSnap = await getDoc(doc(db, 'apartments', room.apartmentId));
      if (aSnap.exists()) {
        apartment = { id: aSnap.id, ...aSnap.data() } as Apartment;
      }
    }
  } else {
    const rooms = getStorageItem<Room[]>('rooms', SEED_ROOMS);
    room = rooms.find(r => r.id === newRoomId);
    if (room) {
      const apartments = getStorageItem<Apartment[]>('apartments', SEED_APARTMENTS);
      apartment = apartments.find(a => a.id === room!.apartmentId);
    }
  }

  if (room) {
    const leaseData = {
      leaseMonthlyRent: room.rentAmount || 10000,
      leaseSecurityDeposit: room.securityDeposit || room.rentAmount || 10000,
      leaseElectricityRate: apartment?.electricityRatePerUnit || 8
    };

    // Update Customer Profile with new room rent rates
    if (isFirebaseConfigured) {
      await updateDoc(doc(db, 'users', customerId), leaseData);
    } else {
      const users = getStorageItem<UserProfile[]>('users', SEED_USERS);
      const userIdx = users.findIndex(u => u.uid === customerId);
      if (userIdx !== -1) {
        users[userIdx] = { ...users[userIdx], ...leaseData };
        setStorageItem('users', users);
      }
    }
  }

  await createAuditLog({
    adminId,
    adminName,
    action: `Transferred customer "${customerName}" to room ${newRoomId}`,
    entityType: 'room',
    entityId: newRoomId,
    newValue: customerId
  });
};

/**
 * Permanently deletes a user profile from the database.
 */
export const deleteUser = async (
  uid: string,
  adminId: string,
  adminName: string,
  userName: string
): Promise<void> => {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'users', uid));
  } else {
    const users = getStorageItem('users', SEED_USERS);
    const filtered = users.filter(u => u.uid !== uid);
    setStorageItem('users', filtered);
  }
  await createAuditLog({
    adminId,
    adminName,
    action: `Deleted user "${userName}" (uid: ${uid})`,
    entityType: 'user',
    entityId: uid,
    entityName: userName
  });
};

/**
 * Sends a notification to all users matching the given role (or all users if role is 'all').
 */
export const sendBroadcastNotification = async (
  targetRole: 'all' | 'owner' | 'customer',
  title: string,
  message: string,
  type: Notification['type'],
  sentByAdminId: string
): Promise<number> => {
  const allUsers = await getUsers();
  const targets = targetRole === 'all'
    ? allUsers.filter(u => u.role !== 'admin')
    : allUsers.filter(u => u.role === targetRole);

  for (const user of targets) {
    await createNotification({
      recipientId: user.uid,
      title,
      message,
      type,
      targetRole,
      sentByAdminId
    });
  }

  await createAuditLog({
    adminId: sentByAdminId,
    adminName: 'Admin',
    action: `Sent broadcast notification to ${targetRole} users: "${title}"`,
    entityType: 'notification',
    newValue: `${targets.length} recipients`
  });

  return targets.length;
};

// ==========================================
// AUDIT LOG OPERATIONS
// ==========================================

export const createAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> => {
  const entry: AuditLog = {
    ...log,
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: Date.now()
  };

  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, 'audit_logs'), entry);
    } catch (e) {
      console.error('Failed to write audit log:', e);
    }
  } else {
    const logs = getStorageItem<AuditLog[]>('audit_logs', []);
    logs.unshift(entry); // newest first
    if (logs.length > 500) logs.splice(500); // cap at 500
    setStorageItem('audit_logs', logs);
  }
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'audit_logs'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as AuditLog))
      .sort((a, b) => b.timestamp - a.timestamp);
  } else {
    const logs = getStorageItem<AuditLog[]>('audit_logs', []);
    return [...logs].sort((a, b) => b.timestamp - a.timestamp);
  }
};

/**
 * Get all notifications for admin (all notifications in the system)
 */
export const getAllNotifications = async (): Promise<Notification[]> => {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'notifications'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification))
      .sort((a, b) => b.createdAt - a.createdAt);
  } else {
    const notifs = getStorageItem('notifications', SEED_NOTIFICATIONS);
    return [...notifs].sort((a, b) => b.createdAt - a.createdAt);
  }
};

// ==========================================
// DOCUMENT OPERATIONS
// ==========================================

export const getVerificationDocuments = async (): Promise<VerificationDocument[]> => {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'verificationDocuments'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as VerificationDocument))
      .sort((a, b) => b.createdAt - a.createdAt);
  } else {
    return getStorageItem<VerificationDocument[]>('verification_documents', []);
  }
};

export const createVerificationDocument = async (
  docData: Omit<VerificationDocument, 'id' | 'createdAt'>
): Promise<VerificationDocument> => {
  const id = `doc-${Math.random().toString(36).substr(2, 9)}`;
  const newDoc: VerificationDocument = {
    ...docData,
    id,
    createdAt: Date.now()
  };

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'verificationDocuments', id), newDoc);
  } else {
    const docs = getStorageItem<VerificationDocument[]>('verification_documents', []);
    docs.unshift(newDoc);
    setStorageItem('verification_documents', docs);
  }
  return newDoc;
};

export const deleteVerificationDocument = async (id: string): Promise<void> => {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'verificationDocuments', id));
  } else {
    const docs = getStorageItem<VerificationDocument[]>('verification_documents', []);
    const filtered = docs.filter(d => d.id !== id);
    setStorageItem('verification_documents', filtered);
  }
};

export const updateVerificationDocumentStatus = async (
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  notes?: string
): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'verificationDocuments', id), { status, ...(notes !== undefined ? { notes } : {}) });
  } else {
    const docs = getStorageItem<VerificationDocument[]>('verification_documents', []);
    const index = docs.findIndex(d => d.id === id);
    if (index !== -1) {
      docs[index].status = status;
      if (notes !== undefined) docs[index].notes = notes;
      setStorageItem('verification_documents', docs);
    }
  }
};

// ==========================================
// VISIT REQUEST RESCHEDULING & STAFF ASSIGNMENT
// ==========================================

export const rescheduleVisitRequest = async (
  requestId: string,
  scheduledDate: string,
  assignedOwnerId: string,
  visitNotes: string,
  adminId: string,
  adminName: string
): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'apartmentRequests', requestId), {
      status: 'scheduled',
      scheduledDate,
      assignedOwnerId,
      visitNotes
    });
  } else {
    const requests = getStorageItem('requests', SEED_REQUESTS);
    const index = requests.findIndex(r => r.id === requestId);
    if (index !== -1) {
      requests[index] = {
        ...requests[index],
        status: 'scheduled',
        scheduledDate,
        assignedOwnerId,
        visitNotes
      };
      setStorageItem('requests', requests);
    }
  }

  await createAuditLog({
    adminId,
    adminName,
    action: `Rescheduled visit request "${requestId}" to ${scheduledDate} and assigned owner "${assignedOwnerId}"`,
    entityType: 'request',
    entityId: requestId,
    newValue: `Scheduled: ${scheduledDate} | Owner: ${assignedOwnerId}`
  });
};

// ==========================================
// LEASE AGREEMENT LIFECYCLE HELPERS
// ==========================================

export const renewLeaseAgreement = async (
  customerId: string,
  data: {
    leaseAgreementNumber: string;
    leaseStartDate: string;
    leaseEndDate: string;
    leaseMonthlyRent: number;
    leaseSecurityDeposit: number;
    leaseElectricityRate: number;
    leaseSpecialConditions: string;
  },
  adminId: string,
  adminName: string
): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'users', customerId), {
      ...data,
      leaseStatus: 'active'
    });
  } else {
    const users = getStorageItem<UserProfile[]>('users', SEED_USERS);
    const index = users.findIndex(u => u.uid === customerId);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        ...data,
        leaseStatus: 'active'
      };
      setStorageItem('users', users);
    }
  }

  await createAuditLog({
    adminId,
    adminName,
    action: `Renewed lease agreement "${data.leaseAgreementNumber}" for customer "${customerId}"`,
    entityType: 'user',
    entityId: customerId,
    newValue: `Number: ${data.leaseAgreementNumber} | Period: ${data.leaseStartDate} to ${data.leaseEndDate}`
  });
};

export const terminateLeaseAgreement = async (
  customerId: string,
  roomId: string | undefined,
  adminId: string,
  adminName: string
): Promise<void> => {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'users', customerId), {
      leaseStatus: 'terminated'
    });
  } else {
    const users = getStorageItem<UserProfile[]>('users', SEED_USERS);
    const index = users.findIndex(u => u.uid === customerId);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        leaseStatus: 'terminated'
      };
      setStorageItem('users', users);
    }
  }

  // If a room is assigned, remove assignment automatically
  if (roomId) {
    await removeRoomFromCustomer(roomId, adminId, adminName);
  }

  await createAuditLog({
    adminId,
    adminName,
    action: `Terminated lease agreement for customer "${customerId}"`,
    entityType: 'user',
    entityId: customerId,
    newValue: 'terminated'
  });
};

export const getCustomerAuditTimeline = async (
  customerId: string
): Promise<AuditLog[]> => {
  const allLogs = await getAuditLogs();
  // Filter logs where the action string mentions the customer ID or customer name or entityId matches customerId
  return allLogs.filter(log => 
    log.entityId === customerId || 
    log.action.toLowerCase().includes(customerId.toLowerCase())
  ).sort((a, b) => b.timestamp - a.timestamp);
};
export const subscribeToVerificationDocuments = (callback: (docs: VerificationDocument[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'verificationDocuments'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as VerificationDocument))
        .sort((a, b) => b.createdAt - a.createdAt);
      callback(docs);
    });
  } else {
    const docs = getStorageItem<VerificationDocument[]>('verification_documents', []);
    callback(docs);
    const interval = setInterval(() => {
      const currentDocs = getStorageItem<VerificationDocument[]>('verification_documents', []);
      callback(currentDocs);
    }, 2000);
    return () => clearInterval(interval);
  }
};

export const subscribeToAuditLogs = (callback: (logs: AuditLog[]) => void): (() => void) => {
  if (isFirebaseConfigured) {
    return onSnapshot(collection(db, 'audit_logs'), (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog))
        .sort((a, b) => b.timestamp - a.timestamp);
      callback(logs);
    });
  } else {
    const logs = getStorageItem<AuditLog[]>('audit_logs', []);
    callback(logs);
    const interval = setInterval(() => {
      const currentLogs = getStorageItem<AuditLog[]>('audit_logs', []);
      callback(currentLogs);
    }, 2000);
    return () => clearInterval(interval);
  }
};

export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> => {
  if (isFirebaseConfigured) {
    return await uploadToCloudinary(file, onProgress);
  } else {
    if (onProgress) onProgress(100);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }
};

// ==========================================
// ADMIN MANAGEMENT CRUD
// ==========================================

const ADMIN_STORE = 'sams_admin_profiles';

const loadAdminProfiles = (): AdminProfile[] => {
  try {
    const raw = localStorage.getItem(ADMIN_STORE);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  // Seed default super admin
  const defaults: AdminProfile[] = [
    {
      uid: 'admin-id',
      email: 'admin@sams.com',
      displayName: 'Admin Operator',
      role: 'super_admin',
      department: 'Platform',
      permissions: ['apartments.read','apartments.write','apartments.delete','rooms.read','rooms.write','rooms.delete','customers.read','customers.write','customers.delete','owners.read','owners.write','owners.delete','billing.read','billing.write','electricity.read','electricity.write','complaints.read','complaints.write','documents.read','documents.write','analytics.read','notifications.send','audit.read','settings.manage','admins.manage','export.all'],
      status: 'active',
      twoFAEnabled: true,
      emailVerified: true,
      createdAt: Date.now() - 90 * 86400000,
      lastLogin: Date.now() - 3600000,
      ipAddress: '192.168.1.1',
    },
    {
      uid: 'admin-finance-id',
      email: 'finance@sams.com',
      displayName: 'Finance Manager',
      role: 'finance_admin',
      department: 'Finance',
      permissions: ['billing.read','billing.write','electricity.read','electricity.write','customers.read','analytics.read','export.all'],
      status: 'active',
      twoFAEnabled: false,
      emailVerified: true,
      createdAt: Date.now() - 60 * 86400000,
      lastLogin: Date.now() - 86400000 * 2,
    },
    {
      uid: 'admin-support-id',
      email: 'support@sams.com',
      displayName: 'Customer Support',
      role: 'customer_support',
      department: 'Support',
      permissions: ['customers.read','customers.write','complaints.read','complaints.write','documents.read','notifications.send'],
      status: 'active',
      twoFAEnabled: false,
      emailVerified: true,
      createdAt: Date.now() - 30 * 86400000,
    },
    {
      uid: 'admin-ops-id',
      email: 'ops@sams.com',
      displayName: 'Operations Lead',
      role: 'operations',
      department: 'Operations',
      permissions: ['apartments.read','rooms.read','rooms.write','complaints.read','complaints.write','documents.read'],
      status: 'suspended',
      twoFAEnabled: false,
      emailVerified: false,
      createdAt: Date.now() - 10 * 86400000,
    },
  ];
  saveAdminProfiles(defaults);
  return defaults;
};

const saveAdminProfiles = (profiles: AdminProfile[]) => {
  localStorage.setItem(ADMIN_STORE, JSON.stringify(profiles));
};

export const getAdminProfiles = async (): Promise<AdminProfile[]> => {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'adminProfiles'));
      return snap.docs.map(d => ({ uid: d.id, ...d.data() } as AdminProfile));
    } catch { /* fallback */ }
  }
  return loadAdminProfiles();
};

export const getAdminProfile = async (uid: string): Promise<AdminProfile | null> => {
  const all = await getAdminProfiles();
  return all.find(a => a.uid === uid) ?? null;
};

export const createAdminProfile = async (profile: Omit<AdminProfile, 'uid' | 'createdAt'>): Promise<string> => {
  const uid = `admin-${Date.now()}`;
  const newProfile: AdminProfile = { ...profile, uid, createdAt: Date.now() };
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'adminProfiles', uid), newProfile);
      return uid;
    } catch { /* fallback */ }
  }
  const all = loadAdminProfiles();
  all.push(newProfile);
  saveAdminProfiles(all);
  return uid;
};

export const updateAdminProfile = async (uid: string, updates: Partial<AdminProfile>): Promise<void> => {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'adminProfiles', uid), updates as Record<string, unknown>);
      return;
    } catch { /* fallback */ }
  }
  const all = loadAdminProfiles();
  const idx = all.findIndex(a => a.uid === uid);
  if (idx !== -1) all[idx] = { ...all[idx], ...updates };
  saveAdminProfiles(all);
};

export const deleteAdminProfile = async (uid: string): Promise<void> => {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'adminProfiles', uid));
      return;
    } catch { /* fallback */ }
  }
  const all = loadAdminProfiles().filter(a => a.uid !== uid);
  saveAdminProfiles(all);
};
