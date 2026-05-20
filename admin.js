// ── API base URL ─────────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://supratravels.onrender.com';

// ── State ────────────────────────────────────────────────────────────────────
let authToken = localStorage.getItem('supra_admin_token');
let trips = [];
let coTravelPostings = [];

// ── DOM helpers ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    updateClock();
    setInterval(updateClock, 1000);

    if (authToken) {
        const valid = await verifyToken();
        if (valid) {
            showApp();
        } else {
            clearAuth();
            showLogin();
        }
    } else {
        showLogin();
    }

    wireLogin();
    wireNav();
    wireSidebarToggle();
    wireLogout();
    wireTripForm();
    wireContactForm();
    wireSettingsForm();
    wireImageUpload();
});

// ── Clock ─────────────────────────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    $('topbar-time').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function verifyToken() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/verify`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.valid) {
            $('admin-name').textContent = data.username || 'Admin';
            return true;
        }
        return false;
    } catch { return false; }
}

function clearAuth() {
    authToken = null;
    localStorage.removeItem('supra_admin_token');
}

function showLogin() {
    $('login-screen').classList.remove('hidden');
    $('admin-app').classList.add('hidden');
}

function showApp() {
    $('login-screen').classList.add('hidden');
    $('admin-app').classList.remove('hidden');
    loadDashboard();
    loadCoTravelPostings();
}

function wireLogin() {
    const form = $('login-form');
    const passEl = $('login-password');
    const toggleEl = $('toggle-pass');
    const errorEl = $('login-error');
    const btn = $('login-btn');

    toggleEl.addEventListener('click', () => {
        const isPass = passEl.type === 'password';
        passEl.type = isPass ? 'text' : 'password';
        toggleEl.innerHTML = isPass
            ? '<i class="fa-solid fa-eye-slash"></i>'
            : '<i class="fa-solid fa-eye"></i>';
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        errorEl.classList.add('hidden');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…';

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: $('login-username').value.trim(),
                    password: passEl.value
                })
            });
            const data = await res.json();

            if (res.ok) {
                authToken = data.token;
                localStorage.setItem('supra_admin_token', authToken);
                $('admin-name').textContent = data.username || 'Admin';
                showApp();
            } else {
                errorEl.textContent = data.error || 'Invalid credentials';
                errorEl.classList.remove('hidden');
            }
        } catch {
            errorEl.textContent = 'Cannot reach server. Check your internet connection.';
            errorEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
        }
    });
}

function wireLogout() {
    $('logout-btn').addEventListener('click', () => {
        clearAuth();
        showLogin();
    });
}

// ── Navigation ────────────────────────────────────────────────────────────────
const PAGE_TITLES = {
    dashboard: 'Dashboard Overview',
    packages: 'Manage Routes',
    'co-travel': 'Co-Travel Pools',
    inquiries: 'Inquiries',
    contact: 'Contact Details',
    settings: 'Site Settings'
};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#sidebar-nav li[data-tab]').forEach(l => l.classList.remove('active'));

    const tab = $(tabId);
    if (tab) tab.classList.add('active');
    const navItem = qs(`#sidebar-nav li[data-tab="${tabId}"]`);
    if (navItem) navItem.classList.add('active');
    $('page-title').textContent = PAGE_TITLES[tabId] || tabId;
}

window.switchTab = switchTab; // expose for inline onclick

function wireNav() {
    document.querySelectorAll('#sidebar-nav li[data-tab]').forEach(li => {
        li.addEventListener('click', () => switchTab(li.getAttribute('data-tab')));
    });
}

function wireSidebarToggle() {
    $('sidebar-toggle').addEventListener('click', () => {
        $('sidebar').classList.toggle('collapsed');
    });
}

// ── Dashboard Load ────────────────────────────────────────────────────────────
async function loadDashboard() {
    // API health check
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const ok = res.ok;
        setApiStatus(ok, ok ? 'Online' : 'Error');
    } catch {
        setApiStatus(false, 'Offline');
    }

    // Load trips
    await loadTrips();
    $('dash-trips').textContent = trips.length;
    $('dash-inquiries').textContent = '3'; // demo
}

function setApiStatus(online, label) {
    const el = $('api-status');
    const dot = el.querySelector('.status-dot');
    $('api-status-text').textContent = label;
    $('dash-api').textContent = label;
    el.classList.toggle('online', online);
    el.classList.toggle('offline', !online);
}

// ── Trips CRUD ─────────────────────────────────────────────────────────────────
async function loadTrips() {
    try {
        const res = await fetch(`${API_BASE}/api/trips`);
        if (res.ok) trips = await res.json();
    } catch {
        showToast('Could not load packages', 'error');
    }
    renderTripsTable();
}

function renderTripsTable() {
    const tbody = $('trips-tbody');
    if (!trips.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">
            No packages yet – click <strong>Add Package</strong> to create one.
        </td></tr>`;
        return;
    }
    tbody.innerHTML = trips.map(t => `
        <tr>
            <td><img src="${t.image}" class="trip-thumb" alt="${t.title}" loading="lazy"></td>
            <td>
                <strong>${t.title}</strong><br>
                ${t.badge ? `<span class="pill">${t.badge}</span>` : ''}
            </td>
            <td>${t.location}</td>
            <td>₹${Number(t.price).toLocaleString()}</td>
            <td>${t.duration}</td>
            <td>${t.order ?? 0}</td>
            <td>
                <button class="action-btn edit" onclick="editTrip('${t._id}')" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn delete" onclick="confirmDelete('${t._id}','${t.title}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function wireTripForm() {
    $('add-trip-btn').addEventListener('click', () => openTripForm());
    $('cancel-trip-btn').addEventListener('click', closeTripForm);
    $('close-trip-form').addEventListener('click', closeTripForm);

    $('trip-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = $('save-trip-btn');
        const id = $('trip-id').value;
        const file = $('trip-image').files[0];

        if (!id && !file) {
            showToast('Please select an image for the new package', 'error');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

        try {
            const fd = new FormData();
            fd.append('title', $('trip-title').value.trim());
            fd.append('location', $('trip-location').value.trim());
            fd.append('price', $('trip-price').value);
            fd.append('duration', $('trip-duration').value.trim());
            fd.append('badge', $('trip-badge').value.trim());
            fd.append('order', $('trip-order').value || '0');
            if (file) fd.append('image', file);

            const url = id ? `${API_BASE}/api/trips/${id}` : `${API_BASE}/api/trips`;
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${authToken}` },
                body: fd
            });

            if (res.ok) {
                showToast(id ? 'Package updated!' : 'Package added!', 'success');
                await loadTrips();
                $('dash-trips').textContent = trips.length;
                closeTripForm();
            } else {
                const err = await res.json();
                showToast(err.error || 'Save failed', 'error');
            }
        } catch (err) {
            showToast('Network error: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Package';
        }
    });
}

function openTripForm(trip = null) {
    $('trip-form').reset();
    $('trip-id').value = '';
    $('image-preview').classList.add('hidden');
    $('image-drop-area').classList.remove('hidden');
    $('existing-image-note').style.display = 'none';
    $('trip-form-title').textContent = 'Add New Package';

    if (trip) {
        $('trip-id').value = trip._id;
        $('trip-title').value = trip.title;
        $('trip-location').value = trip.location;
        $('trip-price').value = trip.price;
        $('trip-duration').value = trip.duration;
        $('trip-badge').value = trip.badge || '';
        $('trip-order').value = trip.order ?? 0;
        $('trip-form-title').textContent = 'Edit Package';

        // Show existing image
        $('preview-img').src = trip.image;
        $('image-preview').classList.remove('hidden');
        $('image-drop-area').classList.add('hidden');
        $('existing-image-note').style.display = 'block';
    }

    $('trip-form-card').classList.remove('hidden');
    $('trip-form-card').scrollIntoView({ behavior: 'smooth' });
    switchTab('packages');
}

function closeTripForm() {
    $('trip-form-card').classList.add('hidden');
    $('trip-form').reset();
}

window.editTrip = function (id) {
    const trip = trips.find(t => t._id === id);
    if (trip) openTripForm(trip);
};

window.confirmDelete = function (id, name) {
    $('confirm-text').textContent = `Delete package "${name}"? This will also remove the image from Cloudinary.`;
    $('confirm-overlay').classList.remove('hidden');

    $('confirm-yes').onclick = async () => {
        $('confirm-overlay').classList.add('hidden');
        try {
            const res = await fetch(`${API_BASE}/api/trips/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (res.ok) {
                showToast('Package deleted', 'success');
                await loadTrips();
                $('dash-trips').textContent = trips.length;
            } else {
                const err = await res.json();
                showToast(err.error || 'Delete failed', 'error');
            }
        } catch (err) {
            showToast('Network error', 'error');
        }
    };

    $('confirm-no').onclick = () => $('confirm-overlay').classList.add('hidden');
};

// ── Image Upload Drag & Drop ──────────────────────────────────────────────────
function wireImageUpload() {
    const dropArea = $('image-drop-area');
    const fileInput = $('trip-image');
    const preview = $('image-preview');
    const previewImg = $('preview-img');
    const removeBtn = $('remove-img');

    dropArea.addEventListener('click', e => {
        if (!e.target.closest('label')) fileInput.click();
    });
    dropArea.addEventListener('dragover', e => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
    dropArea.addEventListener('drop', e => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) setPreview(file);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) setPreview(fileInput.files[0]);
    });
    removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        preview.classList.add('hidden');
        dropArea.classList.remove('hidden');
        $('existing-image-note').style.display = 'none';
    });

    function setPreview(file) {
        const reader = new FileReader();
        reader.onload = e => {
            previewImg.src = e.target.result;
            preview.classList.remove('hidden');
            dropArea.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// ── Contact Form ──────────────────────────────────────────────────────────────
async function wireContactForm() {
    // Pre-fill form from API
    try {
        const res = await fetch(`${API_BASE}/api/config/contact`);
        if (res.ok) {
            const c = await res.json();
            $('contact-phone').value = c.phone || '';
            $('contact-whatsapp').value = c.whatsapp || '';
            $('contact-email').value = c.email || '';
            $('contact-address').value = c.address || '';
        }
    } catch { }

    $('contact-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = $('save-contact-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

        try {
            const res = await fetch(`${API_BASE}/api/config/contact`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    phone: $('contact-phone').value.trim(),
                    whatsapp: $('contact-whatsapp').value.trim(),
                    email: $('contact-email').value.trim(),
                    address: $('contact-address').value.trim()
                })
            });
            if (res.ok) showToast('Contact details updated!', 'success');
            else showToast('Save failed', 'error');
        } catch { showToast('Network error', 'error'); }
        finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Contact Details';
        }
    });
}

// ── Settings Form ─────────────────────────────────────────────────────────────
async function wireSettingsForm() {
    try {
        const res = await fetch(`${API_BASE}/api/config/settings`);
        if (res.ok) {
            const s = await res.json();
            $('setting-hero-headline').value = s.heroHeadline || '';
            $('setting-hero-subtext').value = s.heroSubtext || '';
            $('setting-about-text').value = s.aboutText || '';
        }
    } catch { }

    $('settings-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = $('save-settings-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

        try {
            const res = await fetch(`${API_BASE}/api/config/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    heroHeadline: $('setting-hero-headline').value.trim(),
                    heroSubtext: $('setting-hero-subtext').value.trim(),
                    aboutText: $('setting-about-text').value.trim()
                })
            });
            if (res.ok) showToast('Settings saved and live!', 'success');
            else showToast('Save failed', 'error');
        } catch { showToast('Network error', 'error'); }
        finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Settings';
        }
    });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
    const toast = $('toast');
    const icon = $('toast-icon');
    $('toast-message').textContent = msg;

    toast.className = 'toast';
    icon.className = type === 'error'
        ? 'fa-solid fa-circle-xmark'
        : type === 'info'
            ? 'fa-solid fa-circle-info'
            : 'fa-solid fa-circle-check';
    toast.classList.add(type);
    toast.classList.remove('hidden');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ── Co-Travel administration ───────────────────────────────────────────────
async function loadCoTravelPostings() {
    try {
        const res = await fetch(`${API_BASE}/api/rideshare`);
        if (res.ok) {
            coTravelPostings = await res.json();
        }
    } catch {
        showToast('Could not load co-travel postings', 'error');
    }
    renderCoTravelTable();
}

function renderCoTravelTable() {
    const tbody = $('cotravel-tbody');
    const countEl = $('cotravel-count');
    if (countEl) countEl.textContent = `${coTravelPostings.length} active`;
    
    if (!tbody) return;
    
    if (!coTravelPostings.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">
            No co-travel postings active.
        </td></tr>`;
        return;
    }
    
    tbody.innerHTML = coTravelPostings.map(post => {
        const dateStr = new Date(post.date).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        const isOffering = post.type === 'offering';
        const typeBadge = isOffering 
            ? '<span class="status-pill replied">Offering</span>' 
            : '<span class="status-pill pending">Seeking</span>';
            
        return `
            <tr>
                <td><strong>${post.name}</strong></td>
                <td>${post.phone}</td>
                <td>${post.from} → ${post.to}</td>
                <td>${dateStr}</td>
                <td>${post.seats}</td>
                <td>${typeBadge}</td>
                <td>
                    <button class="action-btn delete" onclick="deleteCoTravel('${post._id}','${post.name}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteCoTravel(id, name) {
    if (!confirm(`Are you sure you want to delete the posting by "${name}"?`)) return;
    try {
        const res = await fetch(`${API_BASE}/api/rideshare/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        });
        if (res.ok) {
            showToast('Posting deleted successfully', 'success');
            await loadCoTravelPostings();
        } else {
            showToast('Delete failed', 'error');
        }
    } catch {
        showToast('Network error', 'error');
    }
}
window.deleteCoTravel = deleteCoTravel;
window.loadCoTravelPostings = loadCoTravelPostings;

