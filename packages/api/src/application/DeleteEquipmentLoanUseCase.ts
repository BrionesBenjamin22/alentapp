import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

export class DeleteEquipmentLoanUseCase {
    constructor(private equipmentLoanRepository: EquipmentLoanRepository) {}

    async execute(id: string): Promise<EquipmentLoanDTO> {
        const currentLoan = await this.equipmentLoanRepository.getById(id);
        
        // 1. Validar existencia
        if (!currentLoan) {
            throw new Error('NOT_FOUND');
        }

        // 2. Validar que solo se pueda eliminar si está "Loaned"
        if (currentLoan.status === 'Returned' || currentLoan.status === 'Damaged') {
            throw new Error('INVALID_STATUS');
        }

        return this.equipmentLoanRepository.delete(id);
    }
}