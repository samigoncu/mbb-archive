# Security

Güvenlik problemi source-control issue olarak hassas detaylarla paylaşılmamalıdır.
Kurumun belirleyeceği güvenlik bildirim kanalı kullanılacaktır.

## Kod standardı

- Secret Git'e girmez.
- Upload güvenilir kabul edilmez.
- Authentication ile authorization ayrı değerlendirilir.
- Security control bypass merge edilemez.
- Dependency ve container taramaları CI/CD kalite kapısı olacaktır.
- Audit kaydı normal logdan ayrıdır.
