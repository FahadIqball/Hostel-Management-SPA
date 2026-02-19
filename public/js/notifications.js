/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS HUB
   ═══════════════════════════════════════════════════════════════ */

const Notifications = {
    data: [],
    unreadCount: 0,

    async init() {
        await this.load();
        this.renderBell();
        // Poll for new notifications every 30 seconds
        setInterval(() => this.load().then(() => this.renderBell()), 30000);
    },

    async load() {
        try {
            this.data = await API.get('/api/notifications');
            this.unreadCount = this.data.filter(n => !n.is_read).length;
        } catch (e) { console.error('Failed to load notifications'); }
    },

    renderBell() {
        const bellContainer = document.getElementById('notifications-bell');
        if (!bellContainer) return;

        bellContainer.innerHTML = `
      <div class="bell-icon-wrapper" onclick="Notifications.toggleDropdown(event)">
        <span class="bell-icon">🔔</span>
        ${this.unreadCount > 0 ? `<span class="bell-badge">${this.unreadCount}</span>` : ''}
      </div>
      <div id="notifications-dropdown" class="notifications-dropdown">
        <div class="dropdown-header">
          <h3>Notifications</h3>
          <button class="btn btn-sm btn-ghost" onclick="Notifications.markAllRead()">Mark all as read</button>
        </div>
        <div class="dropdown-body">
          ${this.data.length === 0 ? '<div class="empty-state" style="padding:1rem">No notifications</div>' : ''}
          ${this.data.map(n => `
            <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="Notifications.markRead(${n.id})">
              <div class="notif-content">
                <p>${n.message}</p>
                <small>${formatDate(n.created_at)}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    },

    toggleDropdown(e) {
        e.stopPropagation();
        const dropdown = document.getElementById('notifications-dropdown');
        dropdown.classList.toggle('active');

        // Close on click outside
        const close = (event) => {
            if (!dropdown.contains(event.target)) {
                dropdown.classList.remove('active');
                document.removeEventListener('click', close);
            }
        };
        if (dropdown.classList.contains('active')) {
            document.addEventListener('click', close);
        }
    },

    async markRead(id) {
        try {
            await API.put(`/api/notifications/${id}/read`);
            this.load().then(() => this.renderBell());
        } catch (e) { }
    },

    async markAllRead() {
        try {
            await API.put('/api/notifications/read-all');
            this.load().then(() => this.renderBell());
        } catch (e) { }
    }
};
