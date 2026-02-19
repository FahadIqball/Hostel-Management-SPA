/* ═══════════════════════════════════════════════════════════════
   APP — SPA Router & Application Controller
   ═══════════════════════════════════════════════════════════════ */

const App = {
    currentPage: null,

    pages: {
        // Admin / Warden Pages
        dashboard: { title: 'Dashboard', render: () => Dashboard.render(), roles: ['Admin', 'Warden'] },
        rooms: { title: 'Rooms Management', render: () => Rooms.render(), roles: ['Admin', 'Warden'] },
        students: { title: 'Students Management', render: () => Students.render(), roles: ['Admin', 'Warden'] },
        fees: { title: 'Fee Management', render: () => Fees.render(), roles: ['Admin', 'Warden'] },
        complaints: { title: 'Complaints & Maintenance', render: () => Complaints.render(), roles: ['Admin', 'Warden'] },
        visitors: { title: 'Visitor Log', render: () => Visitors.render(), roles: ['Admin', 'Warden'] },
        attendance: { title: 'Attendance', render: () => Attendance.render(), roles: ['Admin', 'Warden'] },
        users: { title: 'User Management', render: () => Users.render(), roles: ['Admin'] },
        reports: { title: 'Room Allocation Report', render: () => Allocation.render(), roles: ['Admin'] },
        'activity-log': { title: 'Activity Log', render: () => ActivityLog.render(), roles: ['Admin'] },
        approvals: { title: 'Student Approvals', render: () => Approvals.render(), roles: ['Admin', 'Warden'] },
        inventory: { title: 'Inventory & Assets', render: () => Inventory.render(), roles: ['Admin', 'Warden'] },

        // Student Pages
        'student-dashboard': { title: 'My Dashboard', render: () => StudentDashboard.render(), roles: ['Student'] },
        'my-fees': { title: 'My Fees', render: () => MyFees.render(), roles: ['Student'] },
        'my-attendance': { title: 'My Attendance', render: () => MyAttendance.render(), roles: ['Student'] },
        'my-complaints': { title: 'My Complaints', render: () => MyComplaints.render(), roles: ['Student'] },
        'gate-passes': { title: 'Gate Passes', render: () => GatePass.render(), roles: ['Student'] },
        'room-transfers': { title: 'Room Transfer Requests', render: () => RoomTransfers.render(), roles: ['Student'] },
        'my-mess': { title: 'My Mess Attendance & Bills', render: () => MyMess.render(), roles: ['Student'] },
        'clearance-student': { title: 'My Clearance', render: () => ClearanceStudent.render(), roles: ['Student'] },

        // Shared / Multi-role Pages
        announcements: { title: 'Notices', render: () => Announcements.render(), roles: ['Admin', 'Warden', 'Student'] },
        settings: { title: 'Settings', render: () => Settings.render(), roles: ['Admin', 'Warden', 'Student'] },
        'gate-passes-admin': { title: 'Gate Passes (Admin)', render: () => GatePass.renderAdmin(), roles: ['Admin', 'Warden'] },
        'room-transfers-admin': { title: 'Room Transfer Requests', render: () => RoomTransfers.renderAdmin(), roles: ['Admin', 'Warden'] },
        'mess-menu': { title: 'Mess Menu', render: () => MessMenu.render(), roles: ['Admin', 'Warden', 'Student'] },
        'mess-admin': { title: 'Mess Management', render: () => MessManage.render(), roles: ['Admin', 'Warden'] },
        'clearance-admin': { title: 'Clearance Management', render: () => ClearanceAdmin.render(), roles: ['Admin', 'Warden'] },
        polls: { title: 'Polls & Feedback', render: () => Polls.render(), roles: ['Admin', 'Warden', 'Student'] },
        'emergency': { title: 'Emergency Contacts', render: () => Emergency.render(), roles: ['Admin', 'Warden', 'Student'] },
    },

    init() {
        this.setupNavigation();
        this.setupSidebar();
        this.setupThemeToggle();

        if (!sessionStorage.getItem('sessionId')) {
            this.showLogin();
            return;
        }
        this.launch();
    },

    launch() {
        this.showApp();
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const defaultPage = user.role === 'Student' ? 'student-dashboard' : 'dashboard';
        const targetPage = location.hash.slice(1) || defaultPage;
        this.navigate(targetPage);
        Notifications.init();
    },

    showModal(title, body) { Modal.open(title, body); },
    closeModal() { Modal.close(); },
    confirm(title, message, callback) { Modal.confirm(title, message, callback); },

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-shell').style.display = 'none';
        // Auth.init() is now called once in DOMContentLoaded
    },

    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';

        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('user-display').textContent = `${user.fullName || 'User'} (${user.role || ''})`;

        // Show/hide sidebar items based on role
        document.querySelectorAll('.nav-item').forEach(el => {
            const isAdminItem = el.classList.contains('admin-only'); // Admin/Warden
            const isStudentItem = el.classList.contains('student-only');

            if (user.role === 'Student') {
                el.style.display = isStudentItem || (!isAdminItem && !isStudentItem) ? 'flex' : 'none';
            } else if (user.role === 'Admin') {
                el.style.display = !isStudentItem ? 'flex' : 'none';
            } else { // Warden
                // Hide admin-only specific to Admin role like User Mgmt? 
                // Currently 'admin-only' means Admin/Warden shared mostly, except specific logic.
                // But index.html has 'admin-only' on User Mgmt which Warden shouldn't see? 
                // Wait, index.html class logic is a bit simple. Let's refined it here.

                // If the link points to a page restricted to Admin but user is Warden -> hide
                const pageKey = el.getAttribute('data-page');
                const pageConfig = this.pages[pageKey] || {};

                if (isStudentItem) {
                    el.style.display = 'none';
                } else {
                    if (pageConfig.roles && !pageConfig.roles.includes(user.role)) {
                        el.style.display = 'none';
                    } else {
                        el.style.display = 'flex';
                    }
                }
            }
        });

        document.getElementById('logout-btn').onclick = async () => {
            try { await API.post('/api/logout'); } catch (e) { }
            sessionStorage.clear();
            location.reload();
        };
    },

    setupNavigation() {
        if (this._navSetup) return;
        window.addEventListener('hashchange', () => {
            if (sessionStorage.getItem('sessionId')) {
                this.navigate(location.hash.slice(1));
            }
        });
        this._navSetup = true;
    },

    setupSidebar() {
        if (this._sidebarSetup) return;
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });
        });
        this._sidebarSetup = true;
    },

    setupThemeToggle() {
        if (this._themeSetup) return;
        const btn = document.getElementById('theme-toggle');
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        if (btn) btn.textContent = saved === 'dark' ? '🌙' : '☀️';

        if (btn) {
            btn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
                btn.textContent = next === 'dark' ? '🌙' : '☀️';
            });
        }
        this._themeSetup = true;
    },

    navigate(page) {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');

        // Redirect if page invalid or unauthorized
        if (!this.pages[page] || (this.pages[page].roles && !this.pages[page].roles.includes(user.role))) {
            console.warn(`Unauthorized access to ${page} by ${user.role}`);
            page = user.role === 'Student' ? 'student-dashboard' : 'dashboard';
        }

        this.currentPage = page;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        document.getElementById('page-title').textContent = this.pages[page].title;
        this.pages[page].render();
    },

    getContentEl() {
        return document.getElementById('page-content');
    }
};

// ─── MODAL ──────────────────────────────────────────────────
const Modal = {
    open(title, bodyHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-overlay').classList.add('active');
        document.getElementById('modal-overlay').style.zIndex = '1000'; // ensure on top
    },
    close() {
        document.getElementById('modal-overlay').classList.remove('active');
    },
    init() {
        document.getElementById('modal-close').addEventListener('click', () => Modal.close());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) Modal.close();
        });
    },
    confirm(title, message, onConfirm) {
        const body = `
            <p style="margin-bottom:1.5rem">${message}</p>
            <div style="display:flex; gap:1rem">
                <button id="modal-confirm-btn" class="btn btn-primary" style="flex:1">Confirm</button>
                <button id="modal-cancel-btn" class="btn btn-ghost" style="flex:1">Cancel</button>
            </div>
        `;
        this.open(title, body);
        document.getElementById('modal-confirm-btn').onclick = () => {
            this.close();
            onConfirm();
        };
        document.getElementById('modal-cancel-btn').onclick = () => this.close();
    }
};

// ─── TOAST ──────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── UTILS ──────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr || dateStr.startsWith('0000')) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr || dateStr.startsWith('0000')) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

const MONTHS = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    window.onerror = (msg, url, line) => {
        showToast(`${msg} (at ${url.split('/').pop()}:${line})`, 'error');
    };
    Modal.init();
    Auth.init();
    App.init();
});

// Expose to window for inline event handlers and global access
window.App = App;
window.Modal = Modal;
window.Auth = Auth;
window.showToast = showToast;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.escapeHtml = escapeHtml;
window.MONTHS = MONTHS;
