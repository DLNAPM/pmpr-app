
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
  amount: number;
  isPaid: boolean;
}

export interface Payment {
  id: string;
  propertyId: string;
  month: number; // 1-12
  year: number;
  rentAmount: number;
  rentPaid: boolean;
  utilities: UtilityPayment[];
  paymentDate?: string; // ISO string
}

export interface Repair {
  id: string;
  propertyId: string;
  description: string;
  status: RepairStatus;
  contractorName?: string;
  contractorContact?: string;
  cost: number;
  notes?: string;
  requestDate: string; // ISO string
  completionDate?: string; // ISO string
}

export interface Property {
  id:string;
  name: string;
  address: string;
  tenants: Tenant[];
  leaseStart: string; // ISO string
  leaseEnd: string; // ISO string
  securityDeposit: number;
  rentAmount: number;
  utilitiesToTrack: string[];
}
