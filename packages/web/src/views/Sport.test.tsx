import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportsView } from './Sports';
import { Provider } from '../components/ui/provider';
import { sportsService } from '../services/sports';
import type { SportDTO } from '@alentapp/shared';


vi.mock('../services/sports', () => ({
  sportsService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteSport: vi.fn() 
  }
}));

describe('Vista de Deportes (SportsView)', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<Provider>{ui}</Provider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar el estado de carga y luego renderizar una tabla vacía', async () => {
    // Simulamos que el backend no tiene deportes
    vi.mocked(sportsService.getAll).mockResolvedValueOnce([]);

    renderWithProviders(<SportsView />);

    // Verificamos el estado de carga
    expect(screen.getByText('Cargando deportes...')).toBeInTheDocument();

    // Esperamos a que la promesa se resuelva
    await waitFor(() => {
      expect(screen.queryByText('Cargando deportes...')).not.toBeInTheDocument();
    });
    
    // Verificamos que se renderice el empty state
    expect(screen.getByText('No se encontraron deportes.')).toBeInTheDocument();
  });

  it('debe renderizar la lista de deportes si el backend responde exitosamente', async () => {
    const mockSports = [
      { id: '1', name: 'Fútbol', description: 'Deporte de 11v11', maxCapacity: 22, additionalPrice: 0, isFederated: true, created_at: '', updated_at: '' },
      { id: '2', name: 'Tenis', description: 'Deporte de raqueta', maxCapacity: 4, additionalPrice: 1500, isFederated: false, created_at: '', updated_at: '' }
    ] as SportDTO[];
    
    vi.mocked(sportsService.getAll).mockResolvedValueOnce(mockSports);

    renderWithProviders(<SportsView />);

    await waitFor(() => {
      expect(screen.getByText('Fútbol')).toBeInTheDocument();
    });

    expect(screen.getByText('Deporte de 11v11')).toBeInTheDocument();
    expect(screen.getByText('Tenis')).toBeInTheDocument();
    expect(screen.getByText('$1500.00')).toBeInTheDocument();
  });

  it('debe renderizar un mensaje de error si el servicio backend falla al cargar', async () => {
    // Simulamos una falla en el servidor
    vi.mocked(sportsService.getAll).mockRejectedValueOnce(new Error('Servidor de deportes caído'));

    renderWithProviders(<SportsView />);

    await waitFor(() => {
      expect(screen.getByText('Servidor de deportes caído')).toBeInTheDocument();
    });
  });

  it('debe permitir crear un nuevo deporte mediante el formulario', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    
    vi.mocked(sportsService.getAll).mockResolvedValue([]);
    vi.mocked(sportsService.create).mockResolvedValueOnce({
      id: '3', name: 'Natación', description: 'Pileta libre', maxCapacity: 15, additionalPrice: 0, isFederated: false, created_at: '', updated_at: ''
    } as SportDTO);

    renderWithProviders(<SportsView />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando deportes...')).not.toBeInTheDocument();
    });

    // Hacemos click en "Agregar Deporte"
    const addButton = screen.getByRole('button', { name: /Agregar Deporte/i });
    await user.click(addButton);

    // Llenamos el formulario
    await user.type(screen.getByPlaceholderText('Ej. Fútbol'), 'Natación');
    await user.type(screen.getByPlaceholderText('Ej. Deporte de equipo con pelota'), 'Pileta libre');
    
    const inputCapacity = screen.getByPlaceholderText('Ej. 20');
    await user.clear(inputCapacity);
    await user.type(inputCapacity, '15');

    // Clic en submit
    const submitButton = screen.getByRole('button', { name: 'Crear Deporte' });
    await user.click(submitButton);

    // Verificamos que el servicio create fue llamado con los datos correctos
    expect(sportsService.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Natación',
      description: 'Pileta libre',
      maxCapacity: 15
    }));
  });

  it('debe permitir eliminar un deporte con confirmación', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    
    const mockSports = [
      { id: '1', name: 'Fútbol', description: 'Deporte de 11v11', maxCapacity: 22, additionalPrice: 0, isFederated: true, created_at: '', updated_at: '' }
    ] as SportDTO[];
    
    vi.mocked(sportsService.getAll).mockResolvedValue(mockSports);
    vi.mocked(sportsService.deleteSport).mockResolvedValueOnce(undefined);

    // Interceptamos la alerta nativa del navegador
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<SportsView />);

    await waitFor(() => {
      expect(screen.getByText('Fútbol')).toBeInTheDocument();
    });

    // Clic en eliminar usando el aria-label del IconButton
    const deleteButton = screen.getByLabelText(/Eliminar deporte/i);
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('¿Estás seguro de que deseas eliminar este deporte?');
    expect(sportsService.deleteSport).toHaveBeenCalledWith('1');
    
    confirmSpy.mockRestore();
  });

  it('debe permitir editar un deporte existente', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    
    const mockSports = [
      { id: '1', name: 'Fútbol', description: 'Deporte de 11v11', maxCapacity: 22, additionalPrice: 0, isFederated: true, created_at: '', updated_at: '' }
    ] as SportDTO[];
    
    vi.mocked(sportsService.getAll).mockResolvedValue(mockSports);
    vi.mocked(sportsService.update).mockResolvedValueOnce({
      ...mockSports[0],
      maxCapacity: 30
    });

    renderWithProviders(<SportsView />);

    await waitFor(() => {
      expect(screen.getByText('Fútbol')).toBeInTheDocument();
    });

    // Clic en editar usando el aria-label del IconButton
    const editButton = screen.getByLabelText(/Editar deporte/i);
    await user.click(editButton);

    // Modificamos el cupo máximo
    const inputCapacity = screen.getByPlaceholderText('Ej. 20');
    await user.clear(inputCapacity);
    await user.type(inputCapacity, '30');

    // Guardar cambios
    const submitButton = screen.getByRole('button', { name: 'Guardar Cambios' });
    await user.click(submitButton);

    // Verificamos que se haya enviado el objeto parcial correcto
    expect(sportsService.update).toHaveBeenCalledWith('1', expect.objectContaining({
      maxCapacity: 30
    }));
  });
});