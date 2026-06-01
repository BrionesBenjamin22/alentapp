import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentLoansView } from './EquipmentLoan';
import { Provider } from '../components/ui/provider';

import { loansService } from '../services/loans';
import { membersService } from '../services/members';
import type { EquipmentLoanDTO, MemberDTO } from '@alentapp/shared';

// 1. Mockeamos el servicio de préstamos
vi.mock('../services/loans', () => ({
  loansService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

// 2. Mockeamos el servicio de miembros (¡Clave para que no falle el fetch paralelo!)
vi.mock('../services/members', () => ({
  membersService: {
    getAll: vi.fn(),
  }
}));

describe('Vista de Préstamos de Equipamiento (EquipmentLoansView)', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<Provider>{ui}</Provider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar el estado de carga y luego renderizar una tabla vacía', async () => {
    // Simulamos que el backend no tiene datos
    vi.mocked(loansService.getAll).mockResolvedValueOnce([]);
    vi.mocked(membersService.getAll).mockResolvedValueOnce([]);

    renderWithProviders(<EquipmentLoansView />);

    // Verificamos el estado de carga exacto de tu componente
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();

    // Esperamos a que termine de cargar
    await waitFor(() => {
      expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
    });
    
    // Verificamos el empty state exacto de tu componente
    expect(screen.getByText('No hay préstamos registrados.')).toBeInTheDocument();
  });

  it('debe renderizar la lista de préstamos y cruzar el nombre del socio correctamente', async () => {
    const mockMembers = [
      { id: 'socio-1', name: 'Socio Test', dni: '12345678', category: 'Pleno', status: 'Activo' }
    ] as MemberDTO[];

    const mockLoans = [
      { id: '1', item_name: 'Pelota de Básquet', status: 'Loaned', loan_date: '2026-05-18T10:00:00Z', due_date: null, member_id: 'socio-1', deleted_at: null }
    ] as EquipmentLoanDTO[];
    
    vi.mocked(membersService.getAll).mockResolvedValueOnce(mockMembers);
    vi.mocked(loansService.getAll).mockResolvedValueOnce(mockLoans);

    renderWithProviders(<EquipmentLoansView />);

    // Esperamos que aparezca el nombre del socio (que se cruza desde el ID)
    await waitFor(() => {
      expect(screen.getByText('Socio Test')).toBeInTheDocument();
    });

    // Verificamos que aparezca el ítem
    expect(screen.getByText('Pelota de Básquet')).toBeInTheDocument();
  });

  it('debe permitir registrar un nuevo préstamo', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    
    // Necesitamos un socio activo para que aparezca en el <select>
    const mockMembers = [{ id: 'socio-1', name: 'Socio Test', dni: '12345678', category: 'Pleno', status: 'Activo' }] as MemberDTO[];
    vi.mocked(membersService.getAll).mockResolvedValueOnce(mockMembers);
    vi.mocked(loansService.getAll).mockResolvedValue([]);
    
    vi.mocked(loansService.create).mockResolvedValueOnce({
      id: '3', item_name: 'Raqueta', status: 'Loaned', loan_date: new Date().toISOString(), due_date: null, member_id: 'socio-1', deleted_at: null
    } as EquipmentLoanDTO);

    renderWithProviders(<EquipmentLoansView />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
    });

    // Abrimos el modal
    const addButton = screen.getByRole('button', { name: /Registrar Préstamo/i });
    await user.click(addButton);

    // Seleccionamos al socio (buscamos el select y elegimos el id 'socio-1')
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'socio-1');

    // Llenamos el ítem
    const inputNombre = screen.getByPlaceholderText('Ej. Pelota de Básquet');
    await user.type(inputNombre, 'Raqueta');

    // Clic en submit
    const submitButton = screen.getByRole('button', { name: 'Crear Préstamo' });
    await user.click(submitButton);

    // Verificamos que el servicio create fue llamado con la data armada
    expect(loansService.create).toHaveBeenCalledWith(expect.objectContaining({
      member_id: 'socio-1',
      item_name: 'Raqueta',
      due_date: ''
    }));
  });

  it('debe permitir eliminar un préstamo con confirmación (Soft Delete)', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    
    const mockLoans = [
      { id: 'loan-1', item_name: 'Pelota', status: 'Loaned', member_id: 'socio-1' }
    ] as EquipmentLoanDTO[];
    
    vi.mocked(membersService.getAll).mockResolvedValue([]);
    vi.mocked(loansService.getAll).mockResolvedValue(mockLoans);
    vi.mocked(loansService.delete).mockResolvedValueOnce({
        ...mockLoans[0],
        deleted_at: new Date().toISOString()
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<EquipmentLoansView />);

    await waitFor(() => {
      expect(screen.getByText('Pelota')).toBeInTheDocument();
    });

    // Usamos el aria-label del tachito que definiste en tu componente
    const deleteButton = screen.getByLabelText(/Eliminar préstamo/i);
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('¿Estás seguro de que deseas eliminar este préstamo?');
    expect(loansService.delete).toHaveBeenCalledWith('loan-1');
    
    confirmSpy.mockRestore();
  });

  it('debe permitir editar el estado de un préstamo a Devuelto', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    
    const mockLoans = [
      { id: 'loan-1', item_name: 'Pelota', status: 'Loaned', member_id: 'socio-1' }
    ] as EquipmentLoanDTO[];
    
    vi.mocked(membersService.getAll).mockResolvedValue([]);
    vi.mocked(loansService.getAll).mockResolvedValue(mockLoans);
    vi.mocked(loansService.update).mockResolvedValueOnce({
      ...mockLoans[0],
      status: 'Returned'
    } as EquipmentLoanDTO);

    renderWithProviders(<EquipmentLoansView />);

    await waitFor(() => {
      expect(screen.getByText('Pelota')).toBeInTheDocument();
    });

    const editButton = screen.getByLabelText(/Editar préstamo/i);
    await user.click(editButton);

    // Tu componente tiene varios selects (socio en crear, estado en editar)
    // El combobox de estado es el único visible en el modal de edición
    const selectEstado = screen.getByRole('combobox');
    await user.selectOptions(selectEstado, 'Returned');

    const submitButton = screen.getByRole('button', { name: 'Guardar Cambios' });
    await user.click(submitButton);

    expect(loansService.update).toHaveBeenCalledWith('loan-1', expect.objectContaining({
      status: 'Returned'
    }));
  });
});