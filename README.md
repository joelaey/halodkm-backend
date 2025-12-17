# HaloDKM Backend

Backend API untuk sistem manajemen masjid HaloDKM (Halo Dewan Kemakmuran Masjid).

## 🚀 Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **mysql2** - MySQL driver with promise support

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm

## ⚙️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your database credentials:
   ```
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=halodkm
   DB_PORT=3306
   ```

3. **Create database and import schema:**
   ```bash
   mysql -u root -p -e "CREATE DATABASE halodkm;"
   mysql -u root -p halodkm < database/schema.sql
   ```

## 🏃 Running the Server

**Development mode:**
```bash
npm start
```

Server will run on `http://localhost:5000`

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout

### Dashboard
- `GET /api/v1/dashboard/stats` - Get dashboard statistics

### Kas Masjid
- `GET /api/v1/kas` - Get all transactions
- `POST /api/v1/kas` - Create transaction
- `DELETE /api/v1/kas/:id` - Delete transaction

### Jamaah
- `GET /api/v1/jamaah` - Get all jamaah
- `POST /api/v1/jamaah` - Create jamaah
- `PUT /api/v1/jamaah/:id` - Update jamaah
- `DELETE /api/v1/jamaah/:id` - Delete jamaah

### Info Publik
- `GET /api/v1/info` - Get all info
- `POST /api/v1/info` - Create info
- `PUT /api/v1/info/:id` - Update info
- `DELETE /api/v1/info/:id` - Delete info

### Users
- `GET /api/v1/users` - Get all users
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Audit
- `GET /api/v1/audit` - Get audit logs

## 🔑 Default Credentials

**Admin:**
- Username: `admin`
- Password: `admin123`

**Pengurus:**
- Username: `pengurus1`
- Password: `pengurus123`

## 📁 Project Structure

```
halodkm-backend/
├── config/
│   └── db.js              # Database configuration
├── controllers/
│   ├── authController.js  # Authentication logic
│   ├── dashboardController.js
│   ├── kasController.js
│   ├── jamaahController.js
│   ├── infoController.js
│   ├── userController.js
│   └── auditController.js
├── routes/
│   └── api.js             # API routes
├── database/
│   └── schema.sql         # Database schema
├── .env.example           # Environment template
├── .gitignore
├── package.json
├── server.js              # Entry point
└── README.md
```

## 🛡️ Security Notes

⚠️ **Important:** This is a development version. For production:
- Use proper password hashing (bcrypt)
- Implement JWT authentication
- Add input validation middleware
- Enable HTTPS
- Add rate limiting
- Implement proper error handling

## 📝 License

ISC
