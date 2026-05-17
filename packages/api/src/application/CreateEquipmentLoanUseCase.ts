import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { EquipmentLoanDTO, CreateEquipmentLoanRequest } from '@alentapp/shared';

export class CreateEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepo: EquipmentLoanRepository,
        private readonly memberRepo: MemberRepository
    ) {}

    async execute(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        if (!data.item_name || data.item_name.trim() === '') {
            throw new Error('El nombre del ítem es requerido');
        }

        if (!data.member_id) {
            throw new Error('El campo member_id es requerido');
        }

        if (data.due_date) {
            const dueDate = new Date(data.due_date);
            if (isNaN(dueDate.getTime())) {
                throw new Error('Formato de fecha de devolución inválido');
            }
            if (dueDate <= new Date()) {
                throw new Error('La fecha de devolución debe ser futura');
            }
        }
        const member = await this.memberRepo.findById(data.member_id);

        if (!member) {
            throw new Error('El socio no existe');
        }

        if (member.status !== 'Activo') {
            throw new Error('El socio no está en estado Activo');
        }

        if (member.category === 'Cadete') {
            throw new Error('Los socios Cadet no pueden solicitar préstamos');
        }

        return this.equipmentLoanRepo.create(data);
    }
}