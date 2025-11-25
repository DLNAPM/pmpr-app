
import { RepairStatus } from "./types";

export const UTILITY_CATEGORIES = [
  'Water',
  'Electricity',
  'Gas',
  'Internet',
  'Cable',
  'Trash',
  'Other',
];

export const REPAIR_STATUS_OPTIONS = [
    RepairStatus.PENDING_REPAIRMEN,
    RepairStatus.PENDING_SUPPLY,
    RepairStatus.IN_PROGRESS,
    RepairStatus.COMPLETE,
];

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
];