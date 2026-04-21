# Quick Start Guide - NEXRA Backend

## Step 1: Install PostgreSQL

### Option A: Download PostgreSQL
1. Download from: https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the password you set for the `postgres` user

### Option B: Use Docker (Easier)
```bash
docker run --name nexra-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nexra -p 5432:5432 -d postgres:15
```

## Step 2: Verify PostgreSQL is Running

```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"
```

If this works, PostgreSQL is ready!

## Step 3: Install Python Dependencies

```bash
cd c:\Users\SEVEN\NEXRA
pip install -r requirements.txt
```

## Step 4: Configure Environment

The `.env` file is already created. If PostgreSQL is running on localhost with default settings, you're good to go!

If you used a different password, edit `.env`:
```
POSTGRES_PASSWORD=your_password_here
```

## Step 5: Initialize Database

```bash
python setup_db.py
```

This will:
- Create all tables
- Seed network pricing
- Seed subscription plans

## Step 6: Start the Backend

```bash
uvicorn app.main:app --reload
```

The API will be at: http://localhost:8000

## Step 7: Start the Dashboard

In a NEW terminal:
```bash
cd c:\Users\SEVEN\NEXRA\nexra-dashboard
python -m http.server 8080
```

Dashboard will be at: http://localhost:8080

## Step 8: Sign Up!

1. Open http://localhost:8080
2. Click "Sign up"
3. Fill in the form:
   - Full Name: Your Name
   - Organization: Your Company
   - Email: your@email.com
   - Password: (choose a password)
4. Click "Create Account"

You'll be automatically logged in!

## Troubleshooting

### "Connection Refused" Error

PostgreSQL is not running. Start it:
- Windows: Open Services, start "postgresql-x64-15"
- Docker: `docker start nexra-postgres`

### "Database does not exist"

Create it manually:
```bash
psql -U postgres
CREATE DATABASE nexra;
\q
```

Then run `python setup_db.py` again.

### Import Errors

```bash
pip install --upgrade -r requirements.txt
```

## What's Next?

After signing up:
1. Upload contacts (CSV)
2. Create a campaign
3. Send messages
4. Track delivery status
5. Monitor credit balance

Enjoy NEXRA! 🚀
