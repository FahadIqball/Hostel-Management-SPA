/* ═══════════════════════════════════════════════════════════════
   MY ATTENDANCE
   ═══════════════════════════════════════════════════════════════ */

const MyAttendance = {
    data: null,

    async render() {
        const el = App.getContentEl();
        el.innerHTML = '<div class="empty-state"><p>Loading attendance data...</p></div>';

        try {
            // For now, fetch summary. Ideally, fetch detailed logs for calendar view.
            // But let's stick to summary + recent logs if available.
            // Since API returns all students' summary, we filter here for now.
            const summary = await API.get('/api/attendance/summary');
            const user = JSON.parse(sessionStorage.getItem('user'));

            // Filter for current user's record (matched by name or ID if available)
            // The summary API returns { id, name, total_days, present, absent }
            // We need to match by something unique. ID should match student ID.
            // We don't have student ID in session, only user ID.
            // But we can fetch profile first or just rely on name match (risky) or iterate.

            // Better: fetch profile to get student ID, then filter.
            const profile = await API.get('/api/student-profile');
            this.data = summary.find(s => s.id === profile.id) || { total_days: 0, present: 0, absent: 0 };

            this.renderView(el);
        } catch (err) {
            el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
        }
    },

    renderView(el) {
        const s = this.data;
        const percentage = s.total_days > 0 ? ((s.present / s.total_days) * 100).toFixed(1) : 0;

        el.innerHTML = `
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-body" style="text-align:center">
             <div style="font-size:3rem;font-weight:bold;color:${percentage >= 75 ? 'var(--success-color)' : 'var(--danger-color)'}">
               ${percentage}%
             </div>
             <p style="color:var(--text-secondary)">Attendance Rate</p>
          </div>
        </div>
        <div class="card">
            <div class="card-body">
               <div class="summary-row">
                 <div class="summary-item">Total Days: <strong>${s.total_days}</strong></div>
                 <div class="summary-item">Present: <strong class="text-success">${s.present}</strong></div>
                 <div class="summary-item">Absent: <strong class="text-danger">${s.absent}</strong></div>
               </div>
            </div>
        </div>
      </div>
    `;
    }
};
