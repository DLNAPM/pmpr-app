
export enum RepairStatus {
  PENDING_REPAIRMEN = 'Pending Repairmen',
  PENDING_SUPPLY = 'Pending Supply',
  IN_PROGRESS = 'In Progress',
  COMPLETE = 'Complete',
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface UtilityPayment {
  category: string;
  billAmount: number;
  paidAmount: number;
}

export interface Payment {
  id: string;
  propertyId: string;
  month: number; // 1-12
  year: number;
  rentBillAmount: number;
  rentPaidAmount: number;
  utilities: UtilityPayment[];
  notes?: string;
  paymentDate?: string; // ISO string for when the last payment part was made
  userId: string;
}

export interface Contractor {
  id: string;
  name: string; // Contact Person Name
  contact: string; // Contact Phone
  companyName?: string;
  companyAddress?: string;
  email?: string;
  comments?: string;
  userId: string;
}

export interface Repair {
  id: string;
  propertyId: string;
  description: string;
  status: RepairStatus;
  contractorId?: string;
  cost: number; // This is the bill amount for the repair
  notes?: string;
  requestDate: string; // ISO string
  repairDate?: string; // ISO string for when the repair was done
  completionDate?: string; // ISO string for when status became 'Complete'
  userId: string;
}

export interface Room {
  id: string;
  title: string;
  type: string;
  squareFootage: number;
  maxOccupancy: number;
  rentAmount?: number;
  securityDeposit?: number;
  leaseStart?: string; // ISO string
  leaseEnd?: string; // ISO string
  tenants?: Tenant[];
  leaseNumber?: string; // Random Lease#
}

export interface Lease {
  id: string;
  propertyId: string;
  roomId?: string; // Optional: denotes if the lease is for a specific room specifically
  leaseNumber?: string; // Randomly generated Lease#
  leaseStart: string; // ISO string
  leaseEnd: string; // ISO string
  rentAmount: number;
  securityDeposit?: number;
  tenants: Tenant[];
  status: 'active' | 'historic' | 'upcoming';
  notes?: string;
}

export interface Property {
  id:string;
  name: string;
  address: string;
  tenants: Tenant[];
  leaseStart: string; // ISO string (current)
  leaseEnd: string; // ISO string (current)
  securityDeposit: number;
  rentAmount: number; // This is the standard monthly rent bill amount
  utilitiesToTrack: string[];
  userId: string;
  ownerInfo?: { name: string; email: string }; // Optional field to display owner info for shared properties
  leaseHistory?: Lease[]; // Added to track multiple leases
  rooms?: Room[]; // New list of rooms in dynamic setup
}

export interface DBOwner {
  id: string;
  name: string;
  email: string;
}

export interface Share {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  viewerEmail: string;
  viewerId?: string;
  propertyId: string;
  propertyName: string;
}

export interface Notification {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  message: string;
  timestamp: string; // ISO string
  isAcknowledged: boolean;
  userId: string; // Same as senderId for ownership rules
}

export interface UserProfile {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogo?: string; // Base64 image string
  isPro?: boolean;
  isAdmin?: boolean;
}

export interface LeaseTemplate {
  id: string;
  name: string;
  content: string; // The text with placeholders like {{landlord}}, {{tenant}}, etc.
  userId: string;
}

export interface User extends UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
}
