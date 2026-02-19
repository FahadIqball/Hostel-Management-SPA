/* ═══════════════════════════════════════════════════════════════
   ATTENDANCE — Daily Tracking
   ═══════════════════════════════════════════════════════════════ */

const Attendance = {
  data: [],
  selectedDate: new Date().toISOString().split('T')[0],
  view: 'daily', // 'daily' or 'summary'

  async render() {
    const el = App.getContentEl();
    el.innerHTML = '<div class="empty-state"><p>Loading attendance...</p></div>';

    try {
      if (this.view === 'daily') {
        this.data = await API.get(`/api/attendance?date=${this.selectedDate}`);
        this.renderDaily(el);
      } else {
        this.data = await API.get('/api/attendance/summary');
        this.renderSummary(el);
      }
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
  },

  renderDaily(el) {
    const rows = this.data;
    el.innerHTML = `
      <div class="page-header">
        <div class="search-container">
          <div class="search-input-wrapper" style="max-width:300px">
            <input type="date" id="attendance-date" value="${this.selectedDate}" title="Select Attendance Date">
          </div>
          <button class="btn btn-primary" id="bulk-attendance-btn">📋 Bulk Attendance</button>
        </div>

        <div class="filter-chips">
          <div class="filter-chip ${this.view === 'daily' ? 'active' : ''}" onclick="Attendance.switchView('daily')">Daily View</div>
          <div class="filter-chip ${this.view === 'summary' ? 'active' : ''}" onclick="Attendance.switchView('summary')">Summary Report</div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Roll #</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0
        ? '<tr><td colspan="3"><div class="empty-state"><div class="empty-icon">📋</div><p>No attendance records for this date</p></div></td></tr>'
        : rows.map(a => `
                <tr>
                  <td><strong>${escapeHtml(a.student_name)}</strong></td>
                  <td>${escapeHtml(a.roll_number)}</td>
                  <td><span class="badge ${a.status === 'Present' ? 'badge-success' : a.status === 'Absent' ? 'badge-danger' : 'badge-warning'}">${a.status}</span></td>
                </tr>
              `).join('')
      }
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('attendance-date').addEventListener('change', (e) => {
      this.selectedDate = e.target.value;
      this.render();
    });

    document.getElementById('bulk-attendance-btn').onclick = () => this.openBulkForm();
  },

  renderSummary(el) {
    const rows = this.data;
    el.innerHTML = `
      <div class="page-header">
        <div class="filter-chips">
          <div class="filter-chip ${this.view === 'daily' ? 'active' : ''}" onclick="Attendance.switchView('daily')">Daily View</div>
          <div class="filter-chip ${this.view === 'summary' ? 'active' : ''}" onclick="Attendance.switchView('summary')">Summary Report</div>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Roll #</th>
              <th>Total Days</th>
              <th>Present</th>
              <th>Absent</th>
              <th>On Leave</th>
              <th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0
        ? '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><p>No attendance data yet</p></div></td></tr>'
        : rows.map(s => {
          const pct = s.total_days > 0 ? Math.round((s.present_days / s.total_days) * 100) : 0;
          return `
                    <tr>
                      <td><strong>${escapeHtml(s.name)}</strong></td>
                      <td>${escapeHtml(s.roll_number)}</td>
                      <td>${s.total_days}</td>
                      <td><span style="color:#34d399">${s.present_days}</span></td>
                      <td><span style="color:#f87171">${s.absent_days}</span></td>
                      <td><span style="color:#fbbf24">${s.leave_days}</span></td>
                      <td>
                        <div style="display:flex;align-items:center;gap:0.5rem">
                          <div style="flex:1;height:6px;background:rgba(15,15,35,0.5);border-radius:3px;overflow:hidden;min-width:60px">
                            <div style="height:100%;width:${pct}%;background:${pct >= 75 ? 'var(--gradient-success)' : pct >= 50 ? 'var(--gradient-warning)' : 'var(--gradient-danger)'};border-radius:3px;transition:width 0.3s ease"></div>
                          </div>
                          <span style="font-size:0.8rem;font-weight:600;color:${pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'}">${pct}%</span>
                        </div>
                      </td>
                    </tr>
                  `;
        }).join('')
      }
          </tbody>
        </table>
      </div>
    `;
  },

  switchView(v) {
    this.view = v;
    this.render();
  },

  async openBulkForm() {
    let students = [];
    try { students = await API.get('/api/students/active'); } catch (e) { }

    if (students.length === 0) {
      showToast('No active students to mark attendance for', 'error');
      return;
    }

    Modal.open('Bulk Attendance — ' + this.selectedDate, `
      <form id="bulk-attendance-form">
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="ba-date" value="${this.selectedDate}">
        </div>
        <div style="max-height:350px;overflow-y:auto;margin:1rem 0;border:1px solid var(--border-color);border-radius:var(--radius-sm)">
          <table class="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll #</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => `
                <tr>
                  <td>${escapeHtml(s.name)}</td>
                  <td>${escapeHtml(s.roll_number)}</td>
                  <td>
                    <select class="ba-status form-select-sm" data-sid="${s.id}">
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Attendance</button>
        </div>
      </form>
    `);

    document.getElementById('bulk-attendance-form').onsubmit = async (e) => {
      e.preventDefault();
      const date = document.getElementById('ba-date').value;
      const selects = document.querySelectorAll('.ba-status');
      const records = Array.from(selects).map(sel => ({
        student_id: parseInt(sel.dataset.sid),
        status: sel.value,
      }));

      try {
        await API.post('/api/attendance/bulk', { date, records });
        showToast(`Attendance saved for ${records.length} students`);
        Modal.close();
        this.selectedDate = date;
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
};
window.Attendance = Attendance;
