/* ═══════════════════════════════════════════════════════════════
   EMERGENCY CONTACTS
   ═══════════════════════════════════════════════════════════════ */

const Emergency = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading contacts...</p></div>';

    try {
      this.data = await API.get('/api/emergency-contacts');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isAdmin = user.role === 'Admin' || user.role === 'Warden';

    el.innerHTML = `
      <div class="header-actions">
        <h2>🆘 Emergency Contacts</h2>
        ${isAdmin ? `<button class="btn btn-primary" onclick="Emergency.addContact()">➕ Add Contact</button>` : ''}
      </div>

      <div class="contact-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.5rem">
        ${this.data.map(c => `
          <div class="card contact-card">
            <div class="card-body" style="display:flex;align-items:center;">
               <div style="font-size:2rem;margin-right:1rem">📞</div>
               <div>
                  <h4 style="margin:0">${escapeHtml(c.name)}</h4>
                  <p style="margin:0;color:var(--text-secondary)">${escapeHtml(c.role)}</p>
                  <strong style="color:var(--text-primary);font-size:1.1rem">${escapeHtml(c.phone)}</strong>
               </div>
               ${isAdmin ? `<button class="btn btn-sm btn-ghost" style="margin-left:auto" onclick="Emergency.remove(${c.id})">🗑️</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
     `;
  },

  addContact() {
    Modal.open('Add Contact', `
      <form id="em-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="em-name" required>
        </div>
        <div class="form-group">
          <label>Role</label>
          <input type="text" id="em-role" placeholder="e.g. Warden / Police" required>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="em-phone" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Add Contact</button>
      </form>
    `);

    document.getElementById('em-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('em-name').value,
        role: document.getElementById('em-role').value,
        phone: document.getElementById('em-phone').value
      };

      try {
        await API.post('/api/emergency-contacts', payload);
        showToast('Contact added');
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  },

  async remove(id) {
    App.confirm('Delete Contact', 'Are you sure you want to delete this contact?', async () => {
      try {
        await API.delete(`/api/emergency-contacts/${id}`);
        showToast('Contact deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Emergency = Emergency;
