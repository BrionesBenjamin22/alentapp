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
// Sport
// ==========================================

export interface SportDTO {
  id: string;
  name: string;
  description: string;
  maxCapacity: number;
  additionalPrice: number;
  isFederated: boolean;
  enrolledCount: number;
  availableSlots: number;
  created_at: string; 
  updated_at: string; 
}

export interface CreateSportRequest {
  name: string;
  description: string;
  maxCapacity: number;
  additionalPrice?: number;
  isFederated?: boolean;
}