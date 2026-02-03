# Rate Limiting & Security Middleware - Technical Plan

## 1. Overview

This document outlines the comprehensive technical implementation plan for rate limiting and security middleware across the API. The implementation follows Domain-Driven Design (DDD) principles, adheres to SOLID, DRY, KISS, and YAGNI principles, and integrates seamlessly with the existing NestJS architecture.

## 2. Architecture Analysis

### 2.1 Current System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         NestJS Core                             │
│  - CORS Enabled                                                 │
│  - Global Prefix: /api                                          │
│  - Versioning: URI-based                                        │
│  - Global Pipes: ValidationPipe                                 │
│  - Global Interceptors:                                         │
│    * ResolvePromisesInterceptor                                 │
│    * ClassSerializerInterceptor                                 │
│    * AuditLogContextInterceptor (APP_INTERCEPTOR)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Module Layer                               │
│  - ConfigModule (Global)                                        │
│  - AuditLogModule (Global)                                      │
│  - AuthModule                                                   │
│  - UsersModule                                                  │
│  - SessionModule                                                │
│  - etc.                                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   Controller Layer                              │
│  - @Controller decorators                                       │
│  - @UseGuards(AuthGuard, RolesGuard)                            │
│  - Route handlers                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Service Layer                                │
│  - Business logic                                               │
│  - Domain operations                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│               Infrastructure Layer                              │
│  - Database (TypeORM/Mongoose)                                  │
│  - External services                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Proposed Enhanced Architecture with Security Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                          │
│                  (IP: x.x.x.x, Behind Proxy)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    SECURITY LAYER (NEW)                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1. IP Extraction Middleware                               │ │
│  │    - Extract real IP from X-Forwarded-For                │ │
│  │    - Handle proxy headers                                 │ │
│  │    - Attach to request.realIp                             │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                     │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │ 2. Helmet Middleware                                      │ │
│  │    - Security headers (CSP, HSTS, etc.)                   │ │
│  │    - XSS Protection                                       │ │
│  │    - Clickjacking protection                              │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                     │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │ 3. CSRF Protection Middleware                             │ │
│  │    - Token generation & validation                        │ │
│  │    - Cookie-based double submit                           │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                     │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │ 4. Global Rate Limiter Guard                              │ │
│  │    - 100 requests/minute per IP                           │ │
│  │    - In-memory store                                      │ │
│  │    - 429 with Retry-After header                          │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         NestJS Core                             │
│  (Existing interceptors & pipes)                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Controller Layer                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Endpoint-Specific Rate Limiters:                          │ │
│  │ - @UseGuards(LoginRateLimitGuard)                         │ │
│  │   * 5 attempts/10 min per IP                              │ │
│  │ - @UseGuards(TokenVerificationRateLimitGuard)             │ │
│  │   * 3 attempts/5 min per session/IP                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    (Existing layers)
```

## 3. Detailed Component Design

### 3.1 Rate Limiting Architecture

#### 3.1.1 Data Structure for In-Memory Store

```typescript
// Rate limit entry structure
interface RateLimitEntry {
  count: number;           // Number of requests
  resetTime: number;       // Unix timestamp when counter resets
  firstRequestTime: number; // Unix timestamp of first request in window
}

// Storage structure
interface RateLimitStore {
  [key: string]: RateLimitEntry; // key format: "identifier:endpoint"
}

// Example:
// {
//   "192.168.1.1:global": { count: 45, resetTime: 1738598400000, firstRequestTime: 1738598340000 },
//   "192.168.1.1:/api/v1/auth/email/login": { count: 2, resetTime: 1738598400000, firstRequestTime: 1738598340000 },
//   "session123:/api/v1/auth/refresh": { count: 1, resetTime: 1738598100000, firstRequestTime: 1738598070000 }
// }
```

#### 3.1.2 Rate Limiting Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Incoming Request                             │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                ┌───────────▼────────────┐
                │ Extract Identifier     │
                │ (IP or Session)        │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │ Build Key:             │
                │ identifier:endpoint    │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │ Check if key exists    │
                │ in store               │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │ Key exists in store?   │
                └─────┬─────────────┬────┘
                      │ No          │ Yes
          ┌───────────▼──┐      ┌───▼────────────────┐
          │ Create new   │      │ Check if window    │
          │ entry with   │      │ expired?           │
          │ count = 1    │      └───┬────────────┬───┘
          └───────┬──────┘          │ Yes        │ No
                  │            ┌────▼─────┐  ┌───▼────────────┐
                  │            │ Reset    │  │ Increment      │
                  │            │ entry    │  │ count          │
                  │            │ count=1  │  └───┬────────────┘
                  │            └────┬─────┘      │
                  └─────────────────┴────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │ Check if count >       │
                        │ limit?                 │
                        └───┬────────────────┬───┘
                            │ Yes            │ No
                ┌───────────▼──────┐    ┌────▼─────────────┐
                │ Calculate        │    │ Save entry       │
                │ Retry-After time │    │ Allow request    │
                └───────┬──────────┘    └────┬─────────────┘
                        │                    │
                ┌───────▼──────────┐         │
                │ Throw 429        │         │
                │ HttpException    │         │
                │ with Retry-After │         │
                └──────────────────┘         │
                                            │
                                ┌───────────▼────────────┐
                                │ Log rate limit event   │
                                │ (winston)              │
                                └───────────┬────────────┘
                                            │
                                ┌───────────▼────────────┐
                                │ Proceed to next        │
                                │ middleware/handler     │
                                └────────────────────────┘
```

### 3.2 Module Structure (DDD)

```
src/
└── security/
    ├── security.module.ts                      # Main module
    │
    ├── config/
    │   ├── security.config.ts                  # Configuration loader
    │   └── security-config.type.ts             # Config type definitions
    │
    ├── rate-limit/
    │   ├── domain/
    │   │   ├── rate-limit-config.ts            # Domain entity for config
    │   │   └── rate-limit-entry.ts             # Domain entity for entry
    │   │
    │   ├── infrastructure/
    │   │   ├── storage/
    │   │   │   ├── rate-limit-storage.interface.ts
    │   │   │   └── in-memory-rate-limit-storage.service.ts
    │   │   │
    │   │   └── persistence/
    │   │       └── rate-limit-storage.provider.ts
    │   │
    │   ├── guards/
    │   │   ├── base-rate-limit.guard.ts        # Abstract base guard
    │   │   ├── global-rate-limit.guard.ts      # 100 req/min per IP
    │   │   ├── login-rate-limit.guard.ts       # 5 attempts/10 min
    │   │   └── token-verify-rate-limit.guard.ts # 3 attempts/5 min
    │   │
    │   ├── services/
    │   │   └── rate-limit.service.ts           # Core business logic
    │   │
    │   ├── dto/
    │   │   └── rate-limit-exceeded.dto.ts      # Response DTO
    │   │
    │   └── rate-limit.module.ts
    │
    ├── helmet/
    │   ├── config/
    │   │   └── helmet-options.config.ts        # Helmet configuration
    │   │
    │   └── helmet.module.ts
    │
    ├── csrf/
    │   ├── guards/
    │   │   └── csrf.guard.ts                   # CSRF validation guard
    │   │
    │   ├── services/
    │   │   └── csrf.service.ts                 # Token generation/validation
    │   │
    │   ├── dto/
    │   │   └── csrf-token.dto.ts
    │   │
    │   └── csrf.module.ts
    │
    ├── middleware/
    │   ├── ip-extractor.middleware.ts          # Extract real IP
    │   └── security-headers.middleware.ts      # Additional headers
    │
    └── utils/
        ├── ip-extractor.util.ts                # IP extraction logic
        └── security-logger.service.ts          # Winston logger wrapper
```

## 4. Detailed Component Specifications

### 4.1 Configuration Module

#### 4.1.1 SecurityConfig Type Definition

```typescript
// src/security/config/security-config.type.ts

export type SecurityConfig = {
  rateLimit: {
    global: {
      ttl: number;          // Time window in seconds (60)
      limit: number;        // Max requests per window (100)
    };
    login: {
      ttl: number;          // Time window in seconds (600)
      limit: number;        // Max attempts per window (5)
    };
    tokenVerify: {
      ttl: number;          // Time window in seconds (300)
      limit: number;        // Max attempts per window (3)
    };
    storage: {
      cleanupInterval: number;  // Cleanup interval in ms (60000)
    };
  };
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean | object;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean | object;
    hidePoweredBy: boolean;
    hsts: boolean | object;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean | object;
    xssFilter: boolean;
  };
  csrf: {
    enabled: boolean;
    cookieName: string;
    headerName: string;
    secret: string;
    ttl: number;              // Token TTL in seconds
  };
  ipExtraction: {
    trustProxy: boolean;
    proxyHeaders: string[];   // ['x-forwarded-for', 'x-real-ip']
  };
};
```

#### 4.1.2 Configuration Loader

```typescript
// src/security/config/security.config.ts

Method: registerAs<SecurityConfig>('security', () => SecurityConfig)

Input: process.env variables
  - SECURITY_RATE_LIMIT_GLOBAL_TTL
  - SECURITY_RATE_LIMIT_GLOBAL_LIMIT
  - SECURITY_RATE_LIMIT_LOGIN_TTL
  - SECURITY_RATE_LIMIT_LOGIN_LIMIT
  - SECURITY_RATE_LIMIT_TOKEN_VERIFY_TTL
  - SECURITY_RATE_LIMIT_TOKEN_VERIFY_LIMIT
  - SECURITY_HELMET_ENABLED
  - SECURITY_CSRF_ENABLED
  - SECURITY_CSRF_SECRET
  - SECURITY_IP_TRUST_PROXY

Output: SecurityConfig object with defaults

Logic:
  1. Validate environment variables using class-validator
  2. Apply default values if not provided
  3. Return typed configuration object
```

### 4.2 IP Extraction Middleware

#### 4.2.1 IP Extractor Utility

```typescript
// src/security/utils/ip-extractor.util.ts

Class: IpExtractorUtil

Method: extractRealIp(request: Request, config: IpExtractionConfig): string

Input:
  - request: Express Request object
  - config: { trustProxy: boolean, proxyHeaders: string[] }

Output: string (IP address)

Logic:
  1. IF trustProxy is false:
     - Return request.ip or request.connection.remoteAddress
  
  2. IF trustProxy is true:
     - FOR EACH header in proxyHeaders:
       - Check if request.headers[header] exists
       - IF exists:
         - Parse header value (comma-separated for x-forwarded-for)
         - Extract first valid IP address
         - Validate IP format (IPv4 or IPv6)
         - IF valid: Return IP
     
  3. Fallback: Return request.ip or '0.0.0.0'

Edge Cases:
  - Multiple IPs in X-Forwarded-For (take first)
  - Invalid IP format (fallback to request.ip)
  - Missing headers (fallback to connection IP)
  - IPv6 addresses (handle correctly)
```

#### 4.2.2 IP Extractor Middleware

```typescript
// src/security/middleware/ip-extractor.middleware.ts

Class: IpExtractorMiddleware implements NestMiddleware

Dependencies:
  - ConfigService
  - SecurityLoggerService

Method: use(req: Request, res: Response, next: NextFunction): void

Input: Express request, response, next function

Output: void (modifies request object)

Logic:
  1. Load IP extraction config from ConfigService
  2. Extract real IP using IpExtractorUtil
  3. Attach IP to request object: req.realIp = extractedIp
  4. Log IP extraction event (debug level)
  5. Call next() to proceed

Side Effects:
  - Modifies request object
  - Logs to winston
```

### 4.3 Rate Limiting Components

#### 4.3.1 Domain Entities

```typescript
// src/security/rate-limit/domain/rate-limit-entry.ts

Class: RateLimitEntry

Properties:
  - count: number
  - resetTime: number (Unix timestamp in ms)
  - firstRequestTime: number (Unix timestamp in ms)

Methods:
  - constructor(ttl: number)
  - increment(): void
  - isExpired(): boolean
  - reset(ttl: number): void
  - getRemainingTime(): number
  - toJSON(): object

Logic for isExpired():
  Input: none (uses current time)
  Output: boolean
  
  1. Get current timestamp: now = Date.now()
  2. Compare: now > this.resetTime
  3. Return boolean result

Logic for getRemainingTime():
  Input: none
  Output: number (seconds until reset)
  
  1. Get current timestamp: now = Date.now()
  2. Calculate: remainingMs = this.resetTime - now
  3. IF remainingMs <= 0: Return 0
  4. ELSE: Return Math.ceil(remainingMs / 1000)
```

```typescript
// src/security/rate-limit/domain/rate-limit-config.ts

Class: RateLimitConfig

Properties:
  - ttl: number (seconds)
  - limit: number (max requests)

Methods:
  - constructor(ttl: number, limit: number)
  - validate(): boolean
  - getTtlMs(): number
```

#### 4.3.2 Storage Interface & Implementation

```typescript
// src/security/rate-limit/infrastructure/storage/rate-limit-storage.interface.ts

Interface: IRateLimitStorage

Methods:
  - get(key: string): Promise<RateLimitEntry | null>
  - set(key: string, entry: RateLimitEntry): Promise<void>
  - delete(key: string): Promise<void>
  - clear(): Promise<void>
  - cleanup(): Promise<number> // Returns number of deleted entries
```

```typescript
// src/security/rate-limit/infrastructure/storage/in-memory-rate-limit-storage.service.ts

Class: InMemoryRateLimitStorageService implements IRateLimitStorage

Properties:
  - private store: Map<string, RateLimitEntry>
  - private cleanupIntervalId: NodeJS.Timer | null
  - private readonly logger: SecurityLoggerService

Dependencies:
  - SecurityLoggerService
  - ConfigService (for cleanup interval)

Methods:

1. onModuleInit(): void
   Logic:
     1. Get cleanup interval from config (default: 60000ms)
     2. Start periodic cleanup: setInterval(this.cleanup, interval)
     3. Log initialization

2. onModuleDestroy(): void
   Logic:
     1. IF cleanupIntervalId exists:
        - clearInterval(cleanupIntervalId)
     2. Clear store: this.store.clear()
     3. Log destruction

3. async get(key: string): Promise<RateLimitEntry | null>
   Input: key (string)
   Output: RateLimitEntry or null
   
   Logic:
     1. Check if key exists in store
     2. IF exists:
        - Get entry
        - Check if expired using entry.isExpired()
        - IF expired:
          - Delete entry from store
          - Return null
        - ELSE:
          - Return entry
     3. ELSE: Return null

4. async set(key: string, entry: RateLimitEntry): Promise<void>
   Input: key (string), entry (RateLimitEntry)
   Output: void
   
   Logic:
     1. Store entry: this.store.set(key, entry)
     2. Log storage event (debug level)

5. async delete(key: string): Promise<void>
   Input: key (string)
   Output: void
   
   Logic:
     1. Delete from store: this.store.delete(key)

6. async clear(): Promise<void>
   Logic:
     1. Clear all entries: this.store.clear()
     2. Log clear event

7. async cleanup(): Promise<number>
   Output: number (count of deleted entries)
   
   Logic:
     1. Initialize counter: deletedCount = 0
     2. Get current time: now = Date.now()
     3. FOR EACH [key, entry] in this.store:
        - IF entry.resetTime < now:
          - Delete entry
          - Increment deletedCount
     4. IF deletedCount > 0:
        - Log cleanup event with count
     5. Return deletedCount
```

#### 4.3.3 Rate Limit Service

```typescript
// src/security/rate-limit/services/rate-limit.service.ts

Class: RateLimitService

Dependencies:
  - IRateLimitStorage (via DI)
  - SecurityLoggerService

Methods:

1. async checkLimit(
     identifier: string,
     endpoint: string,
     config: RateLimitConfig
   ): Promise<{ allowed: boolean; retryAfter?: number }>

   Input:
     - identifier: string (IP or session ID)
     - endpoint: string (route path)
     - config: RateLimitConfig

   Output: 
     {
       allowed: boolean,
       retryAfter?: number (seconds)
     }

   Logic:
     1. Build key: `${identifier}:${endpoint}`
     
     2. Get entry from storage: entry = await storage.get(key)
     
     3. IF entry is null:
        - Create new entry: entry = new RateLimitEntry(config.ttl)
        - entry.count = 1
        - await storage.set(key, entry)
        - Log event (debug): "New rate limit entry created"
        - Return { allowed: true }
     
     4. IF entry exists:
        - Check if expired: isExpired = entry.isExpired()
        
        a. IF expired:
           - Reset entry: entry.reset(config.ttl)
           - entry.count = 1
           - await storage.set(key, entry)
           - Log event (debug): "Rate limit window reset"
           - Return { allowed: true }
        
        b. IF not expired:
           - Increment count: entry.increment()
           - await storage.set(key, entry)
           
           - Check limit: IF entry.count > config.limit:
             - Calculate retry after: retryAfter = entry.getRemainingTime()
             - Log event (warn): "Rate limit exceeded"
             - Return { allowed: false, retryAfter }
           
           - ELSE:
             - Log event (debug): "Request counted"
             - Return { allowed: true }

2. async resetLimit(identifier: string, endpoint: string): Promise<void>
   
   Input:
     - identifier: string
     - endpoint: string
   
   Output: void
   
   Logic:
     1. Build key: `${identifier}:${endpoint}`
     2. await storage.delete(key)
     3. Log event (info): "Rate limit reset for key"

3. async getStats(identifier: string, endpoint: string): Promise<RateLimitStats>
   
   Input:
     - identifier: string
     - endpoint: string
   
   Output: RateLimitStats {
     count: number,
     limit: number,
     resetTime: number,
     remaining: number
   }
   
   Logic:
     1. Build key: `${identifier}:${endpoint}`
     2. Get entry from storage
     3. IF entry exists and not expired:
        - Return stats from entry
     4. ELSE:
        - Return empty stats (count: 0, etc.)
```

#### 4.3.4 Base Rate Limit Guard

```typescript
// src/security/rate-limit/guards/base-rate-limit.guard.ts

Abstract Class: BaseRateLimitGuard implements CanActivate

Dependencies:
  - RateLimitService
  - ConfigService
  - SecurityLoggerService

Abstract Properties:
  - protected abstract rateLimitConfig: RateLimitConfig
  - protected abstract endpointIdentifier: string

Abstract Methods:
  - protected abstract getIdentifier(request: Request): string

Concrete Methods:

1. async canActivate(context: ExecutionContext): Promise<boolean>

   Input: ExecutionContext
   Output: boolean (true = allow, exception = block)

   Logic:
     1. Extract request: request = context.switchToHttp().getRequest()
     
     2. Get identifier: identifier = this.getIdentifier(request)
        - This calls abstract method (IP or session)
     
     3. Get endpoint: endpoint = this.getEndpoint(request)
        - OR use this.endpointIdentifier
     
     4. Check rate limit:
        result = await rateLimitService.checkLimit(
          identifier,
          endpoint,
          this.rateLimitConfig
        )
     
     5. IF result.allowed:
        - Return true
     
     6. ELSE (rate limit exceeded):
        - Log warning with details
        - Throw HttpException:
          - Status: 429 (TOO_MANY_REQUESTS)
          - Message: "Rate limit exceeded. Please try again later."
          - Headers: { 'Retry-After': result.retryAfter }
   
   Error Handling:
     - Catch any storage errors
     - Log error
     - Allow request (fail open) to prevent service disruption

2. protected getEndpoint(request: Request): string
   
   Logic:
     1. Get route: request.route?.path
     2. Get method: request.method
     3. Return: `${method}:${route}`
```

#### 4.3.5 Specific Rate Limit Guards

```typescript
// src/security/rate-limit/guards/global-rate-limit.guard.ts

Class: GlobalRateLimitGuard extends BaseRateLimitGuard

Properties:
  - protected rateLimitConfig: RateLimitConfig
    - Initialized from ConfigService (global config)
    - ttl: 60 seconds
    - limit: 100 requests
  
  - protected endpointIdentifier: string = 'global'

Methods:

1. protected getIdentifier(request: Request): string
   
   Input: Request
   Output: string (IP address)
   
   Logic:
     1. Return request.realIp || request.ip || '0.0.0.0'
```

```typescript
// src/security/rate-limit/guards/login-rate-limit.guard.ts

Class: LoginRateLimitGuard extends BaseRateLimitGuard

Properties:
  - protected rateLimitConfig: RateLimitConfig
    - ttl: 600 seconds (10 minutes)
    - limit: 5 attempts
  
  - protected endpointIdentifier: string = '/api/v1/auth/email/login'

Methods:

1. protected getIdentifier(request: Request): string
   
   Input: Request
   Output: string (IP address)
   
   Logic:
     1. Return request.realIp || request.ip || '0.0.0.0'
     
Note: Uses IP only, not session, for login attempts
```

```typescript
// src/security/rate-limit/guards/token-verify-rate-limit.guard.ts

Class: TokenVerificationRateLimitGuard extends BaseRateLimitGuard

Properties:
  - protected rateLimitConfig: RateLimitConfig
    - ttl: 300 seconds (5 minutes)
    - limit: 3 attempts
  
  - protected endpointIdentifier: string = '/api/v1/auth/refresh'

Methods:

1. protected getIdentifier(request: Request): string
   
   Input: Request
   Output: string (session ID or IP)
   
   Logic:
     1. Try to get session ID from request:
        - Check request.user?.sessionId
        - Check request.session?.id
        - Check request.headers['x-session-id']
     
     2. IF session ID found:
        - Return `session:${sessionId}`
     
     3. ELSE (fallback to IP):
        - Return `ip:${request.realIp || request.ip || '0.0.0.0'}`
     
   Reason: Prefer session ID to track authenticated users,
           fallback to IP for unauthenticated requests
```

### 4.4 Helmet Integration

```typescript
// src/security/helmet/config/helmet-options.config.ts

Class: HelmetOptionsFactory

Dependencies:
  - ConfigService

Method: createHelmetOptions(): HelmetOptions

Output: HelmetOptions object

Logic:
  1. Load config: securityConfig = configService.get('security.helmet')
  
  2. IF !securityConfig.enabled:
     - Return null
  
  3. Build options object:
     {
       contentSecurityPolicy: {
         directives: {
           defaultSrc: ["'self'"],
           styleSrc: ["'self'", "'unsafe-inline'"],
           scriptSrc: ["'self'"],
           imgSrc: ["'self'", "data:", "https:"],
         },
       },
       crossOriginEmbedderPolicy: true,
       crossOriginOpenerPolicy: true,
       crossOriginResourcePolicy: { policy: "cross-origin" },
       dnsPrefetchControl: { allow: false },
       frameguard: { action: "deny" },
       hidePoweredBy: true,
       hsts: {
         maxAge: 31536000, // 1 year
         includeSubDomains: true,
         preload: true,
       },
       ieNoOpen: true,
       noSniff: true,
       originAgentCluster: true,
       permittedCrossDomainPolicies: { permittedPolicies: "none" },
       referrerPolicy: { policy: "strict-origin-when-cross-origin" },
       xssFilter: true,
     }
  
  4. Merge with user overrides from config
  5. Return options

Note: Applied in main.ts using app.use(helmet(options))
```

### 4.5 CSRF Protection

#### 4.5.1 CSRF Service

```typescript
// src/security/csrf/services/csrf.service.ts

Class: CsrfService

Dependencies:
  - ConfigService
  - SecurityLoggerService

Private Properties:
  - private readonly secret: string
  - private readonly ttl: number

Methods:

1. generateToken(sessionId: string): string
   
   Input: sessionId (string)
   Output: token (string)
   
   Logic:
     1. Create payload:
        {
          sessionId: sessionId,
          timestamp: Date.now(),
          random: crypto.randomBytes(16).toString('hex')
        }
     
     2. Create signature:
        - Stringify payload
        - Sign using HMAC-SHA256 with secret
        - signature = crypto.createHmac('sha256', secret)
                           .update(payloadString)
                           .digest('hex')
     
     3. Combine:
        - Encode payload: base64(JSON.stringify(payload))
        - token = `${encodedPayload}.${signature}`
     
     4. Return token

2. validateToken(token: string, sessionId: string): boolean
   
   Input:
     - token: string
     - sessionId: string
   
   Output: boolean (valid or not)
   
   Logic:
     1. Try to parse token:
        - Split by '.': [encodedPayload, signature]
        - IF split fails: Return false
     
     2. Decode payload:
        - Decode base64
        - Parse JSON
        - IF parsing fails: Return false
     
     3. Validate session ID:
        - IF payload.sessionId !== sessionId:
          - Log warning
          - Return false
     
     4. Validate timestamp (TTL):
        - currentTime = Date.now()
        - tokenAge = currentTime - payload.timestamp
        - IF tokenAge > (this.ttl * 1000):
          - Log warning: "Token expired"
          - Return false
     
     5. Validate signature:
        - Recreate signature from payload
        - Compare with provided signature
        - IF signatures don't match:
          - Log warning: "Invalid signature"
          - Return false
     
     6. All checks passed:
        - Return true
   
   Error Handling:
     - Catch any errors
     - Log error
     - Return false (fail secure)

3. clearToken(response: Response): void
   
   Input: Response object
   Output: void
   
   Logic:
     1. Clear cookie:
        response.clearCookie(cookieName, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict'
        })
```

#### 4.5.2 CSRF Guard

```typescript
// src/security/csrf/guards/csrf.guard.ts

Class: CsrfGuard implements CanActivate

Dependencies:
  - CsrfService
  - ConfigService
  - SecurityLoggerService

Private Properties:
  - private readonly enabled: boolean
  - private readonly cookieName: string
  - private readonly headerName: string

Methods:

1. async canActivate(context: ExecutionContext): Promise<boolean>
   
   Input: ExecutionContext
   Output: boolean
   
   Logic:
     1. IF !this.enabled:
        - Return true (CSRF protection disabled)
     
     2. Extract request & response:
        - request = context.switchToHttp().getRequest()
        - response = context.switchToHttp().getResponse()
     
     3. Check method:
        - IF method is GET, HEAD, OPTIONS:
          - Generate and set token (safe methods)
          - Return true
     
     4. For POST, PUT, PATCH, DELETE:
        
        a. Get session ID:
           - sessionId = request.session?.id || request.user?.sessionId
           - IF no session ID:
             - Log error
             - Throw UnauthorizedException
        
        b. Get token from request:
           - token = request.headers[headerName] || request.body._csrf
           - IF no token:
             - Log warning
             - Throw ForbiddenException: "CSRF token missing"
        
        c. Validate token:
           - isValid = csrfService.validateToken(token, sessionId)
           - IF !isValid:
             - Log warning with IP and endpoint
             - Throw ForbiddenException: "Invalid CSRF token"
        
        d. Token valid:
           - Return true
   
   Error Handling:
     - Catch unexpected errors
     - Log error
     - Throw InternalServerErrorException
```

### 4.6 Security Logger Service

```typescript
// src/security/utils/security-logger.service.ts

Class: SecurityLoggerService

Dependencies:
  - winston.Logger (created internally)
  - ConfigService

Private Properties:
  - private readonly logger: winston.Logger

Constructor Logic:
  1. Create winston logger:
     - Transports:
       * Console (if enabled)
       * DailyRotateFile for security logs
     - Format:
       * timestamp
       * JSON for file
       * Colorized for console
     - Levels: error, warn, info, debug

Methods:

1. logRateLimitExceeded(details: RateLimitLogDetails): void
   
   Input: {
     identifier: string,
     endpoint: string,
     limit: number,
     retryAfter: number,
     timestamp: Date
   }
   
   Logic:
     1. logger.warn('Rate limit exceeded', details)

2. logSecurityEvent(event: string, details: object): void
   
   Input:
     - event: string (event name)
     - details: object (additional context)
   
   Logic:
     1. logger.info(event, details)

3. logCsrfViolation(details: CsrfLogDetails): void
   
   Input: {
     sessionId: string,
     ip: string,
     endpoint: string,
     reason: string
   }
   
   Logic:
     1. logger.warn('CSRF validation failed', details)

4. Standard logging methods:
   - debug(message: string, meta?: object)
   - info(message: string, meta?: object)
   - warn(message: string, meta?: object)
   - error(message: string, meta?: object)
```

## 5. Integration Flow

### 5.1 Request Processing Flow with Security Layer

```
┌────────────────────────────────────────────────────────────────┐
│  1. HTTP Request arrives at NestJS application                 │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  2. IP Extractor Middleware                                    │
│     - Extract real IP from headers                             │
│     - request.realIp = '192.168.1.1'                           │
│     - Log: "IP extracted: 192.168.1.1"                         │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  3. Helmet Middleware                                          │
│     - Add security headers to response                         │
│     - Set CSP, HSTS, X-Frame-Options, etc.                     │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  4. Global Rate Limit Guard (APP_GUARD)                        │
│     - Check: Has IP made >100 requests in last 60s?            │
│     - Query storage: '192.168.1.1:global'                      │
│     - IF exceeded: Throw 429 with Retry-After                  │
│     - ELSE: Increment counter, proceed                         │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  5. CSRF Guard (if enabled, on state-changing methods)         │
│     - IF method in [POST, PUT, PATCH, DELETE]:                 │
│       - Validate CSRF token                                    │
│       - IF invalid: Throw 403                                  │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  6. Controller Method with Endpoint-Specific Guard             │
│     Example: POST /api/v1/auth/email/login                     │
│     - @UseGuards(LoginRateLimitGuard)                          │
│     - Check: Has IP made >5 login attempts in last 10 min?     │
│     - IF exceeded: Throw 429 with Retry-After                  │
│     - ELSE: Proceed to handler                                 │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  7. Existing Guards (AuthGuard, RolesGuard, etc.)              │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  8. Existing Interceptors                                      │
│     - AuditLogContextInterceptor                               │
│     - ResolvePromisesInterceptor                               │
│     - ClassSerializerInterceptor                               │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  9. Controller Handler Method                                  │
│     - Execute business logic                                   │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  10. Response with Security Headers                            │
│      - Status: 200 (or appropriate)                            │
│      - Headers: Helmet security headers                        │
│      - Body: Response data                                     │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Rate Limit Exceeded Flow

```
┌────────────────────────────────────────────────────────────────┐
│  Request: POST /api/v1/auth/email/login (6th attempt)          │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  LoginRateLimitGuard.canActivate()                             │
│  - identifier: '192.168.1.1'                                   │
│  - endpoint: '/api/v1/auth/email/login'                        │
│  - key: '192.168.1.1:/api/v1/auth/email/login'                 │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  RateLimitService.checkLimit()                                 │
│  - Load entry from storage                                     │
│  - Entry found: { count: 5, resetTime: 1738598400, ... }      │
│  - Entry not expired                                           │
│  - Increment count: count = 6                                  │
│  - Check: 6 > 5 (limit) → TRUE                                 │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  Calculate Retry-After                                         │
│  - currentTime = 1738598100 (example)                          │
│  - resetTime = 1738598400                                      │
│  - retryAfter = (1738598400 - 1738598100) / 1000 = 300 seconds │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  Log Event                                                     │
│  - SecurityLogger.logRateLimitExceeded({                       │
│      identifier: '192.168.1.1',                                │
│      endpoint: '/api/v1/auth/email/login',                     │
│      limit: 5,                                                 │
│      retryAfter: 300                                           │
│    })                                                          │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  Throw HttpException                                           │
│  - Status: 429 TOO_MANY_REQUESTS                               │
│  - Message: "Rate limit exceeded. Try again later."            │
│  - Headers: { 'Retry-After': '300' }                           │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  NestJS Exception Filter                                       │
│  - Format error response                                       │
│  - Set Retry-After header                                      │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│  HTTP Response                                                 │
│  Status: 429 Too Many Requests                                 │
│  Headers:                                                      │
│    - Retry-After: 300                                          │
│    - (+ all Helmet security headers)                           │
│  Body:                                                         │
│    {                                                           │
│      "statusCode": 429,                                        │
│      "message": "Rate limit exceeded. Try again later.",       │
│      "error": "Too Many Requests"                              │
│    }                                                           │
└────────────────────────────────────────────────────────────────┘
```

## 6. Configuration & Environment Variables

```env
# Rate Limiting
SECURITY_RATE_LIMIT_GLOBAL_TTL=60
SECURITY_RATE_LIMIT_GLOBAL_LIMIT=100

SECURITY_RATE_LIMIT_LOGIN_TTL=600
SECURITY_RATE_LIMIT_LOGIN_LIMIT=5

SECURITY_RATE_LIMIT_TOKEN_VERIFY_TTL=300
SECURITY_RATE_LIMIT_TOKEN_VERIFY_LIMIT=3

SECURITY_RATE_LIMIT_CLEANUP_INTERVAL=60000

# Helmet
SECURITY_HELMET_ENABLED=true

# CSRF
SECURITY_CSRF_ENABLED=true
SECURITY_CSRF_SECRET=your-secure-random-secret-here-minimum-32-chars
SECURITY_CSRF_COOKIE_NAME=csrf-token
SECURITY_CSRF_HEADER_NAME=x-csrf-token
SECURITY_CSRF_TTL=3600

# IP Extraction
SECURITY_IP_TRUST_PROXY=true
SECURITY_IP_PROXY_HEADERS=x-forwarded-for,x-real-ip
```

## 7. Module Registration

### 7.1 SecurityModule

```typescript
// src/security/security.module.ts

@Module({
  imports: [
    ConfigModule,
    RateLimitModule,
    CsrfModule,
    HelmetModule,
  ],
  providers: [
    SecurityLoggerService,
  ],
  exports: [
    SecurityLoggerService,
    RateLimitModule,
    CsrfModule,
  ],
})
export class SecurityModule {}
```

### 7.2 AppModule Integration

```typescript
// src/app.module.ts

@Module({
  imports: [
    // ... existing imports
    SecurityModule, // Add SecurityModule
  ],
  providers: [
    // ... existing providers
    {
      provide: APP_GUARD,
      useClass: GlobalRateLimitGuard, // Global rate limiter
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply IP extractor to all routes
    consumer
      .apply(IpExtractorMiddleware)
      .forRoutes('*');
  }
}
```

### 7.3 main.ts Integration

```typescript
// src/main.ts

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  
  // ... existing configuration
  
  // Add Helmet middleware
  const helmetOptionsFactory = app.get(HelmetOptionsFactory);
  const helmetOptions = helmetOptionsFactory.createHelmetOptions();
  if (helmetOptions) {
    app.use(helmet(helmetOptions));
  }
  
  // ... rest of configuration
}
```

## 8. Testing Strategy

### 8.1 Unit Tests Structure

#### Rate Limit Service Tests (30 positive, 30 negative, 30 edge cases)

**Positive Tests:**
1. Should allow request when limit not reached
2. Should increment counter on each request
3. Should return correct remaining count
4. Should reset counter after TTL expires
5. Should handle multiple identifiers independently
6. Should store entry correctly
7. Should retrieve entry correctly
8. Should calculate retry-after correctly
9. Should allow request after reset time
10. Should handle concurrent requests for different IPs
11-30. (Similar positive scenarios)

**Negative Tests:**
31. Should block request when limit exceeded
32. Should throw exception on rate limit exceeded
33. Should not increment counter when limit exceeded
34. Should maintain block until reset time
35. Should reject requests with invalid identifier
36-60. (Similar negative scenarios)

**Edge Cases:**
61. Should handle clock skew gracefully
62. Should handle storage failures (fail open)
63. Should handle very large TTL values
64. Should handle zero limit configuration
65. Should handle negative TTL values (validation)
66. Should handle empty identifier
67. Should handle very long endpoint names
68. Should handle Unicode in identifiers
69. Should handle simultaneous requests (race conditions)
70. Should handle storage corruption
71-90. (Similar edge case scenarios)

### 8.2 Integration Tests

1. Full request flow with all middleware
2. Rate limit enforcement across multiple endpoints
3. IP extraction with various proxy configurations
4. CSRF protection in complete flow
5. Helmet headers in response
6. Error handling and recovery

### 8.3 E2E Tests

1. Complete authentication flow with rate limiting
2. Token verification with rate limiting
3. Global rate limit enforcement
4. Security headers in all responses
5. CSRF protection in state-changing operations

## 9. Error Handling Strategy

```typescript
// Custom exception for rate limiting

Class: RateLimitExceededException extends HttpException

Constructor:
  - retryAfter: number
  - message?: string

Properties:
  - retryAfter: number

Methods:
  - getResponse(): RateLimitErrorResponse
    Returns:
      {
        statusCode: 429,
        message: string,
        error: 'Too Many Requests',
        retryAfter: number
      }
  
  - getHeaders(): Record<string, string>
    Returns:
      {
        'Retry-After': string (seconds)
      }

Usage in Guards:
  throw new RateLimitExceededException(retryAfter, 'Custom message');
```

## 10. Performance Considerations

### 10.1 In-Memory Storage Optimization

- Use Map for O(1) lookups
- Periodic cleanup to prevent memory leaks
- Configurable cleanup interval
- Lazy deletion on access (check expiry)

### 10.2 Guard Execution Order

1. IP Extraction (middleware) - Fastest, runs once
2. Helmet (middleware) - Fast, sets headers
3. Global Rate Limit (guard) - Medium, reads from memory
4. CSRF (guard) - Medium, validates token
5. Endpoint Rate Limit (guard) - Medium, reads from memory
6. Auth/Roles guards - Slower, may query database

### 10.3 Caching Strategy

- Rate limit entries cached in memory
- No external cache needed (in-memory sufficient)
- Periodic cleanup prevents unbounded growth

## 11. Security Best Practices

1. **Fail Open vs Fail Closed:**
   - Rate limiting: Fail open (allow on error to prevent DoS)
   - CSRF: Fail closed (block on error for security)

2. **Secrets Management:**
   - CSRF secret in environment variables
   - Never commit secrets to repository
   - Use strong random values (min 32 chars)

3. **Logging:**
   - Log all rate limit violations
   - Log CSRF violations
   - Log IP extraction events
   - Redact sensitive data

4. **Headers:**
   - Always return Retry-After on 429
   - Set all Helmet security headers
   - Add custom security headers as needed

## 12. Monitoring & Observability

### 12.1 Metrics to Track

- Rate limit hits per endpoint
- Rate limit violations per IP
- CSRF validation failures
- Average request rate per IP
- Peak request rates
- Storage size and cleanup frequency

### 12.2 Logging Structure

```typescript
// Rate limit log entry
{
  timestamp: '2026-02-03T10:30:00Z',
  level: 'warn',
  event: 'rate_limit_exceeded',
  identifier: '192.168.1.1',
  endpoint: '/api/v1/auth/email/login',
  limit: 5,
  count: 6,
  retryAfter: 300,
  userAgent: 'Mozilla/5.0...'
}

// CSRF violation log entry
{
  timestamp: '2026-02-03T10:30:00Z',
  level: 'warn',
  event: 'csrf_validation_failed',
  sessionId: 'abc123',
  ip: '192.168.1.1',
  endpoint: '/api/v1/auth/update',
  reason: 'token_expired',
  userAgent: 'Mozilla/5.0...'
}
```

## 13. Deployment Considerations

### 13.1 Environment-Specific Configuration

**Development:**
- Higher rate limits
- Verbose logging
- CSRF optional
- Trust proxy disabled

**Production:**
- Strict rate limits
- Error-level logging only
- CSRF required
- Trust proxy enabled

### 13.2 Scaling Considerations

**Current Implementation (In-Memory):**
- Works for single-instance deployments
- Sufficient for small to medium scale
- No external dependencies

**Future Scaling (Out of Scope):**
- For multi-instance: Use Redis
- Implement distributed rate limiting
- Shared storage across instances

## 14. Implementation Checklist

- [ ] Install dependencies (helmet, express-rate-limit types)
- [ ] Create security configuration module
- [ ] Implement IP extraction utility & middleware
- [ ] Implement rate limit domain entities
- [ ] Implement in-memory storage service
- [ ] Implement rate limit service
- [ ] Implement base rate limit guard
- [ ] Implement specific rate limit guards (global, login, token)
- [ ] Implement security logger service
- [ ] Implement Helmet configuration
- [ ] Implement CSRF service
- [ ] Implement CSRF guard
- [ ] Create security module
- [ ] Integrate with AppModule
- [ ] Integrate with main.ts
- [ ] Apply guards to auth controller
- [ ] Create unit tests (90 tests)
- [ ] Create integration tests
- [ ] Update documentation
- [ ] Update environment variables example
- [ ] Test in development
- [ ] Code review
- [ ] Deploy to production

## 15. Breaking Changes Analysis

### 15.1 Potential Breaking Changes

**None Expected.** All changes are additive:
- New middleware (transparent to existing code)
- New guards (opt-in via decorators)
- No changes to existing services
- No changes to database schema
- No changes to API contracts

### 15.2 Migration Path

1. Deploy configuration changes (environment variables)
2. Deploy code with feature flags (CSRF optional initially)
3. Monitor logs for issues
4. Enable CSRF in production after testing
5. Adjust rate limits based on actual traffic

## 16. Success Criteria

1. ✅ All rate limits enforced correctly
2. ✅ 429 responses include Retry-After header
3. ✅ All security headers present in responses
4. ✅ CSRF protection working for state-changing methods
5. ✅ IP extraction handles proxy correctly
6. ✅ All 90 unit tests passing
7. ✅ Integration tests passing
8. ✅ No performance degradation
9. ✅ Logs capture all security events
10. ✅ Code follows project standards

---

## Appendix A: Data Flow Diagram

```
                    ┌─────────────────┐
                    │ HTTP Request    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Express Server  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌──────▼──────┐    ┌──────▼──────┐
    │ Helmet   │      │ IP Extract  │    │ CORS        │
    │ Headers  │      │ Middleware  │    │ Enabled     │
    └────┬─────┘      └──────┬──────┘    └──────┬──────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │ NestJS Pipeline │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Global Guards   │
                    │ - GlobalRL      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Route Matched   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Endpoint Guards │
                    │ - LoginRL       │
                    │ - TokenRL       │
                    │ - CSRF          │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Auth Guards     │
                    │ - JWT           │
                    │ - Roles         │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Interceptors    │
                    │ - Audit Log     │
                    │ - Serializer    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Controller      │
                    │ Handler         │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Service Layer   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ HTTP Response   │
                    │ + Security Hdrs │
                    └─────────────────┘
```

## Appendix B: Class Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     SecurityModule                           │
├──────────────────────────────────────────────────────────────┤
│ + imports: Module[]                                          │
│ + providers: Provider[]                                      │
│ + exports: Provider[]                                        │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ contains
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        │                │                │
┌───────▼───────┐ ┌──────▼──────┐ ┌──────▼──────┐
│ RateLimitModule│ │ CsrfModule  │ │HelmetModule │
└───────┬───────┘ └──────┬──────┘ └──────┬──────┘
        │                │                │
        │                │                │
┌───────▼──────────────────────────────────────────────┐
│            RateLimitService                          │
├──────────────────────────────────────────────────────┤
│ - storage: IRateLimitStorage                         │
│ - logger: SecurityLoggerService                      │
├──────────────────────────────────────────────────────┤
│ + checkLimit(): Promise<{allowed, retryAfter}>       │
│ + resetLimit(): Promise<void>                        │
│ + getStats(): Promise<RateLimitStats>                │
└──────────────────────────────────────────────────────┘
                         │
                         │ uses
                         │
┌────────────────────────▼──────────────────────────────┐
│         InMemoryRateLimitStorageService               │
├───────────────────────────────────────────────────────┤
│ - store: Map<string, RateLimitEntry>                  │
│ - cleanupIntervalId: NodeJS.Timer                     │
├───────────────────────────────────────────────────────┤
│ + get(key): Promise<RateLimitEntry|null>              │
│ + set(key, entry): Promise<void>                      │
│ + delete(key): Promise<void>                          │
│ + cleanup(): Promise<number>                          │
│ + onModuleInit(): void                                │
│ + onModuleDestroy(): void                             │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│        BaseRateLimitGuard (abstract)                  │
├───────────────────────────────────────────────────────┤
│ # rateLimitService: RateLimitService                  │
│ # logger: SecurityLoggerService                       │
│ # abstract rateLimitConfig: RateLimitConfig           │
│ # abstract endpointIdentifier: string                 │
├───────────────────────────────────────────────────────┤
│ + canActivate(context): Promise<boolean>              │
│ # abstract getIdentifier(request): string             │
│ # getEndpoint(request): string                        │
└───────────────────────────────────────────────────────┘
                         △
                         │ extends
        ┌────────────────┼────────────────┐
        │                │                │
┌───────┴──────┐  ┌──────┴──────┐  ┌─────┴────────┐
│ GlobalRL     │  │ LoginRL     │  │ TokenVerifyRL│
│ Guard        │  │ Guard       │  │ Guard        │
└──────────────┘  └─────────────┘  └──────────────┘

┌───────────────────────────────────────────────────────┐
│                 CsrfService                           │
├───────────────────────────────────────────────────────┤
│ - secret: string                                      │
│ - ttl: number                                         │
│ - logger: SecurityLoggerService                       │
├───────────────────────────────────────────────────────┤
│ + generateToken(sessionId): string                    │
│ + validateToken(token, sessionId): boolean            │
│ + clearToken(response): void                          │
└───────────────────────────────────────────────────────┘
                         │
                         │ used by
                         │
┌────────────────────────▼──────────────────────────────┐
│                   CsrfGuard                           │
├───────────────────────────────────────────────────────┤
│ - csrfService: CsrfService                            │
│ - enabled: boolean                                    │
│ - cookieName: string                                  │
│ - headerName: string                                  │
├───────────────────────────────────────────────────────┤
│ + canActivate(context): Promise<boolean>              │
└───────────────────────────────────────────────────────┘
```

---

This technical plan provides a comprehensive blueprint for implementing rate limiting and security middleware in the NestJS application. The design follows DDD principles, maintains SOLID practices, and integrates seamlessly with the existing architecture. All function signatures, data types, and flows are detailed without actual code implementation, ready for development.
