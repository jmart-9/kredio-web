export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;          
  roleName: string;      
  permissions: string[]; 
  tenantId?: string;
}

export interface Client {
  id: string;
  fullName: string;
  dpiOrId: string;
  phone: string;
  countryCode: string;  // "SV", "GT", "HN", etc.
  email?: string;
  address?: string;
  createdAt: string;
}


export interface Loan {
  id: string;
  clientId: string;
  clientName?: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  status: 'PENDING' | 'ACTIVE' | 'PAID' | 'DEFAULTED';
  currentBalance: number;
  createdAt: string;
  amortizationMethod: string;
  paymentFrequency: string;
  dayCountConvention?: string;
  earlyRepaymentPolicy?: string;
  graceDays?: number;
  adjustForBusinessDays?: boolean;
  openingDate?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
}

export interface Payment {
  id: string;
  loanId: string;
  amountPaid: number;
  paymentDate: string;
  method: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  tenantId: string;
  fullName: string;
  role: string;
  email: string;
  roleName?: string;
  permissions?: string[];
}

// ==========================================
// TIPOS PARA ADMIN GLOBAL
// ==========================================

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  schemaName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  countryId?: string;
  currencyCode?: string;
  currencySymbol?: string;
  planId?: string;
  planStartDate?: string;
  planEndDate?: string;
  isTrial?: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
  customBrandingEnabled?: boolean;
  logoUrl?: string;
  createdAt: string;
}

export interface SaasPlan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  trialDays?: number;
  maxUsers: number;
  maxActiveLoans: number;
  maxPortfolioVolume: number;
  maxCollectors: number;
  maxClients: number;
  maxCustomRoles: number;
  maxCustomInterestRates: number;
  features?: string;
  supportLevel?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface GlobalDashboardStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  cancelledTenants: number;
  trialTenants: number;
  totalUsers: number;
  monthlyRecurringRevenue: number;
  totalPortfolioValue: number;
  tenantsByPlan: Record<string, number>;
  expiringTrials: TenantAlert[];
  exceededLimits: TenantAlert[];
}

export interface TenantAlert {
  tenantName: string;
  subdomain: string;
  alertType: 'TRIAL_EXPIRING' | 'LIMIT_EXCEEDED';
  message: string;
  daysRemaining: number;
}

export interface TenantCreateRequest {
  name: string;
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

export interface PlanCreateRequest {
  name: string;
  description?: string;
  monthlyPrice: number;
  trialDays?: number;
  maxUsers: number;
  maxActiveLoans: number;
  maxPortfolioVolume: number;
  maxCollectors: number;
  maxClients: number;
  maxCustomRoles: number;
  maxCustomInterestRates: number;
  features?: string;
  supportLevel?: string;
}

// ==========================================
// TIPOS PARA GESTIÓN DE PAGOS
// ==========================================

export interface Payment {
  id: string;
  loanId: string;
  collectorId: string;
  amountPaid: number;
  previousBalance: number;
  newBalance: number;
  paymentDate: string;
  method: string;
  isPrinted: boolean;
  syncedFromOffline: boolean;
  isVoided?: boolean;
  voidedAt?: string;
}

export interface LoanSchedule {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  expectedPrincipal: number;
  expectedInterest: number;
  paidAmount?: number;
  paidDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
}

export interface PaymentRequest {
  loanId: string;
  collectorId: string;
  amountPaid: number;
  method: string;
  isPrinted?: boolean;
  syncedFromOffline?: boolean;
}