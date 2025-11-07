import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; phone?: string; password: string; roleCode: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
}

// Users API
export const usersApi = {
  getUsers: (params?: { status?: string; roleCode?: string }) =>
    api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  approveUser: (id: string) => api.patch(`/admin/users/${id}/approve`),
  rejectUser: (id: string) => api.patch(`/admin/users/${id}/reject`),
  blockUser: (id: string) => api.patch(`/admin/users/${id}/block`),
}

// Medicines API
export const medicinesApi = {
  getMedicines: (params?: { search?: string }) =>
    api.get('/medicines', { params }),
  getMedicine: (id: string) => api.get(`/medicines/${id}`),
}

// Medicine References API (Search from 251K+ medicines)
export const medicineReferencesApi = {
  search: (query: string) =>
    api.get('/medicine-references/search', { params: { q: query } }),
}

// Listings API
export const listingsApi = {
  getListings: (params?: { medicineId?: string; status?: string }) =>
    api.get('/listings', { params }),
  getMyListings: () => api.get('/listings/my'),
  getPendingListings: () => api.get('/listings/pending'),
  createListing: (data: { medicineReferenceId: string; basePrice: number; stock: number }) =>
    api.post('/listings', data),
  approveListing: (id: string, data?: { adminMarkupPct?: number; reviewerNote?: string }) =>
    api.patch(`/listings/${id}/approve`, data),
  rejectListing: (id: string, reviewerNote: string) =>
    api.patch(`/listings/${id}/reject`, { reviewerNote }),
}

// Orders API
export const ordersApi = {
  createOrder: (data: { listingId: string; qty: number }) =>
    api.post('/orders', data),
  getMyOrders: () => api.get('/orders'),
}

// Holds API
export const holdsApi = {
  createHold: (data: { listingId: string; qty: number }) =>
    api.post('/holds', data),
  getMyHolds: () => api.get('/holds/my'),
  cancelHold: (id: string) => api.post(`/holds/${id}/cancel`),
  getAllHolds: () => api.get('/holds'), // Admin only
}

// Dashboard API
export const dashboardApi = {
  getTopHeld: (limit = 4) => api.get('/dashboard/top-held', { params: { limit } }),
  getTopBought: (limit = 4) => api.get('/dashboard/top-bought', { params: { limit } }),
  getTopNews: (limit = 4) => api.get('/dashboard/top-news', { params: { limit } }),
  getRecentListings: (limit = 4) => api.get('/dashboard/recent-listings', { params: { limit } }),
}

// Prices API
export const pricesApi = {
  getPriceHistory: (medicineId: string, days = 30) =>
    api.get('/prices/history', { params: { medicineId, days } }),
  getPriceHistoryByComposition: (composition: string, days = 30) =>
    api.get('/prices/history', { params: { composition, days } }),
  getTrending: (days = 7) =>
    api.get('/prices/trending', { params: { days } }),
  compareComposition: (composition: string) =>
    api.get('/prices/compare', { params: { composition } }),
}

// News API
export const newsApi = {
  getNews: () => api.get('/news'),
  getNewsArticle: (id: string) => api.get(`/news/${id}`),
  createNews: (data: any) => api.post('/admin/news', data),
}

// Analytics API
export const analyticsApi = {
  getTopMedicines: () => api.get('/admin/analytics/top'),
}
