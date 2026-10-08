// API service client stub for Medi Buddy backend communication
const API_BASE_URL = '/api';

export async function fetchHealthCheck() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend API connection stub (offline mode active):', err.message);
    return { status: 'offline', message: 'Using mock frontend mode' };
  }
}
