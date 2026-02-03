# Vercel Environment Variables Setup Guide

## 📋 Quick Copy-Paste untuk Vercel Dashboard

Buka: **Vercel Dashboard** → **backend-cyvote** → **Settings** → **Environment Variables**

Klik **"Add New"** atau **"Paste .env"**, lalu paste ini:

---

## 🔐 Production Environment Variables

```env
# Application
NODE_ENV=production
APP_PORT=3000
APP_NAME=Cyvote
API_PREFIX=api
APP_FALLBACK_LANGUAGE=en
APP_HEADER_LANGUAGE=x-custom-lang

# CORS - UPDATE WITH YOUR ACTUAL DOMAINS!
FRONTEND_DOMAIN=https://your-frontend-domain.vercel.app
BACKEND_DOMAIN=https://backend-cyvote.vercel.app

# Database (Supabase PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_HOST=db.ytdkbqslvnivtdycfwom.supabase.co
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=HiddupJokowi!!!
DATABASE_NAME=postgres
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=10
DATABASE_SSL_ENABLED=true
DATABASE_REJECT_UNAUTHORIZED=false
DATABASE_CA=
DATABASE_KEY=
DATABASE_CERT=
DATABASE_URL=

# File Storage (local uses /tmp on Vercel)
FILE_DRIVER=local
ACCESS_KEY_ID=
SECRET_ACCESS_KEY=
AWS_S3_REGION=
AWS_DEFAULT_S3_BUCKET=

# Email (Mailtrap)
MAIL_HOST=bulk.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=smtp@mailtrap.io
MAIL_PASSWORD=dfa252e670733de95a7766ab11fcbe11
MAIL_IGNORE_TLS=false
MAIL_SECURE=false
MAIL_REQUIRE_TLS=true
MAIL_DEFAULT_EMAIL=noreply@mail.cylink.id
MAIL_DEFAULT_NAME=CyVote E-Voting System
MAIL_CLIENT_PORT=1080

# JWT Secrets - ⚠️ GENERATE NEW FOR PRODUCTION!
# Use: openssl rand -base64 32
AUTH_JWT_SECRET=secret
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=secret_for_refresh
AUTH_REFRESH_TOKEN_EXPIRES_IN=3650d
AUTH_FORGOT_SECRET=secret_for_forgot
AUTH_FORGOT_TOKEN_EXPIRES_IN=30m
AUTH_CONFIRM_EMAIL_SECRET=secret_for_confirm_email
AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=1d

# Admin Authentication
AUTH_ADMIN_JWT_SECRET=admin-secret-key-minimum-32-characters-long
AUTH_ADMIN_JWT_TOKEN_EXPIRES_IN=2h
AUTH_ADMIN_BCRYPT_COST=12

# Social Login (optional)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_APP_AUDIENCE=[]

# Audit Log
AUDIT_LOG_ENABLED=true
AUDIT_LOG_LEVEL=info
AUDIT_LOG_CONSOLE_ENABLED=true
AUDIT_LOG_FILE_ENABLED=false
AUDIT_LOG_FILE_PATH=./logs
AUDIT_LOG_MAX_FILES=30d
AUDIT_LOG_MAX_SIZE=20m
AUDIT_LOG_DATABASE_ENABLED=true

# Security Configuration
SECURITY_RATE_LIMIT_GLOBAL_TTL=60
SECURITY_RATE_LIMIT_GLOBAL_LIMIT=100
SECURITY_RATE_LIMIT_LOGIN_TTL=600
SECURITY_RATE_LIMIT_LOGIN_LIMIT=5
SECURITY_RATE_LIMIT_TOKEN_VERIFY_TTL=300
SECURITY_RATE_LIMIT_TOKEN_VERIFY_LIMIT=3
SECURITY_RATE_LIMIT_CLEANUP_INTERVAL=60000

# Helmet
SECURITY_HELMET_ENABLED=true

# CSRF Protection
SECURITY_CSRF_ENABLED=true
SECURITY_CSRF_SECRET=your-secure-random-secret-here-minimum-32-characters
SECURITY_CSRF_COOKIE_NAME=csrf-token
SECURITY_CSRF_HEADER_NAME=x-csrf-token
SECURITY_CSRF_TTL=3600

# IP Extraction
SECURITY_IP_TRUST_PROXY=true
SECURITY_IP_PROXY_HEADERS=[x-forwarded-for,x-real-ip]

# Worker/Redis (optional)
WORKER_HOST=redis://redis:6379/1
```

---

## ⚠️ WAJIB DIGANTI SEBELUM PRODUCTION:

1. **FRONTEND_DOMAIN** - URL frontend production Anda
2. **BACKEND_DOMAIN** - URL backend di Vercel (e.g., `https://backend-cyvote.vercel.app`)
3. **Semua JWT Secrets** - Generate random strings:
   ```bash
   openssl rand -base64 32
   ```

   - `AUTH_JWT_SECRET`
   - `AUTH_REFRESH_SECRET`
   - `AUTH_FORGOT_SECRET`
   - `AUTH_CONFIRM_EMAIL_SECRET`
   - `AUTH_ADMIN_JWT_SECRET`
   - `SECURITY_CSRF_SECRET`

---

## 🚀 Alternative: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Add env vars one by one
vercel env add DATABASE_HOST production
vercel env add DATABASE_PORT production
vercel env add DATABASE_USERNAME production
vercel env add DATABASE_PASSWORD production

# Or pull existing .env.production
vercel env pull .env.production
```

---

## ✅ After Adding Env Vars:

1. Redeploy manually dari Vercel Dashboard
2. Or push empty commit:
   ```bash
   git commit --allow-empty -m "trigger redeploy with env vars"
   git push
   ```

---

## 🔍 Verify Deployment:

```bash
# Check if backend is running
curl https://backend-cyvote.vercel.app/

# Check API docs
curl https://backend-cyvote.vercel.app/api/docs
```
