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

# Export all relevant environment variables to .env file
# Use env instead of printenv and handle special characters
env | while IFS='=' read -r name value; do
  case "$name" in
    NODE_ENV|APP_*|API_*|DATABASE_*|FILE_*|MAIL_*|AUTH_*|FRONTEND_*|BACKEND_*|WORKER_*|SECURITY_*|AUDIT_*|SUPABASE_*|VOTE_*)
      # Write to .env, properly quoting values with special characters
      echo "${name}=${value}" >> /usr/src/app/.env
      ;;
  esac
done

# Debug: Show database config in .env
echo "Database config in .env:"
cat /usr/src/app/.env | grep -E "^DATABASE_(HOST|PORT)=" || echo "Database vars not found in .env"
echo ""
echo "FRONTEND_DOMAIN value:"
cat /usr/src/app/.env | grep "^FRONTEND_DOMAIN=" || echo "FRONTEND_DOMAIN not found"

echo ""
echo "Running migrations..."
npm run migration:run

echo "Running seeds..."
npm run seed:run:relational

echo ""
echo "Checking dist folder..."
ls -la /usr/src/app/dist/ 2>/dev/null || echo "dist folder not found!"
ls -la /usr/src/app/dist/main.js 2>/dev/null || echo "dist/main.js not found!"

# If dist doesn't exist, try to build
if [ ! -f /usr/src/app/dist/main.js ]; then
  echo "Building application..."
  cd /usr/src/app && npm run build
fi

echo "Starting application..."
npm run start:prod
