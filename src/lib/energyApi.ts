const ENERGY_API_BASE = 'https://bsupers.fly.dev/v1/energy';

export const energyApi = {
  async getEnergeticos(params?: { inicio?: string; fin?: string }) {
    const query = new URLSearchParams();
    if (params?.inicio) query.set('inicio', params.inicio);
    if (params?.fin) query.set('fin', params.fin);

    const url = `${ENERGY_API_BASE}/energeticos${query.toString() ? '?' + query.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error fetching energeticos');
    return response.json();
  },

  async createEnergetico(data: any) {
    const response = await fetch(`${ENERGY_API_BASE}/energeticos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error creating energetico');
    return response.json();
  },

  async updateEnergetico(fecha: string, data: any) {
    const response = await fetch(`${ENERGY_API_BASE}/energeticos/${fecha}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error updating energetico');
    return response.json();
  },

  async deleteEnergetico(id: number) {
    const response = await fetch(`${ENERGY_API_BASE}/energeticos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error deleting energetico');
    return response.json();
  },

  async getPreciosEnergia() {
    const response = await fetch(`${ENERGY_API_BASE}/precios-energia`);
    if (!response.ok) throw new Error('Error fetching precios');
    return response.json();
  },

  async getPrecioEnergia(anio: number, mes: number) {
    const response = await fetch(`${ENERGY_API_BASE}/precios-energia/${anio}/${mes}`);
    if (!response.ok) throw new Error('Error fetching precio');
    return response.json();
  },

  async createPrecioEnergia(data: any) {
    const response = await fetch(`${ENERGY_API_BASE}/precios-energia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error creating precio');
    return response.json();
  },

  async updatePrecioEnergia(anio: number, mes: number, data: any) {
    const response = await fetch(`${ENERGY_API_BASE}/precios-energia/${anio}/${mes}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error updating precio');
    return response.json();
  },

  async deletePrecioEnergia(anio: number, mes: number) {
    const response = await fetch(`${ENERGY_API_BASE}/precios-energia/${anio}/${mes}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error deleting precio');
    return response.json();
  },

  async getGasNivelesMes(anio: number, mes?: number) {
    const url = mes
      ? `${ENERGY_API_BASE}/gas-niveles-mes/${anio}/${mes}`
      : `${ENERGY_API_BASE}/gas-niveles-mes/${anio}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error fetching gas niveles');
    return response.json();
  },

  async createGasNivelesMes(data: any) {
    const response = await fetch(`${ENERGY_API_BASE}/gas-niveles-mes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error creating gas niveles');
    return response.json();
  },

  async updateGasNivelesMes(anio: number, mes: number, data: any) {
    const response = await fetch(`${ENERGY_API_BASE}/gas-niveles-mes/${anio}/${mes}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error updating gas niveles');
    return response.json();
  },

  async deleteGasNivelesMes(anio: number, mes: number) {
    const response = await fetch(`${ENERGY_API_BASE}/gas-niveles-mes/${anio}/${mes}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error deleting gas niveles');
    return response.json();
  },
};
