# Security Audit Checklist

## Pre-Audit Information
- **Application:** Exchange Backoffice
- **Version:** <commit SHA>
- **Auditor:** Security Engineer Agent
- **Date:** <YYYY-MM-DD>

---

## 1. Dependency Security
- [ ] `npm audit` run on all package-lock.json files
- [ ] Zero critical/high vulnerabilities in direct dependencies
- [ ] Zero critical vulnerabilities in transitive dependencies
- [ ] All packages have been published within last 2 years
- [ ] No GPL-licensed packages in proprietary code
- [ ] SBOM generated (CycloneDX format)
- [ ] No typosquatting detected in dependency names

## 2. OWASP Top 10
- [ ] **A01 — Broken Access Control:** RBAC enforced on every endpoint
- [ ] **A02 — Cryptographic Failures:** Proper hashing (bcrypt/argon2), TLS in transit
- [ ] **A03 — Injection:** Parameterized queries, no raw SQL concatenation
- [ ] **A04 — Insecure Design:** Threat modeling performed
- [ ] **A05 — Security Misconfiguration:** No default credentials, no verbose errors
- [ ] **A06 — Vulnerable Components:** Dependencies scanned and updated
- [ ] **A07 — Auth Failures:** Rate limiting, JWT validation, session management
- [ ] **A08 — Data Integrity Failures:** Input validation, signed artifacts
- [ ] **A09 — Logging Failures:** Security events logged, no PII in logs
- [ ] **A10 — SSRF:** User-supplied URLs validated and restricted

## 3. Authentication & Authorization
- [ ] JWT signature verified on every request
- [ ] JWT expiry enforced
- [ ] JWT issuer and audience validated
- [ ] Algorithm confusion attack prevented (explicit algorithm whitelist)
- [ ] RBAC middleware applied to every route
- [ ] No IDOR (Insecure Direct Object Reference) vulnerabilities
- [ ] No privilege escalation paths
- [ ] Password/secret hashing uses bcrypt or argon2
- [ ] Rate limiting on login endpoint
- [ ] Rate limiting on password reset endpoint
- [ ] Token rotation implemented
- [ ] Token revocation capability exists

## 4. Input Validation
- [ ] All API inputs validated (type, length, format, range)
- [ ] File uploads validated (type, size, content-type, magic bytes)
- [ ] No XSS vectors in frontend rendering
- [ ] No SQL injection vectors
- [ ] No command injection vectors
- [ ] No prototype pollution vectors
- [ ] Query parameters sanitized
- [ ] Path parameters sanitized

## 5. Data Protection
- [ ] PII not logged in application logs
- [ ] PII not exposed in error responses
- [ ] PII not included in URLs or query parameters
- [ ] Database encryption at rest configured
- [ ] File storage access controlled (presigned URLs with expiry)
- [ ] API responses do not over-fetch data
- [ ] Sensitive fields excluded from API responses where not needed

## 6. Infrastructure
- [ ] Docker containers do not run as root
- [ ] Docker images use multi-stage builds
- [ ] No secrets in Dockerfile or docker-compose.yml
- [ ] No secrets committed to git (.env files in .gitignore)
- [ ] CORS policy restricts to known origins
- [ ] Security headers configured (Helmet.js)
  - [ ] Content-Security-Policy
  - [ ] Strict-Transport-Security
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
  - [ ] Referrer-Policy
- [ ] Rate limiting on API endpoints
- [ ] No server version disclosure in response headers
- [ ] No stack traces in production error responses

## 7. Audit Trail
- [ ] All authentication events logged
- [ ] All authorization failures logged
- [ ] All data modification events logged
- [ ] Logs include timestamp, user ID, action, resource
- [ ] Logs are tamper-resistant (append-only / external storage)

---

## Summary

| Category | Findings | Critical | High | Medium | Low |
|----------|----------|----------|------|--------|-----|
| Dependencies | | | | | |
| OWASP Top 10 | | | | | |
| Auth & AuthZ | | | | | |
| Input Validation | | | | | |
| Data Protection | | | | | |
| Infrastructure | | | | | |
| Audit Trail | | | | | |
| **Total** | | | | | |

## Verdict
- [ ] **PASS** — Zero CRITICAL/HIGH findings
- [ ] **CONDITIONAL PASS** — Zero CRITICAL, HIGH with remediation plan
- [ ] **FAIL** — CRITICAL or unmitigated HIGH findings exist
