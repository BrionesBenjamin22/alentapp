import type { CreatePaymentRequest, PaymentDTO, PaymentStatus, UpdatePaymentRequest } from '@alentapp/shared';
import type { MemberRepository } from '../MemberRepository.js';

const PAYMENT_STATUSES: PaymentStatus[] = ['Pending', 'Paid', 'Canceled'];
const MIN_VALID_YEAR = 1900;

export class PaymentValidator {
    constructor(private readonly memberRepo: MemberRepository) {}

    async validateForCreate(data: CreatePaymentRequest): Promise<void> {
        this.validateMemberId(data.member_id);
        await this.validateMemberExists(data.member_id);
        this.validateAmount(data.amount);
        this.validateMonth(data.month);
        this.validateYear(data.year);
        this.validateDueDate(data.due_date);
        this.validateStatus(data.status);
        this.validatePaymentDate(data.status ?? 'Pending', data.payment_date);
    }

    validateForUpdate(data: UpdatePaymentRequest, existingPayment: PaymentDTO): void {
        this.validateMemberIsNotModified(data);

        if (data.amount !== undefined) {
            this.validateAmount(data.amount);
        }

        if (data.month !== undefined) {
            this.validateMonth(data.month);
        }

        if (data.year !== undefined) {
            this.validateYear(data.year);
        }

        if (data.due_date !== undefined) {
            this.validateDueDate(data.due_date);
        }

        this.validateStatus(data.status);

        const finalStatus = data.status ?? existingPayment.status;
        const finalPaymentDate = data.payment_date !== undefined
            ? data.payment_date
            : existingPayment.payment_date;
        this.validatePaymentDate(finalStatus, finalPaymentDate);
    }

    validateMemberIsNotModified(data: UpdatePaymentRequest): void {
        if ('member_id' in data || 'id' in data) {
            throw new Error('No se puede modificar el socio asociado al pago');
        }
    }

    validateMemberId(memberId: string): void {
        if (!memberId || typeof memberId !== 'string') {
            throw new Error('El socio asociado al pago es obligatorio');
        }
    }

    async validateMemberExists(memberId: string): Promise<void> {
        const member = await this.memberRepo.findById(memberId);
        if (!member) {
            throw new Error('El socio asociado al pago no existe');
        }
    }

    validateAmount(amount: number): void {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('El monto del pago debe ser mayor a cero');
        }
    }

    validateMonth(month: number): void {
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            throw new Error('El mes debe estar comprendido entre 1 y 12');
        }
    }

    validateYear(year: number): void {
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(year) || year < MIN_VALID_YEAR || year > currentYear + 1) {
            throw new Error('El año del pago no es válido');
        }
    }

    validateDueDate(dueDate: string): void {
        if (!this.isValidDate(dueDate)) {
            throw new Error('La fecha de vencimiento del pago no es válida');
        }
    }

    validateStatus(status?: PaymentStatus): void {
        if (status && !PAYMENT_STATUSES.includes(status)) {
            throw new Error('El estado del pago no es válido');
        }
    }

    validatePaymentDate(status: PaymentStatus, paymentDate?: string | null): void {
        if (status === 'Paid' && !paymentDate) {
            throw new Error('La fecha de pago es obligatoria para pagos abonados');
        }

        if (status === 'Pending' && paymentDate) {
            throw new Error('Un pago pendiente no debe tener fecha de pago');
        }

        if (paymentDate && !this.isValidDate(paymentDate)) {
            throw new Error('La fecha de pago no es válida');
        }
    }

    private isValidDate(value: string): boolean {
        const date = new Date(value);
        return Boolean(value) && !Number.isNaN(date.getTime());
    }
}
