const mysql = require('mysql2/promise');

const DB_NAME = 'hostel_management';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

async function initDatabase() {
  // Create database if not exists
  const tempConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
  });

  await tempConn.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await tempConn.end();

  // Create tables
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role ENUM('Admin','Warden') DEFAULT 'Warden',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_number VARCHAR(20) UNIQUE NOT NULL,
        floor INT DEFAULT 1,
        type ENUM('Single','Double','Triple','Dormitory') DEFAULT 'Double',
        capacity INT DEFAULT 2,
        status ENUM('Available','Full','Maintenance') DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        roll_number VARCHAR(50) UNIQUE NOT NULL,
        contact VARCHAR(20),
        email VARCHAR(100),
        room_id INT,
        check_in_date DATE,
        status ENUM('Active','Checked-Out','Suspended') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS fees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        due_date DATE,
        status ENUM('Paid','Unpaid','Overdue') DEFAULT 'Unpaid',
        paid_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        category ENUM('Plumbing','Electrical','Furniture','Cleanliness','Other') DEFAULT 'Other',
        subject VARCHAR(200) NOT NULL,
        description TEXT,
        priority ENUM('Low','Medium','High','Urgent') DEFAULT 'Medium',
        status ENUM('Open','In Progress','Resolved') DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        visitor_name VARCHAR(100) NOT NULL,
        contact VARCHAR(20),
        purpose VARCHAR(200),
        student_id INT,
        check_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        check_out TIMESTAMP NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        date DATE NOT NULL,
        status ENUM('Present','Absent','On Leave') DEFAULT 'Present',
        UNIQUE KEY unique_attendance (student_id, date),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        posted_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    const [settingsExist] = await conn.execute("SHOW TABLES LIKE 'settings'");
    if (settingsExist.length === 0) {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          hostel_name VARCHAR(200) DEFAULT 'My Hostel',
          contact VARCHAR(50),
          email VARCHAR(100),
          address TEXT,
          rules TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } else {
      // Ensure 'rules' column exists
      try { await conn.execute("ALTER TABLE settings ADD COLUMN rules TEXT"); } catch (e) { }
    }

    // ─── PHASE 3 SCHEMA UPDATES ─────────────────────────────

    // 1. Modify Users Table (Add Student role & approval_status)
    try {
      await conn.execute("ALTER TABLE users MODIFY COLUMN role ENUM('Admin','Warden','Student') DEFAULT 'Warden'");
    } catch (e) { }
    try {
      await conn.execute("ALTER TABLE users ADD COLUMN approval_status ENUM('Pending','Approved','Rejected') DEFAULT 'Approved'");
    } catch (e) { }

    // 2. Modify Students Table (Add user_id)
    try {
      await conn.execute("ALTER TABLE students ADD COLUMN user_id INT");
    } catch (e) { }

    // 3. Modify Announcements (Add priority & category)
    try { await conn.execute("ALTER TABLE announcements ADD COLUMN priority ENUM('Normal','Important','Urgent') DEFAULT 'Normal'"); } catch (e) { }
    try { await conn.execute("ALTER TABLE announcements ADD COLUMN category VARCHAR(50) DEFAULT 'General'"); } catch (e) { }

    // 4. New Tables
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS gate_passes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        destination VARCHAR(255) NOT NULL,
        from_date DATETIME NOT NULL,
        to_date DATETIME NOT NULL,
        reason TEXT,
        status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
        approved_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS room_transfer_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        current_room_id INT,
        requested_room_id INT,
        reason TEXT,
        status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
        reviewed_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS meal_menu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
        meal_type ENUM('Breakfast','Lunch','Dinner') NOT NULL,
        items TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_meal (day_of_week, meal_type)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL, 
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ─── PHASE 5 SCHEMA UPDATES ─────────────────────────────

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type ENUM('Furniture','Asset','Consumable') DEFAULT 'Furniture',
        room_id INT,
        item_condition ENUM('New','Good','Fair','Damaged') DEFAULT 'Good',
        quantity INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS mess_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        date DATE NOT NULL,
        meal_type ENUM('Breakfast','Lunch','Dinner') NOT NULL,
        status ENUM('Present','Absent') DEFAULT 'Present',
        UNIQUE KEY unique_mess_attendance (student_id, date, meal_type),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS mess_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status ENUM('Paid','Unpaid') DEFAULT 'Unpaid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS polls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question VARCHAR(255) NOT NULL,
        options TEXT NOT NULL, -- JSON string of options
        posted_by INT,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        poll_id INT NOT NULL,
        user_id INT NOT NULL,
        option_index INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vote (poll_id, user_id),
        FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'General',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS clearance_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        reason TEXT,
        tentative_leave_date DATE,
        status ENUM('Pending','Warden_Approved','Fees_Cleared','Completed','Rejected') DEFAULT 'Pending',
        warden_remarks TEXT,
        account_remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    // Seed default admin user (password: admin123 — simple hash for demo)
    const [existing] = await conn.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    if (existing.length === 0) {
      // Using a simple base64-encoded hash for demo purposes (not production-grade)
      const simpleHash = Buffer.from('admin123').toString('base64');
      await conn.execute(
        'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        ['admin', simpleHash, 'System Administrator', 'Admin']
      );
      console.log('✅ Default admin user created (admin / admin123)');
    }

    console.log('✅ Database tables initialized');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDatabase };
