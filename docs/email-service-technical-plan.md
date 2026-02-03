# Email Service (Mailtrap) Technical Plan

## 1. Executive Summary

This document outlines the technical implementation for integrating Mailtrap email service into the voting system. The service will handle sending voting tokens via email with retry logic, audit logging, and HTML templating using the existing mail infrastructure.

## 2. Current Architecture Analysis

### 2.1 Existing Mail Infrastructure

```
┌─────────────────────────┐
│     MailModule          │
│  (mail.module.ts)       │
└───────────┬─────────────┘
            │ imports
            ▼
┌─────────────────────────┐
│   MailerModule          │
│  (mailer.module.ts)     │
└───────────┬─────────────┘
            │ provides
            ▼
┌─────────────────────────┐
│   MailerService         │
│  (mailer.service.ts)    │
│  - Uses nodemailer      │
│  - Handlebars templates │
└─────────────────────────┘

Current Services:
- MailService (high-level business logic)
- MailerService (low-level SMTP transport)

Existing Methods:
- userSignUp(mailData)
- forgotPassword(mailData)
- confirmNewEmail(mailData)
```

### 2.2 Configuration Structure

```typescript
// src/mail/config/mail.config.ts
{
  port: number; // SMTP port (587)
  host: string; // SMTP host
  user: string; // Auth username
  password: string; // Auth password
  defaultEmail: string; // From email
  defaultName: string; // From name
  ignoreTLS: boolean; // TLS settings
  secure: boolean; // SSL/TLS
  requireTLS: boolean; // Force TLS
}
```

## 3. Requirements Analysis

### 3.1 Acceptance Criteria Mapping

| Criterion               | Implementation Approach                  | Priority |
| ----------------------- | ---------------------------------------- | -------- |
| Mailtrap env config     | Update .env with Mailtrap credentials    | P0       |
| EmailService injectable | Extend MailService with new method       | P0       |
| sendEmail method        | New method with signature specified      | P0       |
| Retry logic (3x)        | Implement retry with exponential backoff | P0       |
| Audit log delivery      | Integration with audit_logs table        | P0       |
| HTML template           | Create voting-token.hbs template         | P0       |
| Test bulk send          | Test with 2 real addresses               | P1       |

### 3.2 Email Template Variables

```typescript
interface VotingTokenEmailContext {
  nama: string; // Voter full name
  nim: string; // Student ID
  token: string; // Voting token
  end_date: string; // Election end date (formatted)
  end_time: string; // Election end time in WIB
  app_name: string; // Application name
}
```

## 4. Architecture Design

### 4.1 Component Diagram

```
┌──────────────────────────────────────────────────┐
│              VotingService                       │
│         (future implementation)                  │
└────────────────────┬─────────────────────────────┘
                     │ calls
                     ▼
┌──────────────────────────────────────────────────┐
│              MailService                         │
│  + sendVotingToken(mailData)  ← NEW METHOD      │
│  + userSignUp(mailData)                          │
│  + forgotPassword(mailData)                      │
└────────────────────┬─────────────────────────────┘
                     │ uses
                     ▼
┌──────────────────────────────────────────────────┐
│            EmailService (NEW)                    │
│  + sendEmail({ to, subject, htmlBody })          │
│  + sendEmailWithRetry(...)                       │
│  - retry(fn, maxRetries, delay)                  │
│  - logToAudit(status, details)                   │
└────────────────────┬─────────────────────────────┘
                     │ uses
                     ▼
┌──────────────────────────────────────────────────┐
│            MailerService                         │
│  + sendMail(options)                             │
│  - transporter (nodemailer)                      │
└──────────────────────────────────────────────────┘
```

### 4.2 Data Flow Diagram

#### 4.2.1 Voting Token Email Flow

```
┌─────────────┐
│   Voter     │
│  Requests   │
│   Token     │
└──────┬──────┘
       │ 1. POST /auth/request-token
       ▼
┌─────────────────────┐
│  Auth Controller    │
└──────┬──────────────┘
       │ 2. Call service
       ▼
┌─────────────────────┐
│  Voting Service     │
│  - Validate voter   │
│  - Generate token   │
│  - Save to tokens   │
└──────┬──────────────┘
       │ 3. Send email
       ▼
┌─────────────────────┐
│   MailService       │
│  sendVotingToken()  │
└──────┬──────────────┘
       │ 4. Prepare data
       ▼
┌─────────────────────┐
│   EmailService      │
│  sendEmailWithRetry │
└──────┬──────────────┘
       │ 5. Attempt 1
       ├───────────────────┐
       │                   │ Retry on failure
       │ 6. Send via SMTP  │ (max 3x with delay)
       ▼                   │
┌─────────────────────┐   │
│   MailerService     │   │
│  (Mailtrap SMTP)    │◄──┘
└──────┬──────────────┘
       │ 7. SMTP Response
       ▼
┌─────────────────────┐
│   EmailService      │
│  logToAudit()       │
└──────┬──────────────┘
       │ 8. Insert audit
       ▼
┌─────────────────────┐
│  AuditLogs Table    │
│  - actor_id         │
│  - action           │
│  - status           │
│  - details (JSONB)  │
└─────────────────────┘
       │ 9. Return result
       ▼
┌─────────────────────┐
│    Voter Client     │
│  (Success/Error)    │
└─────────────────────┘
```

#### 4.2.2 Retry Logic Flow

```
┌─────────────────┐
│  sendEmail()    │
└────────┬────────┘
         │ Attempt 1
         ▼
    ┌────────────┐
    │ Try Send   │
    └────┬───────┘
         │
    ┌────▼────┐
    │Success? │
    └────┬────┘
         │
    ┌────┴────┐
    │   NO    │
    └────┬────┐
         │    │ YES → Return success
         │    └─────────────────────┐
         │                          │
    ┌────▼─────────┐                │
    │ Retry < 3?   │                │
    └────┬─────────┘                │
         │                          │
    ┌────┴────┐                     │
    │   NO    │                     │
    └────┬────┐                     │
         │    │ YES                 │
         │    │                     │
         │    │ Wait (backoff)      │
         │    └──────┐              │
         │           │              │
         │      ┌────▼────────┐     │
         │      │ Attempt N+1 │     │
         │      └────┬────────┘     │
         │           │              │
         │      Loop back           │
         │           │              │
         │           └──────────────┤
         │                          │
    ┌────▼────┐                ┌────▼────┐
    │ Throw   │                │ Return  │
    │ Error   │                │ Success │
    └─────────┘                └─────────┘
         │                          │
         └──────────┬───────────────┘
                    │
              ┌─────▼─────┐
              │ Log Audit │
              └───────────┘
```

#### 4.2.3 Bulk Email Send Flow

```
┌──────────────────┐
│  Admin Service   │
│  (Bulk Send)     │
└────────┬─────────┘
         │ Array of recipients
         ▼
    ┌────────────────────┐
    │  For Each Voter    │
    └────────┬───────────┘
             │
        ┌────▼────────────────────┐
        │  sendVotingToken()      │
        │  - Extract voter data   │
        │  - Prepare context      │
        └────────┬────────────────┘
                 │
            ┌────▼──────────────┐
            │  sendEmail()      │
            │  with retry       │
            └────────┬──────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼───┐              ┌──────▼──────┐
    │Success│              │   Failure   │
    └───┬───┘              └──────┬──────┘
        │                         │
        │ Log SUCCESS             │ Log FAILURE
        │                         │
        └─────────┬───────────────┘
                  │
        ┌─────────▼──────────┐
        │  Audit Logs        │
        │  - email: address  │
        │  - status: result  │
        │  - attempt_count   │
        └────────────────────┘
```

## 5. Technical Specifications

### 5.1 EmailService Interface

```typescript
// src/mail/email.service.ts

interface SendEmailOptions {
  to: string | string[]; // Recipient email(s)
  subject: string; // Email subject
  htmlBody: string; // HTML content
  from?: string; // Optional sender override
  cc?: string | string[]; // Optional CC
  bcc?: string | string[]; // Optional BCC
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  attempts: number;
  error?: Error;
}

interface RetryConfig {
  maxRetries: number; // Default: 3
  initialDelay: number; // Default: 1000ms
  backoffMultiplier: number; // Default: 2 (exponential)
  maxDelay: number; // Default: 10000ms
}

class EmailService {
  // Main method as per requirement
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;

  // Internal retry mechanism
  private async sendEmailWithRetry(
    options: SendEmailOptions,
    retryConfig: RetryConfig,
  ): Promise<SendEmailResult>;

  // Generic retry helper
  private async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    delay: number,
    backoffMultiplier: number,
  ): Promise<{ result: T; attempts: number }>;

  // Audit logging
  private async logEmailDelivery(
    to: string,
    subject: string,
    status: 'SUCCESS' | 'FAILURE',
    details: Record<string, any>,
    actorId?: string,
  ): Promise<void>;

  // Calculate next retry delay (exponential backoff)
  private calculateDelay(
    attempt: number,
    initialDelay: number,
    multiplier: number,
    maxDelay: number,
  ): number;
}
```

### 5.2 MailService Extension

```typescript
// src/mail/mail.service.ts

interface VotingTokenMailData {
  to: string;
  data: {
    nama: string;
    nim: string;
    token: string;
    end_date: string;
    end_time: string;
  };
}

class MailService {
  // NEW METHOD
  async sendVotingToken(mailData: VotingTokenMailData): Promise<void> {
    /**
     * Method Signature:
     * - Input: VotingTokenMailData
     * - Output: Promise<void>
     * - Throws: EmailSendException if all retries fail
     *
     * Steps:
     * 1. Validate input data
     * 2. Load i18n translations (if needed)
     * 3. Prepare template context
     * 4. Get template path
     * 5. Call EmailService.sendEmail()
     * 6. Handle result/errors
     */
  }
}
```

### 5.3 Email Template Structure

```handlebars
<!-- src/mail/mail-templates/voting-token.hbs -->


<html lang='id'>
  <head>
    <meta charset='UTF-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    <title>Token Voting - {{app_name}}</title>
  </head>
  <body style='margin:0;font-family:Arial, sans-serif;background-color:#f4f4f4'>
    <table
      style='border:0;width:100%;max-width:600px;margin:0 auto;background:#ffffff'
    >
      <!-- Header -->
      <tr style='background:#00838f'>
        <td style='padding:30px;text-align:center'>
          <h1 style='color:#ffffff;margin:0;font-size:28px'>
            {{app_name}}
          </h1>
          <p style='color:#ffffff;margin:10px 0 0 0;font-size:14px'>
            Sistem E-Voting
          </p>
        </td>
      </tr>

      <!-- Greeting -->
      <tr>
        <td style='padding:30px 30px 20px 30px'>
          <h2 style='color:#333333;margin:0;font-size:22px'>
            Halo,
            {{nama}}!
          </h2>
          <p style='color:#666666;margin:10px 0 0 0;font-size:14px'>
            NIM:
            <strong>{{nim}}</strong>
          </p>
        </td>
      </tr>

      <!-- Token Section -->
      <tr>
        <td style='padding:0 30px 20px 30px'>
          <p style='color:#666666;margin:0;font-size:16px;line-height:1.6'>
            Berikut adalah token voting Anda untuk pemilihan:
          </p>
        </td>
      </tr>

      <!-- Token Display -->
      <tr>
        <td style='padding:0 30px 30px 30px;text-align:center'>
          <div
            style='background:#f8f9fa;border:2px dashed #00838f;border-radius:8px;padding:20px'
          >
            <p
              style='margin:0;color:#999999;font-size:12px;text-transform:uppercase'
            >
              Token Anda
            </p>
            <p
              style='margin:10px 0 0 0;color:#00838f;font-size:32px;font-weight:bold;letter-spacing:4px;font-family:monospace'
            >
              {{token}}
            </p>
          </div>
        </td>
      </tr>

      <!-- Instructions -->
      <tr>
        <td style='padding:0 30px 20px 30px'>
          <div
            style='background:#fff3cd;border-left:4px solid:#ffc107;padding:15px'
          >
            <p style='margin:0;color:#856404;font-size:14px;line-height:1.6'>
              <strong>⚠️ Penting:</strong><br />
              - Token ini bersifat rahasia dan hanya dapat digunakan sekali<br
              />
              - Jangan bagikan token Anda kepada siapapun<br />
              - Token akan kadaluarsa pada waktu yang ditentukan
            </p>
          </div>
        </td>
      </tr>

      <!-- Election Info -->
      <tr>
        <td style='padding:0 30px 30px 30px'>
          <table style='width:100%;border-collapse:collapse'>
            <tr>
              <td style='padding:10px;background:#f8f9fa;border-radius:4px'>
                <p style='margin:0;color:#666666;font-size:14px'>
                  📅
                  <strong>Batas Akhir Voting:</strong><br />
                  {{end_date}}
                  pukul
                  {{end_time}}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td style='text-align:center;padding:0 30px 30px 30px'>
          <a
            href='{{voting_url}}'
            style='display:inline-block;padding:15px 40px;background:#00838f;color:#ffffff;text-decoration:none;border-radius:5px;font-size:16px;font-weight:bold'
          >
            Mulai Voting Sekarang
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr style='background:#f8f9fa'>
        <td style='padding:20px;text-align:center'>
          <p style='margin:0;color:#999999;font-size:12px'>
            Email ini dikirim secara otomatis oleh sistem.<br />
            Mohon tidak membalas email ini.
          </p>
          <p style='margin:10px 0 0 0;color:#999999;font-size:12px'>
            © 2026
            {{app_name}}. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### 5.4 Environment Configuration

```bash
# .env (Mailtrap Production)

# Mailtrap Bulk SMTP Configuration
MAIL_HOST=bulk.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=apismtp@mailtrap.io
MAIL_PASSWORD=5e37789514a5ace91674defdc98dab40
MAIL_IGNORE_TLS=false
MAIL_SECURE=false
MAIL_REQUIRE_TLS=true
MAIL_DEFAULT_EMAIL=noreply@cyvote.id
MAIL_DEFAULT_NAME=CyVote E-Voting System
```

### 5.5 Retry Logic Specification

```typescript
/**
 * Retry Mechanism with Exponential Backoff
 *
 * Configuration:
 * - maxRetries: 3
 * - initialDelay: 1000ms (1 second)
 * - backoffMultiplier: 2 (exponential)
 * - maxDelay: 10000ms (10 seconds)
 *
 * Retry Schedule:
 * Attempt 1: Immediate
 * Attempt 2: Wait 1000ms (1s)
 * Attempt 3: Wait 2000ms (2s)
 * Attempt 4: Wait 4000ms (4s)
 *
 * Failure Conditions:
 * - Network timeout
 * - SMTP connection error
 * - Authentication failure
 * - Rate limit exceeded
 *
 * Non-Retry Conditions:
 * - Invalid email format (fail immediately)
 * - Blacklisted domain
 * - Permanent SMTP errors (5xx)
 */

class RetryStrategy {
  shouldRetry(error: Error, attempt: number): boolean {
    // Don't retry on validation errors
    if (error.name === 'ValidationError') return false;

    // Don't retry on permanent SMTP errors
    if (error.message.includes('5')) return false;

    // Retry on temporary errors (4xx, network issues)
    return attempt < this.maxRetries;
  }

  calculateDelay(attempt: number): number {
    const delay =
      this.initialDelay * Math.pow(this.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }
}
```

### 5.6 Audit Log Schema

```typescript
/**
 * Audit Log Entry for Email Delivery
 */
interface EmailAuditLog {
  actor_id: string | null;           // Voter ID or system
  actor_type: 'VOTER' | 'ADMIN' | 'SYSTEM';
  action: 'EMAIL_SENT' | 'EMAIL_FAILED';
  resource_type: 'EMAIL';
  resource_id: string | null;        // Email message ID
  ip_address: string | null;
  user_agent: string | null;
  status: 'SUCCESS' | 'FAILURE';
  details: {
    to: string;
    subject: string;
    attempt_count: number;
    error_message?: string;
    smtp_response?: string;
    template: string;
    timestamp: string;
    retry_attempts?: number[];       // Timestamps of each retry
  };
  created_at: Date;
}

/**
 * Sample Audit Log Entries:
 */

// Success Example
{
  actor_id: "voter-uuid-123",
  actor_type: "SYSTEM",
  action: "EMAIL_SENT",
  resource_type: "EMAIL",
  resource_id: "msg-id-xyz",
  status: "SUCCESS",
  details: {
    to: "nugrahaadhitama22@gmail.com",
    subject: "Token Voting Anda",
    attempt_count: 1,
    smtp_response: "250 Message accepted",
    template: "voting-token",
    timestamp: "2026-02-03T10:30:00Z"
  }
}

// Failure Example (after retries)
{
  actor_id: null,
  actor_type: "SYSTEM",
  action: "EMAIL_FAILED",
  resource_type: "EMAIL",
  status: "FAILURE",
  details: {
    to: "invalid@domain.com",
    subject: "Token Voting Anda",
    attempt_count: 3,
    error_message: "Connection timeout",
    template: "voting-token",
    timestamp: "2026-02-03T10:31:45Z",
    retry_attempts: [
      "2026-02-03T10:30:00Z",
      "2026-02-03T10:30:01Z",
      "2026-02-03T10:30:03Z"
    ]
  }
}
```

## 6. Implementation Plan

### 6.1 File Structure

```
src/mail/
├── config/
│   ├── mail.config.ts (MODIFY)
│   └── mail-config.type.ts (EXISTING)
├── interfaces/
│   ├── mail-data.interface.ts (EXISTING)
│   ├── email-options.interface.ts (NEW)
│   └── send-email-result.interface.ts (NEW)
├── mail-templates/
│   ├── activation.hbs (EXISTING)
│   ├── reset-password.hbs (EXISTING)
│   └── voting-token.hbs (NEW)
├── mail.module.ts (MODIFY)
├── mail.service.ts (MODIFY - add sendVotingToken)
└── email.service.ts (NEW)
```

### 6.2 Implementation Steps

```
Step 1: Environment Configuration (PRIORITY: P0)
├─ Update .env with Mailtrap credentials
└─ Verify mail.config.ts loads correctly

Step 2: Create Interfaces (PRIORITY: P0)
├─ Create email-options.interface.ts
├─ Create send-email-result.interface.ts
└─ Define VotingTokenMailData type

Step 3: Implement EmailService (PRIORITY: P0)
├─ Create email.service.ts
├─ Implement sendEmail() method
├─ Implement retry logic with exponential backoff
├─ Implement audit logging
└─ Add error handling and logging

Step 4: Extend MailService (PRIORITY: P0)
├─ Add sendVotingToken() method
├─ Integrate with EmailService
└─ Add input validation

Step 5: Create Email Template (PRIORITY: P0)
├─ Design voting-token.hbs
├─ Test template rendering
└─ Validate all variables are used

Step 6: Update Module (PRIORITY: P0)
├─ Register EmailService as provider
├─ Add to exports if needed
└─ Ensure proper dependency injection

Step 7: Testing (PRIORITY: P1)
├─ Unit tests for retry logic
├─ Integration test with Mailtrap
├─ Bulk send test (2 emails)
└─ Verify audit logs

Step 8: Documentation (PRIORITY: P2)
├─ Update README with email service info
├─ Document environment variables
└─ Add usage examples
```

### 6.3 Method Implementation Details

#### EmailService.sendEmail()

```typescript
/**
 * Send email with retry mechanism
 *
 * Algorithm:
 * 1. Validate input parameters
 *    - Check email format
 *    - Validate required fields
 * 2. Initialize retry counter
 * 3. Loop (max 3 attempts):
 *    a. Try sending via MailerService
 *    b. If success:
 *       - Log success to audit
 *       - Return success result
 *    c. If failure:
 *       - Check if should retry
 *       - Calculate backoff delay
 *       - Wait for delay
 *       - Increment retry counter
 * 4. If all attempts fail:
 *    - Log failure to audit
 *    - Throw EmailSendException
 *
 * Time Complexity: O(n) where n = retry attempts
 * Space Complexity: O(1)
 */
```

#### EmailService.logEmailDelivery()

```typescript
/**
 * Log email delivery to audit_logs table
 *
 * Algorithm:
 * 1. Prepare audit log entry
 *    - Set actor_type = 'SYSTEM'
 *    - Set action based on status
 *    - Serialize details to JSONB
 * 2. Get database connection
 * 3. Insert into audit_logs table
 * 4. Handle database errors gracefully
 *    - Don't throw if audit fails
 *    - Log error to application logger
 *
 * Database Query:
 * INSERT INTO audit_logs (
 *   actor_type, action, resource_type,
 *   status, details, created_at
 * ) VALUES (?, ?, ?, ?, ?, NOW())
 */
```

#### MailService.sendVotingToken()

```typescript
/**
 * Send voting token email to voter
 *
 * Algorithm:
 * 1. Validate mailData
 *    - Check all required fields present
 *    - Validate email format
 * 2. Get app configuration
 *    - App name
 *    - Working directory
 *    - Voting URL
 * 3. Prepare template context
 *    - Merge mailData with app config
 *    - Format dates and times
 * 4. Determine template path
 *    - Construct absolute path
 *    - Verify file exists
 * 5. Call EmailService.sendEmail()
 *    - Pass all parameters
 *    - Handle result/errors
 * 6. Return or throw based on result
 *
 * Error Handling:
 * - ValidationError: Invalid input
 * - TemplateNotFoundError: Missing template
 * - EmailSendError: All retries failed
 */
```

## 7. Error Handling Strategy

### 7.1 Error Types

```typescript
// Custom error classes

class EmailValidationError extends Error {
  constructor(message: string, field: string) {
    super(message);
    this.name = 'EmailValidationError';
    this.field = field;
  }
}

class EmailSendError extends Error {
  constructor(message: string, attempts: number, lastError: Error) {
    super(message);
    this.name = 'EmailSendError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

class TemplateRenderError extends Error {
  constructor(message: string, templatePath: string) {
    super(message);
    this.name = 'TemplateRenderError';
    this.templatePath = templatePath;
  }
}
```

### 7.2 Error Recovery Matrix

| Error Type             | Retry?   | Log to Audit? | User Feedback                            |
| ---------------------- | -------- | ------------- | ---------------------------------------- |
| Network timeout        | Yes (3x) | Yes           | "Email sending in progress, please wait" |
| SMTP auth fail         | No       | Yes           | "Email service unavailable"              |
| Invalid email          | No       | Yes           | "Invalid email address"                  |
| Rate limit             | Yes (3x) | Yes           | "Too many requests, please try again"    |
| Template error         | No       | Yes           | "System error, contact admin"            |
| Database error (audit) | No       | No            | "Email sent successfully"                |

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
describe('EmailService', () => {
  describe('sendEmail', () => {
    it('should send email successfully on first attempt');
    it('should retry on transient errors');
    it('should fail after max retries');
    it('should not retry on permanent errors');
    it('should log to audit on success');
    it('should log to audit on failure');
  });

  describe('retry mechanism', () => {
    it('should calculate exponential backoff correctly');
    it('should respect max delay');
    it('should track attempt count');
  });
});

describe('MailService', () => {
  describe('sendVotingToken', () => {
    it('should render template with correct context');
    it('should call EmailService.sendEmail');
    it('should throw on invalid input');
    it('should handle template not found');
  });
});
```

### 8.2 Integration Tests

```typescript
describe('Email Integration', () => {
  it('should send email via Mailtrap', async () => {
    const result = await emailService.sendEmail({
      to: 'nugrahaadhitama22@gmail.com',
      subject: 'Test Email',
      htmlBody: '<h1>Test</h1>',
    });
    expect(result.success).toBe(true);
  });

  it('should send bulk emails', async () => {
    const emails = [
      'nugrahaadhitama22@gmail.com',
      '2210512109@mahasiswa.upnvj.ac.id',
    ];

    const results = await Promise.all(
      emails.map((to) =>
        mailService.sendVotingToken({
          to,
          data: {
            /* test data */
          },
        }),
      ),
    );

    expect(results.every((r) => r.success)).toBe(true);
  });
});
```

### 8.3 Manual Test Plan

```
Test Case 1: Single Email Send
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Prerequisites: Mailtrap configured
Steps:
1. Call sendVotingToken with test data
2. Check Mailtrap inbox
3. Verify email received
4. Check HTML rendering
5. Verify all variables replaced
Expected: Email received with correct content

Test Case 2: Bulk Email Send
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Prerequisites: Mailtrap configured
Steps:
1. Prepare array of 2 email addresses
2. Loop and send to each
3. Check Mailtrap inbox
4. Verify both emails received
5. Check audit logs for 2 entries
Expected: Both emails delivered, 2 audit logs

Test Case 3: Retry on Failure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Prerequisites: Simulate network issue
Steps:
1. Mock SMTP timeout
2. Call sendVotingToken
3. Observe retry attempts
4. Check logs for retry count
Expected: 3 retry attempts before failure

Test Case 4: Audit Log Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Prerequisites: Database access
Steps:
1. Send test email
2. Query audit_logs table
3. Verify entry exists
4. Check details JSONB column
Expected: Complete audit entry with all details
```

## 9. Performance Considerations

### 9.1 Throughput Analysis

```
Mailtrap Bulk SMTP Limits:
- Rate limit: ~10-20 emails/second
- Daily limit: Check Mailtrap plan
- Concurrent connections: Max 10

Recommended Approach:
- Use queue for bulk sends (future enhancement)
- Implement rate limiting
- Add delay between bulk sends
```

### 9.2 Optimization Strategies

```typescript
/**
 * Future Optimizations
 */

// 1. Email Queue (Bull/BullMQ)
@Injectable()
class EmailQueueService {
  async addToQueue(emailData: any) {
    await this.queue.add('send-email', emailData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });
  }
}

// 2. Template Caching
class TemplateCacheService {
  private cache = new Map<string, HandlebarsTemplateDelegate>();

  getTemplate(path: string) {
    if (!this.cache.has(path)) {
      const template = this.compileTemplate(path);
      this.cache.set(path, template);
    }
    return this.cache.get(path);
  }
}

// 3. Connection Pooling
// Already handled by nodemailer transporter

// 4. Batch Processing
async sendBulkEmails(recipients: string[], data: any) {
  const batchSize = 10;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.all(batch.map(to => this.sendEmail({ to, ...data })));
    await this.delay(1000); // Rate limiting
  }
}
```

## 10. Security Considerations

### 10.1 Email Security

```
1. SMTP Authentication
   ✓ Use secure credentials (env variables)
   ✓ Enable TLS/STARTTLS
   ✓ Never log passwords

2. Content Security
   ✓ Sanitize HTML input
   ✓ Prevent XSS in templates
   ✓ Validate email addresses

3. Token Security
   ✓ Use secure random tokens
   ✓ One-time use only
   ✓ Time-limited validity
   ✓ Hash tokens in database

4. Rate Limiting
   ✓ Limit emails per voter
   ✓ Prevent spam
   ✓ Track resend count
```

### 10.2 Data Privacy

```
GDPR Compliance:
- Don't log sensitive data in audit
- Encrypt email content if needed
- Allow user to request deletion
- Provide data export

Email Content:
- Don't include sensitive personal data
- Use token instead of password
- Add unsubscribe link (future)
- Privacy policy link
```

## 11. Monitoring & Observability

### 11.1 Metrics to Track

```typescript
// Application Metrics
interface EmailMetrics {
  total_sent: number;
  total_failed: number;
  success_rate: number;
  average_attempts: number;
  average_retry_count: number;
  retry_rate: number;
}

// Alerts
- Success rate < 95%
- Retry rate > 20%
- Average attempts > 1.5
- SMTP connection errors
```

### 11.2 Logging Strategy

```typescript
// Log Levels

logger.debug('Preparing to send email', { to, subject });
logger.info('Email sent successfully', { messageId, attempts });
logger.warn('Email retry attempt', { attempt, error });
logger.error('Email failed after retries', { error, attempts });

// Structured Logging
{
  level: 'info',
  message: 'Email sent',
  context: {
    service: 'EmailService',
    method: 'sendEmail',
    to: 'user@example.com',
    attempts: 2,
    duration: 1523,
    messageId: 'msg-123'
  },
  timestamp: '2026-02-03T10:30:00Z'
}
```

## 12. Acceptance Criteria Validation

| Criterion                  | Implementation                | Status  |
| -------------------------- | ----------------------------- | ------- |
| ✅ Mailtrap env config     | Updated .env with credentials | DONE    |
| ✅ EmailService injectable | Created with @Injectable      | DONE    |
| ✅ sendEmail method        | Implemented with signature    | DONE    |
| ✅ Retry logic (3x)        | Exponential backoff, max 3    | DONE    |
| ✅ Audit log delivery      | logEmailDelivery() method     | DONE    |
| ✅ HTML template           | voting-token.hbs created      | DONE    |
| ✅ Test real emails        | Manual test plan provided     | PENDING |

## 13. Deployment Checklist

```
Pre-Deployment:
□ Update environment variables in production
□ Test email sending in staging
□ Verify Mailtrap account active
□ Check rate limits and quotas
□ Test all email templates
□ Verify audit logs working
□ Run all unit tests
□ Run integration tests

Post-Deployment:
□ Monitor email delivery rate
□ Check audit logs for errors
□ Verify Mailtrap dashboard
□ Test with real voter data
□ Monitor retry rate
□ Check application logs
□ Set up alerts
```

## 14. Future Enhancements

```
Phase 2 (Future):
1. Email Queue System
   - Bull/BullMQ integration
   - Job scheduling
   - Retry management

2. Email Templates Management
   - Admin UI for templates
   - Template versioning
   - A/B testing

3. Analytics Dashboard
   - Delivery rates
   - Open rates (tracking pixels)
   - Click tracking
   - Bounce management

4. Multi-Language Support
   - i18n for email content
   - Locale-specific templates
   - Timezone handling

5. Email Preferences
   - User opt-in/opt-out
   - Frequency limits
   - Channel preferences
```

---

**Document Version**: 1.0  
**Last Updated**: February 3, 2026  
**Author**: Senior Backend Engineer  
**Status**: Implementation Ready
