# Voting System Technical Plan

## 1. Executive Summary

This document outlines the complete technical architecture for a secure, transparent, and auditable electronic voting (e-voting) system. The system is designed to handle student elections with cryptographic integrity verification, token-based authentication, and comprehensive audit trails.

## 2. Database Architecture Overview

### 2.1 Entity Relationship Diagram

```
┌─────────────────────┐
│   election_config   │
│  (System Settings)  │
└──────────┬──────────┘
           │
           │ created_by
           ▼
┌──────────────────────┐
│       admins         │
│   (System Admins)    │
└──────────────────────┘
           │
           │ performs actions
           ▼
┌──────────────────────┐         ┌─────────────────────┐
│    audit_logs        │◄────────│      voters         │
│  (All Activities)    │         │  (Voter Registry)   │
└──────────────────────┘         └──────────┬──────────┘
                                            │
                                            │ generates
                                            ▼
                                  ┌─────────────────────┐
                                  │      tokens         │
                                  │  (Auth Tokens)      │
                                  └─────────────────────┘
                                            │
                                            │ authorizes
                                            ▼
┌──────────────────────┐         ┌─────────────────────┐
│    candidates        │◄────────│       votes         │
│  (Nominees)          │  voted  │  (Ballot Records)   │
└──────────────────────┘   for   └──────────┬──────────┘
                                            │
                                            │ integrity
                                            ▼
                                  ┌─────────────────────┐
                                  │    vote_hashes      │
                                  │  (Cryptographic)    │
                                  └─────────────────────┘
```

### 2.2 Table Dependencies (Creation Order)

```
1. admins (independent)
2. election_config (depends on: admins)
3. voters (independent)
4. candidates (independent)
5. tokens (depends on: voters)
6. votes (depends on: voters, candidates)
7. vote_hashes (depends on: votes)
8. audit_logs (independent - references multiple tables)
```

## 3. Detailed Table Specifications

### 3.1 Voters Table

**Purpose**: Store registered voter information and voting status

**Fields**:
- `id` (UUID, PK): Unique identifier
- `nim` (VARCHAR(15), UNIQUE, NOT NULL): Student identification number
- `nama_lengkap` (VARCHAR(100), NOT NULL): Full name
- `angkatan` (INTEGER, NOT NULL): Academic cohort/year
- `email` (VARCHAR(255), NOT NULL): Email address
- `has_voted` (BOOLEAN, DEFAULT FALSE): Voting completion status
- `voted_at` (TIMESTAMP, NULLABLE): Vote submission timestamp
- `created_at` (TIMESTAMP, DEFAULT NOW())
- `updated_at` (TIMESTAMP, DEFAULT NOW())
- `deleted_at` (TIMESTAMP, NULLABLE): Soft delete timestamp

**Indexes**:
- `idx_voters_nim`: Fast lookup by student ID
- `idx_voters_has_voted`: Quick filtering of voting status

**Business Rules**:
- NIM must be unique across all voters
- `has_voted` can only transition from FALSE to TRUE
- `voted_at` must be set when `has_voted` becomes TRUE
- Email format validation required at application level
- Soft delete support for data retention compliance

### 3.2 Candidates Table

**Purpose**: Store candidate information and campaign materials

**Fields**:
- `id` (UUID, PK): Unique identifier
- `nama` (VARCHAR(100), NOT NULL): Candidate name
- `photo_url` (VARCHAR(500), NULLABLE): Profile photo URL
- `visi_misi` (TEXT, NULLABLE): Vision and mission statement
- `program_kerja` (TEXT, NULLABLE): Work program details
- `grand_design_url` (VARCHAR(500), NULLABLE): Strategic plan document URL
- `created_at` (TIMESTAMP, DEFAULT NOW())
- `updated_at` (TIMESTAMP, DEFAULT NOW())

**Business Rules**:
- URLs must be validated at application level
- Support for multiple file formats (PDF, images)
- Candidate data immutable during active election period

### 3.3 Tokens Table

**Purpose**: Manage one-time authentication tokens for voting

**Fields**:
- `id` (UUID, PK): Unique identifier
- `voter_id` (UUID, FK → voters.id): Token owner
- `token_hash` (VARCHAR(64), NOT NULL): SHA-256 hashed token
- `generated_at` (TIMESTAMP, DEFAULT NOW())
- `used_at` (TIMESTAMP, NULLABLE): Token consumption timestamp
- `is_used` (BOOLEAN, DEFAULT FALSE): Usage status
- `resend_count` (INTEGER, DEFAULT 0): Token regeneration counter

**Indexes**:
- `idx_tokens_voter`: Fast lookup by voter
- `idx_tokens_hash`: Quick token verification (optional - consider security implications)

**Business Rules**:
- One active token per voter at a time
- Token expires after specified duration (e.g., 30 minutes)
- Maximum resend limit (e.g., 3 attempts)
- Token must be cryptographically strong (minimum 32 bytes entropy)
- `is_used` can only transition from FALSE to TRUE

### 3.4 Votes Table

**Purpose**: Store encrypted vote records with anonymity preservation

**Fields**:
- `id` (UUID, PK): Unique identifier
- `voter_id` (UUID, FK → voters.id): Voter reference
- `candidate_id` (UUID, FK → candidates.id): Selected candidate
- `vote_hash` (VARCHAR(64), NOT NULL): SHA-256 vote integrity hash
- `voted_at` (TIMESTAMP, DEFAULT NOW())
- `receipt_code` (VARCHAR(20), UNIQUE, NOT NULL): Verification receipt

**Indexes**:
- `idx_votes_voter`: Ensure one vote per voter
- `idx_votes_candidate`: Vote counting aggregation
- `idx_votes_receipt`: Receipt verification

**Business Rules**:
- One vote per voter (enforced at application and database level)
- Vote immutable once submitted
- Receipt code format: `VOTE-{timestamp}-{random}`
- `vote_hash` = SHA256(voter_id + candidate_id + timestamp + salt)
- Anonymization layer required for result publication

### 3.5 Vote Hashes Table

**Purpose**: Cryptographic chain for vote integrity verification

**Fields**:
- `id` (UUID, PK): Unique identifier
- `vote_id` (UUID, FK → votes.id): Associated vote
- `hash` (VARCHAR(64), NOT NULL): Primary hash value
- `verification_hash` (VARCHAR(64), NULLABLE): Secondary verification
- `created_at` (TIMESTAMP, DEFAULT NOW())

**Business Rules**:
- `hash` = SHA256(vote.vote_hash + previous_hash)
- Blockchain-like integrity chain
- Tamper detection through hash chain verification
- `verification_hash` for additional audit layer

### 3.6 Admins Table

**Purpose**: System administrator authentication and authorization

**Fields**:
- `id` (UUID, PK): Unique identifier
- `username` (VARCHAR(50), UNIQUE, NOT NULL): Login username
- `password_hash` (VARCHAR(255), NOT NULL): Bcrypt hashed password
- `role` (VARCHAR(20), NOT NULL): Admin role (ADMIN/SUPERADMIN)
- `created_at` (TIMESTAMP, DEFAULT NOW())
- `last_login` (TIMESTAMP, NULLABLE): Last authentication timestamp

**Business Rules**:
- Password: minimum 12 characters, complexity requirements
- SUPERADMIN: full system access
- ADMIN: read-only access to results, limited configuration
- Password hash using bcrypt with cost factor ≥ 12
- Session management integration required

### 3.7 Election Config Table

**Purpose**: Global election settings and lifecycle management

**Fields**:
- `id` (UUID, PK): Unique identifier
- `start_date` (TIMESTAMP, NOT NULL): Election start time
- `end_date` (TIMESTAMP, NOT NULL): Election end time
- `status` (VARCHAR(20), DEFAULT 'SCHEDULED'): Election state
- `results_published_at` (TIMESTAMP, NULLABLE): Results publication time
- `created_by` (UUID, FK → admins.id): Configuration creator
- `created_at` (TIMESTAMP, DEFAULT NOW())
- `updated_at` (TIMESTAMP, DEFAULT NOW())

**Status Values**:
- `SCHEDULED`: Election planned but not started
- `ACTIVE`: Currently accepting votes
- `CLOSED`: Voting ended, results pending
- `PUBLISHED`: Results publicly available

**Business Rules**:
- Only one active election at a time
- `end_date` must be after `start_date`
- Status transitions: SCHEDULED → ACTIVE → CLOSED → PUBLISHED
- Configuration changes locked during ACTIVE status

### 3.8 Audit Logs Table

**Purpose**: Comprehensive activity tracking for security and compliance

**Fields**:
- `id` (UUID, PK): Unique identifier
- `actor_id` (UUID, NULLABLE): User performing action
- `actor_type` (VARCHAR(20), NULLABLE): User role type
- `action` (VARCHAR(100), NOT NULL): Action description
- `resource_type` (VARCHAR(50), NULLABLE): Affected resource type
- `resource_id` (UUID, NULLABLE): Affected resource identifier
- `ip_address` (VARCHAR(45), NULLABLE): IPv4/IPv6 address
- `user_agent` (TEXT, NULLABLE): Browser/client information
- `status` (VARCHAR(20), NULLABLE): Operation result
- `details` (JSONB, NULLABLE): Additional context data
- `created_at` (TIMESTAMP, DEFAULT NOW())

**Indexes**:
- `idx_audit_logs_created_at`: Time-based queries
- `idx_audit_logs_actor`: User activity tracking

**Actor Types**:
- `VOTER`: Registered voter actions
- `ADMIN`: Administrator actions
- `SUPERADMIN`: Super administrator actions
- `SYSTEM`: Automated system actions

**Actions** (Examples):
- `VOTER_REGISTERED`, `TOKEN_GENERATED`, `TOKEN_USED`
- `VOTE_SUBMITTED`, `VOTE_VERIFIED`, `RESULT_VIEWED`
- `ELECTION_CREATED`, `ELECTION_STARTED`, `ELECTION_CLOSED`
- `ADMIN_LOGIN`, `CONFIG_UPDATED`, `DATA_EXPORTED`

## 4. Data Flow Architecture

### 4.1 Voter Registration Flow

```
┌─────────────┐
│   Admin     │
│  Interface  │
└──────┬──────┘
       │ 1. Upload voter list (CSV/Excel)
       ▼
┌─────────────────────┐
│  Voter Import       │
│  Service            │
└──────┬──────────────┘
       │ 2. Validate data (NIM, email, cohort)
       │ 3. Check duplicates
       ▼
┌─────────────────────┐
│  voters table       │
│  (INSERT)           │
└──────┬──────────────┘
       │ 4. Generate audit log
       ▼
┌─────────────────────┐
│  audit_logs table   │
│  (INSERT)           │
└─────────────────────┘
```

### 4.2 Token Generation Flow

```
┌─────────────┐
│   Voter     │
│   Client    │
└──────┬──────┘
       │ 1. Request token (NIM + Email)
       ▼
┌─────────────────────┐
│  Auth Service       │
└──────┬──────────────┘
       │ 2. Verify voter exists
       ▼
┌─────────────────────┐
│  voters table       │
│  (SELECT)           │
└──────┬──────────────┘
       │ 3. Check voting status
       │ 4. Generate crypto token
       ▼
┌─────────────────────┐
│  tokens table       │
│  (INSERT/UPDATE)    │
└──────┬──────────────┘
       │ 5. Send token via email
       ▼
┌─────────────────────┐
│  Email Service      │
│  (Mailer)           │
└──────┬──────────────┘
       │ 6. Log action
       ▼
┌─────────────────────┐
│  audit_logs table   │
│  (INSERT)           │
└─────────────────────┘
```

### 4.3 Voting Flow

```
┌─────────────┐
│   Voter     │
│   Client    │
└──────┬──────┘
       │ 1. Submit vote (token + candidate_id)
       ▼
┌─────────────────────┐
│  Voting Service     │
└──────┬──────────────┘
       │ 2. Validate token
       ▼
┌─────────────────────┐
│  tokens table       │
│  (SELECT + UPDATE)  │
└──────┬──────────────┘
       │ 3. Verify election active
       ▼
┌─────────────────────┐
│  election_config    │
│  (SELECT)           │
└──────┬──────────────┘
       │ 4. Check not already voted
       ▼
┌─────────────────────┐
│  voters table       │
│  (SELECT)           │
└──────┬──────────────┘
       │ 5. Begin transaction
       │
       ├─► 6a. Create vote record
       │   ┌─────────────────────┐
       │   │  votes table        │
       │   │  (INSERT)           │
       │   └──────┬──────────────┘
       │          │
       ├─► 6b. Create hash chain
       │   ┌─────────────────────┐
       │   │  vote_hashes table  │
       │   │  (INSERT)           │
       │   └──────┬──────────────┘
       │          │
       ├─► 6c. Update voter status
       │   ┌─────────────────────┐
       │   │  voters table       │
       │   │  (UPDATE)           │
       │   └──────┬──────────────┘
       │          │
       ├─► 6d. Mark token used
       │   ┌─────────────────────┐
       │   │  tokens table       │
       │   │  (UPDATE)           │
       │   └──────┬──────────────┘
       │          │
       └─► 6e. Log vote submission
           ┌─────────────────────┐
           │  audit_logs table   │
           │  (INSERT)           │
           └──────┬──────────────┘
                  │ 7. Commit transaction
                  │ 8. Return receipt
                  ▼
           ┌─────────────────────┐
           │   Voter Client      │
           │   (Display Receipt) │
           └─────────────────────┘
```

### 4.4 Result Calculation Flow

```
┌─────────────┐
│   Admin     │
│   Client    │
└──────┬──────┘
       │ 1. Request close election
       ▼
┌─────────────────────┐
│  Election Service   │
└──────┬──────────────┘
       │ 2. Verify election ended
       ▼
┌─────────────────────┐
│  election_config    │
│  (SELECT + UPDATE)  │
└──────┬──────────────┘
       │ 3. Aggregate votes
       ▼
┌─────────────────────┐
│  votes table        │
│  (SELECT + GROUP)   │
│                     │
│  SELECT             │
│    candidate_id,    │
│    COUNT(*) as cnt  │
│  FROM votes         │
│  GROUP BY           │
│    candidate_id     │
└──────┬──────────────┘
       │ 4. Join candidate info
       ▼
┌─────────────────────┐
│  candidates table   │
│  (LEFT JOIN)        │
└──────┬──────────────┘
       │ 5. Verify hash integrity
       ▼
┌─────────────────────┐
│  vote_hashes table  │
│  (SELECT)           │
│  Validate chain     │
└──────┬──────────────┘
       │ 6. Update config status
       ▼
┌─────────────────────┐
│  election_config    │
│  (UPDATE status)    │
└──────┬──────────────┘
       │ 7. Log result access
       ▼
┌─────────────────────┐
│  audit_logs table   │
│  (INSERT)           │
└──────┬──────────────┘
       │ 8. Return results
       ▼
┌─────────────────────┐
│   Admin Client      │
│  (Display Results)  │
└─────────────────────┘
```

## 5. Migration Strategy

### 5.1 Migration Order & Dependencies

```
Migration Order (Sequential Execution Required):

1. CreateAdminsTable (no dependencies)
2. CreateVotersTable (no dependencies)
3. CreateCandidatesTable (no dependencies)
4. CreateElectionConfigTable (depends on: admins)
5. CreateTokensTable (depends on: voters)
6. CreateVotesTable (depends on: voters, candidates)
7. CreateVoteHashesTable (depends on: votes)
8. CreateAuditLogsTable (no dependencies - soft references)
```

### 5.2 Migration File Structure

Each migration will follow TypeORM conventions:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName{timestamp} implements MigrationInterface {
  name = 'MigrationName{timestamp}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Forward migration
    await queryRunner.query(`CREATE TABLE ...`);
    await queryRunner.query(`CREATE INDEX ...`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback migration
    await queryRunner.query(`DROP INDEX ...`);
    await queryRunner.query(`DROP TABLE ...`);
  }
}
```

### 5.3 Migration Execution Commands

```bash
# Generate timestamp
npm run migration:create src/database/migrations/CreateTableName

# Run all pending migrations
pnpm run migration:run

# Revert last migration
pnpm run migration:revert

# Drop all tables (DANGEROUS - development only)
pnpm run schema:drop
```

## 6. Security Considerations

### 6.1 Cryptographic Requirements

- **Token Generation**: Use `crypto.randomBytes(32)` for token generation
- **Password Hashing**: Bcrypt with cost factor ≥ 12
- **Vote Hashing**: SHA-256 with salt: `SHA256(voter_id || candidate_id || timestamp || secret_salt)`
- **Hash Chaining**: Each vote hash includes previous hash for integrity

### 6.2 SQL Injection Prevention

- Use parameterized queries exclusively (TypeORM ORM)
- Validate all input data at DTO level
- Sanitize user-generated content (email, names)

### 6.3 Access Control

```
Voter Permissions:
- Request token
- Submit vote (once)
- View receipt
- Verify vote in blockchain

Admin Permissions:
- View aggregated results (after closure)
- Export anonymized data
- View audit logs

SuperAdmin Permissions:
- All Admin permissions
- Manage election config
- Manage voter registry
- Manage candidates
- Access sensitive audit logs
```

## 7. Performance Optimization

### 7.1 Indexing Strategy

**Critical Indexes** (already included in schema):
- `voters.nim`: Unique lookup during authentication
- `voters.has_voted`: Filter voters who haven't voted
- `tokens.voter_id`: Token validation
- `votes.voter_id`: Prevent double voting
- `votes.candidate_id`: Result aggregation
- `audit_logs.created_at`: Time-based log queries

**Optional Indexes** (add if needed):
- `votes.voted_at`: Time-series analysis
- `tokens.generated_at`: Token expiration cleanup

### 7.2 Query Optimization

**Vote Counting Query** (optimized):
```sql
SELECT 
  c.id,
  c.nama,
  COUNT(v.id) as vote_count,
  ROUND(COUNT(v.id) * 100.0 / total.count, 2) as percentage
FROM candidates c
LEFT JOIN votes v ON v.candidate_id = c.id
CROSS JOIN (SELECT COUNT(*) as count FROM votes) total
GROUP BY c.id, c.nama, total.count
ORDER BY vote_count DESC;
```

### 7.3 Connection Pooling

From `.env`:
```
DATABASE_MAX_CONNECTIONS=100
```

**Recommended Settings**:
- Development: 10-20 connections
- Production: 50-100 connections (adjust based on concurrent voters)
- Monitor connection usage during peak voting times

## 8. Data Integrity Rules

### 8.1 Foreign Key Constraints

```sql
-- Cascade rules for referential integrity

-- Soft delete voter: keep historical data
ALTER TABLE votes 
  ADD CONSTRAINT fk_votes_voter 
  FOREIGN KEY (voter_id) 
  REFERENCES voters(id) 
  ON DELETE RESTRICT;

-- Delete candidate: prevent if has votes
ALTER TABLE votes 
  ADD CONSTRAINT fk_votes_candidate 
  FOREIGN KEY (candidate_id) 
  REFERENCES candidates(id) 
  ON DELETE RESTRICT;

-- Delete vote: cascade delete hash
ALTER TABLE vote_hashes 
  ADD CONSTRAINT fk_hash_vote 
  FOREIGN KEY (vote_id) 
  REFERENCES votes(id) 
  ON DELETE CASCADE;
```

### 8.2 Transaction Boundaries

**Critical Transactions**:

1. **Vote Submission** (ACID):
   ```
   BEGIN;
     INSERT INTO votes ...;
     INSERT INTO vote_hashes ...;
     UPDATE voters SET has_voted = TRUE ...;
     UPDATE tokens SET is_used = TRUE ...;
     INSERT INTO audit_logs ...;
   COMMIT;
   ```

2. **Voter Registration Batch**:
   ```
   BEGIN;
     INSERT INTO voters (bulk) ...;
     INSERT INTO audit_logs ...;
   COMMIT;
   ```

### 8.3 Soft Delete Strategy

**Tables with Soft Delete**:
- `voters`: Retain voting history
- Other tables: Hard delete (or add `deleted_at` if needed)

**Implementation**:
```typescript
// TypeORM entity
@DeleteDateColumn()
deletedAt: Date;
```

## 9. Monitoring & Observability

### 9.1 Key Metrics to Track

**Database Metrics**:
- Connection pool utilization
- Query execution time (p50, p95, p99)
- Table sizes and growth rate
- Index hit ratio

**Application Metrics**:
- Token generation rate
- Vote submission rate
- Failed authentication attempts
- Concurrent voters

**Audit Metrics**:
- Admin actions count
- Suspicious activity patterns
- Result access frequency

### 9.2 Alerting Thresholds

```
Critical:
- Multiple failed vote submissions (> 5 in 1 minute)
- Database connection pool exhausted
- Hash chain integrity failure

Warning:
- Token resend limit exceeded (voter-level)
- Unusual voting patterns (time-based spikes)
- High query latency (> 500ms)
```

## 10. Testing Strategy

### 10.1 Migration Testing

```bash
# Test up migration
pnpm run migration:run

# Verify tables created
psql -U postgres -d postgres -c "\dt"

# Test down migration
pnpm run migration:revert

# Verify tables dropped
psql -U postgres -d postgres -c "\dt"
```

### 10.2 Integration Testing

**Test Scenarios**:
1. Voter can request token successfully
2. Voter cannot vote without valid token
3. Voter cannot vote twice
4. Vote hash chain maintains integrity
5. Results calculation matches manual count
6. Admin cannot access votes during election
7. Soft deleted voters excluded from active queries

### 10.3 Load Testing

**Simulate Election Day**:
- 1000 concurrent voters
- Token requests: 50 req/sec
- Vote submissions: 30 req/sec
- Duration: 30 minutes

## 11. Compliance & Regulations

### 11.1 Data Privacy (GDPR/Local Laws)

- **Personal Data**: NIM, email, full name
- **Retention Policy**: 2 years post-election
- **Right to Erasure**: Soft delete with anonymization
- **Data Export**: Provide voter with their data in portable format

### 11.2 Audit Trail Requirements

- **Immutability**: Audit logs cannot be modified
- **Retention**: Minimum 5 years
- **Access Control**: Only SuperAdmin read access
- **Encryption**: Encrypt sensitive fields in audit details (JSONB)

## 12. Rollback & Disaster Recovery

### 12.1 Backup Strategy

```bash
# Daily automated backups
pg_dump -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Pre-election backup
pg_dump -U postgres -d postgres > pre_election_$(date +%Y%m%d_%H%M%S).sql
```

### 12.2 Recovery Procedures

**Scenario 1: Migration Failure**
```bash
pnpm run migration:revert
# Fix migration file
pnpm run migration:run
```

**Scenario 2: Data Corruption**
```bash
# Restore from last good backup
psql -U postgres -d postgres < backup_20260203.sql
# Verify hash chain integrity
# Re-run affected migrations
```

**Scenario 3: Election Day Failure**
```bash
# Switch to read-only mode
# Investigate issue
# Rollback to pre-election backup if needed
# Extend election period after resolution
```

## 13. Implementation Checklist

### Phase 1: Database Setup ✓
- [x] Analyze existing codebase
- [x] Create feature branch
- [ ] Create migration files (8 tables)
- [ ] Run migrations
- [ ] Validate schema
- [ ] Run Codacy analysis

### Phase 2: Entity & Repository Layer (Future)
- [ ] Create TypeORM entities
- [ ] Implement repositories
- [ ] Add validation decorators
- [ ] Write unit tests

### Phase 3: Service Layer (Future)
- [ ] Implement business logic
- [ ] Add transaction management
- [ ] Implement cryptographic functions
- [ ] Write service tests

### Phase 4: API Layer (Future)
- [ ] Create controllers
- [ ] Add authentication guards
- [ ] Implement rate limiting
- [ ] Write E2E tests

### Phase 5: Deployment (Future)
- [ ] Configure production database
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Load testing
- [ ] Security audit

---

## Appendix A: SQL Schema Reference

All SQL schemas are defined in the [instruction.md](../instruction.md) file.

## Appendix B: TypeORM Migration Patterns

Reference: [docs/database.md](./database.md)

## Appendix C: Glossary

- **NIM**: Nomor Induk Mahasiswa (Student ID Number)
- **Hash Chain**: Cryptographic technique where each hash includes previous hash
- **Soft Delete**: Logical deletion using timestamp instead of physical removal
- **ACID**: Atomicity, Consistency, Isolation, Durability
- **DTO**: Data Transfer Object
- **ORM**: Object-Relational Mapping

---

**Document Version**: 1.0  
**Last Updated**: February 3, 2026  
**Author**: Senior Backend Engineer  
**Status**: Implementation Phase
