# 🏰 Hostel Management System

![Project Header](https://capsule-render.vercel.app/api?type=waving&color=0:007bff,100:00d4ff&height=250&section=header&text=Hostel%20Management%20System&fontSize=50&animation=fadeIn&fontAlignY=38&desc=Modern%20Web-Based%20Solution%20for%20Hostel%20Administration&descAlignY=55&descAlign=50)

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey.svg?logo=express)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg?logo=mysql)](https://www.mysql.com/)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)]()

**[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation-and-setup) • [Usage](#-usage-guide) • [API](#-api-endpoints)**

</div>

---

## 📖 About The Project

The **Hostel Management System (HMS)** is a comprehensive web-based application designed to streamline and automate the daily operations of a hostel. Replacing traditional manual paper-based systems, HMS offers a centralized platform for managing students, rooms, fees, complaints, and staff. 

With a clean, user-friendly interface and role-based access control, it empowers:
- **Admins** to oversee the entire facility and finances.
- **Wardens** to manage day-to-day attendance and discipline.
- **Students** to access their profiles, pay fees, and lodge complaints.

---

## 🚀 Key Features

### 👤 User Roles & Authentication
- **Secure Login:** Role-based redirection (Admin/Warden/Student).
- **Session Management:** Secure session handling for data protection.

### 🏠 Accommodation Management
- **Room Allocation:** Assign rooms to students efficiently.
- **Availability Tracker:** Real-time view of occupied and available rooms.
- **Room Transfers:** Handle transfer requests seamlessly.

### 🎓 Student Operations
- **Digital Profiles:** Store and manage complete student details.
- **Gate Pass System:** Online application and approval for student leaves.
- **Attendance:** Daily attendance tracking and monthly reports.

### 💰 Financials
- **Fee Management:** Generate monthly bills and track payments.
- **Status Tracking:** View Paid, Unpaid, and Overdue statuses instantly.
- **Reports:** Comprehensive financial summaries for admins.

### 🛠️ Facility Services
- **Complaint Box:** Students can report issues (Plumbing, Electrical, etc.).
- **Status Updates:** Track complaint resolution from "Open" to "Resolved".
- **Inventory:** Manage hostel assets and furniture.
- **Mess Management:** Track daily meal attendance and menu planning.

---

## 💻 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript | Vanilla JS with responsive design. |
| **Backend** | Node.js, Express.js | Robust REST API server. |
| **Database** | MySQL | Relational data management. |
| **Utilities** | crypto | Secure hashing for passwords and sessions. |

---

## 🛠 Installation and Setup

Follow these steps to get the project running on your local machine.

### Prerequisites
- **Node.js** (v14 or higher)
- **MySQL Server** (v8.0 or higher)
- **Git**

### Step-by-Step Guide

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/hostel-management-web.git
    cd hostel-management-web
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Database Configuration**
    - Open `db.js` in the root directory.
    - Update the database connection settings to match your local MySQL configuration:
      ```javascript
      // db.js
      const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',      // Your MySQL username
        password: '',      // Your MySQL password
        database: 'hostel_management',
        // ...
      });
      ```
    - *Note:* The system handles database creation automatically. You **do not** need to manually create the database.

4.  **Start the Application**
    ```bash
    npm start
    ```
    - The server will start on port `3000`.
    - It will automatically create the `hostel_management` database and seed the default admin user.

5.  **Access the Dashboard**
    - Open your browser and navigate to:
      `http://localhost:3000`

---

## 📘 Usage Guide

### Default Admin Credentials
When you run the app for the first time, a default admin account is created:
> **Username:** `admin`  
> **Password:** `admin123`

### Common Workflows
- **For Admins:** Log in to add `Rooms` first, then register `Students`, and finally assign them to rooms.
- **For Students:** Use the "Student Register" link on the login page to sign up. The account will require Admin approval.

---

## 📡 API Endpoints

The backend exposes a RESTful API. Here are some core endpoints:

| specialized | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/login` | User login |
| **Students** | `GET` | `/api/students` | Get all students |
| **Rooms** | `GET` | `/api/rooms` | Get room status |
| **Fees** | `GET` | `/api/fees` | Get fee records |
| **Complaints** | `POST` | `/api/complaints` | File a complaint |

---

## 🛡️ Repository Hygiene

To maintain a clean and secure public repository, several files and directories are excluded via `.gitignore`:

- **`node_modules/`**: Contains external dependencies (installable via `npm install`).
- **`.env`**: (If added) Used for sensitive credentials like database passwords or API keys.
- **Debug Logs**: `npm-debug.log`, `*.log` etc., are ignored to keep the commit history clean.
- **OS Metadata**: Files like `.DS_Store` or `Thumbs.db` are excluded.

> [!IMPORTANT]
> Never commit your `db.js` with production credentials. It is recommended to use environment variables for sensitive data in a production environment.

---

## 🤝 Contribution

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by the Antigravity Team</sub>
</div>
