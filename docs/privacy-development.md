# Privacy Development Rules

The frontend should collect only the information required to authenticate a learner, preserve progress, and evaluate reviewed exercises.

## Prohibited Data

- Seed phrases, spending keys, or production wallet secrets
- Google access tokens or refresh tokens in browser storage
- Full Zcash addresses, memos, or payment requests in analytics
- Learner source code in analytics or general application logs
- Unredacted authentication assertions or session cookies

## Logging

Log opaque user, request, scenario, submission, and runner identifiers.
Use bounded error categories instead of raw sensitive input.
Never log authorization headers, cookies, source bodies, or environment values.

## Analytics

Use a reviewed event allowlist with explicit fields.
Do not infer identity from email, wallet data, or protocol artifacts.
Account export, deletion, and retention behavior must be testable.

## Local Configuration

`.env` remains ignored and must contain only the credentials required for local development.
Browser-visible variables must be treated as public and may not contain secrets.
