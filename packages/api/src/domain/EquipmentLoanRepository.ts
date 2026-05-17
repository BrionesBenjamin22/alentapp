import { EquipmentLoanDTO, CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

export interface EquipmentLoanRepository {
    create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
    getAll(): Promise<EquipmentLoanDTO[]>;
    getById(id: string): Promise<EquipmentLoanDTO | null>;
    update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
}