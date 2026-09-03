# Signature Validation Model

Do not collapse all checks into a single `IsSigned` boolean.

A validation result distinguishes:

```text
signature bytes cryptographically valid?
certificate identity?
certificate chain trusted?
revocation known?
timestamp valid for exact bytes?
PAdES/XAdES/CAdES profile validated?
provider configured?
```

Recommended status semantics:

- `Valid`: all checks represented by the configured validation profile succeeded.
- `Invalid`: cryptographic/data binding failure or confirmed invalid evidence.
- `Indeterminate`: cryptography may be valid, but trust/revocation/profile/provider
  cannot be established.
- `Pending`: validation not completed.

Legal/qualified-signature status must not be inferred solely from certificate subject,
PDF signature presence, or CMS cryptographic integrity.
