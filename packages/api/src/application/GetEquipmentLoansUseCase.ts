import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

export class GetEquipmentLoansUseCase {
    constructor(private equipmentLoanRepository: EquipmentLoanRepository) {}

    async execute(): Promise<EquipmentLoanDTO[]> {
        return this.equipmentLoanRepository.getAll();
    }
}