export class DisciplineValidator {
  validateReason(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      throw new Error('El motivo de la sanción es obligatorio');
    }
  }

  validateStartDate(startDate: string): void {
    if (!this.isValidDate(startDate)) {
      throw new Error('La fecha de inicio no es válida');
    }
  }

  validateEndDate(endDate: string): void {
    if (!this.isValidDate(endDate)) {
      throw new Error('La fecha de fin no es válida');
    }
  }

  validateDateRange(startDate: string, endDate: string): void {
    this.validateStartDate(startDate);
    this.validateEndDate(endDate);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end.getTime() <= start.getTime()) {
      throw new Error('La fecha de fin debe ser posterior a la de inicio');
    }
  }

  private isValidDate(value: string): boolean {
    if (!value || value.trim().length === 0) {
      return false;
    }

    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }
}
