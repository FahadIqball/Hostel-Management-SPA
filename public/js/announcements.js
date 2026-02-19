/* ═══════════════════════════════════════════════════════════════
   ANNOUNCEMENTS — Notice Board
   ═══════════════════════════════════════════════════════════════ */

const Announcements = {
  data: [],

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading announcements...</p></div>';

    try {
      this.data = await API.get('/api/announcements');
      this.renderView(el);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderView(el) {
    const rows = this.data;
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isAdmin = user.role !== 'Student';

    el.innerHTML = `
      <div class="page-toolbar">
        <div class="toolbar-left">
          <span style="font-size:0.9rem;color:var(--text-secondary)">${rows.length} announcement${rows.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="toolbar-right">
          ${isAdmin ? `<button class="btn btn-primary" id="add-announcement-btn">+ Post Announcement</button>` : ''}
        </div>
      </div>
      <div class="announcement-list">
        ${rows.length === 0
        ? `<div class="empty-state"><div class="empty-icon">📢</div><p>No announcements yet.</p></div>`
        : rows.map(a => `
            <div class="announcement-card" style="border-left: 4px solid ${this.getPriorityColor(a.priority)}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                   <h4 style="margin-bottom:0.25rem">${escapeHtml(a.title)}</h4>
                   ${a.category ? `<span class="badge badge-info" style="font-size:0.7rem">${escapeHtml(a.category)}</span>` : ''}
                   ${a.priority && a.priority !== 'Normal' ? `<span class="badge ${a.priority === 'Urgent' ? 'badge-danger' : 'badge-warning'}" style="font-size:0.7rem">${a.priority}</span>` : ''}
                </div>
                ${isAdmin ? `
                <div class="actions-cell">
                  <button class="btn btn-sm btn-ghost" onclick="Announcements.edit(${a.id})">✏️</button>
                  <button class="btn btn-sm btn-danger btn-icon" onclick="Announcements.remove(${a.id})">🗑️</button>
                </div>` : ''}
              </div>
              <p style="margin-top:0.75rem">${escapeHtml(a.message)}</p>
              <div class="announcement-meta">
                <span>📅 ${formatDate(a.created_at)}</span>
                <span>👤 ${escapeHtml(a.posted_by_name || 'Unknown')}</span>
              </div>
            </div>
          `).join('')
      }
      </div>
    `;

    if (isAdmin) {
      document.getElementById('add-announcement-btn').onclick = () => this.openForm();
    }
  },

  getPriorityColor(priority) {
    if (priority === 'Urgent') return 'var(--danger-color)';
    if (priority === 'Important') return 'var(--warning-color)';
    return 'var(--border-color)';
  },

  openForm(announcement = null) {
    const isEdit = !!announcement;
    Modal.open(isEdit ? 'Edit Announcement' : 'Post Announcement', `
      <form id="announcement-form">
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="af-title" value="${announcement ? escapeHtml(announcement.title) : ''}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
               <label>Category</label>
               <select id="af-category">
                  <option value="General" ${announcement && announcement.category === 'General' ? 'selected' : ''}>General</option>
                  <option value="Academic" ${announcement && announcement.category === 'Academic' ? 'selected' : ''}>Academic</option>
                  <option value="Events" ${announcement && announcement.category === 'Events' ? 'selected' : ''}>Events</option>
                  <option value="Maintenance" ${announcement && announcement.category === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
               </select>
            </div>
            <div class="form-group">
               <label>Priority</label>
               <select id="af-priority">
                  <option value="Normal" ${announcement && announcement.priority === 'Normal' ? 'selected' : ''}>Normal</option>
                  <option value="Important" ${announcement && announcement.priority === 'Important' ? 'selected' : ''}>Important</option>
                  <option value="Urgent" ${announcement && announcement.priority === 'Urgent' ? 'selected' : ''}>Urgent</option>
               </select>
            </div>
        </div>
        <div class="form-group">
          <label>Message</label>
          <textarea id="af-message" rows="5" required>${announcement ? escapeHtml(announcement.message) : ''}</textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Update' : 'Post'}</button>
      </form>
    `);

    document.getElementById('announcement-form').onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        title: document.getElementById('af-title').value.trim(),
        category: document.getElementById('af-category').value,
        priority: document.getElementById('af-priority').value,
        message: document.getElementById('af-message').value.trim(),
      };

      try {
        if (isEdit) {
          await API.put(`/api/announcements/${announcement.id}`, data);
          showToast('Announcement updated');
        } else {
          await API.post('/api/announcements', data);
          showToast('Announcement posted');
        }
        Modal.close();
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  },

  edit(id) {
    const a = this.data.find(x => x.id === id);
    if (a) this.openForm(a);
  },

  async remove(id) {
    App.confirm('Delete Announcement', 'Are you sure you want to delete this announcement?', async () => {
      try {
        await API.delete(`/api/announcements/${id}`);
        showToast('Announcement deleted');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
window.Announcements = Announcements;
