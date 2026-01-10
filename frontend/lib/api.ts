import axios from 'axios'

// Use relative path for API calls - Next.js dev server will proxy to backend
const API_URL = '/api/v1'

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
  approveUser: (id: string) => api.patch(`/admin/users/${id}/approve`, {}),
  rejectUser: (id: string) => api.patch(`/admin/users/${id}/reject`, {}),
  blockUser: (id: string) => api.patch(`/admin/users/${id}/block`, {}),
  getUserDocuments: (id: string) => api.get(`/admin/users/${id}/documents`),
  approveDocument: (userId: string, documentId: string, reviewerNote?: string) =>
    api.patch(`/admin/users/${userId}/documents/${documentId}/approve`, { reviewerNote }),
  rejectDocument: (userId: string, documentId: string, reviewerNote: string) =>
    api.patch(`/admin/users/${userId}/documents/${documentId}/reject`, { reviewerNote }),
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
  getListings: (params?: { medicineId?: string; status?: string; search?: string }) =>
    api.get('/listings', { params }),
  getMyListings: () => api.get('/listings/my'),
  getPendingListings: () => api.get('/listings/pending'),
  createListing: (data: { medicineReferenceId: string; basePrice: number; stock: number }) =>
    api.post('/listings', data),
  approveListing: (id: string, data?: { adminMarkupPct?: number; reviewerNote?: string }) =>
    api.patch(`/listings/${id}/approve`, data),
  rejectListing: (id: string, reviewerNote: string) =>
    api.patch(`/listings/${id}/reject`, { reviewerNote }),
  getPendingProposals: () => api.get('/listings/proposals/pending'),
  approveMedicineProposal: (id: string, adminMarkupPct?: number) =>
    api.patch(`/listings/proposals/${id}/approve`, { adminMarkupPct }),
  rejectMedicineProposal: (id: string, reviewerNote: string) =>
    api.patch(`/listings/proposals/${id}/reject`, { reviewerNote }),
  // Bulk Listings
  createBulkListing: (data: FormData) =>
    api.post('/listings/bulk', data, {
      headers: { 'Content-Type': undefined },
    }),
  getMyBulkRequests: () => api.get('/listings/bulk/my-requests'),
  getBulkRequests: (status?: string) => api.get('/listings/bulk/requests', { params: { status } }),
  getBulkRequest: (id: string) => api.get(`/listings/bulk/requests/${id}`),
  approveBulkItems: (id: string, selectedIndices: number[], markupType: 'PERCENTAGE' | 'FIXED', markupValue: number) =>
    api.post(`/listings/bulk/requests/${id}/approve`, { selectedIndices, markupType, markupValue }),
  deleteBulkRequest: (id: string) => api.delete(`/listings/bulk/requests/${id}`),
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

// Watchlist API
export const watchlistApi = {
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (data: { medicineId: string; name?: string; color?: string }) =>
    api.post('/watchlist', data),
  removeFromWatchlist: (id: string) => api.delete(`/watchlist/${id}`),
  updateWatchlistItem: (id: string, data: { name?: string; color?: string; sortOrder?: number }) =>
    api.patch(`/watchlist/${id}`, data),
  reorderWatchlist: (itemIds: string[]) => api.post('/watchlist/reorder', { itemIds }),
  isInWatchlist: (medicineId: string) => api.get(`/watchlist/check/${medicineId}`),
}

// Price Alerts API
export const priceAlertsApi = {
  getUserPriceAlerts: () => api.get('/price-alerts'),
  createPriceAlert: (data: { medicineId: string; targetPrice: number; condition: 'BELOW' | 'ABOVE' | 'EQUALS' }) =>
    api.post('/price-alerts', data),
  deletePriceAlert: (id: string) => api.delete(`/price-alerts/${id}`),
  togglePriceAlert: (id: string, isActive: boolean) => api.patch(`/price-alerts/${id}/toggle`, { isActive }),
}

// Dashboard API (Enhanced)
export const dashboardApiNew = {
  getTraderDashboard: () => api.get('/dashboard/trader'),
  getSellerDashboard: () => api.get('/dashboard/seller'),
  getRecentListings: (limit = 10) => api.get('/dashboard/recent-listings', { params: { limit } }),
  getTrendingMedicines: (limit = 10) => api.get('/dashboard/trending', { params: { limit } }),
  getPlatformMostBought: (limit = 8) => api.get('/dashboard/most-bought', { params: { limit } }),
  getPortfolioValue: () => api.get('/dashboard/portfolio-value'),
  getStatistics: () => api.get('/dashboard/statistics'),
}

// Inventory API (Enhanced)
export const inventoryApi = {
  getUserInventory: () => api.get('/inventory'),
  getInventoryHistory: (days = 30) => api.get('/inventory/history', { params: { days } }),
  getLowStockInventory: (threshold = 100) => api.get('/inventory/low-stock', { params: { threshold } }),
  getExpiringInventory: (withinDays = 90) => api.get('/inventory/expiring', { params: { withinDays } }),
}

// Notifications API
export const notificationsApi = {
  getNotifications: (params?: { limit?: number; includeRead?: boolean }) => 
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  postRequirement: (data: { medicineName: string; quantity: number; message: string }) =>
    api.post('/notifications/requirements', data),
}

// Buy Proposals API
export const buyProposalsApi = {
  createProposal: (data: FormData) =>
    api.post('/buy-proposals', data, {
      headers: { 'Content-Type': undefined }, // Let browser set multipart boundary
    }),
  uploadReceipt: (proposalId: string, data: FormData) =>
    api.post(`/buy-proposals/${proposalId}/upload-receipt`, data, {
      headers: { 'Content-Type': undefined }, // Let browser set multipart boundary
    }),
  uploadSellerInvoice: (proposalId: string, data: FormData) =>
    api.post(`/buy-proposals/${proposalId}/seller-invoice`, data, {
      headers: { 'Content-Type': undefined },
    }),
  getMyProposals: () => api.get('/buy-proposals/my'),
  getProposal: (id: string) => api.get(`/buy-proposals/${id}`),
  getPendingProposals: () => api.get('/buy-proposals/pending'),
  approveProposal: (id: string, data: FormData | { reviewerNote?: string }) => {
    // Check if data is FormData (new flow with invoice upload) or plain object (old flow)
    if (data instanceof FormData) {
      return api.patch(`/buy-proposals/${id}/approve`, data, {
        headers: { 'Content-Type': undefined }, // Let browser set multipart boundary
      });
    } else {
      return api.patch(`/buy-proposals/${id}/approve`, data);
    }
  },
  rejectProposal: (id: string, reviewerNote: string) =>
    api.patch(`/buy-proposals/${id}/reject`, { reviewerNote }),
}

// Delivery Requests API
export const deliveryRequestsApi = {
  // Seller/Trader: Create delivery request
  createRequest: (data: { inventoryLotId: string; qty: number }) =>
    api.post('/delivery-requests', data),
  // Seller/Trader: Get my delivery requests
  getMyRequests: () => api.get('/delivery-requests/my'),
  // Admin: Get all delivery requests
  getAllRequests: (status?: string) =>
    api.get('/delivery-requests', { params: status ? { status } : {} }),
  // Admin: Approve delivery request
  approveRequest: (id: string, reviewerNote?: string) =>
    api.post(`/delivery-requests/${id}/approve`, { reviewerNote }),
  // Admin: Reject delivery request
  rejectRequest: (id: string, reviewerNote: string) =>
    api.post(`/delivery-requests/${id}/reject`, { reviewerNote }),
  // Admin/Seller: Mark as dispatched
  markDispatched: (id: string) =>
    api.post(`/delivery-requests/${id}/dispatch`),
  // Buyer: Confirm delivery with OTP
  confirmDelivery: (id: string, otp: string) =>
    api.post(`/delivery-requests/${id}/confirm`, { otp }),
}
