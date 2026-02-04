# Technical Plan: Superadmin Audit Logs Query & Export

## 1. Overview

Endpoint untuk superadmin query dan export audit logs dengan fitur filtering, pagination, dan export CSV.

## 2. Architecture Analysis

### 2.1 Existing Components

- **Database**: PostgreSQL dengan tabel `audit_log` (UUID primary key)
- **Audit Log Module**: DDD architecture dengan repository pattern
- **Auth**: AdminAuthGuard + AdminRolesGuard + AdminRole.SUPERADMIN
- **Rate Limiting**: BaseRateLimitGuard dengan RateLimitService

### 2.2 Database Schema

```sql
TABLE audit_log (
  id UUID PRIMARY KEY,
  actorId VARCHAR,
  actorType VARCHAR(20), -- 'VOTER', 'ADMIN', 'SUPERADMIN', 'SYSTEM'
  action VARCHAR(100),
  resourceType VARCHAR(50),
  resourceId VARCHAR,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  status VARCHAR(20), -- 'SUCCESS', 'FAILURE'
  message TEXT,
  details JSONB,
  createdAt TIMESTAMP
)

INDEXES:
- IDX_audit_log_actorId
- IDX_audit_log_actorType
- IDX_audit_log_action
- IDX_audit_log_status
- IDX_audit_log_createdAt
```

## 3. Module Structure

```
src/
  superadmin-audit-logs/
    superadmin-audit-logs.controller.ts
    superadmin-audit-logs.service.ts
    superadmin-audit-logs.module.ts
    dto/
      superadmin-audit-logs-query.dto.ts
      superadmin-audit-logs-response.dto.ts
    guards/
      superadmin-audit-logs-rate-limit.guard.ts
    services/
      csv-export.service.ts
```

## 4. Data Flow Diagram

### 4.1 Query Endpoint Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ GET /api/v1/superadmin/logs?page=1&limit=20&action=VOTE_CAST
     ▼
┌──────────────────────────────────────┐
│  SuperadminAuditLogsController       │
│  - @UseGuards(AdminAuthGuard,        │
│     AdminRolesGuard,                 │
│     SuperadminAuditLogsRateLimit)    │
│  - @AdminRoles(SUPERADMIN)           │
└────┬─────────────────────────────────┘
     │ Validate JWT & Role
     │ Check Rate Limit
     ▼
┌──────────────────────────────────────┐
│  SuperadminAuditLogsService          │
│  - queryLogs(filters)                │
└────┬─────────────────────────────────┘
     │ Build filters
     ▼
┌──────────────────────────────────────┐
│  AuditLogService                     │
│  - findMany(filters)                 │
│  - count(filters)                    │
└────┬─────────────────────────────────┘
     │ Query database
     ▼
┌──────────────────────────────────────┐
│  AuditLogRepository                  │
│  - Apply WHERE conditions            │
│  - Apply pagination                  │
│  - ORDER BY createdAt DESC           │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  Response                            │
│  {                                   │
│    data: [...logs],                  │
│    total: 1234,                      │
│    page: 1,                          │
│    limit: 20,                        │
│    totalPages: 62                    │
│  }                                   │
└──────────────────────────────────────┘
```

### 4.2 Export CSV Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ GET /api/v1/superadmin/logs/export?dateFrom=2024-01-01
     ▼
┌──────────────────────────────────────┐
│  SuperadminAuditLogsController       │
│  - exportLogsAsCSV()                 │
└────┬─────────────────────────────────┘
     │ Validate filters
     ▼
┌──────────────────────────────────────┐
│  CsvExportService                    │
│  - generateCsv(logs)                 │
└────┬─────────────────────────────────┘
     │ Fetch all matching logs (batched)
     │ Convert to CSV format
     ▼
┌──────────────────────────────────────┐
│  Stream Response                     │
│  Content-Type: text/csv              │
│  Content-Disposition: attachment;    │
│    filename="audit-logs-{date}.csv"  │
└──────────────────────────────────────┘
```

## 5. Detailed Component Design

### 5.1 Controller: SuperadminAuditLogsController

**File**: `superadmin-audit-logs.controller.ts`

**Purpose**: Handle HTTP requests for audit logs query and export

**Endpoints**:

1. `GET /api/v1/superadmin/logs`
2. `GET /api/v1/superadmin/logs/export`

**Guards**:

- `AdminAuthGuard` - Validate JWT token
- `AdminRolesGuard` - Check AdminRole.SUPERADMIN
- `SuperadminAuditLogsRateLimitGuard` - Rate limit protection

**Methods**:

```typescript
queryLogs(
  query: SuperadminAuditLogsQueryDto,
  admin: AdminJwtPayload
): Promise<SuperadminAuditLogsResponseDto>

exportLogsAsCSV(
  query: SuperadminAuditLogsQueryDto,
  admin: AdminJwtPayload,
  res: Response
): Promise<void>
```

**Decorators**:

- `@ApiTags('Superadmin - Audit Logs')`
- `@ApiBearerAuth()`
- `@Controller('api/v1/superadmin/logs')`
- `@UseGuards(AdminAuthGuard, AdminRolesGuard, SuperadminAuditLogsRateLimitGuard)`
- `@AdminRoles(AdminRole.SUPERADMIN)`

**Audit Logging**:

- Log SUPERADMIN accessing audit logs
- Log export actions
- Include filters in audit details

### 5.2 Service: SuperadminAuditLogsService

**File**: `superadmin-audit-logs.service.ts`

**Purpose**: Business logic for querying and preparing audit logs data

**Dependencies**:

- `AuditLogService` (inject existing service)
- `AuditLogLoggerService` (for logging admin actions)

**Methods**:

```typescript
async queryLogs(
  filters: SuperadminAuditLogsQueryDto
): Promise<{
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>

Logic:
1. Extract filters from DTO
2. Call auditLogService.findMany(filters)
3. Call auditLogService.count(filters without pagination)
4. Calculate totalPages = Math.ceil(total / limit)
5. Return formatted response

async getLogsForExport(
  filters: Omit<SuperadminAuditLogsQueryDto, 'page' | 'limit'>
): Promise<AuditLog[]>

Logic:
1. Extract filters (without pagination)
2. Set high limit for export (e.g., 50000)
3. Call auditLogService.findMany() with high limit
4. Return all matching logs
5. Add warning if result count reaches limit
```

### 5.3 Service: CsvExportService

**File**: `services/csv-export.service.ts`

**Purpose**: Convert audit logs to CSV format

**Methods**:

```typescript
generateCsvContent(logs: AuditLog[]): string

Logic:
1. Define CSV headers: ['ID', 'Actor ID', 'Actor Type', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'Status', 'Message', 'Details', 'Created At']
2. Escape CSV values (handle quotes, commas, newlines)
3. Format details field (JSON.stringify())
4. Format createdAt (ISO string or custom format)
5. Join rows with newline
6. Return complete CSV string

private escapeCsvValue(value: any): string
- Handle null/undefined → empty string
- Handle objects → JSON.stringify
- Handle strings with quotes/commas → wrap in quotes and escape
- Handle dates → format to ISO string
```

### 5.4 DTO: SuperadminAuditLogsQueryDto

**File**: `dto/superadmin-audit-logs-query.dto.ts`

**Purpose**: Validate and type query parameters

**Fields**:

```typescript
@IsOptional()
@IsInt()
@Min(1)
@Type(() => Number)
page?: number = 1;

@IsOptional()
@IsInt()
@Min(1)
@Max(100)
@Type(() => Number)
limit?: number = 20;

@IsOptional()
@Type(() => Date)
dateFrom?: Date;

@IsOptional()
@Type(() => Date)
dateTo?: Date;

@IsOptional()
@IsEnum(AuditAction)
action?: AuditAction;

@IsOptional()
@IsEnum(AuditActorType)
actorType?: AuditActorType;

@IsOptional()
@IsString()
ip?: string;

@IsOptional()
@IsString()
search?: string; // for actorId search
```

**Mapping to AuditLogQueryDto**:

```typescript
toAuditLogQueryDto(): AuditLogQueryDto {
  return {
    page: this.page,
    limit: this.limit,
    createdFrom: this.dateFrom,
    createdTo: this.dateTo,
    action: this.action,
    actorType: this.actorType,
    ipAddress: this.ip,
    actorId: this.search,
  };
}
```

### 5.5 DTO: SuperadminAuditLogsResponseDto

**File**: `dto/superadmin-audit-logs-response.dto.ts`

**Purpose**: Type response structure

**Fields**:

```typescript
@ApiProperty({ type: [AuditLog] })
data: AuditLog[];

@ApiProperty({ example: 1234 })
total: number;

@ApiProperty({ example: 1 })
page: number;

@ApiProperty({ example: 20 })
limit: number;

@ApiProperty({ example: 62 })
totalPages: number;
```

### 5.6 Guard: SuperadminAuditLogsRateLimitGuard

**File**: `guards/superadmin-audit-logs-rate-limit.guard.ts`

**Purpose**: Rate limiting for audit logs endpoints

**Configuration**:

- TTL: 60 seconds
- Limit: 30 requests per minute
- Identifier: IP + AdminId

**Implementation**:

```typescript
@Injectable()
export class SuperadminAuditLogsRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = 'superadmin-audit-logs';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityAuditLoggerService,
    configService: ConfigService<AllConfigType>,
  ) {
    super(rateLimitService, logger);

    const config = configService.get('security.rateLimit.superadminAuditLogs', {
      infer: true,
    });
    this.rateLimitConfig = new RateLimitConfig(
      config?.ttl || 60,
      config?.limit || 30,
    );
  }

  protected getIdentifier(request: Request): string {
    const ip = (request as any).realIp || request.ip || '0.0.0.0';
    const adminId = (request as any).user?.id || 'anonymous';
    return `${ip}:${adminId}`;
  }
}
```

## 6. Module Registration

**File**: `superadmin-audit-logs.module.ts`

```typescript
@Module({
  imports: [
    AuditLogModule, // Import existing audit-log module
    SecurityModule, // For rate limiting
    AuthAdminModule, // For guards
  ],
  controllers: [SuperadminAuditLogsController],
  providers: [
    SuperadminAuditLogsService,
    CsvExportService,
    SuperadminAuditLogsRateLimitGuard,
  ],
  exports: [], // No exports needed
})
export class SuperadminAuditLogsModule {}
```

**Register in app.module.ts**:

```typescript
imports: [
  // ...existing imports
  SuperadminAuditLogsModule,
];
```

## 7. API Specifications

### 7.1 Query Endpoint

**Method**: `GET`
**Path**: `/api/v1/superadmin/logs`
**Auth**: Bearer token (SUPERADMIN only)

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|------------|--------|----------|---------|----------------------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page (max 100) |
| dateFrom | Date | No | - | Filter from date |
| dateTo | Date | No | - | Filter to date |
| action | enum | No | - | Filter by AuditAction |
| actorType | enum | No | - | Filter by AuditActorType |
| ip | string | No | - | Filter by IP address |
| search | string | No | - | Search by actorId |

**Success Response** (200):

```json
{
  "data": [
    {
      "id": "uuid",
      "actorId": "admin-uuid",
      "actorType": "SUPERADMIN",
      "action": "VOTE_CAST",
      "resourceType": "VOTE",
      "resourceId": "vote-uuid",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "status": "SUCCESS",
      "message": "Vote cast successfully",
      "details": { "candidateId": "candidate-uuid" },
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1234,
  "page": 1,
  "limit": 20,
  "totalPages": 62
}
```

**Error Responses**:

- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (not SUPERADMIN)
- 429: Too Many Requests (rate limit exceeded)
- 400: Bad Request (invalid query params)

### 7.2 Export CSV Endpoint

**Method**: `GET`
**Path**: `/api/v1/superadmin/logs/export`
**Auth**: Bearer token (SUPERADMIN only)

**Query Parameters**: Same as query endpoint (except page, limit)

**Success Response** (200):

- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="audit-logs-{timestamp}.csv"`
- Body: CSV file content

**CSV Format**:

```csv
ID,Actor ID,Actor Type,Action,Resource Type,Resource ID,IP Address,User Agent,Status,Message,Details,Created At
uuid1,admin-uuid,SUPERADMIN,VOTE_CAST,VOTE,vote-uuid,192.168.1.1,"Mozilla/5.0...",SUCCESS,"Vote cast","{""candidateId"":""candidate-uuid""}",2024-01-01T12:00:00Z
```

**Error Responses**:

- 401: Unauthorized
- 403: Forbidden
- 429: Too Many Requests
- 400: Bad Request

## 8. Security Considerations

### 8.1 Authentication & Authorization

- ✅ JWT-based authentication via AdminAuthGuard
- ✅ Role-based access control (SUPERADMIN only)
- ✅ Token validation on every request

### 8.2 Rate Limiting

- ✅ IP + AdminId based rate limiting
- ✅ 30 requests per minute per admin
- ✅ Separate rate limit for export endpoint (lower limit)

### 8.3 Audit Logging

- ✅ Log all access to audit logs endpoint
- ✅ Log export actions with filters
- ✅ Include admin ID, IP, action in audit

### 8.4 Data Protection

- ✅ No sensitive data exposure in logs
- ✅ HTTPS only (enforced at infrastructure level)
- ✅ CORS configuration for admin domains only

### 8.5 Input Validation

- ✅ DTO validation with class-validator
- ✅ Sanitize CSV output (escape special characters)
- ✅ Limit export size to prevent resource exhaustion

## 9. Performance Considerations

### 9.1 Database Optimization

- ✅ Use existing indexes on createdAt, actorId, actorType, action
- ✅ Pagination to limit result set
- ✅ Count query optimization (use same WHERE conditions)

### 9.2 CSV Export Optimization

- ✅ Stream large result sets (if needed)
- ✅ Batch processing for very large exports
- ✅ Set maximum export limit (50,000 records)
- ✅ Background job for very large exports (future enhancement)

### 9.3 Caching (Future Enhancement)

- Consider caching count results for same filters
- Cache TTL: 5 minutes

## 10. Testing Strategy

### 10.1 Unit Tests

- SuperadminAuditLogsService
  - queryLogs with various filters
  - getLogsForExport
  - pagination logic
- CsvExportService
  - generateCsvContent
  - escapeCsvValue (special characters, quotes, commas)

### 10.2 Integration Tests

- Controller endpoints
  - Authentication (401 without token)
  - Authorization (403 for non-SUPERADMIN)
  - Query with filters
  - Export CSV
  - Rate limiting

### 10.3 E2E Tests

- Complete flow from request to response
- CSV download and content verification
- Rate limit enforcement

## 11. Implementation Steps

1. ✅ Create technical plan (this document)
2. Create new branch `feat/superadmin-audit-logs`
3. Install dependencies (if needed): None required, use Node.js built-in
4. Create module structure
5. Implement DTOs
6. Implement CsvExportService
7. Implement SuperadminAuditLogsService
8. Implement SuperadminAuditLogsRateLimitGuard
9. Implement SuperadminAuditLogsController
10. Register module in app.module.ts
11. Write unit tests
12. Write integration tests
13. Test manually with Swagger
14. Update API documentation

## 12. Dependencies

**Required**: None (all required packages already in package.json)

**CSV Generation**: Use Node.js built-in string manipulation (no external library needed)

**Rationale**:

- Lightweight solution
- No external dependencies
- Full control over CSV format
- Better security (no third-party vulnerabilities)

## 13. Configuration

Add to `src/config/security.config.ts`:

```typescript
rateLimit: {
  // ... existing configs
  superadminAuditLogs: {
    ttl: 60, // 60 seconds
    limit: 30, // 30 requests per minute
  },
}
```

## 14. SOLID Principles Application

### Single Responsibility Principle (SRP)

- ✅ Controller: Handle HTTP requests/responses only
- ✅ Service: Business logic and data orchestration
- ✅ CsvExportService: CSV generation only
- ✅ Repository: Data access only

### Open/Closed Principle (OCP)

- ✅ Extend BaseRateLimitGuard (not modify)
- ✅ Use existing AuditLogService (not modify)
- ✅ Add new module without modifying existing code

### Liskov Substitution Principle (LSP)

- ✅ SuperadminAuditLogsRateLimitGuard properly extends BaseRateLimitGuard
- ✅ Can be substituted with any rate limit guard

### Interface Segregation Principle (ISP)

- ✅ Use specific DTOs for superadmin queries
- ✅ Don't force unnecessary dependencies

### Dependency Inversion Principle (DIP)

- ✅ Depend on AuditLogService abstraction (not concrete implementation)
- ✅ Inject dependencies via constructor

## 15. Error Handling

### Expected Errors

- Invalid query parameters → 400 Bad Request
- Missing/invalid JWT → 401 Unauthorized
- Insufficient permissions → 403 Forbidden
- Rate limit exceeded → 429 Too Many Requests

### Unexpected Errors

- Database errors → Log error, return 500 Internal Server Error
- CSV generation errors → Log error, return 500 Internal Server Error

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid query parameters",
  "error": "Bad Request"
}
```

## 16. Future Enhancements

1. **Background Export Jobs**: For exports > 50,000 records
2. **Email Export Results**: Send CSV via email for large exports
3. **Multiple Export Formats**: JSON, Excel (XLSX)
4. **Advanced Filtering**: Full-text search, date range presets
5. **Export History**: Track previous exports
6. **Scheduled Reports**: Automated daily/weekly exports

## 17. Acceptance Criteria Checklist

- [ ] `GET /api/v1/superadmin/logs` endpoint implemented
  - [ ] Supports pagination (page, limit)
  - [ ] Supports date filters (dateFrom, dateTo)
  - [ ] Supports action filter (enum)
  - [ ] Supports actorType filter (enum)
  - [ ] Supports IP filter (string)
  - [ ] Supports search by actorId (string)
  - [ ] Returns data with pagination metadata
  - [ ] Default sort: createdAt DESC

- [ ] `GET /api/v1/superadmin/logs/export` endpoint implemented
  - [ ] Applies same filters as query endpoint
  - [ ] Returns CSV file download
  - [ ] Proper CSV headers
  - [ ] Proper CSV escaping

- [ ] Protected with SUPERADMIN role
  - [ ] AdminAuthGuard enforced
  - [ ] AdminRolesGuard enforced
  - [ ] Only SUPERADMIN can access

- [ ] Rate limiting implemented
  - [ ] Custom rate limit guard
  - [ ] IP + AdminId based identifier
  - [ ] Configurable limits

- [ ] Tests written
  - [ ] Unit tests for service
  - [ ] Unit tests for CSV export
  - [ ] Integration tests for controller

- [ ] Documentation updated
  - [ ] Swagger/OpenAPI annotations
  - [ ] README if needed
