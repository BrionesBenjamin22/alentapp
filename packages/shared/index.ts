// ==========================================
// Member
// ==========================================
export type MemberCategory = 'Pleno' | 'Cadete' | 'Honorario';
export type MemberStatus = 'Activo' | 'Moroso' | 'Suspendido';

export interface MemberDTO {
  id: string; // UUID
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
  status: MemberStatus;
  created_at: string; // ISO Date String
}

export interface CreateMemberRequest {
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
}

export interface UpdateMemberRequest {
  dni?: string;
  name?: string;
  email?: string;
  birthdate?: string; // ISO Date String (YYYY-MM-DD)
  category?: MemberCategory;
  status?: MemberStatus;
}

// ==========================================
// Payment
// ==========================================
export type PaymentStatus = 'Pending' | 'Paid' | 'Canceled';

export interface PaymentDTO {
  id: string; // UUID
  amount: number;
  month: number;
  year: number;
  status: PaymentStatus;
  due_date: string; // ISO Date String (YYYY-MM-DD)
  payment_date: string | null; // ISO DateTime String
  member_id: string; // UUID
  created_at: string; // ISO DateTime String
  updated_at: string; // ISO DateTime String
}

export interface CreatePaymentRequest {
  amount: number;
  month: number;
  year: number;
  due_date: string; // ISO Date String (YYYY-MM-DD)
  member_id: string; // UUID
  status?: PaymentStatus;
  payment_date?: string | null; // ISO DateTime String
}

export interface UpdatePaymentRequest {
  amount?: number;
  month?: number;
  year?: number;
  due_date?: string; // ISO Date String (YYYY-MM-DD)
  status?: PaymentStatus;
  payment_date?: string | null; // ISO DateTime String
}

export type PaymentResponse = PaymentDTO;

// ==========================================
// Discipline
// ==========================================
export interface DisciplineDTO {
  id: string;
  memberId: string;
  reason: string;
  startDate: string;
  endDate: string;
  isTotalSuspension: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisciplineRequest {
  memberId: string;
  reason: string;
  startDate: string;
  endDate: string;
  isTotalSuspension: boolean;
}

export interface UpdateDisciplineRequest {
  reason?: string;
  startDate?: string;
  endDate?: string;
  isTotalSuspension?: boolean;
}

// ==========================================
// Equipment Loan
// ==========================================
export interface EquipmentLoanDTO {
  id: string;
  item_name: string;
  status: 'Loaned' | 'Returned' | 'Damaged';
  loan_date: string;
  due_date: string | null;
  member_id: string;
  deleted_at: string | null;
}

export interface CreateEquipmentLoanRequest {
  member_id: string;
  item_name: string;
  due_date?: string;
}

export interface UpdateEquipmentLoanRequest {
  status?: 'Loaned' | 'Returned' | 'Damaged';
  due_date?: string;
}