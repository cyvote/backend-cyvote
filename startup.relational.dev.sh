#!/usr/bin/env bash
set -e

# Use DATABASE_HOST and DATABASE_PORT from environment variables
# Default to postgres:5432 for local development with Docker postgres service
DB_HOST=${DATABASE_HOST:-postgres}
DB_PORT=${DATABASE_PORT:-5432}

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
/opt/wait-for-it.sh "${DB_HOST}:${DB_PORT}" -t 60

echo "Running migrations..."
npm run migration:run

echo "Running seeds..."
npm run seed:run:relational

echo "Starting application..."
npm run start:prod
