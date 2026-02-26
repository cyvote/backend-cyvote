# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-15

Initial production release of the CyVote e-voting backend system.

### Added

#### Core Voting System

- Implemented secure vote casting with cryptographic hash verification to ensure vote integrity.
- Added one-voter-one-vote enforcement via unique database constraints on voter ID.
- Introduced vote hash salt configuration (`VOTE_HASH_SALT`) for tamper-resistant vote storage.

#### Authentication & Authorization

- Implemented dual authentication system with separate flows for admins and voters.
- Added JWT-based admin/superadmin authentication with configurable token expiry and bcrypt cost.
- Built two-step voter authentication using one-time tokens sent via email.
- Integrated social login support (Google, Facebook, Apple) via the boilerplate foundation.
- Added session management module for tracking active user sessions.

#### Election Management

- Created election scheduling module with automated lifecycle management (pending → active → completed).
- Implemented cron-based election state transitions using `@nestjs/schedule`.
- Added environment-aware election duration rules (relaxed constraints for development).
- Built configurable election start/end times with admin controls.

#### Admin Dashboard & Management

- Implemented admin dashboard endpoints with real-time election statistics and voter turnout tracking.
- Built full CRUD operations for voter management (create, read, update, delete, list with filters).
- Added bulk voter import functionality for mass voter registration.
- Created candidate management module with CRUD operations and status management (active/inactive).
- Implemented export CSV endpoint for non-voters data.
- Added token status fields to voter list for tracking email delivery and verification status.

#### Voting Token System

- Built event-driven token generation with email delivery via Mailtrap.
- Implemented token resend functionality with rate-limited retry logic.
- Added composite index on tokens table for optimized lookup performance.

#### Election Results

- Created election results aggregation module with automated vote tallying.
- Implemented candidate ranking with vote counts and percentage breakdowns.

#### Audit Logging

- Implemented comprehensive audit logging service using Winston with daily rotate file transport.
- Added database-persisted audit logs with UUID primary keys for forensic analysis.
- Built audit log context interceptor for automatic request metadata capture.
- Created superadmin audit log query and export endpoints for administrative oversight.

#### Security

- Implemented global and endpoint-specific rate limiting (login, token verify) with in-memory store.
- Added Helmet security headers middleware with configurable options.
- Integrated CSRF protection with cookie-based token validation.
- Built intelligent IP extraction supporting `x-forwarded-for` and `x-real-ip` headers behind proxies.
- Configured trust proxy for accurate client IP resolution in Docker/nginx environments.

#### Email Service

- Integrated Mailtrap SMTP for transactional email delivery.
- Built customizable Handlebars email templates for voter tokens and election notifications.
- Added configurable voting URL (`VOTING_URL`) for email links pointing to the voter-facing page.

#### Infrastructure & Deployment

- Created production Docker setup with `Dockerfile.production` and `docker-compose.prod.yaml` (API + Redis).
- Built development Docker Compose configuration with PostgreSQL 17, Maildev, and Adminer.
- Configured Vercel serverless handler as an alternative deployment target.
- Implemented GitHub Actions CI/CD workflows for both development and production deployments.
- Added automated `.env.production` generation from GitHub Secrets in the deployment pipeline.
- Configured SSH-based deployment to VPS with Docker Compose orchestration.

#### Database

- Created 17 TypeORM migrations covering all domain entities (voters, candidates, admins, election config, tokens, votes, vote hashes, audit logs, seed history).
- Implemented relational database seeding for initial admin and voter data.
- Added seed history tracking table to prevent duplicate seed execution.

#### Developer Experience

- Configured ESLint flat config with Prettier integration for consistent code style.
- Set up Husky pre-commit hooks with commitlint for conventional commit enforcement.
- Added hygen code generators for scaffolding new resources and database seeds.
- Integrated Swagger/OpenAPI documentation accessible at `/docs`.
- Added internationalization (i18n) support with English language files via `nestjs-i18n`.
- Configured multi-origin CORS support with comma-separated `FRONTEND_DOMAIN`.

### Security

- All JWT secrets are generated using `openssl rand -base64 32` and stored as GitHub Secrets.
- Database passwords and API keys are never committed to the repository.
- Vote hashes use a dedicated salt to prevent rainbow table attacks.
- Rate limiting protects login and token verification endpoints from brute-force attempts.
- Helmet hardens HTTP response headers against common web vulnerabilities.
- CSRF tokens prevent cross-site request forgery on state-changing operations.

[1.0.0]: https://github.com/cyvote/backend-cyvote/releases/tag/v1.0.0
