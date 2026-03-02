# CyVote Backend

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Vulnerabilities](https://img.shields.io/badge/vulnerabilities-0-brightgreen)

> **TL;DR:** Secure e-voting backend microservice for campus student organization elections.

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Prerequisites](#%EF%B8%8F-prerequisites)
- [Getting Started (Local Setup)](#-getting-started-local-setup)
- [Testing](#-testing)
- [Environment Variables](#-environment-variables)
- [Deployment & CI/CD](#-deployment--cicd)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [Ownership & Support](#-ownership--support)

---

## 🎯 About the Project

**Business Context:** CyVote is a secure, end-to-end electronic voting system built to replace the manual voting process for leadership elections within KSM Cyber Security UPNVJ (Unit Kegiatan Mahasiswa). It provides a tamper-resistant, auditable, and user-friendly platform that ensures election integrity while enabling remote participation for all organization members.

**Key Features:**

- **Dual Authentication System:** Separate JWT-based authentication for administrators/superadmins, and a token-based two-step verification flow for voters — ensuring strict role separation and secure access.
- **Secure Voting with Hash Verification:** Every cast vote is cryptographically hashed, preventing tampering and guaranteeing vote integrity. Each voter can only vote once, enforced at the database level.
- **Election Scheduling & Lifecycle Management:** Automated election state transitions (pending → active → completed) powered by cron jobs, with configurable start/end times and environment-aware duration rules.
- **Comprehensive Audit Logging:** All critical actions (voting, authentication, admin operations) are logged via Winston and persisted to the database, providing a full forensic trail for post-election audits.
- **Rate Limiting & Security Middleware:** Global and endpoint-specific rate limiting, Helmet security headers, CSRF protection, and intelligent IP extraction behind proxies — hardening the API against abuse.
- **Admin Dashboard & Monitoring:** Real-time election statistics, voter turnout tracking, and candidate performance metrics accessible through dedicated admin endpoints.
- **Election Results Aggregation:** Automated vote tallying with candidate ranking, vote counts, and percentage breakdowns.
- **Email Notification System:** Integrated with Mailtrap for sending voter tokens, election announcements, and voting confirmations via customizable Handlebars templates.

**External Documentation:** For deeper architectural decisions, technical plans, and API contracts, please refer to:

- [Technical Documentation](/docs/readme.md)

---

## 🏗 Architecture & Tech Stack

- **Language/Framework:** TypeScript / NestJS 11.x (Node.js 22)
- **Database:** PostgreSQL 17 (via TypeORM)
- **Messaging/Email:** Nodemailer (Mailtrap SMTP)
- **Design Pattern:** Hexagonal Architecture / Domain-Driven Design
- **Containerization:** Docker & Docker Compose
- **CI/CD:** GitHub Actions
- **API Documentation:** Swagger / OpenAPI
- **Security:** Helmet, CSRF protection, JWT, bcrypt, rate limiting
- **Logging:** Winston with daily rotate file transport
- **Internationalization:** nestjs-i18n

---

## ⚙️ Prerequisites

Before you begin, ensure your local development environment meets the following requirements:

- [Node.js v22.x](https://nodejs.org/) (use [NVM](https://github.com/nvm-sh/nvm) — the project includes an `.nvmrc` file)
- [pnpm](https://pnpm.io/) (package manager)
- [Docker Desktop v4.x](https://www.docker.com/products/docker-desktop/) (for local PostgreSQL, Maildev, and Adminer)
- [Git](https://git-scm.com/)

---

## 🚀 Getting Started (Local Setup)

Follow the steps below to get the service running locally.

1. **Clone the repository:**

   ```bash
   git clone git@github.com:cyvote/backend-cyvote.git
   cd backend-cyvote
   ```

2. **Use the correct Node.js version:**

   ```bash
   nvm use
   ```

3. **Install dependencies:**

   ```bash
   pnpm install
   ```

4. **Setup environment variables:**

   Copy the example environment file and adjust as needed.

   ```bash
   cp env-example-relational .env
   ```

   > **Note:** For local development, use `.env.local`. For the development VPS environment, use `.env.development`. For production, use `.env.production`.

5. **Bootstrap the application (spin up local PostgreSQL, Maildev, and Adminer via Docker):**

   ```bash
   docker compose up -d
   ```

   This will start:
   - **PostgreSQL** on port `${DATABASE_PORT}`
   - **Maildev** (email testing UI) on port `1080`
   - **Adminer** (database management UI) on port `8080`

6. **Run database migrations:**

   ```bash
   pnpm run migration:run
   ```

7. **Seed the database (optional):**

   ```bash
   pnpm run seed:run:relational
   ```

8. **Run the application:**

   ```bash
   pnpm run start:dev
   ```

   The service should now be running at `http://localhost:3021`. Swagger API documentation is available at `http://localhost:3021/docs`.

---

## 🧪 Testing

- **Run Unit Tests:**

  ```bash
  pnpm test
  ```

- **Run Linter / Formatting:**

  ```bash
  pnpm run lint
  ```

- **Run E2E Tests (via Docker):**

  ```bash
  pnpm run test:e2e:relational:docker
  ```

---

## 🔐 Environment Variables

This project requires several environment variables to function correctly. **Never commit actual secrets to this repository.**

| Variable Name                      | Description                             | Default Value (Local)                       | Required |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- | -------- |
| `NODE_ENV`                         | Application environment                 | `development`                               | Yes      |
| `APP_PORT`                         | The port the application binds to       | `3021`                                      | Yes      |
| `APP_NAME`                         | Application display name                | `Cyvote`                                    | Yes      |
| `API_PREFIX`                       | Global API route prefix                 | `api`                                       | Yes      |
| `FRONTEND_DOMAIN`                  | Allowed CORS origin(s), comma-separated | `http://localhost:3000`                     | Yes      |
| `VOTING_URL`                       | User-facing voting page base URL        | —                                           | Yes      |
| `DATABASE_TYPE`                    | Database driver type                    | `postgres`                                  | Yes      |
| `DATABASE_HOST`                    | Database connection host                | `localhost`                                 | Yes      |
| `DATABASE_PORT`                    | Database connection port                | `5432`                                      | Yes      |
| `DATABASE_USERNAME`                | Database user                           | `root`                                      | Yes      |
| `DATABASE_PASSWORD`                | Database password                       | _(see env-example)_                         | Yes      |
| `DATABASE_NAME`                    | Database name                           | `postgres`                                  | Yes      |
| `DATABASE_SSL_ENABLED`             | Enable SSL for database connection      | `false`                                     | No       |
| `AUTH_JWT_SECRET`                  | JWT signing secret for user auth        | _(generate with `openssl rand -base64 32`)_ | Yes      |
| `AUTH_JWT_TOKEN_EXPIRES_IN`        | JWT access token TTL                    | `15m`                                       | Yes      |
| `AUTH_REFRESH_SECRET`              | JWT refresh token secret                | _(generate)_                                | Yes      |
| `AUTH_ADMIN_JWT_SECRET`            | JWT secret for admin authentication     | _(generate)_                                | Yes      |
| `MAIL_HOST`                        | SMTP mail server host                   | `localhost`                                 | Yes      |
| `MAIL_PORT`                        | SMTP mail server port                   | `1025`                                      | Yes      |
| `MAIL_DEFAULT_EMAIL`               | Sender email address                    | `noreply@example.com`                       | Yes      |
| `AUDIT_LOG_ENABLED`                | Enable audit logging                    | `true`                                      | No       |
| `AUDIT_LOG_DATABASE_ENABLED`       | Persist audit logs to database          | `true`                                      | No       |
| `SECURITY_RATE_LIMIT_GLOBAL_TTL`   | Global rate limit window (seconds)      | `60`                                        | No       |
| `SECURITY_RATE_LIMIT_GLOBAL_LIMIT` | Max requests per global window          | `100`                                       | No       |
| `SECURITY_RATE_LIMIT_LOGIN_TTL`    | Login rate limit window (seconds)       | `600`                                       | No       |
| `SECURITY_RATE_LIMIT_LOGIN_LIMIT`  | Max login attempts per window           | `5`                                         | No       |
| `SECURITY_HELMET_ENABLED`          | Enable Helmet security headers          | `true`                                      | No       |
| `SECURITY_CSRF_ENABLED`            | Enable CSRF protection                  | `true`                                      | No       |
| `VOTE_HASH_SALT`                   | Salt used for vote hash generation      | _(generate)_                                | Yes      |

For a complete list of all environment variables, refer to `env-example-relational`.

---

## 🚢 Deployment & CI/CD

- **Branching Strategy:** We use a modified GitFlow strategy:
  - `master` — stable base branch
  - `development` — integration branch for staging/dev environment
  - `deployment` — production release branch
  - Feature branches follow the convention: `feat/`, `hotfix/`, `chore/`, `scripts/`

- **CI/CD:** Governed by GitHub Actions with two primary workflows:
  - **Development:** Every push to `development` triggers a Docker build and deployment to the development VPS.
  - **Production:** Every push to `deployment` triggers a Docker build, pushes to Docker Hub, and deploys to the production VPS.

- **Production Release:** To release to production, merge `development` into `deployment`. This will automatically trigger the production deployment pipeline.

- **Production Infrastructure:**
  - Docker Compose on VPS with API container + Redis
  - PostgreSQL hosted externally
  - Automated database migrations run on startup

See [CHANGELOG.md](CHANGELOG.md) for the project's release history.

---

## 🛠 Troubleshooting & FAQ

**Q: I'm getting a `connection refused` error when the app tries to connect to the database.**
**A:** Ensure your Docker daemon is running and execute `docker compose up -d postgres` to start the local database container. Verify your `DATABASE_HOST` is set to `localhost` (not a remote host) in your `.env` file.

**Q: Database migrations are failing with SSL errors.**
**A:** For local development, set `DATABASE_SSL_ENABLED=false` in your `.env` file. SSL is only required when connecting to remote PostgreSQL instances (e.g., Supabase).

**Q: Port 3021 is already in use.**
**A:** Either stop the conflicting process or change `APP_PORT` in your `.env` file to a different port.

**Q: Docker Compose fails because port 8080 (Adminer) is already in use.**
**A:** Another service is occupying port 8080. Stop it, or modify the Adminer port mapping in `docker-compose.yaml`.

**Q: `pnpm install` fails on certain packages.**
**A:** Ensure you are using Node.js v22 (`nvm use`). Delete `node_modules` and the pnpm store cache, then retry: `rm -rf node_modules && pnpm install`.

**Q: Emails are not being sent/received in local development.**
**A:** Ensure the Maildev container is running (`docker compose up -d maildev`). Open `http://localhost:1080` to view captured emails in the Maildev web UI.

---

## 📞 Ownership & Support

This service is maintained by **Ristek Division of KSM Cyber Security UPNVJ**.

- **Jira Board:** [CyVote Project Board](https://mahasiswa-team-ys7jfvny.atlassian.net/jira/software/projects/CYVOTE/boards/34)
