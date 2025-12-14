
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ENGINEER = 'ENGINEER'
}

export enum TaskStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export enum ClientType {
  INDIVIDUAL = 'Физлицо',
  COMPANY = 'ТОО/ИП',
  GOV = 'Гос. учреждение'
}

export enum AttendanceStatus {
  PRESENT = 'Присутствовал',
  LATE = 'Опоздал',
  SICK = 'Больничный',
  LEAVE = 'Отгул',
  ABSENT = 'Прогул',
  FIRED = 'Уволен'
}

// --- NEW ROLE SYSTEM TYPES ---

export type ResourceAction = 'view' | 'create' | 'edit' | 'delete';

export interface Permission {
  resourceId: string;
  actions: ResourceAction[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean; // System roles cannot be deleted
  permissions: Permission[];
}

// --- FINANCE TYPES ---

export type AccountType = 'Cash' | 'Bank' | 'SubAccount';

export interface FinancialAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  accountNumber?: string; // IIK for Banks
  parentId?: string; // For SubAccounts (Cards linked to main account)
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  accountId: string;
  description?: string;
  is1C?: boolean; // Flag for 1C statement entries
}

// -----------------------------

export interface User {
  id: string;
  name: string;
  role: UserRole; // Kept for backward compatibility, ideally would be roleId
  customRoleId?: string; // Link to the dynamic Role
  avatar: string;
  position?: string; 
  phone?: string;
  salary: number; 
  
  // System Access Fields
  email?: string; 
  password?: string;
  isSystemUser?: boolean; 
}

export interface Advance {
  id: string;
  userId: string;
  amount: number;
  date: string;
  comment?: string;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  phone: string;
  address: string;
  balance: number;
}

export interface Task {
  id: string;
  title: string;
  clientName: string;
  address: string;
  deadline: string;
  status: TaskStatus;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  engineerId?: string;
  // New fields for Recurring Tasks
  isRecurring?: boolean; 
  maintenanceObjectId?: string;
}

export interface Sale {
  id: string;
  date: string;
  clientName: string;
  amount: number;
  items: string[];
  status: 'Paid' | 'Pending';
}

export interface TimeEntry {
  id: string;
  userId: string; 
  date: string; 
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  totalHours: number;
  comment?: string;
  location?: { lat: number; lng: number }; 
}

export interface MonthlyService {
  id: string;
  clientName: string;
  objectName: string; 
  serviceType: 'GPS' | 'CCTV' | 'Access Control';
  amount: number;
  status: 'Done' | 'Pending';
  month: string;
}

export interface GpsTracker {
  id: string;
  model: string;
  imei: string;
  simNumber: string;
  clientId: string;
  clientName: string;
  status: 'Active' | 'Inactive';
  installDate: string;
}

export interface CmsObject {
  id: string;
  name: string;
  address: string;
  contractNumber: string;
  monthlyFee: number;
  clientId: string;
  clientName: string;
  status: 'Active' | 'Suspended';
  connectionDate: string;
}

export interface MaintenanceObject {
  id: string;
  type: 'CCTV' | 'APS' | 'OPS' | 'ACCESS';
  name: string;
  address: string;
  monthlyFee: number;
  clientId: string;
  clientName: string;
  status: 'Active' | 'Paused';
  lastCheckDate: string;
}
