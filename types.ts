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
  notes?: string; // Add notes field
  paymentDate?: string; // ISO string for when the last payment part was made
  userId?: string;
}

export interface Contractor {
  id: string;
  name: string; // Contact Person Name
  contact: string; // Contact Phone
  companyName?: string;
  companyAddress?: string;
  email?: string;
  comments?: string;
  userId?: string;
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
  userId?: string;
}

export interface Property {
  id:string;
  name: string;
  address: string;
  tenants: Tenant[];
  leaseStart: string; // ISO string
  leaseEnd: string; // ISO string
  securityDeposit: number;
  rentAmount: number; // This is the standard monthly rent bill amount
  utilitiesToTrack: string[];
  userId?: string;
}