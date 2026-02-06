# Future Improvements & Technical Debt

> Last updated: 2026-02-06

---

## 1. Delete Election Config Endpoint

**Priority:** High
**Status:** Not implemented

Currently there is no API endpoint to delete an election configuration. During development/testing, election configs are deleted directly from the database, which bypasses all business logic (token invalidation, audit logging, cascade cleanup).

**What to implement:**

- `DELETE /v1/superadmin/election/config` endpoint
- Decide which statuses allow deletion (e.g., only `SCHEDULED` and `CLOSED`, not `ACTIVE`)
- Invalidate all associated unused tokens on deletion
- Optionally reset `has_voted` flags and delete vote records (useful for dev/testing)
- Log deletion in audit trail
- Consider soft-delete vs hard-delete approach

---

## 2. Timezone Consistency (PostgreSQL vs Node.js)

**Priority:** High
**Status:** Partially mitigated

The database uses `TIMESTAMP WITHOUT TIME ZONE` columns with `DEFAULT now()` (PostgreSQL server local time), while Node.js uses `new Date()` (UTC). This mismatch caused a critical bug where token `generated_at` and election `created_at` timestamps were not directly comparable.

**Current mitigation:** The invalidation logic was changed to invalidate ALL unused tokens instead of comparing timestamps. This works but masks the underlying inconsistency.

**What to improve:**

- Standardize all timestamps to UTC across the entire stack
- Option A: Set PostgreSQL timezone to UTC (`SET timezone = 'UTC'`)
- Option B: Use `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`) columns instead
- Option C: Always use `new Date()` from application code and never rely on `DEFAULT now()`
- Audit all migrations and entities for timestamp consistency
- Add a shared utility for timestamp creation to prevent future drift

---

## 3. Token Email Distribution Reliability

**Priority:** Medium
**Status:** Retry mechanism exists (3x with exponential backoff in `EmailService`), but post-failure handling can be improved

**What already works:**

- `EmailService.sendEmailWithRetry()` retries up to 3 times with exponential backoff (1s → 2s → 4s, max 10s)
- Smart retry skipping for permanent errors (invalid email, 550/551 SMTP codes)
- Each attempt is logged via audit trail

**What to improve:**

- Consider a dead-letter queue or failed-email table for emails that still fail after all 3 retries
- Add a manual "retry failed emails" admin endpoint for emails that exhausted retries
- The catch-up cron (every 5 minutes) only catches voters whose token was never created or whose `email_sent_at` is NULL — it does NOT re-attempt emails that failed after 3 retries if the token was already created but `email_sent_at` was never set (this case IS covered), however if the token was created and email sending failed at the application level before `markEmailSent` could run, the token exists with `email_sent_at = NULL` and the catch-up cron won't regenerate it since the voter already has an unused token

---

## 4. Token Resend Flow Consolidation

**Priority:** Medium
**Status:** Two separate paths exist

`admin-resend-token.service.ts` handles manual admin-initiated resends, while `token-generation-orchestrator.service.ts` handles system-initiated generation. Both generate tokens and send emails but with slightly different flows.

**What to improve:**

- Consider unifying the token generation + email send logic into a single shared method
- Ensure resend count tracking is consistent across both paths
- The orchestrator currently does NOT increment `resend_count` for catch-up generated tokens (which is correct for new tokens, but edge cases may exist)

---

## 5. Election Lifecycle State Machine

**Priority:** Medium
**Status:** Implicit transitions only

Election status transitions (`SCHEDULED → ACTIVE → CLOSED → PUBLISHED`) are handled by individual cron checks with timestamp comparisons. There is no explicit state machine or transition validation.

**What to improve:**

- Implement a proper state machine pattern for election status
- Add transition guards (e.g., cannot go from `CLOSED` back to `ACTIVE`)
- Centralize all side-effects of transitions (token generation, notifications, etc.) in one place
- Consider event sourcing for election lifecycle events

---

## 6. Full Election Reset for Development/Testing

**Priority:** Low (dev-only)
**Status:** Not implemented

When testing the full election flow repeatedly, there is no single action to reset everything.

**What to implement:**

- A dev-only endpoint or CLI command that:
  - Deletes election config
  - Invalidates all tokens
  - Resets `has_voted` on all voters
  - Deletes all votes and vote hashes
  - Clears relevant audit logs (optional)
- Guard this behind an environment check (`NODE_ENV !== 'production'`)

---

## 7. Batch Processing Improvements

**Priority:** Low
**Status:** Basic batching implemented

The orchestrator uses batch processing (50 voters per batch, 60s delay between batches) to avoid overwhelming the mail server.

**What to improve:**

- Make `BATCH_SIZE` and `BATCH_DELAY_MS` configurable via environment variables
- Add progress tracking (e.g., store batch progress in DB so it survives restarts)
- If the application restarts mid-batch, the catch-up cron handles remaining voters, but there is no visibility into partial completion
- Consider using a proper job queue (e.g., BullMQ) for large-scale deployments

---

## 8. Rate Limiting Per-Endpoint Customization

**Priority:** Low
**Status:** Global rate limiter applied

The `GlobalRateLimitGuard` applies a uniform rate limit across all endpoints.

**What to improve:**

- Add per-endpoint rate limit configuration (e.g., stricter limits on token validation/voting endpoints)
- Consider different limits for authenticated vs unauthenticated requests
- Add rate limit headers in responses (`X-RateLimit-Remaining`, etc.)

---

## 9. Audit Log Querying & Export

**Priority:** Low
**Status:** Logging works, querying is basic

**What to improve:**

- Add filtered audit log listing endpoints (by action, actor, resource, date range)
- Add pagination for audit log queries
- Add audit log export functionality (CSV/JSON) for compliance reporting
- Consider audit log retention policies for long-running deployments
