# Audit Logging Service - Technical Plan

## 1. Overview

Centralized Audit Logging Service untuk tracking semua aktivitas penting di sistem CyVote. Service ini akan menjadi single source of truth untuk semua audit trail.

## 2. Architecture Analysis

### Current Project Structure (DDD)

```
src/
  ├── [domain]/
  │   ├── domain/          # Domain entities
  │   ├── dto/             # Data Transfer Objects
  │   ├── infrastructure/  # Persistence implementations
  │   ├── [domain].controller.ts
  │   ├── [domain].service.ts
  │   └── [domain].module.ts
```

### New Module Structure

```
src/
  └── audit-log/
      ├── domain/
      │   └── audit-log.ts                    # Domain entity
      ├── dto/
      │   ├── create-audit-log.dto.ts         # Input DTO
      │   └── audit-log-response.dto.ts       # Response DTO
      ├── enums/
      │   ├── audit-action.enum.ts            # Action types enum
      │   ├── audit-actor-type.enum.ts        # Actor types enum
      │   ├── audit-resource-type.enum.ts     # Resource types enum
      │   └── audit-status.enum.ts            # Status enum
      ├── infrastructure/
      │   └── persistence/
      │       ├── document/                   # MongoDB implementation
      │       │   ├── document-persistence.module.ts
      │       │   ├── entities/
      │       │   │   └── audit-log.schema.ts
      │       │   ├── mappers/
      │       │   │   └── audit-log.mapper.ts
      │       │   └── repositories/
      │       │       └── audit-log.repository.ts
      │       └── relational/                 # PostgreSQL implementation
      │           ├── relational-persistence.module.ts
      │           ├── entities/
      │           │   └── audit-log.entity.ts
      │           ├── mappers/
      │           │   └── audit-log.mapper.ts
      │           └── repositories/
      │               └── audit-log.repository.ts
      ├── interfaces/
      │   ├── audit-log.repository.interface.ts    # Repository abstraction
      │   └── audit-log-request-context.interface.ts
      ├── config/
      │   ├── audit-log-config.type.ts
      │   └── audit-log.config.ts
      ├── audit-log.service.ts                # Main service
      └── audit-log.module.ts                 # Module definition
```

## 3. Data Flow Architecture

### 3.1. High-Level Flow

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ HTTP Request (with IP, User-Agent)
       ▼
┌──────────────────────────────────┐
│     NestJS Controller            │
│  (Guards, Interceptors)          │
└──────┬───────────────────────────┘
       │ Calls business logic
       ▼
┌──────────────────────────────────┐
│    Business Service              │
│  (Users/Auth/Voting/etc)         │
└──────┬───────────────────────────┘
       │ Async call (non-blocking)
       ▼
┌──────────────────────────────────┐
│    AuditLogService               │
│  - Extract request context       │
│  - Format log message            │
│  - Enqueue to Winston            │
└──────┬───────────────────────────┘
       │ Async processing
       ▼
┌──────────────────────────────────┐
│       Winston Logger             │
│  - Console transport             │
│  - File transport                │
│  - Database transport (optional) │
└──────┬───────────────────────────┘
       │ Write to
       ▼
┌──────────────────────────────────┐
│    Persistence Layer             │
│  - Database (if configured)      │
│  - Log files                     │
└──────────────────────────────────┘
```

### 3.2. Detailed Flow for Voting Action

```
User votes
    │
    ▼
VotingController.castVote()
    │
    ├─► Extract JWT token → Get userId
    │
    ├─► VotingService.castVote(userId, candidateId)
    │       │
    │       ├─► Validate vote eligibility
    │       ├─► Save vote to database
    │       │
    │       └─► AuditLogService.log({
    │               actorId: userId,
    │               actorType: ActorType.USER,
    │               action: AuditAction.VOTE_CAST,
    │               resourceType: ResourceType.VOTE,
    │               resourceId: voteId,
    │               status: AuditStatus.SUCCESS,
    │               details: { candidateId }
    │           })
    │               │
    │               ├─► Build log message: "User with ID {uuid} has successfully voted!"
    │               ├─► Get request context (IP, User-Agent) via AsyncLocalStorage
    │               ├─► Create audit log object
    │               └─► Winston.log (async, non-blocking)
    │                       │
    │                       └─► Write to database & file
    │
    └─► Return response to user (WITHOUT waiting for log)
```

### 3.3. Request Context Flow

```
HTTP Request arrives
    │
    ▼
RequestContextInterceptor (Global)
    │
    ├─► Extract from Request:
    │       - IP Address (req.ip)
    │       - User Agent (req.headers['user-agent'])
    │       - User ID (req.user?.id if authenticated)
    │       - Timestamp
    │
    ├─► Store in AsyncLocalStorage
    │
    └─► Continue to controller
            │
            └─► Any call to AuditLogService.log()
                    │
                    └─► Retrieve context from AsyncLocalStorage
```

## 4. Component Specifications

### 4.1. Enums

#### AuditAction Enum

```typescript
enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ADMIN_LOGOUT = 'ADMIN_LOGOUT',

  // Voter Management
  VOTER_CREATED = 'VOTER_CREATED',
  VOTER_UPDATED = 'VOTER_UPDATED',
  VOTER_DELETED = 'VOTER_DELETED',
  VOTER_BULK_IMPORTED = 'VOTER_BULK_IMPORTED',

  // Candidate Management
  CANDIDATE_CREATED = 'CANDIDATE_CREATED',
  CANDIDATE_UPDATED = 'CANDIDATE_UPDATED',
  CANDIDATE_DELETED = 'CANDIDATE_DELETED',

  // Token/OTP Management
  TOKEN_GENERATED = 'TOKEN_GENERATED',
  TOKEN_SENT = 'TOKEN_SENT',
  TOKEN_RESENT = 'TOKEN_RESENT',
  TOKEN_VERIFIED = 'TOKEN_VERIFIED',
  TOKEN_FAILED = 'TOKEN_FAILED',

  // Voting
  VOTE_CAST = 'VOTE_CAST',

  // Election Management
  ELECTION_SCHEDULED = 'ELECTION_SCHEDULED',
  ELECTION_EXTENDED = 'ELECTION_EXTENDED',

  // Results
  RESULTS_VERIFIED = 'RESULTS_VERIFIED',
  RESULTS_PUBLISHED = 'RESULTS_PUBLISHED',

  // Export
  EXPORT_NON_VOTERS = 'EXPORT_NON_VOTERS',
}
```

#### AuditActorType Enum

```typescript
enum AuditActorType {
  USER = 'USER', // Regular voter
  ADMIN = 'ADMIN', // System administrator
  SYSTEM = 'SYSTEM', // Automated system action
  ANONYMOUS = 'ANONYMOUS', // Unauthenticated action
}
```

#### AuditResourceType Enum

```typescript
enum AuditResourceType {
  USER = 'USER',
  VOTER = 'VOTER',
  CANDIDATE = 'CANDIDATE',
  VOTE = 'VOTE',
  TOKEN = 'TOKEN',
  ELECTION = 'ELECTION',
  RESULTS = 'RESULTS',
  EXPORT = 'EXPORT',
}
```

#### AuditStatus Enum

```typescript
enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}
```

### 4.2. Domain Entity

```typescript
class AuditLog {
  id: number | string;

  actorId: string | null;
  actorType: AuditActorType;

  action: AuditAction;

  resourceType: AuditResourceType | null;
  resourceId: string | null;

  ipAddress: string | null;
  userAgent: string | null;

  status: AuditStatus;

  message: string;
  details: Record<string, any> | null;

  createdAt: Date;
}
```

### 4.3. DTOs

#### CreateAuditLogDto

```typescript
interface CreateAuditLogDto {
  actorId: string | null;
  actorType: AuditActorType;
  action: AuditAction;
  resourceType?: AuditResourceType | null;
  resourceId?: string | null;
  status: AuditStatus;
  details?: Record<string, any> | null;
}
```

#### AuditLogRequestContext Interface

```typescript
interface AuditLogRequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  userId: string | null;
  timestamp: Date;
}
```

### 4.4. Service Method Signatures

#### AuditLogService

```typescript
class AuditLogService {
  constructor(
    private readonly auditLogRepository: AuditLogRepositoryInterface,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main logging method - Async and non-blocking
   * @param dto - Audit log data
   * @returns Promise<void> - Fire and forget
   */
  async log(dto: CreateAuditLogDto): Promise<void>;

  /**
   * Build human-readable log message based on action
   * @param action - Audit action type
   * @param actorId - Actor identifier
   * @param details - Additional context
   * @returns string - Formatted message
   */
  private buildLogMessage(
    action: AuditAction,
    actorId: string | null,
    details: Record<string, any> | null,
  ): string;

  /**
   * Get current request context from AsyncLocalStorage
   * @returns AuditLogRequestContext | null
   */
  private getRequestContext(): AuditLogRequestContext | null;

  /**
   * Query audit logs (for admin/reporting)
   * @param filters - Query filters
   * @returns Promise<AuditLog[]>
   */
  async findMany(filters: AuditLogQueryDto): Promise<AuditLog[]>;

  /**
   * Get audit log by ID
   * @param id - Audit log identifier
   * @returns Promise<AuditLog | null>
   */
  async findOne(id: string | number): Promise<AuditLog | null>;
}
```

#### Repository Interface

```typescript
interface AuditLogRepositoryInterface {
  /**
   * Create new audit log entry
   */
  create(data: AuditLog): Promise<AuditLog>;

  /**
   * Find multiple audit logs with filters
   */
  findMany(filters: AuditLogQueryDto): Promise<AuditLog[]>;

  /**
   * Find single audit log by ID
   */
  findOne(id: string | number): Promise<AuditLog | null>;

  /**
   * Count total audit logs matching filters
   */
  count(filters: AuditLogQueryDto): Promise<number>;
}
```

### 4.5. Winston Configuration

```typescript
interface AuditLogConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';

  // Console output
  consoleEnabled: boolean;

  // File output
  fileEnabled: boolean;
  filePath: string;
  maxFiles: number;
  maxSize: string;

  // Database output
  databaseEnabled: boolean;
}
```

## 5. Implementation Steps

### Step 1: Install Dependencies

```bash
pnpm add winston winston-daily-rotate-file
pnpm add -D @types/winston
```

### Step 2: Create Enums

1. Create `src/audit-log/enums/audit-action.enum.ts`
2. Create `src/audit-log/enums/audit-actor-type.enum.ts`
3. Create `src/audit-log/enums/audit-resource-type.enum.ts`
4. Create `src/audit-log/enums/audit-status.enum.ts`

### Step 3: Create Domain Entity

1. Create `src/audit-log/domain/audit-log.ts`

### Step 4: Create DTOs

1. Create `src/audit-log/dto/create-audit-log.dto.ts`
2. Create `src/audit-log/dto/audit-log-response.dto.ts`
3. Create `src/audit-log/dto/audit-log-query.dto.ts`

### Step 5: Create Interfaces

1. Create `src/audit-log/interfaces/audit-log.repository.interface.ts`
2. Create `src/audit-log/interfaces/audit-log-request-context.interface.ts`

### Step 6: Create Config

1. Create `src/audit-log/config/audit-log-config.type.ts`
2. Create `src/audit-log/config/audit-log.config.ts`
3. Add config to `app.module.ts` ConfigModule

### Step 7: Create Database Entities & Repositories

#### For Relational DB:

1. Create `src/audit-log/infrastructure/persistence/relational/entities/audit-log.entity.ts`
2. Create `src/audit-log/infrastructure/persistence/relational/repositories/audit-log.repository.ts`
3. Create `src/audit-log/infrastructure/persistence/relational/mappers/audit-log.mapper.ts`
4. Create `src/audit-log/infrastructure/persistence/relational/relational-persistence.module.ts`
5. Generate migration: `pnpm migration:generate src/database/migrations/CreateAuditLog`

#### For Document DB:

1. Create `src/audit-log/infrastructure/persistence/document/entities/audit-log.schema.ts`
2. Create `src/audit-log/infrastructure/persistence/document/repositories/audit-log.repository.ts`
3. Create `src/audit-log/infrastructure/persistence/document/mappers/audit-log.mapper.ts`
4. Create `src/audit-log/infrastructure/persistence/document/document-persistence.module.ts`

### Step 8: Create Winston Logger Service

1. Create `src/audit-log/audit-log-logger.service.ts`
   - Configure Winston with transports
   - Daily rotate file
   - Console output
   - Custom format

### Step 9: Create Request Context

1. Create `src/audit-log/audit-log-request-context.service.ts`
   - Use AsyncLocalStorage
   - Store request metadata

2. Create `src/audit-log/interceptors/audit-log-context.interceptor.ts`
   - Extract IP, User-Agent
   - Store in AsyncLocalStorage

### Step 10: Create Main Service

1. Create `src/audit-log/audit-log.service.ts`
   - Implement `log()` method
   - Implement message builder
   - Integrate Winston
   - Integrate repository

### Step 11: Create Module

1. Create `src/audit-log/audit-log.module.ts`
   - Register as global module
   - Export AuditLogService
   - Configure database persistence

2. Import in `app.module.ts`

### Step 12: Create Global Interceptor

1. Register `AuditLogContextInterceptor` globally in `app.module.ts`

### Step 13: Create Unit Tests

1. Create `src/audit-log/audit-log.service.spec.ts`
   - 30 positive tests
   - 30 negative tests
   - 30 edge case tests

## 6. Message Formatting Rules

### Special Format for VOTE_CAST

```typescript
// For VOTE_CAST action ONLY:
message = `User with ID ${actorId} has successfully voted!`;
```

### Generic Format for Other Actions

```typescript
message = `${actorType} ${actorId || 'anonymous'} performed ${action} on ${resourceType} ${resourceId || ''} - ${status}`;
```

### Examples

```typescript
// VOTE_CAST
'User with ID 123e4567-e89b-12d3-a456-426614174000 has successfully voted!';

// LOGIN_SUCCESS
'USER 123e4567-e89b-12d3-a456-426614174000 performed LOGIN_SUCCESS - SUCCESS';

// VOTER_CREATED
'ADMIN admin-uuid performed VOTER_CREATED on VOTER voter-uuid - SUCCESS';

// TOKEN_FAILED
'ANONYMOUS performed TOKEN_FAILED on TOKEN token-uuid - FAILED';
```

## 7. Async Logging Strategy

### Non-Blocking Implementation

```typescript
async log(dto: CreateAuditLogDto): Promise<void> {
  // Fire and forget - don't await in caller
  setImmediate(async () => {
    try {
      // Get request context
      const context = this.getRequestContext();

      // Build message
      const message = this.buildLogMessage(dto.action, dto.actorId, dto.details);

      // Create domain entity
      const auditLog = new AuditLog({
        ...dto,
        message,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        createdAt: new Date(),
      });

      // Log with Winston (async)
      this.logger.info(message, {
        ...auditLog,
        service: 'AuditLogService',
      });

      // Save to database (async, if enabled)
      if (this.config.databaseEnabled) {
        await this.auditLogRepository.create(auditLog);
      }
    } catch (error) {
      // Never throw - just log error
      this.logger.error('Failed to create audit log', error);
    }
  });
}
```

## 8. Usage Examples

### Example 1: Login Success

```typescript
// In AuthService
async login(email: string, password: string) {
  const user = await this.validateUser(email, password);

  if (user) {
    const token = this.generateToken(user);

    // Log success (async, non-blocking)
    this.auditLogService.log({
      actorId: user.id.toString(),
      actorType: AuditActorType.USER,
      action: AuditAction.LOGIN_SUCCESS,
      status: AuditStatus.SUCCESS,
    });

    return { token, user };
  }

  // Log failure
  this.auditLogService.log({
    actorId: email,
    actorType: AuditActorType.ANONYMOUS,
    action: AuditAction.LOGIN_FAILED,
    status: AuditStatus.FAILED,
    details: { reason: 'Invalid credentials' },
  });

  throw new UnauthorizedException();
}
```

### Example 2: Cast Vote (LUBERJUDIL format)

```typescript
// In VotingService
async castVote(userId: string, candidateId: string) {
  // Validate and save vote
  const vote = await this.voteRepository.save({
    userId,
    candidateId,
    timestamp: new Date(),
  });

  // Log with special format
  this.auditLogService.log({
    actorId: userId,
    actorType: AuditActorType.USER,
    action: AuditAction.VOTE_CAST,
    resourceType: AuditResourceType.VOTE,
    resourceId: vote.id.toString(),
    status: AuditStatus.SUCCESS,
    details: { candidateId },
  });

  return vote;
}
// Output: "User with ID 123e4567-e89b-12d3-a456-426614174000 has successfully voted!"
```

### Example 3: Bulk Import Voters

```typescript
// In VoterService
async bulkImport(voters: CreateVoterDto[], adminId: string) {
  const results = await this.voterRepository.bulkCreate(voters);

  this.auditLogService.log({
    actorId: adminId,
    actorType: AuditActorType.ADMIN,
    action: AuditAction.VOTER_BULK_IMPORTED,
    resourceType: AuditResourceType.VOTER,
    status: AuditStatus.SUCCESS,
    details: {
      count: results.length,
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
    },
  });

  return results;
}
```

## 9. Testing Strategy

### Unit Tests Structure (90 tests total)

#### Positive Tests (30)

1. Successfully log with all fields
2. Successfully log with minimum required fields
3. Successfully log VOTE_CAST with special format
4. Successfully log each action type (15 tests)
5. Successfully retrieve request context
6. Successfully build message for each action type (5 tests)
7. Successfully query logs with filters
8. Successfully count logs

#### Negative Tests (30)

1. Handle null actorId
2. Handle missing required fields
3. Handle invalid enum values
4. Handle database connection error
5. Handle Winston logger error
6. Handle repository error
7. Handle invalid date
8. Handle malformed details object
9. Handle circular reference in details
10. Handle oversized details object
    11-30. Error scenarios for each action type

#### Edge Case Tests (30)

1. Log with empty details object
2. Log with null details
3. Log with undefined fields
4. Log with extremely long actorId
5. Log with special characters in fields
6. Log without request context
7. Log with partial request context
8. Concurrent logging (race condition)
9. Log with maximum field lengths
10. Log with Unicode characters
11. Log with SQL injection attempt in details
12. Log with XSS attempt in details
13. Log when database is disabled
14. Log when file logging is disabled
15. Log when all transports are disabled
16. Log with future timestamp
17. Log with past timestamp (year 1970)
18. Query with empty filters
19. Query with invalid pagination
20. Query with extreme pagination (page 999999)
    21-30. Edge cases for each major action type

## 10. Security Considerations

1. **Sensitive Data**: Never log passwords, tokens, or PII details
2. **Injection Prevention**: Sanitize all log inputs
3. **Size Limits**: Limit details object size to prevent DoS
4. **Rate Limiting**: Consider rate limiting for audit logs from single IP
5. **Access Control**: Only admins can query audit logs
6. **Data Retention**: Configure log rotation and retention policies

## 11. Performance Considerations

1. **Async Processing**: All logging is non-blocking
2. **Batch Writes**: Consider batching database writes
3. **Index Strategy**: Index on `actorId`, `action`, `createdAt`, `status`
4. **Partitioning**: Consider table partitioning for large datasets
5. **Caching**: Don't cache audit logs (always fresh)

## 12. Monitoring & Alerting

1. **Failed Logs**: Alert when audit log fails to write
2. **Volume Spike**: Alert on unusual log volume
3. **Failed Actions**: Alert on high failure rate
4. **Disk Space**: Monitor log file disk usage

## 13. SOLID Principles Application

- **S**: Single Responsibility - Each class has one clear purpose
- **O**: Open/Closed - Can extend with new transports without modifying core
- **L**: Liskov Substitution - Repository interface allows swapping implementations
- **I**: Interface Segregation - Small, focused interfaces
- **D**: Dependency Inversion - Depend on abstractions (repository interface)

## 14. Database Schema

### Relational (PostgreSQL)

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id VARCHAR(255),
  actor_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_actor_id (actor_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_status (status),
  INDEX idx_actor_type (actor_type)
);
```

### Document (MongoDB)

```javascript
{
  _id: ObjectId,
  actorId: String,
  actorType: String,
  action: String,
  resourceType: String,
  resourceId: String,
  ipAddress: String,
  userAgent: String,
  status: String,
  message: String,
  details: Object,
  createdAt: Date
}

// Indexes
db.audit_logs.createIndex({ actorId: 1 })
db.audit_logs.createIndex({ action: 1 })
db.audit_logs.createIndex({ createdAt: -1 })
db.audit_logs.createIndex({ status: 1 })
db.audit_logs.createIndex({ actorType: 1 })
```

## 15. Environment Variables

```env
# Audit Log Configuration
AUDIT_LOG_ENABLED=true
AUDIT_LOG_LEVEL=info
AUDIT_LOG_CONSOLE_ENABLED=true
AUDIT_LOG_FILE_ENABLED=true
AUDIT_LOG_FILE_PATH=./logs
AUDIT_LOG_MAX_FILES=30d
AUDIT_LOG_MAX_SIZE=20m
AUDIT_LOG_DATABASE_ENABLED=true
```

---

## Summary

This technical plan provides a complete, detailed blueprint for implementing a centralized audit logging service that:

1. ✅ Follows DDD architecture
2. ✅ Uses Winston for logging
3. ✅ Supports both MongoDB and PostgreSQL
4. ✅ Implements async, non-blocking logging
5. ✅ Captures request context automatically
6. ✅ Uses special "LUBERJUDIL" format for votes
7. ✅ Follows SOLID, DRY, KISS, YAGNI principles
8. ✅ Includes comprehensive testing strategy (90 tests)
9. ✅ Prevents circular dependencies
10. ✅ Production-ready with proper error handling

The service can be injected anywhere in the application without circular dependencies and will not block request processing.
