# NEXRA Backend Setup Guide

Quick guide to set up and run the NEXRA backend API for authentication and SMS services.

## Prerequisites

1. **PostgreSQL** installed and running
2. **Python 3.10+** installed
3. **Redis** (optional, for caching)

## Step 1: Database Setup

### Create PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE nexra;
CREATE USER nexra WITH PASSWORD 'nexra123';
GRANT ALL PRIVILEGES ON DATABASE nexra TO nexra;
\q
```

### Or use existing PostgreSQL

Edit `.env` file and update database credentials:
```
POSTGRES_SERVER=localhost
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=nexra
```

## Step 2: Install Dependencies

```bash
cd c:\Users\SEVEN\NEXRA
pip install -r requirements.txt
```

## Step 3: Initialize Database

Run the setup script to create tables and seed data:

```bash
python setup_db.py
```

This will:
- Create all database tables
- Seed network pricing (MTN, Vodafone, AirtelTigo)
- Seed subscription plans (Starter, Business, Enterprise, PAYG)

## Step 4: Start the Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

## Step 5: Test the API

### Check if server is running

Open browser: `http://localhost:8000`

You should see: `{"message": "NEXRA Messaging API is running"}`

### API Documentation

Visit: `http://localhost:8000/docs` for interactive API documentation

## Step 6: Start the Dashboard

In a new terminal:

```bash
cd c:\Users\SEVEN\NEXRA\nexra-dashboard
python -m http.server 8080
```

Open browser: `http://localhost:8080`

## Available Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Campaigns
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign

### Messages
- `GET /api/v1/messages` - List messages
- `GET /api/v1/messages/stats` - Get statistics

### Billing
- `GET /api/v1/billing/balance` - Get credit balance

## Troubleshooting

### Database Connection Error

If you get database connection errors:
1. Make sure PostgreSQL is running
2. Check credentials in `.env` file
3. Verify database exists: `psql -U postgres -l`

### Import Errors

If you get import errors:
```bash
pip install --upgrade -r requirements.txt
```

### Port Already in Use

If port 8000 is already in use:
```bash
uvicorn app.main:app --reload --port 8001
```

Then update dashboard `app.js`:
```javascript
const API_BASE_URL = 'http://localhost:8001/api/v1';
```

## Default Credentials

After registration, you can create a test account:
- Email: `test@nexra.com`
- Password: `test123`
- Organization: `Test Org`

## Environment Variables

Key variables in `.env`:

```bash
# Security
SECRET_KEY=your-secret-key-change-this

# Database
POSTGRES_SERVER=localhost
POSTGRES_USER=nexra
POSTGRES_PASSWORD=nexra123
POSTGRES_DB=nexra

# JWT Token
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days
```

## Next Steps

1. Register a new account via dashboard
2. Create contacts
3. Create and send campaigns
4. Monitor delivery status
5. Track credit balance

## Production Deployment

For production:
1. Change `SECRET_KEY` to a secure random string
2. Use strong database password
3. Enable HTTPS
4. Set `allow_origins` in CORS to specific domains
5. Use environment-specific `.env` files
6. Set up proper logging
7. Configure Redis for caching
8. Set up SMPP connections to real gateways
