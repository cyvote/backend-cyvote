# Admin Dashboard Module - Technical Plan

## Overview

This document outlines the technical implementation plan for Admin Dashboard endpoints that provide voting statistics and voter monitoring capabilities.

## Requirements Analysis

### Functional Requirements

1. **GET /api/admin/dashboard/stats** - Voting statistics endpoint
   - Returns total registered voters (non-deleted)
   - Returns total voted count (has_voted = true)
   - Returns total not voted count (has_voted = false)
   - Returns participation rate as percentage (2 decimal places)

2. **GET /api/admin/monitor/voters** - Voter monitoring endpoint
   - Returns paginated voter list
   - Query parameters: `page`, `limit`, `filter` (all/voted/not-voted)
   - Columns: id, nim, nama_lengkap, angkatan, email, has_voted, voted_at
   - **MUST NOT** include candidate choice (privacy principle)
   - Default sort: nama_lengkap ASC
   - Uses existing indexes from BE-2

### Non-Functional Requirements

- Protected by ADMIN authentication
- Rate limiting using existing GlobalRateLimitGuard
- Audit logging for all operations
- Follow DDD architecture
- Follow SOLID, DRY, KISS, YAGNI principles
- Use LEFT JOIN instead of INNER JOIN when applicable
- Optimized database queries

## Database Schema Analysis

### Voters Table Structure

```sql
voters (
  id: uuid PRIMARY KEY,
  nim: varchar(15) UNIQUE,
  nama_lengkap: varchar(100),
  angkatan: integer,
  email: varchar(255),
  has_voted: boolean DEFAULT false,
  voted_at: TIMESTAMP,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  deleted_at: TIMESTAMP
)

-- Existing Indexes:
idx_voters_nim
idx_voters_has_voted
```

### Votes Table Structure

```sql
votes (
  id: uuid PRIMARY KEY,
  voter_id: uuid UNIQUE, -- One vote per voter
  candidate_id: uuid,
  vote_hash: varchar(64),
  voted_at: TIMESTAMP,
  receipt_code: varchar(20) UNIQUE
)

-- Existing Indexes:
idx_votes_voter
idx_votes_candidate
```

## Architecture Design

### Module Structure

```
src/admin-dashboard/
├── admin-dashboard.module.ts
├── admin-dashboard.controller.ts
├── admin-dashboard.service.ts
├── config/
│   ├── admin-dashboard-config.type.ts
│   └── admin-dashboard.config.ts
├── domain/
│   ├── dashboard-stats.ts
│   └── voter-monitor.ts
├── dto/
│   ├── dashboard-stats-response.dto.ts
│   ├── voter-monitor-query.dto.ts
│   └── voter-monitor-response.dto.ts
├── guards/
│   └── admin-dashboard-rate-limit.guard.ts
└── infrastructure/
    └── persistence/
        └── relational/
            ├── relational-persistence.module.ts
            ├── repositories/
            │   └── dashboard.repository.ts
            └── mappers/
                └── dashboard.mapper.ts
```

## Data Flow Diagram

```
┌─────────────────┐
│   Admin Client  │
└────────┬────────┘
         │ HTTP Request with JWT
         ▼
┌─────────────────────────────────────┐
│   NestJS Middleware Pipeline        │
│   1. Global Rate Limit Guard       │
│   2. AdminAuthGuard (JWT)          │
│   3. AdminRolesGuard (ADMIN check) │
│   4. Audit Log Interceptor         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  AdminDashboardController           │
│  - getStats()                       │
│  - monitorVoters(query)             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  AdminDashboardService              │
│  - Business logic                   │
│  - Data transformation              │
│  - Audit logging                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  DashboardRepository                │
│  - Database queries (TypeORM)      │
│  - Optimized with indexes          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  PostgreSQL Database                │
│  - voters table                    │
│  - Indexed queries                 │
└─────────────────────────────────────┘
```

## Request/Response Flow

### Flow 1: Get Dashboard Stats

```
Admin Client
    │
    ├─► GET /api/v1/admin/dashboard/stats
    │   Headers: { Authorization: "Bearer <jwt_token>" }
    │
    ▼
GlobalRateLimitGuard (IP-based rate limiting)
    │
    ▼
AdminAuthGuard (Validate JWT token)
    │
    ▼
AdminRolesGuard (Check role: ADMIN or SUPERADMIN)
    │
    ▼
AuditLogInterceptor (Capture request context)
    │
    ▼
AdminDashboardController.getStats()
    │
    ├─► AdminDashboardService.getStats(adminId)
    │       │
    │       ├─► DashboardRepository.getVoterStats()
    │       │       │
    │       │       ├─► SELECT COUNT(*) FROM voters WHERE deleted_at IS NULL
    │       │       ├─► SELECT COUNT(*) FROM voters WHERE has_voted = true AND deleted_at IS NULL
    │       │       ├─► SELECT COUNT(*) FROM voters WHERE has_voted = false AND deleted_at IS NULL
    │       │       │
    │       │       └─► Return { totalVoters, totalVoted, totalNotVoted }
    │       │
    │       ├─► Calculate participationRate = (totalVoted / totalVoters * 100).toFixed(2)
    │       │
    │       ├─► AuditLogService.log({
    │       │       actorId: adminId,
    │       │       actorType: ADMIN,
    │       │       action: DASHBOARD_STATS_VIEWED,
    │       │       resourceType: VOTER,
    │       │       status: SUCCESS
    │       │   })
    │       │
    │       └─► Return DashboardStats domain object
    │
    └─► Map to DashboardStatsResponseDto
    │
    ▼
Response: {
    data: {
        totalVoters: 1000,
        totalVoted: 856,
        totalNotVoted: 144,
        participationRate: "85.60"
    },
    message: "Dashboard stats retrieved successfully"
}
```

### Flow 2: Monitor Voters

```
Admin Client
    │
    ├─► GET /api/v1/admin/monitor/voters?page=1&limit=20&filter=not-voted
    │   Headers: { Authorization: "Bearer <jwt_token>" }
    │
    ▼
GlobalRateLimitGuard
    │
    ▼
AdminAuthGuard
    │
    ▼
AdminRolesGuard
    │
    ▼
AuditLogInterceptor
    │
    ▼
AdminDashboardController.monitorVoters(query)
    │
    ├─► AdminDashboardService.monitorVoters(query, adminId)
    │       │
    │       ├─► DashboardRepository.findVotersForMonitoring(query)
    │       │       │
    │       │       ├─► Build Query:
    │       │       │   SELECT v.id, v.nim, v.nama_lengkap, v.angkatan,
    │       │       │          v.email, v.has_voted, v.voted_at
    │       │       │   FROM voters v
    │       │       │   WHERE v.deleted_at IS NULL
    │       │       │   [AND v.has_voted = false]  -- if filter=not-voted
    │       │       │   ORDER BY v.nama_lengkap ASC
    │       │       │   LIMIT 20 OFFSET 0
    │       │       │
    │       │       ├─► Execute query with count
    │       │       │
    │       │       └─► Return { data: VoterMonitor[], total: number }
    │       │
    │       ├─► Calculate pagination metadata
    │       │
    │       ├─► AuditLogService.log({
    │       │       actorId: adminId,
    │       │       actorType: ADMIN,
    │       │       action: VOTER_MONITOR_ACCESSED,
    │       │       resourceType: VOTER,
    │       │       status: SUCCESS,
    │       │       details: { filter, page, limit }
    │       │   })
    │       │
    │       └─► Return domain objects
    │
    └─► Map to VoterMonitorResponseDto
    │
    ▼
Response: {
    data: [
        {
            id: "uuid",
            nim: "2110511001",
            namaLengkap: "Ahmad Rizki",
            angkatan: 2021,
            email: "ahmad.rizki@example.com",
            hasVoted: false,
            votedAt: null
        },
        ...
    ],
    meta: {
        total: 144,
        page: 1,
        limit: 20,
        totalPages: 8,
        hasPreviousPage: false,
        hasNextPage: true,
        filters: { status: "not-voted" }
    },
    message: "Voter monitoring data retrieved successfully"
}
```

## Detailed Component Design

### 1. Domain Layer

#### DashboardStats Domain

```typescript
interface DashboardStats {
  totalVoters: number;
  totalVoted: number;
  totalNotVoted: number;
  participationRate: string; // Format: "XX.XX"
}
```

#### VoterMonitor Domain

```typescript
interface VoterMonitor {
  id: string;
  nim: string;
  namaLengkap: string;
  angkatan: number;
  email: string;
  hasVoted: boolean;
  votedAt: Date | null;
}
```

### 2. DTO Layer

#### DashboardStatsResponseDto

```typescript
Properties:
- data: DashboardStatsDto
- message: string

Validation: None (response only)
```

#### VoterMonitorQueryDto

```typescript
Properties:
- page?: number (default: 1, min: 1)
- limit?: number (default: 10, min: 1, max: 100)
- filter?: 'all' | 'voted' | 'not-voted' (default: 'all')

Validation:
- @IsOptional()
- @IsInt()
- @Min(1)
- @IsEnum(['all', 'voted', 'not-voted'])
```

#### VoterMonitorResponseDto

```typescript
Properties:
- data: VoterMonitorItemDto[]
- meta: PaginationMetaDto
- message: string

Validation: None (response only)
```

### 3. Repository Layer

#### DashboardRepository Methods

**Method: getVoterStats()**

```typescript
Signature: async getVoterStats(): Promise<VoterStatsResult>

Logic:
1. Execute single query with multiple COUNTs:
   SELECT
     COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_voters,
     COUNT(*) FILTER (WHERE has_voted = true AND deleted_at IS NULL) as total_voted,
     COUNT(*) FILTER (WHERE has_voted = false AND deleted_at IS NULL) as total_not_voted
   FROM voters

2. Return { totalVoters, totalVoted, totalNotVoted }

Optimization:
- Single query instead of 3 separate queries
- Uses existing idx_voters_has_voted index
- Filter on deleted_at uses NULL check
```

**Method: findVotersForMonitoring(query)**

```typescript
Signature: async findVotersForMonitoring(
  query: VoterMonitorQueryDto
): Promise<{ data: VoterMonitor[]; total: number }>

Logic:
1. Build TypeORM QueryBuilder:
   const qb = repository.createQueryBuilder('voter')

2. Base WHERE clause:
   .where('voter.deleted_at IS NULL')

3. Apply filter:
   if (filter === 'voted'):
     .andWhere('voter.has_voted = :hasVoted', { hasVoted: true })
   else if (filter === 'not-voted'):
     .andWhere('voter.has_voted = :hasVoted', { hasVoted: false })
   // filter === 'all': no additional condition

4. Select specific columns (privacy):
   .select([
     'voter.id',
     'voter.nim',
     'voter.nama_lengkap',
     'voter.angkatan',
     'voter.email',
     'voter.has_voted',
     'voter.voted_at'
   ])
   // IMPORTANT: DO NOT select any vote or candidate data

5. Apply sort:
   .orderBy('voter.nama_lengkap', 'ASC')

6. Apply pagination:
   .skip((page - 1) * limit)
   .take(limit)

7. Execute with count:
   .getManyAndCount()

8. Map entities to domain objects

9. Return { data, total }

Optimization:
- Uses idx_voters_has_voted for filter
- Query only necessary columns
- Pagination at database level
```

### 4. Service Layer

#### AdminDashboardService Methods

**Method: getStats(adminId)**

```typescript
Signature: async getStats(adminId: string): Promise<DashboardStatsResponseDto>

Logic:
1. Call repository.getVoterStats()

2. Calculate participation rate:
   const participationRate = totalVoters > 0
     ? ((totalVoted / totalVoters) * 100).toFixed(2)
     : "0.00"

3. Create domain object:
   const stats = new DashboardStats()
   stats.totalVoters = result.totalVoters
   stats.totalVoted = result.totalVoted
   stats.totalNotVoted = result.totalNotVoted
   stats.participationRate = participationRate

4. Log audit:
   auditLogService.log({
     actorId: adminId,
     actorType: AuditActorType.ADMIN,
     action: AuditAction.DASHBOARD_STATS_VIEWED,
     resourceType: AuditResourceType.VOTER,
     resourceId: null,
     status: AuditStatus.SUCCESS,
     details: { stats }
   })

5. Return DTO:
   return {
     data: stats,
     message: i18n.t('adminDashboard.statsRetrieved')
   }

Error Handling:
- Catch database errors
- Log failed audit
- Throw InternalServerErrorException
```

**Method: monitorVoters(query, adminId)**

```typescript
Signature: async monitorVoters(
  query: VoterMonitorQueryDto,
  adminId: string
): Promise<VoterMonitorResponseDto>

Logic:
1. Set defaults:
   const page = query.page || 1
   const limit = query.limit || 10
   const filter = query.filter || 'all'

2. Call repository:
   const { data, total } = await repository.findVotersForMonitoring(query)

3. Calculate pagination meta:
   const totalPages = Math.ceil(total / limit)
   const meta = {
     total,
     page,
     limit,
     totalPages,
     hasPreviousPage: page > 1,
     hasNextPage: page < totalPages,
     filters: { status: filter }
   }

4. Map domain to DTOs:
   const dtoData = data.map(voter => ({
     id: voter.id,
     nim: voter.nim,
     namaLengkap: voter.namaLengkap,
     angkatan: voter.angkatan,
     email: voter.email,
     hasVoted: voter.hasVoted,
     votedAt: voter.votedAt
   }))

5. Log audit:
   auditLogService.log({
     actorId: adminId,
     actorType: AuditActorType.ADMIN,
     action: AuditAction.VOTER_MONITOR_ACCESSED,
     resourceType: AuditResourceType.VOTER,
     resourceId: null,
     status: AuditStatus.SUCCESS,
     details: { filter, page, limit, total }
   })

6. Return response:
   return {
     data: dtoData,
     meta,
     message: i18n.t('adminDashboard.monitorRetrieved')
   }

Error Handling:
- Catch database errors
- Log failed audit
- Throw appropriate exceptions
```

### 5. Controller Layer

#### AdminDashboardController

**Endpoint: GET /api/v1/admin/dashboard/stats**

```typescript
Method: getStats(@CurrentAdmin('id') adminId: string)

Decorators:
- @ApiTags('Admin Dashboard')
- @ApiBearerAuth()
- @UseGuards(AdminAuthGuard, AdminRolesGuard)
- @AdminRoles(AdminRole.ADMIN, AdminRole.SUPERADMIN)
- @Get('stats')
- @HttpCode(HttpStatus.OK)
- @ApiOperation({ summary: 'Get voting statistics' })
- @ApiResponse({ status: 200, type: DashboardStatsResponseDto })
- @ApiResponse({ status: 401, description: 'Unauthorized' })

Flow:
1. Guards validate authentication and authorization
2. Extract adminId from JWT token
3. Call service.getStats(adminId)
4. Return response
```

**Endpoint: GET /api/v1/admin/monitor/voters**

```typescript
Method: monitorVoters(
  @Query() query: VoterMonitorQueryDto,
  @CurrentAdmin('id') adminId: string
)

Decorators:
- @Get('voters')
- @HttpCode(HttpStatus.OK)
- @ApiOperation({ summary: 'Monitor voters with pagination' })
- @ApiResponse({ status: 200, type: VoterMonitorResponseDto })
- @ApiResponse({ status: 401, description: 'Unauthorized' })

Flow:
1. Guards validate authentication and authorization
2. Validate query parameters
3. Extract adminId from JWT token
4. Call service.monitorVoters(query, adminId)
5. Return response
```

### 6. Guards Layer

#### AdminDashboardRateLimitGuard (Optional - if specific limits needed)

```typescript
Extends: BaseRateLimitGuard

Configuration:
- ttl: 60 seconds
- limit: 100 requests

Identifier: IP address + admin ID

Note: Can use GlobalRateLimitGuard if no specific limits needed
```

### 7. Audit Actions

#### New Audit Actions to Add

```typescript
enum AuditAction {
  ...existing actions,
  DASHBOARD_STATS_VIEWED = 'dashboard_stats_viewed',
  VOTER_MONITOR_ACCESSED = 'voter_monitor_accessed'
}
```

## Security Considerations

### 1. Authentication & Authorization

- Admin JWT token required
- Role validation (ADMIN or SUPERADMIN only)
- Token expiration check

### 2. Data Privacy

- **CRITICAL**: Never expose candidate choice in monitor endpoint
- Only return voter status, not voting details
- Audit all access to monitoring data

### 3. Rate Limiting

- Apply global rate limit (100 req/min per IP)
- Consider specific limits for dashboard endpoints if needed
- Prevent abuse of statistics endpoints

### 4. Audit Logging

- Log all successful accesses
- Log query parameters for monitoring endpoint
- Track which admin accessed what data

## Performance Optimization

### 1. Database Queries

- Use single query for stats (not 3 separate queries)
- Leverage existing indexes:
  - idx_voters_has_voted for filtering
  - idx_voters_nim for sorting (if added)
- Use COUNT with FILTER for PostgreSQL efficiency

### 2. Query Optimization

- Select only required columns
- Avoid N+1 queries
- Use pagination at database level
- Consider caching stats for short duration (optional)

### 3. Caching Strategy (Future Enhancement)

```typescript
// Optional: Cache stats for 30 seconds
@Cacheable({ ttl: 30, key: 'dashboard:stats' })
async getStats() {
  // ...
}
```

## Testing Strategy

### 1. Unit Tests

- Service layer logic
- Calculation of participation rate
- Edge cases (0 voters, 100% voted, etc.)

### 2. Integration Tests

- Controller endpoints
- Authentication/authorization
- Database queries
- Audit logging

### 3. E2E Tests

- Full request/response flow
- Different filter scenarios
- Pagination
- Rate limiting

### 4. Test Cases

#### Dashboard Stats Tests

```
✓ Should return correct stats with voters
✓ Should return 0.00 participation when no voters
✓ Should calculate participation rate with 2 decimals
✓ Should exclude soft-deleted voters
✓ Should require admin authentication
✓ Should log audit on success
✓ Should log audit on failure
```

#### Voter Monitor Tests

```
✓ Should return paginated voter list
✓ Should filter by voted status
✓ Should filter by not-voted status
✓ Should return all voters with 'all' filter
✓ Should sort by nama_lengkap ASC by default
✓ Should NOT include candidate choice
✓ Should handle pagination correctly
✓ Should require admin authentication
✓ Should log audit with query params
```

## Implementation Checklist

- [ ] Create domain models (DashboardStats, VoterMonitor)
- [ ] Create DTOs (request/response)
- [ ] Create repository interface
- [ ] Implement repository (relational)
- [ ] Create service with business logic
- [ ] Create controller with guards
- [ ] Add audit action enums
- [ ] Add i18n translations
- [ ] Create module and wire dependencies
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test with Postman/Thunder Client
- [ ] Update API documentation
- [ ] Review code quality
- [ ] Security review
- [ ] Performance review

## API Documentation Examples

### GET /api/v1/admin/dashboard/stats

**Request:**

```http
GET /api/v1/admin/dashboard/stats HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "data": {
    "totalVoters": 1000,
    "totalVoted": 856,
    "totalNotVoted": 144,
    "participationRate": "85.60"
  },
  "message": "Dashboard stats retrieved successfully"
}
```

### GET /api/v1/admin/monitor/voters

**Request:**

```http
GET /api/v1/admin/monitor/voters?page=1&limit=20&filter=not-voted HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "nim": "2110511001",
      "namaLengkap": "Ahmad Rizki Maulana",
      "angkatan": 2021,
      "email": "ahmad.rizki@example.com",
      "hasVoted": false,
      "votedAt": null
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "nim": "2110511002",
      "namaLengkap": "Budi Santoso",
      "angkatan": 2021,
      "email": "budi.santoso@example.com",
      "hasVoted": false,
      "votedAt": null
    }
  ],
  "meta": {
    "total": 144,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasPreviousPage": false,
    "hasNextPage": true,
    "filters": {
      "status": "not-voted"
    }
  },
  "message": "Voter monitoring data retrieved successfully"
}
```

## Dependencies

### Existing Dependencies (No new packages needed)

- @nestjs/common
- @nestjs/core
- @nestjs/config
- @nestjs/typeorm
- @nestjs/swagger
- typeorm
- class-validator
- class-transformer
- nestjs-i18n

### Internal Modules

- AuditLogModule
- RateLimitModule (GlobalRateLimitGuard)
- AuthAdminModule (AdminAuthGuard, AdminRolesGuard)

## Conclusion

This technical plan provides a comprehensive blueprint for implementing the admin dashboard endpoints. The design follows DDD principles, maintains separation of concerns, ensures data privacy, and optimizes for performance. All code will be implemented following SOLID, DRY, KISS, and YAGNI principles while maintaining consistency with the existing codebase architecture.
