# ADR-0008 — Security Scan Before Original Storage

**Status:** Accepted

Bir uploaded dosya aşağıdaki güvenlik kapılarını geçmeden arşiv orijinali değildir:

1. staging
2. SHA-256
3. magic/file-signature detection
4. ClamAV scan
5. security result
6. original-store promotion

Malware veya tanınmayan file signature, original object store'a taşınmaz.
