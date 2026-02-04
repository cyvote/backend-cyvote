#!/usr/bin/env bash
set -e

# Use DATABASE_HOST and DATABASE_PORT from environment variables
# Default to postgres:5432 for local development with Docker postgres service
DB_HOST=${DATABASE_HOST:-postgres}
DB_PORT=${DATABASE_PORT:-5432}

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
/opt/wait-for-it.sh "${DB_HOST}:${DB_PORT}" -t 60

# Create .env file from current environment variables for env-cmd to use
# This ensures TypeORM migrations use the correct database connection
echo "Creating .env file from environment variables..."
printenv | grep -E "^(NODE_ENV|APP_|API_|DATABASE_|FILE_|MAIL_|AUTH_|FRONTEND_|BACKEND_|WORKER_|SECURITY_|AUDIT_|SUPABASE_|VOTE_)=" > /usr/src/app/.env || true

# Debug: Show database config in .env
echo "Database config in .env:"
grep "^DATABASE_HOST=" /usr/src/app/.env || echo "DATABASE_HOST not found"
grep "^DATABASE_PORT=" /usr/src/app/.env || echo "DATABASE_PORT not found"

echo "Running migrations..."
npm run migration:run

echo "Running seeds..."
npm run seed:run:relational

echo "Starting application..."
npm run start:prod
