/* ═══════════════════════════════════════════════════════════════
   ALLOCATION — Room Allocation Report
   ═══════════════════════════════════════════════════════════════ */

const Allocation = {
    data: [],

    async render() {
        const el = App.getContentEl();
        el.innerHTML = '<div class="empty-state"><p>Loading room report...</p></div>';

        try {
            this.data = await API.get('/api/reports/allocation');
            this.renderView(el);
        } catch (err) {
            el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
        }
    },

    renderView(el) {
        const rooms = this.data;
        const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
        const totalOccupied = rooms.reduce((s, r) => s + r.occupied, 0);
        const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

        // Group by floor
        const floors = {};
        rooms.forEach(r => {
            if (!floors[r.floor]) floors[r.floor] = [];
            floors[r.floor].push(r);
        });

        el.innerHTML = `
      <div class="summary-row">
        <div class="summary-item">Total Rooms: <strong>${rooms.length}</strong></div>
        <div class="summary-item">Total Capacity: <strong>${totalCapacity}</strong></div>
        <div class="summary-item">Occupied Beds: <strong style="color:#818cf8">${totalOccupied}</strong></div>
        <div class="summary-item">Vacant Beds: <strong style="color:#34d399">${totalCapacity - totalOccupied}</strong></div>
        <div class="summary-item">Occupancy: <strong style="color:${occupancyPct > 80 ? '#f87171' : '#34d399'}">${occupancyPct}%</strong></div>
      </div>

      ${Object.keys(floors).sort((a, b) => a - b).map(floor => `
        <div class="card" style="margin-bottom:1rem">
          <h4 style="margin-bottom:0.75rem;color:var(--text-primary)">📍 Floor ${floor}</h4>
          <div class="allocation-grid">
            ${floors[floor].map(r => {
            const pct = r.capacity > 0 ? Math.round((r.occupied / r.capacity) * 100) : 0;
            const statusColor = r.status === 'Maintenance' ? '#f59e0b' : pct >= 100 ? '#f87171' : pct > 0 ? '#818cf8' : '#34d399';
            return `
                <div class="allocation-room-card" style="border-left: 3px solid ${statusColor}">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
                    <strong style="font-size:1rem">${escapeHtml(r.room_number)}</strong>
                    <span class="badge ${r.status === 'Available' ? 'badge-success' : r.status === 'Full' ? 'badge-danger' : 'badge-warning'}">${r.status}</span>
                  </div>
                  <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.4rem">${r.type} · ${r.occupied}/${r.capacity} beds</div>
                  <div style="height:4px;background:rgba(15,15,35,0.3);border-radius:2px;overflow:hidden;margin-bottom:0.5rem">
                    <div style="height:100%;width:${pct}%;background:${statusColor};border-radius:2px;transition:width 0.3s ease"></div>
                  </div>
                  ${r.occupants && r.occupants.length > 0 ? `
                    <div style="font-size:0.78rem;color:var(--text-secondary)">
                      ${r.occupants.map(s => `<div style="padding:2px 0">👤 ${escapeHtml(s.name)} <span style="opacity:0.5">(${escapeHtml(s.roll_number)})</span></div>`).join('')}
                    </div>
                  ` : `<div style="font-size:0.78rem;color:var(--text-muted);font-style:italic">No occupants</div>`}
                </div>
              `;
        }).join('')}
          </div>
        </div>
      `).join('')}

      ${rooms.length === 0 ? '<div class="empty-state"><div class="empty-icon">🏠</div><p>No rooms to display. Add rooms first.</p></div>' : ''}
    `;
    }
};
