# Security Baseline

v0.2 foundation güvenlik varsayımları:

- Uploaded filename storage path olarak kullanılmaz.
- Upload content RAM'e komple alınmaz.
- SHA-256 streaming sırasında hesaplanır.
- Client MIME güvenilir kabul edilmez.
- Staging path traversal kontrol edilir.
- Original file henüz archive record değildir.
- Security scan tamamlanmadan kullanıcıya güvenilir belge olarak sunulmaz.
- Secrets source control'a yazılmaz.
- Exception stack trace API response'a dönülmez.
- Correlation ID her request için vardır.

Sonraki güvenlik fazı:

- OIDC
- MFA
- RBAC + ABAC
- antivirus
- MIME magic/signature validation
- rate limiting
- authorization policies
- immutable object lock
- audit trail
