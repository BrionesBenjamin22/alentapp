import { EquipmentLoanDTO, CreateEquipmentLoanRequest } from '@alentapp/shared';

export interface EquipmentLoanRepository {
    create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
}