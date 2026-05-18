import type { SportDTO, CreateSportRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const sportsService = {
  async getAll(): Promise<SportDTO[]> {
    try {
      const response = await fetch(`${API_URL}/deportes`);
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
      const response = await fetch(`${API_URL}/deportes`, {
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
};
