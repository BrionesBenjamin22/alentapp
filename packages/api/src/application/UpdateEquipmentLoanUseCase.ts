import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { UpdateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

export class UpdateEquipmentLoanUseCase {
    constructor(private equipmentLoanRepository: EquipmentLoanRepository) {}

    async execute(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const currentLoan = await this.equipmentLoanRepository.getById(id);
        
        if (!currentLoan) {
            throw new Error('NOT_FOUND');
        }

        // Validación de la máquina de estados
        if (data.status && data.status !== currentLoan.status) {
            if (currentLoan.status === 'Returned' || currentLoan.status === 'Damaged') {
                throw new Error('INVALID_TRANSITION'); // Son estados terminales
            }
        }

        // Validación de fecha de devolución lógica
        if (data.due_date) {
            const loanDate = new Date(currentLoan.loan_date);
            const dueDate = new Date(data.due_date);
            if (dueDate < loanDate) {
                throw new Error('INVALID_DUE_DATE');
            }
        }

        return this.equipmentLoanRepository.update(id, data);
    }
}