# Bounded Context Map

## Core Domain

### Documents
Belgenin kimliği, sürümü, yaşam döngüsü, bütünlüğü ve ilişkileri.

### Archive
Bir belgenin record/arşiv statüsüne geçişi, immutable kayıt ve arşiv kabul süreçleri.

### Retention
Saklama kuralları, süre hesapları, legal hold, disposition/devir/imha.

### Workflow
İş akışı tanımı, instance, task, SLA, approval ve escalation.

## Supporting Domain

### Classification
Standart Dosya Planı, sınıflandırma, metadata şemaları.

### PhysicalArchive
Bina/oda/dolap/raf/kutu/dosya, barkod/QR, ödünç/zimmet.

### Scanning
Scan batch, scan profile, scanner agent ve kalite giriş süreci.

### Search
Full-text index, faceted search, saved search ve semantic search projection'ları.

### Sharing
Süreli link, OTP, watermark ve erişim politikaları.

### Organization
Kurum, bağlı kuruluş, birim ve organizasyon ağacı.

### Identity
Kullanıcı kimliği, AD/LDAP mapping, role ve access policy.

## Generic / Technical

### Audit
Append-only audit trail ve güvenlik olayları.

### Reporting
Read-model tabanlı dashboard ve raporlar.

### Integrations
EBYS, EYP, KEP, CBS, ERP, webhook, external API adapter'ları.

## Bağımlılık yaklaşımı

Core domain birbirinin veritabanına erişmez.
İhtiyaçlar contract/event üzerinden çözülür.

```text
Identity ───────┐
Organization ───┼──► Documents ───► Archive
                │         │             │
Classification ─┘         │             ▼
                          │         Retention
                          │
                          ├──► Search
                          ├──► Workflow
                          └──► Audit (event/projection)
```
