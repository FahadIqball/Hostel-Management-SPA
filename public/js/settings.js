/* ═══════════════════════════════════════════════════════════════
   SETTINGS — Hostel Configuration
   ═══════════════════════════════════════════════════════════════ */

const Settings = {
    async render() {
        const el = App.getContentEl();
        el.innerHTML = '<div class="empty-state"><p>Loading settings...</p></div>';

        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const isAdmin = user.role === 'Admin';

        try {
            const s = await API.get('/api/settings');
            el.innerHTML = `
        <div class="card" style="max-width:600px">
          <h4 style="margin-bottom:1rem;color:var(--text-primary)">🏨 Hostel Information</h4>
          <form id="settings-form">
            <div class="form-group">
              <label>Hostel Name</label>
              <input type="text" id="sf-name" value="${escapeHtml(s.hostel_name || '')}" placeholder="Hostel name" ${!isAdmin ? 'disabled' : ''}>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Contact Number</label>
                <input type="text" id="sf-contact" value="${escapeHtml(s.contact || '')}" placeholder="Phone number" ${!isAdmin ? 'disabled' : ''}>
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="sf-email" value="${escapeHtml(s.email || '')}" placeholder="Email address" ${!isAdmin ? 'disabled' : ''}>
              </div>
            </div>
            <div class="form-group">
              <label>Address</label>
              <textarea id="sf-address" rows="3" placeholder="Full address" ${!isAdmin ? 'disabled' : ''}>${escapeHtml(s.address || '')}</textarea>
            </div>
            ${isAdmin ? `
              <div class="modal-actions" style="justify-content:flex-start;padding-top:0.5rem">
                <button type="submit" class="btn btn-primary">Save Settings</button>
              </div>
            ` : '<p style="color:var(--text-secondary);font-size:0.85rem;margin-top:0.5rem">Only admins can edit settings.</p>'}
          </form>
        </div>

        <div class="card" style="max-width:600px;margin-top:1.5rem">
          <h4 style="margin-bottom:1rem;color:var(--text-primary)">🎨 Appearance</h4>
          <div style="display:flex;align-items:center;gap:1rem">
            <span style="color:var(--text-secondary);font-size:0.9rem">Theme:</span>
            <button class="btn btn-sm ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'btn-primary' : 'btn-ghost'}" onclick="Settings.setTheme('dark')">🌙 Dark</button>
            <button class="btn btn-sm ${document.documentElement.getAttribute('data-theme') === 'light' ? 'btn-primary' : 'btn-ghost'}" onclick="Settings.setTheme('light')">☀️ Light</button>
          </div>
        </div>

        <div class="card" style="max-width:600px;margin-top:1.5rem">
          <h4 style="margin-bottom:0.5rem;color:var(--text-primary)">ℹ️ System Info</h4>
          <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.8">
            <div>Logged in as: <strong>${escapeHtml(user.fullName)}</strong> (${user.role})</div>
            <div>Application: Hostel Management System v2.0</div>
          </div>
        </div>
      `;

            if (isAdmin) {
                document.getElementById('settings-form').onsubmit = async (e) => {
                    e.preventDefault();
                    try {
                        await API.put('/api/settings', {
                            hostel_name: document.getElementById('sf-name').value.trim(),
                            contact: document.getElementById('sf-contact').value.trim(),
                            email: document.getElementById('sf-email').value.trim(),
                            address: document.getElementById('sf-address').value.trim(),
                        });
                        showToast('Settings saved');
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                };
            }
        } catch (err) {
            el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
        }
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        document.getElementById('theme-toggle').textContent = theme === 'dark' ? '🌙' : '☀️';
        this.render(); // re-render to update active button
    }
};
