export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  tenantId: string;
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
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  status: string;
  currentBalance: number;
  createdAt: string;
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
}