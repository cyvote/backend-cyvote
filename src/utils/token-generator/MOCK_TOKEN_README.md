# Mock Token Generator

> ⚠️ **TEMPORARY SOLUTION**
>
> This is a temporary mock token generator for testing purposes only.
> It should be replaced with a proper token generation service in production.

## Purpose

This utility generates and hashes voting tokens for testing the voter authentication flow, specifically for:

- Testing the `test-email-send.ts` script
- Unit testing the `AuthVoterService`

## Usage

```typescript
import { MockTokenGenerator } from './mock-token-generator';

// Generate a random 16-character token
const token = MockTokenGenerator.generate();

// Hash a token (SHA-256)
const hash = MockTokenGenerator.hash(token);

// Generate both at once
const { token, tokenHash } = MockTokenGenerator.generateWithHash();
```

## Token Format

- **Plain Token**: 16 uppercase alphanumeric characters (e.g., `ABC123XYZ789TEST`)
- **Hashed Token**: 64-character lowercase hex string (SHA-256)

## Hash Comparison

Tokens are normalized to **uppercase** before hashing to ensure case-insensitive comparison during verification.

## TODO

Replace this with a proper token generation service that:

1. Generates cryptographically secure tokens
2. Stores tokens securely in the database
3. Handles token expiration
4. Integrates with email sending service
5. Implements rate limiting for token generation
