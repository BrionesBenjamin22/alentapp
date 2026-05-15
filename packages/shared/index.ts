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
