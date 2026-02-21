// Configuration
const API_BASE_URL = 'https://24rxexchange.com/api/v1';

// State
let currentUser = null;
let deliveries = [];
let filteredDeliveries = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen for 2 seconds to showcase the animation
    setTimeout(() => {
        hideLoadingScreen();
        checkAuth();
    }, 2000);
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDeliveries);
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilter);
    }
}

// Loading Screen
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 300);
}

// Authentication
function checkAuth() {
    const token = localStorage.getItem('courier_token');
    const user = localStorage.getItem('courier_user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showDashboard();
        loadDeliveries();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
    document.getElementById('userName').textContent = currentUser?.name || 'Courier Partner';
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    
    // Show loading
    loginBtn.disabled = true;
    loginBtn.querySelector('span').style.display = 'none';
    loginBtn.querySelector('.btn-loader').style.display = 'block';
    loginError.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Check if user is a courier
        if (data.user.roleCode !== 'COURIER') {
            throw new Error('Access denied. This dashboard is only for courier partners.');
        }
        
        // Save auth data
        localStorage.setItem('courier_token', data.access_token);
        localStorage.setItem('courier_user', JSON.stringify(data.user));
        currentUser = data.user;
        
        // Show dashboard
        showDashboard();
        loadDeliveries();
        
    } catch (error) {
        loginError.textContent = error.message;
        loginError.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.querySelector('span').style.display = 'block';
        loginBtn.querySelector('.btn-loader').style.display = 'none';
    }
}

function handleLogout() {
    localStorage.removeItem('courier_token');
    localStorage.removeItem('courier_user');
    currentUser = null;
    deliveries = [];
    showLogin();
}

// API Calls
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('courier_token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        },
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    });
    
    if (response.status === 401) {
        handleLogout();
        throw new Error('Session expired. Please login again.');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }
    
    return data;
}

// Load Deliveries
async function loadDeliveries() {
    const loadingEl = document.getElementById('loadingDeliveries');
    const emptyEl = document.getElementById('emptyState');
    const tableEl = document.getElementById('deliveriesTable');
    
    loadingEl.style.display = 'flex';
    emptyEl.style.display = 'none';
    tableEl.style.display = 'none';
    
    try {
        const data = await apiCall('/delivery-requests/courier/my');
        deliveries = data;
        filteredDeliveries = deliveries;
        
        updateStats();
        renderDeliveries();
        
    } catch (error) {
        console.error('Failed to load deliveries:', error);
        alert('Failed to load deliveries: ' + error.message);
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Update Stats
function updateStats() {
    const total = deliveries.length;
    const pending = deliveries.filter(d => d.status === 'AWAITING_COURIER_PICKUP').length;
    const inTransit = deliveries.filter(d => ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status)).length;
    
    // Delivered today
    const today = new Date().toDateString();
    const deliveredToday = deliveries.filter(d => {
        if (d.status === 'DELIVERED' && d.deliveredAt) {
            return new Date(d.deliveredAt).toDateString() === today;
        }
        return false;
    }).length;
    
    document.getElementById('totalDeliveries').textContent = total;
    document.getElementById('pendingPickup').textContent = pending;
    document.getElementById('inTransit').textContent = inTransit;
    document.getElementById('deliveredToday').textContent = deliveredToday;
}

// Render Deliveries
function renderDeliveries() {
    const tbody = document.getElementById('deliveriesTableBody');
    const emptyEl = document.getElementById('emptyState');
    const tableEl = document.getElementById('deliveriesTable');
    
    if (filteredDeliveries.length === 0) {
        emptyEl.style.display = 'flex';
        tableEl.style.display = 'none';
        return;
    }
    
    emptyEl.style.display = 'none';
    tableEl.style.display = 'table';
    
    tbody.innerHTML = filteredDeliveries.map(delivery => `
        <tr>
            <td>
                <div style="font-weight: 600; color: var(--gray-900);">#${delivery.id.slice(0, 8)}</div>
                ${delivery.trackingNumber ? `<div style="font-size: 0.75rem; color: var(--gray-500);">Track: ${delivery.trackingNumber}</div>` : ''}
                ${(delivery.sourceAddress || delivery.destinationAddress) ? `<div style="font-size: 0.75rem; color: var(--gray-500);">Route: ${delivery.sourceAddress || 'NA'} → ${delivery.destinationAddress || 'NA'}</div>` : ''}
            </td>
            <td>
                <div style="font-weight: 600; color: var(--gray-900);">${delivery.inventoryLot?.medicine?.name || 'N/A'}</div>
                <div style="font-size: 0.75rem; color: var(--gray-500);">${delivery.inventoryLot?.medicine?.form || ''}</div>
            </td>
            <td>${delivery.qty} units</td>
            <td>
                <div style="font-weight: 600;">${delivery.requester?.name || 'N/A'}</div>
                <div style="font-size: 0.75rem; color: var(--gray-500);">${delivery.requester?.phone || ''}</div>
            </td>
            <td>
                <div style="font-weight: 600;">${delivery.inventoryLot?.sourceOrder?.listing?.seller?.name || 'N/A'}</div>
                <div style="font-size: 0.75rem; color: var(--gray-500);">${delivery.inventoryLot?.sourceOrder?.listing?.seller?.phone || ''}</div>
            </td>
            <td>${getStatusBadge(delivery.status)}</td>
            <td>${formatDate(delivery.createdAt)}</td>
            <td>
                <button class="btn-action btn-action-primary" onclick="openDeliveryModal('${delivery.id}')">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

// Status Badge
function getStatusBadge(status) {
    const statusMap = {
        'AWAITING_COURIER_PICKUP': { label: 'Awaiting Pickup', class: 'status-awaiting' },
        'IN_TRANSIT': { label: 'In Transit', class: 'status-transit' },
        'OUT_FOR_DELIVERY': { label: 'Out for Delivery', class: 'status-out' },
        'DELIVERY_ATTEMPTED': { label: 'Attempted', class: 'status-attempted' },
        'PENDING_OTP_VERIFICATION': { label: 'Pending OTP', class: 'status-pending-otp' },
        'DELIVERED': { label: 'Delivered', class: 'status-delivered' },
    };
    
    const info = statusMap[status] || { label: status, class: 'status-awaiting' };
    return `<span class="status-badge ${info.class}">${info.label}</span>`;
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
        if (hours < 1) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes}m ago`;
        }
        return `${hours}h ago`;
    }
    
    return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Search and Filter
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    filterDeliveries(query, document.getElementById('statusFilter').value);
}

function handleFilter(e) {
    const status = e.target.value;
    filterDeliveries(document.getElementById('searchInput').value.toLowerCase(), status);
}

function filterDeliveries(searchQuery, statusFilter) {
    filteredDeliveries = deliveries.filter(delivery => {
        const matchesSearch = !searchQuery || 
            delivery.id.toLowerCase().includes(searchQuery) ||
            delivery.trackingNumber?.toLowerCase().includes(searchQuery) ||
            delivery.requester?.name?.toLowerCase().includes(searchQuery) ||
            delivery.inventoryLot?.medicine?.name?.toLowerCase().includes(searchQuery);
        
        const matchesStatus = !statusFilter || delivery.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    renderDeliveries();
}

// Delivery Modal
function openDeliveryModal(deliveryId) {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;
    
    const modal = document.getElementById('deliveryModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div style="display: grid; gap: 2rem;">
            <!-- Order Info -->
            <div>
                <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: var(--gray-900);">Order Information</h3>
                <div style="background: var(--gray-50); border-radius: 0.5rem; padding: 1.5rem; display: grid; gap: 1rem;">
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Order ID:</span>
                        <span style="color: var(--gray-900); font-weight: 600;">#${delivery.id.slice(0, 8)}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Status:</span>
                        <span>${getStatusBadge(delivery.status)}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Tracking Number:</span>
                        <span style="color: var(--gray-900);">${delivery.trackingNumber || 'Not assigned yet'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Created:</span>
                        <span style="color: var(--gray-900);">${new Date(delivery.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Source:</span>
                        <span style="color: var(--gray-900);">${delivery.sourceAddress || 'Not provided'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Destination:</span>
                        <span style="color: var(--gray-900);">${delivery.destinationAddress || 'Not provided'}</span>
                    </div>
                    ${delivery.courierBillAmount ? `
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Courier Charge:</span>
                        <span style="color: var(--gray-900);">INR ${Number(delivery.courierBillAmount).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Medicine Info -->
            <div>
                <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: var(--gray-900);">Medicine Details</h3>
                <div style="background: var(--gray-50); border-radius: 0.5rem; padding: 1.5rem; display: grid; gap: 1rem;">
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Name:</span>
                        <span style="color: var(--gray-900); font-weight: 600;">${delivery.inventoryLot?.medicine?.name || 'N/A'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Form:</span>
                        <span style="color: var(--gray-900);">${delivery.inventoryLot?.medicine?.form || 'N/A'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Quantity:</span>
                        <span style="color: var(--gray-900); font-weight: 600;">${delivery.qty} units</span>
                    </div>
                </div>
            </div>
            
            <!-- Buyer Info -->
            <div>
                <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: var(--gray-900);">Buyer Information</h3>
                <div style="background: var(--gray-50); border-radius: 0.5rem; padding: 1.5rem; display: grid; gap: 1rem;">
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Name:</span>
                        <span style="color: var(--gray-900); font-weight: 600;">${delivery.requester?.name || 'N/A'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Email:</span>
                        <span style="color: var(--gray-900);">${delivery.requester?.email || 'N/A'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Phone:</span>
                        <span style="color: var(--gray-900); font-weight: 600;">${delivery.requester?.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Seller Info -->
            <div>
                <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: var(--gray-900);">Seller Information</h3>
                <div style="background: var(--gray-50); border-radius: 0.5rem; padding: 1.5rem; display: grid; gap: 1rem;">
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Name:</span>
                        <span style="color: var(--gray-900); font-weight: 600;">${delivery.inventoryLot?.sourceOrder?.listing?.seller?.name || 'N/A'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Email:</span>
                        <span style="color: var(--gray-900);">${delivery.inventoryLot?.sourceOrder?.listing?.seller?.email || 'N/A'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem;">
                        <span style="color: var(--gray-600); font-weight: 600;">Phone:</span>
                        <span style="color: var(--gray-900); font-weight: 600;">${delivery.inventoryLot?.sourceOrder?.listing?.seller?.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Documents -->
            ${delivery.medicineInvoiceUrl || delivery.courierInvoiceUrl || delivery.packageImageUrl ? `
            <div>
                <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: var(--gray-900);">Documents</h3>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    ${delivery.medicineInvoiceUrl ? `
                        <a href="${delivery.medicineInvoiceUrl}" target="_blank" class="btn btn-secondary">
                            Medicine Invoice
                        </a>
                    ` : ''}
                    ${delivery.courierInvoiceUrl ? `
                        <a href="${delivery.courierInvoiceUrl}" target="_blank" class="btn btn-secondary">
                            Courier Invoice
                        </a>
                    ` : ''}
                    ${delivery.packageImageUrl ? `
                        <a href="${delivery.packageImageUrl}" target="_blank" class="btn btn-secondary">
                            View Package Image
                        </a>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Action Buttons -->
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding-top: 1rem; border-top: 1px solid var(--gray-200);">
                ${getActionButtons(delivery)}
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function getActionButtons(delivery) {
    if (delivery.status === 'AWAITING_COURIER_PICKUP') {
        return `
            <div style="display: grid; gap: 0.75rem; width: 100%; max-width: 520px;">
                <input id="billAmount-${delivery.id}" type="number" min="0" step="0.01" placeholder="Courier Bill Amount (INR)" style="padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 0.5rem;" />
                <input id="trackingNumber-${delivery.id}" type="text" placeholder="Tracking Number (Optional)" style="padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 0.5rem;" />
                <input id="deliveryPartner-${delivery.id}" type="text" placeholder="Delivery Partner Name (Optional)" style="padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 0.5rem;" />
                <input id="courierInvoice-${delivery.id}" type="file" accept=".pdf,.jpg,.jpeg,.png" style="padding: 0.5rem;" />
                <textarea id="courierNote-${delivery.id}" placeholder="Dispatch note (Optional)" rows="2" style="padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 0.5rem;"></textarea>
                <button class="btn btn-primary" onclick="acceptDelivery('${delivery.id}')">Accept & Start Delivery</button>
            </div>
        `;
    }

    if (delivery.status === 'IN_TRANSIT') {
        return `<button class="btn btn-primary" onclick="updateDeliveryStatus('${delivery.id}', 'OUT_FOR_DELIVERY')">Mark Out for Delivery</button>`;
    }

    if (delivery.status === 'OUT_FOR_DELIVERY') {
        return `<button class="btn btn-primary" onclick="updateDeliveryStatus('${delivery.id}', 'PENDING_OTP_VERIFICATION')">Mark as Delivered</button>`;
    }

    return '<p style="color: var(--gray-600);">No actions available for this status.</p>';
}

function closeDeliveryModal() {
    document.getElementById('deliveryModal').style.display = 'none';
}

async function acceptDelivery(deliveryId) {
    const billAmount = document.getElementById(`billAmount-${deliveryId}`)?.value;
    const trackingNumber = document.getElementById(`trackingNumber-${deliveryId}`)?.value || '';
    const deliveryPartner = document.getElementById(`deliveryPartner-${deliveryId}`)?.value || '';
    const notes = document.getElementById(`courierNote-${deliveryId}`)?.value || '';
    const invoiceFile = document.getElementById(`courierInvoice-${deliveryId}`)?.files?.[0];

    if (!billAmount || Number(billAmount) < 0) {
        alert('Please enter a valid courier bill amount.');
        return;
    }

    if (!invoiceFile) {
        alert('Please upload courier invoice.');
        return;
    }

    const token = localStorage.getItem('courier_token');
    const formData = new FormData();
    formData.append('billAmount', String(billAmount));
    formData.append('invoice', invoiceFile);
    if (trackingNumber) formData.append('trackingNumber', trackingNumber);
    if (deliveryPartner) formData.append('deliveryPartner', deliveryPartner);
    if (notes) formData.append('notes', notes);

    try {
        const response = await fetch(`${API_BASE_URL}/delivery-requests/courier/${deliveryId}/accept`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to accept delivery');
        }

        alert('Delivery accepted successfully.');
        closeDeliveryModal();
        loadDeliveries();
    } catch (error) {
        alert('Failed to accept delivery: ' + error.message);
    }
}

// Update Delivery Status (placeholder - will be implemented with backend)
async function updateDeliveryStatus(deliveryId, newStatus) {
    try {
        await apiCall(`/delivery-requests/courier/${deliveryId}/status`, {
            method: 'POST',
            body: JSON.stringify({ status: newStatus }),
        });
        
        alert('Status updated successfully!');
        closeDeliveryModal();
        loadDeliveries();
    } catch (error) {
        alert('Failed to update status: ' + error.message);
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeDeliveryModal();
    }
});
