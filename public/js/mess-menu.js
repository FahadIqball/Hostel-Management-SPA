/* ═══════════════════════════════════════════════════════════════
   MESS MENU
   ═══════════════════════════════════════════════════════════════ */

const MessMenu = {
    data: [],
    DAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    MEALS: ['Breakfast', 'Lunch', 'Dinner'],

    async render() {
        const el = App.getContentEl();
        el.innerHTML = '<div class="empty-state"><p>Loading menu...</p></div>';

        try {
            this.data = await API.get('/api/mess-menu');
            this.renderView(el);
        } catch (err) {
            el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
        }
    },

    renderView(el) {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const isAdmin = user.role === 'Admin' || user.role === 'Warden';

        // Group by Day
        const menuByDay = {};
        this.DAYS.forEach(d => menuByDay[d] = {});
        this.data.forEach(m => {
            if (menuByDay[m.day_of_week]) menuByDay[m.day_of_week][m.meal_type] = m.items;
        });

        el.innerHTML = `
      <div class="header-actions">
        <h2>🍽️ Weekly Mess Menu</h2>
        ${isAdmin ? `<button class="btn btn-primary" onclick="MessMenu.editMenu()">✏️ Edit Menu</button>` : ''}
      </div>

      <div class="menu-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:1.5rem">
        ${this.DAYS.map(day => `
          <div class="card">
            <div class="card-header">
              <h3>${day}</h3>
            </div>
            <div class="card-body">
              ${this.MEALS.map(meal => `
                <div style="margin-bottom:1rem">
                  <div style="font-weight:600;color:var(--text-accent);font-size:0.9rem">${meal}</div>
                  <div style="font-size:0.95rem;color:var(--text-secondary)">
                    ${menuByDay[day][meal] || '—'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    },

    editMenu() {
        // Generate form rows for each day/meal
        const rows = this.DAYS.map(day => `
      <div style="margin-bottom:1.5rem;border-bottom:1px solid var(--border-color);padding-bottom:1rem">
        <strong>${day}</strong>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-top:0.5rem">
          ${this.MEALS.map(meal => {
            const val = this.data.find(m => m.day_of_week === day && m.meal_type === meal)?.items || '';
            return `
               <div>
                 <label style="font-size:0.75rem">${meal}</label>
                 <input type="text" class="menu-input" data-day="${day}" data-meal="${meal}" value="${escapeHtml(val)}" placeholder="Item 1, Item 2">
               </div>
             `;
        }).join('')}
        </div>
      </div>
    `).join('');

        Modal.open('Edit Mess Menu', `
      <form id="menu-form">
        <div style="max-height:60vh;overflow-y:auto;padding-right:0.5rem">
           ${rows}
        </div>
        <div style="margin-top:1rem">
           <button type="submit" class="btn btn-primary btn-block">Save Menu</button>
        </div>
      </form>
    `);

        document.getElementById('menu-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = document.querySelectorAll('.menu-input');
            const updates = [];

            inputs.forEach(input => {
                updates.push({
                    day: input.dataset.day,
                    type: input.dataset.meal,
                    items: input.value
                });
            });

            try {
                // Send updates sequentially or bulk? API supports single update.
                // Let's loop. Not efficient but works for small data.
                // Or update API to accept array.
                // Assuming user edits few fields, we can diff?
                // Let's just send all for simplicity, maybe in promise.all.
                // Limit concurrency.

                await Promise.all(updates.map(u => API.put('/api/mess-menu', u)));

                showToast('Menu updated');
                Modal.close();
                this.render();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
};
