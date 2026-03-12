// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '' 
    : 'https://expense-tracker-kopf.onrender.com'; // User's Render Backend

// Global State
let state = {
    username: localStorage.getItem('expenses_username') || null,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1, // 1-12
    expenses: [],
    chartInstance: null
};

// DOM Elements
const els = {
    // Containers
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    
    // Inputs
    yearSelect: document.getElementById('year-select'),
    monthSelect: document.getElementById('month-select'),
    
    // Forms & Buttons
    expenseForm: document.getElementById('expense-form'),
    refreshBtn: document.getElementById('refresh-btn'),
    
    // UI Elements
    monthlyTotal: document.getElementById('monthly-total'),
    expensesList: document.getElementById('expenses-list'),
    chartCanvas: document.getElementById('expenseChart'),
    chartLoader: document.getElementById('chart-loader'),
    toast: document.getElementById('toast'),
    toastMsg: document.querySelector('#toast .message'),
    
    // Expense Form Inputs
    shopInput: document.getElementById('shop-name'),
    amountInput: document.getElementById('amount'),
    categorySelect: document.getElementById('category'),
    addBtn: document.querySelector('.add-btn'),
    addBtnText: document.querySelector('.add-btn .btn-text'),
    addBtnLoader: document.querySelector('.add-btn .loader'),
    customCategoryGroup: document.getElementById('custom-category-group'),
    customCategoryInput: document.getElementById('custom-category-name'),
    
    // Auth
    authForm: document.getElementById('auth-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('login-btn'),
    registerBtn: document.getElementById('register-btn'),
    loginBtnText: document.querySelector('#login-btn .btn-text'),
    loginBtnLoader: document.querySelector('#login-btn .loader'),
    registerBtnText: document.querySelector('#register-btn .btn-text'),
    registerBtnLoader: document.querySelector('#register-btn .loader'),
    logoutBtn: document.getElementById('logout-btn'),
    currentUserDisplay: document.getElementById('current-user-display')
};

// --- Initialization ---
function init() {
    setupEventListeners();
    
    if (state.username) {
        showDashboard();
    } else {
        showAuth();
    }
}

function showAuth() {
    els.authContainer.classList.remove('hidden');
    els.appContainer.classList.add('hidden');
}

function showDashboard() {
    els.authContainer.classList.add('hidden');
    els.appContainer.classList.remove('hidden');
    
    els.currentUserDisplay.textContent = `User: ${state.username}`;
    
    populateYears();
    els.monthSelect.value = state.currentMonth;
    fetchData();
}

function populateYears() {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 3; // Show last 3 years + current
    
    els.yearSelect.innerHTML = '';
    for (let y = currentYear; y >= startYear; y--) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        els.yearSelect.appendChild(option);
    }
    els.yearSelect.value = state.currentYear;
}

function setupEventListeners() {
    // Filters
    els.yearSelect.addEventListener('change', (e) => {
        state.currentYear = parseInt(e.target.value);
        fetchData();
    });
    
    els.monthSelect.addEventListener('change', (e) => {
        state.currentMonth = parseInt(e.target.value);
        fetchData();
    });
    
    els.refreshBtn.addEventListener('click', fetchData);
    
    // Expense entry
    els.expenseForm.addEventListener('submit', handleAddExpense);
    
    // Custom Category Toggle
    els.categorySelect.addEventListener('change', (e) => {
        if (e.target.value === 'Other') {
            els.customCategoryGroup.classList.remove('hidden');
            els.customCategoryInput.required = true;
        } else {
            els.customCategoryGroup.classList.add('hidden');
            els.customCategoryInput.required = false;
        }
    });
    
    // Auth
    els.loginBtn.addEventListener('click', handleLogin);
    els.registerBtn.addEventListener('click', handleRegister);
    els.authForm.addEventListener('submit', (e) => e.preventDefault()); // Prevent default submit
    els.logoutBtn.addEventListener('click', handleLogout);
}


// --- API Interactions ---
async function fetchData() {
    // Show Loaders
    els.chartLoader.classList.remove('hidden');
    els.refreshBtn.classList.add('spinning');
    
    try {
        const url = `${API_BASE_URL}/api/expenses?username=${encodeURIComponent(state.username)}&year=${state.currentYear}&month=${state.currentMonth}`;
        
        const response = await fetch(url, {
            method: 'GET',
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            state.expenses = result.data || [];
            updateDashboard();
        } else {
            showToast('Failed to load data', true);
            console.error(result.message);
        }
    } catch (error) {
        showToast('Network error loading data', true);
        console.error('Fetch error:', error);
    } finally {
        els.chartLoader.classList.add('hidden');
        els.refreshBtn.classList.remove('spinning');
    }
}

async function handleAddExpense(e) {
    e.preventDefault();
    
    // Get values
    const shop = els.shopInput.value.trim();
    const amount = els.amountInput.value;
    let category = els.categorySelect.value;
    
    // Use custom category if 'Other' is selected
    if (category === 'Other') {
        const customCat = els.customCategoryInput.value.trim();
        if (!customCat) {
            showToast('Please enter a custom category name', true);
            return;
        }
        category = customCat;
    }
    
    if (!state.username) {
        showToast('Session expired. Please log in again.', true);
        handleLogout();
        return;
    }
    
    if (!shop || !amount || !category) {
        showToast('Please fill in all required fields', true);
        return;
    }
    
    // Set UI to loading
    setLoadingState(true);
    
    const payload = {
        username: state.username,
        year: parseInt(els.yearSelect.value) || new Date().getFullYear(),
        month: parseInt(els.monthSelect.value) || (new Date().getMonth() + 1),
        shop: shop,
        amount: parseFloat(amount),
        category: category
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/expenses`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            showToast('Expense added successfully!');
            els.expenseForm.reset();
            els.customCategoryGroup.classList.add('hidden'); // Hide the custom field again
            els.customCategoryInput.required = false;
            // Reset to current filter if needed, but usually we just refresh
            fetchData();
        } else {
            const errorMsg = result.message || (result.detail ? result.detail[0].msg : 'Failed to add expense');
            showToast(errorMsg, true);
            console.error('Add expense failed:', result);
        }
    } catch (error) {
        console.error('Add expense error:', error);
        showToast('Network error adding expense', true);
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    if (isLoading) {
        els.addBtnText.classList.add('hidden');
        els.addBtnLoader.classList.remove('hidden');
        els.addBtn.disabled = true;
    } else {
        els.addBtnText.classList.remove('hidden');
        els.addBtnLoader.classList.add('hidden');
        els.addBtn.disabled = false;
    }
}

// --- Auth Logic ---
async function handleLogin(e) {
    e.preventDefault();
    
    const username = els.usernameInput.value.trim();
    const password = els.passwordInput.value.trim();
    
    if (!username || !password) {
        showToast('Please enter both username and password', true);
        return;
    }
    
    setAuthLoading(els.loginBtn, els.loginBtnText, els.loginBtnLoader, true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            state.username = result.username;
            localStorage.setItem('expenses_username', state.username);
            els.authForm.reset();
            showDashboard();
            showToast('Logged in successfully');
        } else {
            showToast(result.message || 'Login failed', true);
        }
    } catch (error) {
        showToast('Network error during login', true);
    } finally {
        setAuthLoading(els.loginBtn, els.loginBtnText, els.loginBtnLoader, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = els.usernameInput.value.trim();
    const password = els.passwordInput.value.trim();
    
    if (!username || !password) {
        showToast('Please enter both username and password to register', true);
        return;
    }
    
    setAuthLoading(els.registerBtn, els.registerBtnText, els.registerBtnLoader, true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showToast('Account created! Logging in...');
            // Automatically log them in
            setTimeout(() => {
                handleLogin({ preventDefault: () => {} });
            }, 1000);
        } else {
            showToast(result.message || 'Registration failed', true);
        }
    } catch (error) {
        showToast('Network error during registration', true);
    } finally {
        setAuthLoading(els.registerBtn, els.registerBtnText, els.registerBtnLoader, false);
    }
}

function handleLogout() {
    state.username = null;
    localStorage.removeItem('expenses_username');
    
    // Clear data
    state.expenses = [];
    els.expensesList.innerHTML = '';
    if (state.chartInstance) {
        state.chartInstance.destroy();
        state.chartInstance = null;
    }
    
    showAuth();
}

function setAuthLoading(btn, textEl, loaderEl, isLoading) {
    if (isLoading) {
        textEl.classList.add('hidden');
        loaderEl.classList.remove('hidden');
        btn.disabled = true;
    } else {
        textEl.classList.remove('hidden');
        loaderEl.classList.add('hidden');
        btn.disabled = false;
    }
}

// --- UI Updates ---
function updateDashboard() {
    updateExpensesList();
    updateChart();
    updateTotal();
}

function updateExpensesList() {
    els.expensesList.innerHTML = '';
    
    if (state.expenses.length === 0) {
        els.expensesList.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">No expenses found for this month.</td>
            </tr>
        `;
        return;
    }
    
    // Sort expenses latest first
    const sortedExpenses = [...state.expenses].reverse();
    
    sortedExpenses.forEach(expense => {
        // Handle ISO timestamp from Python backend
        const date = new Date(expense.timestamp);
        const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td><strong>${escapeHtml(expense.shop)}</strong></td>
            <td><span class="category-badge">${escapeHtml(expense.category)}</span></td>
            <td class="amount-col">$${expense.amount.toFixed(2)}</td>
            <td style="text-align: right; width: 50px;">
                <button class="delete-btn" onclick="deleteExpense(${expense.id})" title="Delete Expense">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        els.expensesList.appendChild(tr);
    });
}

function updateTotal() {
    const total = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    els.monthlyTotal.textContent = `$${total.toFixed(2)}`;
}

// --- Charting ---
const CHART_COLORS = [
    'rgba(99, 102, 241, 0.8)',   // Primary
    'rgba(236, 72, 153, 0.8)',   // Secondary
    'rgba(16, 185, 129, 0.8)',   // Green
    'rgba(245, 158, 11, 0.8)',   // Yellow
    'rgba(14, 165, 233, 0.8)',   // Sky
    'rgba(168, 85, 247, 0.8)',   // Purple
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(100, 116, 139, 0.8)'   // Gray
];

function updateChart() {
    // Aggregate data by category
    const categoryTotals = {};
    state.expenses.forEach(exp => {
        if (!categoryTotals[exp.category]) {
            categoryTotals[exp.category] = 0;
        }
        categoryTotals[exp.category] += exp.amount;
    });
    
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }
    
    if (labels.length === 0) {
        return;
    }
    
    const ctx = els.chartCanvas.getContext('2d');
    Chart.defaults.color = 'rgba(248, 250, 252, 0.7)'; // Text color
    Chart.defaults.font.family = "'Outfit', sans-serif";
    
    state.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CHART_COLORS,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'rgba(248, 250, 252, 0.8)',
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// --- Utilities ---
function showToast(message, isError = false) {
    els.toastMsg.textContent = message;
    
    if (isError) {
        els.toast.style.backgroundColor = '#ef4444';
        els.toast.querySelector('.icon').className = 'fa-solid fa-circle-exclamation icon';
    } else {
        els.toast.style.backgroundColor = '#10b981';
        els.toast.querySelector('.icon').className = 'fa-solid fa-circle-check icon';
    }
    
    els.toast.classList.add('show');
    
    setTimeout(() => {
        els.toast.classList.remove('show');
    }, 3000);
}

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/expenses/${id}?username=${encodeURIComponent(state.username)}`, {
            method: 'DELETE',
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showToast('Expense deleted');
            fetchData(); // Refresh list and chart
        } else {
            showToast('Failed to delete', true);
            console.error(result.message);
        }
    } catch (error) {
        showToast('Network error deleting expense', true);
        console.error('Delete error:', error);
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Start app
document.addEventListener('DOMContentLoaded', init);
