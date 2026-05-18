import type { SportDTO, CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const sportsService = {
  async getAll(): Promise<SportDTO[]> {
    try {
      const response = await fetch(`${API_URL}/sports`);
      if (!response.ok) {
        throw new Error('Error al obtener los deportes');
      }
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error en getAll:', error);
      throw new Error('Error al obtener los deportes');
    }
  },

  async create(data: CreateSportRequest): Promise<SportDTO> {
    try {
      const response = await fetch(`${API_URL}/sports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el deporte');
      }
      const result = await response.json();
      return result.data || result;
    } catch (error: any) {
      console.error('Error en create:', error);
      throw error;
    }
  },

  async update(id: string, data: UpdateSportRequest): Promise<SportDTO> {
    try {
      const response = await fetch(`${API_URL}/sports/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el deporte');
      }
      const result = await response.json();
      return result.data || result;
    } catch (error: any) {
      console.error('Error en update:', error);
      throw error;
    }
  },
  async deleteSport(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/sports/${id}`, {
        method: 'DELETE',
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }
  }
};
