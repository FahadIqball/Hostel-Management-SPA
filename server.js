const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { pool, initDatabase } = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple session store (in-memory for demo)
const sessions = new Map();

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

// Auth middleware
function requireAuth(req, res, next) {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = sessions.get(sessionId);
    req.user = sessions.get(sessionId);
    next();
}

async function logActivity(userId, action, details = '', ip = '') {
    try {
        await pool.execute('INSERT INTO activity_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
            [userId, action, details || null, ip]);
    } catch (e) { console.error('Log failed', e); }
}

// Admin/Warden middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== 'Admin' && req.user.role !== 'Warden') {
        return res.status(403).json({ error: 'Administrative access required' });
    }
    next();
}

function requireStudent(req, res, next) {
    if (req.user.role !== 'Student') {
        return res.status(403).json({ error: 'Student access required' });
    }
    next();
}

// ─── AUTH ROUTES ────────────────────────────────────────────────

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = rows[0];
        const hash = Buffer.from(password).toString('base64');
        if (hash !== user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

        // Check approval status
        if (user.approval_status === 'Pending') return res.status(403).json({ error: 'Account pending approval', code: 'PENDING_APPROVAL' });
        if (user.approval_status === 'Rejected') return res.status(403).json({ error: 'Account rejected', code: 'ACCOUNT_REJECTED' });

        const sessionId = generateSessionId();
        sessions.set(sessionId, { id: user.id, username: user.username, fullName: user.full_name, role: user.role });

        await logActivity(user.id, 'Login', 'User logged in', req.ip);
        res.json({ sessionId, user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Student Self-Registration
app.post('/api/student-register', async (req, res) => {
    try {
        const { username, password, fullName, rollNumber, contact, email } = req.body;

        // Check if username or roll number exists
        const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ error: 'Username already taken' });

        const [existingRoll] = await pool.execute('SELECT id FROM students WHERE roll_number = ?', [rollNumber]);
        if (existingRoll.length > 0) return res.status(400).json({ error: 'Roll number already exists' });

        const hash = Buffer.from(password).toString('base64');

        // 1. Create User (Pending)
        const [userResult] = await pool.execute(
            'INSERT INTO users (username, password_hash, full_name, role, approval_status) VALUES (?, ?, ?, ?, ?)',
            [username, hash, fullName, 'Student', 'Pending']
        );
        const userId = userResult.insertId;

        // 2. Create Student Record
        await pool.execute(
            'INSERT INTO students (name, roll_number, contact, email, status, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [fullName, rollNumber, contact, email, 'Active', userId]
        );

        await logActivity(userId, 'Register', `Student registration request: ${fullName}`, req.ip);
        res.json({ message: 'Registration successful. Please wait for admin approval.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin-only: register new users
app.post('/api/register', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { username, password, fullName, role } = req.body;
        const hash = Buffer.from(password).toString('base64');
        const [result] = await pool.execute(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [username, hash, fullName, role || 'Warden']
        );
        res.json({ id: result.insertId, message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
        res.status(500).json({ error: err.message });
    }
});

// ─── USER MANAGEMENT (Admin only) ──────────────────────────────

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { full_name, role } = req.body;
        await pool.execute('UPDATE users SET full_name=?, role=? WHERE id=?', [full_name, role, req.params.id]);
        res.json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { password } = req.body;
        const hash = Buffer.from(password).toString('base64');
        await pool.execute('UPDATE users SET password_hash=? WHERE id=?', [hash, req.params.id]);
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        if (req.user.id === parseInt(req.params.id)) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await pool.execute('DELETE FROM users WHERE id=?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    sessions.delete(sessionId);
    res.json({ message: 'Logged out' });
});

app.get('/api/me', requireAuth, (req, res) => {
    res.json(req.user);
});

// ─── DASHBOARD STATS ───────────────────────────────────────────

app.get('/api/dashboard', requireAuth, async (req, res) => {
    try {
        const [[{ totalRooms }]] = await pool.execute('SELECT COUNT(*) as totalRooms FROM rooms');
        const [[{ occupiedRooms }]] = await pool.execute("SELECT COUNT(*) as occupiedRooms FROM rooms WHERE status = 'Full'");
        const [[{ totalStudents }]] = await pool.execute("SELECT COUNT(*) as totalStudents FROM students WHERE status = 'Active'");
        const [[{ pendingFees }]] = await pool.execute("SELECT COUNT(*) as pendingFees FROM fees WHERE status IN ('Unpaid','Overdue')");
        const [[{ openComplaints }]] = await pool.execute("SELECT COUNT(*) as openComplaints FROM complaints WHERE status IN ('Open','In Progress')");
        const [[{ todayVisitors }]] = await pool.execute("SELECT COUNT(*) as todayVisitors FROM visitors WHERE DATE(check_in) = CURDATE() AND check_out IS NULL");
        const [[{ totalCollected }]] = await pool.execute("SELECT COALESCE(SUM(amount),0) as totalCollected FROM fees WHERE status = 'Paid'");
        const [[{ totalPending }]] = await pool.execute("SELECT COALESCE(SUM(amount),0) as totalPending FROM fees WHERE status IN ('Unpaid','Overdue')");

        res.json({ totalRooms, occupiedRooms, totalStudents, pendingFees, openComplaints, todayVisitors, totalCollected, totalPending });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ROOMS CRUD ─────────────────────────────────────────────────

app.get('/api/rooms', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM students s WHERE s.room_id = r.id AND s.status = 'Active') as occupied
      FROM rooms r ORDER BY r.room_number
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rooms', requireAuth, async (req, res) => {
    try {
        const { room_number, floor, type, capacity, status } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO rooms (room_number, floor, type, capacity, status) VALUES (?, ?, ?, ?, ?)',
            [room_number, floor || 1, type || 'Double', capacity || 2, status || 'Available']
        );
        res.json({ id: result.insertId, message: 'Room added' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Room number already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/rooms/:id', requireAuth, async (req, res) => {
    try {
        const { room_number, floor, type, capacity, status } = req.body;
        await pool.execute(
            'UPDATE rooms SET room_number=?, floor=?, type=?, capacity=?, status=? WHERE id=?',
            [room_number, floor, type, capacity, status, req.params.id]
        );
        res.json({ message: 'Room updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/rooms/:id', requireAuth, async (req, res) => {
    try {
        await pool.execute('DELETE FROM rooms WHERE id=?', [req.params.id]);
        res.json({ message: 'Room deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── STUDENTS CRUD ──────────────────────────────────────────────

app.get('/api/students', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT s.*, r.room_number 
      FROM students s 
      LEFT JOIN rooms r ON s.room_id = r.id 
      ORDER BY s.name
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/students', requireAuth, async (req, res) => {
    try {
        const { name, roll_number, contact, email, room_id, check_in_date, status } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO students (name, roll_number, contact, email, room_id, check_in_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, roll_number, contact, email, room_id || null, check_in_date || new Date().toISOString().split('T')[0], status || 'Active']
        );
        // Auto-update room status
        if (room_id) await updateRoomStatus(room_id);
        res.json({ id: result.insertId, message: 'Student added' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Roll number already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/students/:id', requireAuth, async (req, res) => {
    try {
        const { name, roll_number, contact, email, room_id, check_in_date, status } = req.body;
        // Get old room_id to update its status
        const [[old]] = await pool.execute('SELECT room_id FROM students WHERE id=?', [req.params.id]);
        await pool.execute(
            'UPDATE students SET name=?, roll_number=?, contact=?, email=?, room_id=?, check_in_date=?, status=? WHERE id=?',
            [name, roll_number, contact, email, room_id || null, check_in_date, status, req.params.id]
        );
        // Update both old and new room statuses
        if (old && old.room_id) await updateRoomStatus(old.room_id);
        if (room_id) await updateRoomStatus(room_id);
        res.json({ message: 'Student updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/students/:id', requireAuth, async (req, res) => {
    try {
        const [[student]] = await pool.execute('SELECT room_id FROM students WHERE id=?', [req.params.id]);
        await pool.execute('DELETE FROM students WHERE id=?', [req.params.id]);
        if (student && student.room_id) await updateRoomStatus(student.room_id);
        res.json({ message: 'Student deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function updateRoomStatus(roomId) {
    const [[room]] = await pool.execute('SELECT capacity FROM rooms WHERE id=?', [roomId]);
    if (!room) return;
    const [[{ count }]] = await pool.execute("SELECT COUNT(*) as count FROM students WHERE room_id=? AND status='Active'", [roomId]);
    const newStatus = count >= room.capacity ? 'Full' : 'Available';
    await pool.execute('UPDATE rooms SET status=? WHERE id=?', [newStatus, roomId]);
}

// ─── FEES CRUD ──────────────────────────────────────────────────

app.get('/api/fees', requireAuth, async (req, res) => {
    try {
        let query = `
      SELECT f.*, s.name as student_name, s.roll_number
      FROM fees f
      JOIN students s ON f.student_id = s.id
    `;
        const params = [];
        if (req.user.role === 'Student') {
            const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
            if (stu.length === 0) return res.json([]);
            query += ' WHERE f.student_id = ?';
            params.push(stu[0].id);
        }
        query += ' ORDER BY f.year DESC, f.month DESC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/fees', requireAuth, async (req, res) => {
    try {
        const { student_id, amount, month, year, due_date, status } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO fees (student_id, amount, month, year, due_date, status) VALUES (?, ?, ?, ?, ?, ?)',
            [student_id, amount, month, year, due_date || null, status || 'Unpaid']
        );
        res.json({ id: result.insertId, message: 'Fee record added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/fees/:id', requireAuth, async (req, res) => {
    try {
        const { student_id, amount, month, year, due_date, status, paid_date } = req.body;
        await pool.execute(
            'UPDATE fees SET student_id=?, amount=?, month=?, year=?, due_date=?, status=?, paid_date=? WHERE id=?',
            [student_id, amount, month, year, due_date, status, paid_date || null, req.params.id]
        );
        res.json({ message: 'Fee record updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/fees/:id/pay', requireAuth, async (req, res) => {
    try {
        await pool.execute(
            "UPDATE fees SET status='Paid', paid_date=CURDATE() WHERE id=?",
            [req.params.id]
        );
        res.json({ message: 'Fee marked as paid' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/fees/:id', requireAuth, async (req, res) => {
    try {
        await pool.execute('DELETE FROM fees WHERE id=?', [req.params.id]);
        res.json({ message: 'Fee record deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── COMPLAINTS CRUD ────────────────────────────────────────────

app.get('/api/complaints', requireAuth, async (req, res) => {
    try {
        let query = `
      SELECT c.*, s.name as student_name, s.roll_number
      FROM complaints c
      JOIN students s ON c.student_id = s.id
    `;
        const params = [];
        if (req.user.role === 'Student') {
            const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
            if (stu.length === 0) return res.json([]);
            query += ' WHERE c.student_id = ?';
            params.push(stu[0].id);
        }
        query += ' ORDER BY c.created_at DESC';

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/complaints', requireAuth, async (req, res) => {
    try {
        let { student_id, category, subject, description, priority } = req.body;

        if (req.user.role === 'Student') {
            const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
            if (stu.length === 0) return res.status(404).json({ error: 'Student record not found' });
            student_id = stu[0].id; // Force student ID
        }

        const [result] = await pool.execute(
            'INSERT INTO complaints (student_id, category, subject, description, priority) VALUES (?, ?, ?, ?, ?)',
            [student_id, category || 'Other', subject, description, priority || 'Medium']
        );

        await logActivity(req.user.id, 'Complaint', `Filed complaint: ${subject}`, req.ip);
        res.json({ id: result.insertId, message: 'Complaint filed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/complaints/:id', requireAuth, async (req, res) => {
    try {
        const { student_id, category, subject, description, priority, status } = req.body;
        const resolvedAt = status === 'Resolved' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
        await pool.execute(
            'UPDATE complaints SET student_id=?, category=?, subject=?, description=?, priority=?, status=?, resolved_at=? WHERE id=?',
            [student_id, category, subject, description, priority, status, resolvedAt, req.params.id]
        );

        const [[stu]] = await pool.execute('SELECT user_id FROM students WHERE id = ?', [student_id]);
        if (stu) await createNotification(stu.user_id, `Your complaint "${subject}" status changed to ${status}.`, 'Complaint');

        res.json({ message: 'Complaint updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/complaints/:id/resolve', requireAuth, async (req, res) => {
    try {
        await pool.execute(
            "UPDATE complaints SET status='Resolved', resolved_at=NOW() WHERE id=?",
            [req.params.id]
        );

        const [[comp]] = await pool.execute('SELECT s.user_id, c.subject FROM complaints c JOIN students s ON c.student_id = s.id WHERE c.id = ?', [req.params.id]);
        if (comp) await createNotification(comp.user_id, `Your complaint "${comp.subject}" has been resolved.`, 'Complaint');

        res.json({ message: 'Complaint resolved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/complaints/:id', requireAuth, async (req, res) => {
    try {
        await pool.execute('DELETE FROM complaints WHERE id=?', [req.params.id]);
        res.json({ message: 'Complaint deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── VISITORS CRUD ──────────────────────────────────────────────

app.get('/api/visitors', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT v.*, s.name as student_name, s.roll_number
      FROM visitors v
      LEFT JOIN students s ON v.student_id = s.id
      ORDER BY v.check_in DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/visitors', requireAuth, async (req, res) => {
    try {
        const { visitor_name, contact, purpose, student_id } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO visitors (visitor_name, contact, purpose, student_id) VALUES (?, ?, ?, ?)',
            [visitor_name, contact, purpose, student_id || null]
        );
        res.json({ id: result.insertId, message: 'Visitor checked in' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/visitors/:id/checkout', requireAuth, async (req, res) => {
    try {
        await pool.execute(
            'UPDATE visitors SET check_out=NOW() WHERE id=?',
            [req.params.id]
        );
        res.json({ message: 'Visitor checked out' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/visitors/:id', requireAuth, async (req, res) => {
    try {
        await pool.execute('DELETE FROM visitors WHERE id=?', [req.params.id]);
        res.json({ message: 'Visitor record deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ATTENDANCE CRUD ────────────────────────────────────────────

app.get('/api/attendance', requireAuth, async (req, res) => {
    try {
        const { date } = req.query;
        let query = `
      SELECT a.*, s.name as student_name, s.roll_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
    `;
        const params = [];
        if (date) {
            query += ' WHERE a.date = ?';
            params.push(date);
        }
        query += ' ORDER BY a.date DESC, s.name';
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/attendance', requireAuth, async (req, res) => {
    try {
        const { student_id, date, status } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status)',
            [student_id, date, status || 'Present']
        );
        res.json({ id: result.insertId, message: 'Attendance recorded' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/attendance/bulk', requireAuth, async (req, res) => {
    try {
        const { date, records } = req.body; // records: [{ student_id, status }]
        for (const r of records) {
            await pool.execute(
                'INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status)',
                [r.student_id, date, r.status]
            );
        }
        res.json({ message: `Attendance recorded for ${records.length} students` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/attendance/summary', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT s.id, s.name, s.roll_number,
        COUNT(a.id) as total_days,
        SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN a.status='Absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN a.status='On Leave' THEN 1 ELSE 0 END) as leave_days
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
      WHERE s.status = 'Active'
      GROUP BY s.id
      ORDER BY s.name
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ANNOUNCEMENTS CRUD ────────────────────────────────────────

app.get('/api/announcements', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT a.*, u.full_name as posted_by_name
      FROM announcements a
      LEFT JOIN users u ON a.posted_by = u.id
      ORDER BY a.created_at DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/announcements', requireAuth, async (req, res) => {
    try {
        const { title, message, priority, category } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO announcements (title, message, priority, category, posted_by) VALUES (?, ?, ?, ?, ?)',
            [title, message, priority || 'Normal', category || 'General', req.user.id]
        );
        res.json({ id: result.insertId, message: 'Announcement posted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/announcements/:id', requireAuth, async (req, res) => {
    try {
        const { title, message, priority, category } = req.body;
        await pool.execute(
            'UPDATE announcements SET title=?, message=?, priority=?, category=? WHERE id=?',
            [title, message, priority || 'Normal', category || 'General', req.params.id]
        );
        res.json({ message: 'Announcement updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/announcements/:id', requireAuth, async (req, res) => {
    try {
        await pool.execute('DELETE FROM announcements WHERE id=?', [req.params.id]);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── AVAILABLE ROOMS (for dropdowns) ───────────────────────────

app.get('/api/rooms/available', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT r.*,
        (SELECT COUNT(*) FROM students s WHERE s.room_id = r.id AND s.status = 'Active') as occupied
      FROM rooms r
      WHERE r.status != 'Maintenance'
      HAVING occupied < r.capacity
      ORDER BY r.room_number
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ACTIVE STUDENTS (for dropdowns) ───────────────────────────

app.get('/api/students/active', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT id, name, roll_number FROM students WHERE status='Active' ORDER BY name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── SETTINGS ──────────────────────────────────────────────────

app.get('/api/settings', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM settings LIMIT 1');
        res.json(rows[0] || { hostel_name: 'My Hostel', contact: '', email: '', address: '' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { hostel_name, contact, email, address } = req.body;
        const [existing] = await pool.execute('SELECT id FROM settings LIMIT 1');
        if (existing.length > 0) {
            await pool.execute('UPDATE settings SET hostel_name=?, contact=?, email=?, address=? WHERE id=?',
                [hostel_name, contact, email, address, existing[0].id]);
        } else {
            await pool.execute('INSERT INTO settings (hostel_name, contact, email, address) VALUES (?, ?, ?, ?)',
                [hostel_name, contact, email, address]);
        }
        res.json({ message: 'Settings saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ROOM ALLOCATION REPORT ────────────────────────────────────

app.get('/api/reports/allocation', requireAuth, async (req, res) => {
    try {
        const [rooms] = await pool.execute(`
            SELECT r.id, r.room_number, r.floor, r.type, r.capacity, r.status,
                (SELECT COUNT(*) FROM students s WHERE s.room_id = r.id AND s.status = 'Active') as occupied
            FROM rooms r
            ORDER BY r.floor, r.room_number
        `);
        // Fetch occupants separately for compatibility with older MySQL
        const [occupants] = await pool.execute(
            "SELECT id, name, roll_number, room_id FROM students WHERE status = 'Active' AND room_id IS NOT NULL"
        );
        // Group occupants by room_id
        const occupantMap = {};
        occupants.forEach(s => {
            if (!occupantMap[s.room_id]) occupantMap[s.room_id] = [];
            occupantMap[s.room_id].push({ id: s.id, name: s.name, roll_number: s.roll_number });
        });
        rooms.forEach(r => {
            r.occupants = occupantMap[r.id] || [];
        });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── INVENTORY CRUD ───────────────────────────────────────────

app.get('/api/inventory', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT i.*, r.room_number 
            FROM inventory_items i 
            LEFT JOIN rooms r ON i.room_id = r.id 
            ORDER BY i.type, i.name
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inventory', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, type, room_id, item_condition, quantity } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO inventory_items (name, type, room_id, item_condition, quantity) VALUES (?, ?, ?, ?, ?)',
            [name, type || 'Furniture', room_id || null, item_condition || 'Good', quantity || 1]
        );
        res.json({ id: result.insertId, message: 'Item added to inventory' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/inventory/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, type, room_id, item_condition, quantity } = req.body;
        await pool.execute(
            'UPDATE inventory_items SET name=?, type=?, room_id=?, item_condition=?, quantity=? WHERE id=?',
            [name, type, room_id || null, item_condition, quantity, req.params.id]
        );
        res.json({ message: 'Inventory item updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/inventory/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.execute('DELETE FROM inventory_items WHERE id=?', [req.params.id]);
        res.json({ message: 'Item removed from inventory' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ADVANCED MESS MANAGEMENT ──────────────────────────────────

app.get('/api/mess/attendance', requireAuth, async (req, res) => {
    try {
        const { date } = req.query;
        let query = `
            SELECT ma.*, s.name as student_name, s.roll_number 
            FROM mess_attendance ma 
            JOIN students s ON ma.student_id = s.id
        `;
        const params = [];
        if (date) {
            query += ' WHERE ma.date = ?';
            params.push(date);
        }
        if (req.user.role === 'Student') {
            const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
            if (stu.length > 0) {
                query += (date ? ' AND' : ' WHERE') + ' ma.student_id = ?';
                params.push(stu[0].id);
            }
        }
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/mess/attendance/bulk', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { date, records } = req.body; // records: [{ student_id, meal_type, status }]
        for (const r of records) {
            await pool.execute(
                'INSERT INTO mess_attendance (student_id, date, meal_type, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status)',
                [r.student_id, date, r.meal_type, r.status]
            );
        }
        res.json({ message: `Mess attendance recorded for ${records.length} records` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/mess/bills', requireAuth, async (req, res) => {
    try {
        let query = `
            SELECT mb.*, s.name as student_name, s.roll_number
            FROM mess_bills mb
            JOIN students s ON mb.student_id = s.id
        `;
        const params = [];
        if (req.user.role === 'Student') {
            const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
            if (stu.length > 0) {
                query += ' WHERE mb.student_id = ?';
                params.push(stu[0].id);
            }
        }
        query += ' ORDER BY mb.year DESC, mb.month DESC';
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/mess/bills/generate', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { month, year, dailyRate } = req.body;

        // Fetch student IDs and their attendance count for the month
        const [attendance] = await pool.execute(`
            SELECT student_id, COUNT(*) as present_count 
            FROM mess_attendance 
            WHERE MONTH(date) = ? AND YEAR(date) = ? AND status = 'Present'
            GROUP BY student_id
        `, [month, year]);

        for (const a of attendance) {
            const amount = a.present_count * (dailyRate / 3); // simplistic: rate per meal
            await pool.execute(
                'INSERT INTO mess_bills (student_id, month, year, amount, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=VALUES(amount)',
                [a.student_id, month, year, amount, 'Unpaid']
            );
        }
        res.json({ message: `Generated bills for ${attendance.length} students` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/mess/bills/:id/pay', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.execute("UPDATE mess_bills SET status = 'Paid' WHERE id = ?", [req.params.id]);
        res.json({ message: 'Mess bill marked as paid' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── STUDENT APPROVALS (Admin) ─────────────────────────────────

app.get('/api/approvals', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT u.id, u.full_name, u.username, u.created_at, s.roll_number, s.email, s.contact
            FROM users u
            JOIN students s ON s.user_id = u.id
            WHERE u.role = 'Student' AND u.approval_status = 'Pending'
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/approvals/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body; // Approved / Rejected
        await pool.execute('UPDATE users SET approval_status = ? WHERE id = ?', [status, req.params.id]);

        await createNotification(req.params.id, `Your account has been ${status.toLowerCase()}.`, 'System');
        await logActivity(req.user.id, 'Approval', `User ${req.params.id} ${status}`, req.ip);
        res.json({ message: `User ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── STUDENT PROFILE ───────────────────────────────────────────

app.get('/api/student-profile', requireAuth, requireStudent, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT s.*, r.room_number, r.floor, r.type as room_type
            FROM students s
            LEFT JOIN rooms r ON s.room_id = r.id
            WHERE s.user_id = ?
        `, [req.user.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GATE PASSES ───────────────────────────────────────────────

app.get('/api/gate-passes', requireAuth, async (req, res) => {
    try {
        let query = `
            SELECT gp.*, s.name as student_name, s.roll_number, r.room_number
            FROM gate_passes gp
            JOIN students s ON gp.student_id = s.id
            LEFT JOIN rooms r ON s.room_id = r.id
        `;
        const params = [];

        if (req.user.role === 'Student') {
            // Get student ID first
            const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
            if (stu.length === 0) return res.json([]);
            query += ' WHERE gp.student_id = ? ORDER BY gp.created_at DESC';
            params.push(stu[0].id);
        } else {
            query += ' ORDER BY gp.created_at DESC';
        }

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/gate-passes', requireAuth, requireStudent, async (req, res) => {
    try {
        const { destination, fromDate, toDate, reason } = req.body;

        const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (stu.length === 0) return res.status(404).json({ error: 'Student record not found' });

        await pool.execute(
            'INSERT INTO gate_passes (student_id, destination, from_date, to_date, reason) VALUES (?, ?, ?, ?, ?)',
            [stu[0].id, destination, fromDate, toDate, reason]
        );

        await logActivity(req.user.id, 'Gate Pass', `Requested pass to ${destination}`, req.ip);
        res.json({ message: 'Gate pass requested' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/gate-passes/:id/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await pool.execute('UPDATE gate_passes SET status = ?, approved_by = ? WHERE id = ?',
            [status, req.user.id, req.params.id]);

        const [[gp]] = await pool.execute('SELECT s.user_id FROM gate_passes g JOIN students s ON g.student_id = s.id WHERE g.id = ?', [req.params.id]);
        if (gp) await createNotification(gp.user_id, `Your gate pass request has been ${status.toLowerCase()}.`, 'GatePass');

        await logActivity(req.user.id, 'Gate Pass', `Marked pass ${req.params.id} as ${status}`, req.ip);
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ROOM TRANSFER REQUESTS ────────────────────────────────────

app.get('/api/room-transfers', requireAuth, async (req, res) => {
    try {
        let query = `
            SELECT rt.*, s.name as student_name, s.roll_number, 
                   r_curr.room_number as current_room, r_req.room_number as requested_room
            FROM room_transfer_requests rt
            JOIN students s ON rt.student_id = s.id
            LEFT JOIN rooms r_curr ON rt.current_room_id = r_curr.id
            LEFT JOIN rooms r_req ON rt.requested_room_id = r_req.id
        `;
        const params = [];

        if (req.user.role === 'Student') {
            const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
            if (stu.length === 0) return res.json([]);
            query += ' WHERE rt.student_id = ? ORDER BY rt.created_at DESC';
            params.push(stu[0].id);
        } else {
            query += ' ORDER BY rt.created_at DESC';
        }

        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/room-transfers', requireAuth, requireStudent, async (req, res) => {
    try {
        const { currentRoomId, requestedRoomId, reason } = req.body;
        const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (stu.length === 0) return res.status(404).json({ error: 'Student record not found' });

        await pool.execute(
            'INSERT INTO room_transfer_requests (student_id, current_room_id, requested_room_id, reason) VALUES (?, ?, ?, ?)',
            [stu[0].id, currentRoomId, requestedRoomId, reason]
        );

        await logActivity(req.user.id, 'Room Transfer', `Requested transfer to room ${requestedRoomId}`, req.ip);
        res.json({ message: 'Transfer request submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/room-transfers/:id/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const [reqs] = await pool.execute('SELECT * FROM room_transfer_requests WHERE id = ?', [req.params.id]);
        if (reqs.length === 0) return res.status(404).json({ error: 'Request not found' });

        const transfer = reqs[0];

        if (status === 'Approved') {
            // Update student's room
            if (transfer.requested_room_id) {
                await pool.execute('UPDATE students SET room_id = ? WHERE id = ?', [transfer.requested_room_id, transfer.student_id]);
            }
        }

        await pool.execute('UPDATE room_transfer_requests SET status = ?, reviewed_by = ? WHERE id = ?',
            [status, req.user.id, req.params.id]);

        await logActivity(req.user.id, 'Room Transfer', `Marked transfer ${req.params.id} as ${status}`, req.ip);
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── MESS MENU ─────────────────────────────────────────────────

app.get('/api/mess-menu', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM meal_menu ORDER BY FIELD(day_of_week, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"), FIELD(meal_type, "Breakfast","Lunch","Dinner")');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/mess-menu', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { day, type, items } = req.body;
        await pool.execute(`
            INSERT INTO meal_menu (day_of_week, meal_type, items) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE items = VALUES(items)
        `, [day, type, items]);
        res.json({ message: 'Menu updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── EMERGENCY CONTACTS ────────────────────────────────────────

app.get('/api/emergency-contacts', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM emergency_contacts ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/emergency-contacts', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, role, phone } = req.body;
        await pool.execute('INSERT INTO emergency_contacts (name, role, phone) VALUES (?, ?, ?)', [name, role, phone]);
        res.json({ message: 'Contact added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/emergency-contacts/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.execute('DELETE FROM emergency_contacts WHERE id = ?', [req.params.id]);
        res.json({ message: 'Contact deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── ACTIVITY LOG ──────────────────────────────────────────────

app.get('/api/activity-log', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT al.*, u.username, u.role 
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── CLEARANCE REQUESTS ─────────────────────────────────────────

app.get('/api/clearance', requireAuth, async (req, res) => {
    try {
        let query = `
            SELECT cr.*, s.name as student_name, s.roll_number
            FROM clearance_requests cr
            JOIN students s ON cr.student_id = s.id
        `;
        const params = [];
        if (req.user.role === 'Student') {
            const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
            if (stu.length > 0) {
                query += ' WHERE cr.student_id = ?';
                params.push(stu[0].id);
            }
        }
        query += ' ORDER BY cr.created_at DESC';
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/clearance', requireAuth, requireStudent, async (req, res) => {
    try {
        const { reason, tentative_leave_date } = req.body;
        const [stu] = await pool.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
        if (stu.length === 0) return res.status(404).json({ error: 'Student record not found' });

        const [result] = await pool.execute(
            'INSERT INTO clearance_requests (student_id, reason, tentative_leave_date, status) VALUES (?, ?, ?, ?)',
            [stu[0].id, reason, tentative_leave_date, 'Pending']
        );
        res.json({ id: result.insertId, message: 'Clearance request submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/clearance/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status, warden_remarks, account_remarks } = req.body;
        await pool.execute(
            'UPDATE clearance_requests SET status=?, warden_remarks=?, account_remarks=? WHERE id=?',
            [status, warden_remarks || null, account_remarks || null, req.params.id]
        );
        res.json({ message: 'Clearance request updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POLLS ──────────────────────────────────────────────────────

app.get('/api/polls', requireAuth, async (req, res) => {
    try {
        const [polls] = await pool.execute(`
            SELECT p.*, (SELECT COUNT(*) FROM poll_votes pv WHERE pv.poll_id = p.id) as total_votes
            FROM polls p ORDER BY p.created_at DESC
        `);

        // Fetch votes for the user
        const [userVotes] = await pool.execute('SELECT poll_id, option_index FROM poll_votes WHERE user_id = ?', [req.user.id]);
        const userVoteMap = {};
        userVotes.forEach(v => userVoteMap[v.poll_id] = v.option_index);

        polls.forEach(p => {
            p.options = JSON.parse(p.options);
            p.user_vote = userVoteMap[p.id] !== undefined ? userVoteMap[p.id] : null;
        });

        res.json(polls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/polls', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { question, options, expires_at } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO polls (question, options, posted_by, expires_at) VALUES (?, ?, ?, ?)',
            [question, JSON.stringify(options), req.user.id, expires_at || null]
        );
        res.json({ id: result.insertId, message: 'Poll posted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/polls/:id/vote', requireAuth, async (req, res) => {
    try {
        const { option_index } = req.body;
        const pollId = req.params.id;

        // Check if poll expired
        const [[poll]] = await pool.execute('SELECT expires_at FROM polls WHERE id = ?', [pollId]);
        if (poll && poll.expires_at && new Date(poll.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Poll has expired' });
        }

        await pool.execute(
            'INSERT INTO poll_votes (poll_id, user_id, option_index) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE option_index=VALUES(option_index)',
            [pollId, req.user.id, option_index]
        );
        res.json({ message: 'Vote recorded' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/polls/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await pool.execute('DELETE FROM polls WHERE id = ?', [req.params.id]);
        res.json({ message: 'Poll deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function createNotification(userId, message, type = 'General') {
    try {
        await pool.execute(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [userId, message, type]
        );
    } catch (e) { console.error('Notification failed', e); }
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────

app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
        await pool.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── START SERVER ───────────────────────────────────────────────

async function start() {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`\n🏨 Hostel Management System running at http://localhost:${PORT}\n`);
        });
    } catch (err) {
        console.error('❌ Failed to start:', err.message);
        console.error('   Make sure XAMPP MySQL is running!');
        process.exit(1);
    }
}

start();
