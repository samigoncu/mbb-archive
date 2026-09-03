# RULES.md

Bu dosya insan geliştiriciler ve AI coding agent'ları için bağlayıcı proje standardıdır.

## 1. Temel mimari

- Başlangıç dağıtım modeli: **Modular Monolith + bağımsız Worker process'leri**.
- Her iş alanı bir **Bounded Context** olarak ele alınır.
- Domain modeli altyapı detaylarını bilmez.
- Modüller birbirlerinin internal entity, DbContext veya repository'lerine doğrudan erişmez.
- Cross-module iletişim public contract, application API veya integration event üzerinden yapılır.
- Mikroservis yalnızca ölçülmüş operasyonel/ölçekleme ihtiyacı oluştuğunda çıkarılır.

## 2. Kullanılan yaklaşımlar

- Domain-Driven Design
- Clean Architecture
- Vertical Slice Architecture
- SOLID
- Ports & Adapters
- CQRS yalnızca değer kattığı yerde
- Outbox / Inbox
- Idempotency
- Optimistic Concurrency
- Defense in Depth
- Observability by default

Pattern, ihtiyaç olmadığı halde kullanılmaz.

## 3. Katman bağımlılıkları

### Domain
Domain şunları bilmez:

- EF Core
- PostgreSQL
- HTTP
- ASP.NET Core
- RabbitMQ
- Redis
- OpenSearch
- filesystem
- external API DTO'ları

### Application
Application:

- use-case orchestration yapar,
- domain modelini çağırır,
- dış bağımlılıklar için abstraction kullanır,
- transaction sınırını koordine eder.

### Infrastructure
Infrastructure:

- persistence
- object storage
- queue
- cache
- search
- LDAP/AD
- external integrations

gibi teknik adapter'ları uygular.

### Presentation
Presentation:

- request/response
- route
- HTTP mapping
- authentication/authorization boundary

ile ilgilenir.

Endpoint içinde business rule, SQL, OCR veya PDF işleme yapılmaz.

## 4. Modül sınırları

Başlangıç bounded context'leri:

1. Identity
2. Organization
3. Documents
4. Archive
5. PhysicalArchive
6. Classification
7. Retention
8. Scanning
9. Workflow
10. Search
11. Sharing
12. Reporting
13. Audit
14. Integrations

Bir context başka bir context'in private veritabanı tablolarını JOIN ederek kullanamaz.

## 5. Domain kuralları

- Karmaşık aggregate'ler anemic model olamaz.
- Kritik state değişikliği public setter ile yapılmaz.
- Invariant aggregate tarafından korunur.
- Primitive obsession azaltılır.
- İş açısından anlamlı olaylar Domain Event olabilir.
- Teknik log Domain Event değildir.

Kötü:

```csharp
document.Status = DocumentStatus.Archived;
```

Doğru:

```csharp
document.Archive(now);
```

## 6. Kod boyutu ve okunabilirlik

Satır sayısı tek başına kalite değildir; ancak:

- 150+ satır: sorumluluk gözden geçirilir
- 250+ satır: parçalama ciddi değerlendirilir
- 400+ satır: gerekçe gerektirir
- 700+ satır: generated code dışında kabul edilmez

Metot:

- tercihen 5–30 satır
- 50+ satır: parçalama kontrolü
- 80+ satır: istisna dışında kabul edilmez

`Manager`, `Helper`, `Utils`, `Common` gibi belirsiz sınıf adlarından kaçınılır.

## 7. Yorum politikası

Yorum **ne yaptığını değil, neden yaptığını** açıklar.

Yorum beklenen alanlar:

- mevzuat kaynaklı kural
- güvenlik kararı
- sıra dışı iş kuralı
- performans optimizasyonu
- dış sistem kısıtı
- geçici workaround ve kaldırma şartı

## 8. Vertical Slice

Feature dosyaları birlikte tutulur:

```text
Documents/
  Create/
    CreateDocumentCommand.cs
    CreateDocumentCommandHandler.cs
    CreateDocumentEndpoint.cs
```

Tüm solution'ı kapsayan dev `Commands`, `Handlers`, `Dtos` klasörleri oluşturulmaz.

## 9. Repository

Generic `IRepository<T>` varsayılan çözüm değildir.

Aggregate-specific interface kullan:

- `IDocumentRepository`
- `IRetentionCaseRepository`

Read model sorgularında gerektiğinde doğrudan projection/Dapper kullanılabilir.

## 10. Persistence

- PostgreSQL hedef ana veri tabanıdır.
- Her bounded context ayrı PostgreSQL schema sahibi olacaktır.
- Binary belge PostgreSQL içine gömülmez.
- Original dosya Object Storage'da immutable yaklaşım ile saklanır.
- Distributed transaction kullanılmaz.
- Cross-context consistency için Outbox/Eventual Consistency kullanılır.

## 11. Messaging

- Consumer'lar idempotent olmalıdır.
- Sonsuz retry yasaktır.
- Retry + exponential backoff + Dead Letter Queue uygulanır.
- Database commit ile event publish arasında Outbox kullanılır.
- Consumer tarafında Inbox/processed-message stratejisi uygulanır.

## 12. OCR/PDF

HTTP request büyük OCR/PDF işini beklemez.

Pipeline:

```text
Upload
→ Quarantine
→ Virus Scan
→ MIME Validation
→ Hash
→ Original Store
→ Normalize
→ OCR
→ Metadata Extraction
→ Search Index
→ Quality Control
→ Archive
```

Her adım:

- retryable
- observable
- idempotent

olmalıdır.

## 13. Security

- OIDC/OAuth
- AD/LDAP integration
- MFA
- RBAC + ABAC
- least privilege
- secrets vault
- upload quarantine
- malware scan
- MIME sniffing
- decompression bomb protection

tasarımın parçasıdır.

Authorization policy bağlamı:

- role
- organization
- unit
- document class
- confidentiality
- ownership
- metadata
- legal hold
- retention state

## 14. Audit ve immutable record

Audit:

- append-only
- normal application logundan ayrı
- correlation/trace bilgili

olur.

Archive/Record statüsündeki original belge silent overwrite edilemez.

Düzeltme gerekiyorsa yeni version/correction ilişkisi oluşturulur.

## 15. Error handling

Beklenen business sonucu exception ile kontrol akışına çevrilmez.

- Result
- Error
- ProblemDetails

kullanılır.

Beklenmeyen exception global handler tarafından ele alınır.
Stack trace son kullanıcıya dönülmez.

## 16. Async

- `.Result`
- `.Wait()`

yasaktır.

CancellationToken I/O boundary boyunca taşınır.

## 17. Testing

Test katmanları:

- Unit
- Architecture
- Integration
- Contract
- End-to-End

Architecture test'leri ilerleyen fazda şu kuralları otomatik zorlayacaktır:

- Domain -> Infrastructure referansı yok
- Presentation -> DbContext erişimi yok
- modüller arası internal dependency yok
- yasaklı namespace kontrolü

## 18. Observability

Her request/job:

- TraceId
- CorrelationId

taşır.

Logs + Metrics + Traces birlikte tasarlanır.

## 19. API standardı

- `/api/v1`
- ProblemDetails
- pagination
- filter/sort
- idempotency key
- correlation id
- rate limit
- OpenAPI

standardize edilir.

Entity doğrudan dış API modeli olarak kullanılmaz.

## 20. Frontend

- Next.js App Router
- React
- TypeScript strict
- feature-based structure
- Server Component varsayılan, Client Component ihtiyaç halinde
- UI component içinde domain/business rule bulunmaz
- API contract typed olmalıdır
- `any` varsayılan olarak yasaktır

## 21. Database migration

Destructive migration production'a sessiz uygulanmaz.

Expand/Contract yaklaşımı kullanılır.

## 22. Performans

Yasak:

- N+1
- limitsiz liste endpoint
- büyük dosyayı tamamen RAM'e yüklemek
- HTTP request içinde ağır OCR
- gereksiz eager loading

Büyük dosya streaming ile işlenir.

## 23. AI

AI öneri motorudur; kayıt kaynağı değildir.

AI sonucu:

- confidence
- model/version
- timestamp
- human validation status

ile izlenir.

AI kritik metadata'yı sessiz overwrite edemez.

## 24. AI coding agent kuralları

Bir değişiklikten önce:

1. Bounded context'i belirle.
2. Public contract'ları oku.
3. En küçük doğru değişikliği yap.
4. Domain kuralını Domain'e koy.
5. Use-case'i feature slice'a koy.
6. Test etkisini değerlendir.
7. Security ve observability etkisini değerlendir.
8. Büyük dosyayı parçala.
9. Mevcut mimariyi bypass etme.
10. Paket sürümü uydurma.

AI:

- bilinmeyen API uyduramaz,
- test silerek build yeşile çeviremez,
- destructive migration'ı gizleyemez,
- security bypass ekleyemez.

## 25. Definition of Done

Bir iş aşağıdakiler değerlendirilmeden done değildir:

- validation
- authorization
- tests
- logging/metrics
- error paths
- API contract
- migration
- security
- documentation/ADR ihtiyacı

## 26. Ana ilke

**Basit ve açık kod, akıllı görünen karmaşık koddan değerlidir.**

# 27. Persistence ve Outbox ek kuralları

- Integration event isimleri stable + versioned olacaktır (`*.v1`).
- CLR type adı event wire contract değildir.
- DB state ve Outbox aynı transaction'da yazılır.
- Object storage + DB için distributed transaction kullanılmaz.
- Staging orphan cleanup/reconciliation job zorunludur.
- Client tarafından gelen MIME trusted değildir.
- Upload filename storage key olarak kullanılmaz.
- Production original storage immutable/object-lock kapasitesine sahip olmalıdır.

# 28. Large File Upload

- Büyük dosya RAM'e komple yüklenemez.
- Varsayılan ingestion endpoint streaming çalışır.
- Hash tek pass içinde hesaplanır.
- Upload size server-side enforce edilir.
- Chunk/resume desteği geldiğinde yeni protocol version olarak eklenir; mevcut endpoint gizlice davranış değiştirmez.

# 29. Optimistic Concurrency

- Kritik aggregate'lerde explicit concurrency token kullanılır.
- `DbUpdateConcurrencyException` sessizce retry edilmez.
- Kullanıcı/iş akışına uygun conflict sonucu üretilir.
- Last-write-wins varsayılan değildir.

# 30. Messaging

- Integration event delivery semantic'i `at-least-once` kabul edilir.
- Publisher confirm olmadan Outbox mesajı processed işaretlenemez.
- Consumer idempotent olmadan production queue consumer yazılamaz.
- Consumer ACK, business transaction tamamlanmadan gönderilemez.
- RabbitMQ connection/channel her mesaj için yeniden oluşturulamaz.
- Queue/exchange isimleri versioned ve açık olmalıdır.
- Retry sonsuz olamaz.
- DB Outbox dead-letter ile RabbitMQ consumer DLQ birbirine karıştırılmaz.

# 31. Security Ingestion

- Staging dosyası trusted değildir.
- Client MIME güvenilir değildir.
- Magic/file-signature detection security scan öncesi çalışır.
- Malware scan geçmeden original object storage'a promotion yasaktır.
- Security result consumer manual ACK kullanır.
- Result event id'leri redelivery altında deterministik/idempotent olmalıdır.
- Malware sonucu retry edilmez; rejected business state'tir.
- Scanner altyapı hatası malware sonucu gibi kaydedilmez.

# 32. Original Storage

- Original storage key kullanıcı filename'ından türetilemez.
- Original bytes content-addressed SHA-256 key ile saklanır.
- SecurityApproved olmayan ingestion promotion edilemez.
- Promotion sırasında hash ve size tekrar doğrulanır.
- DB commit başarısız olsa bile retry aynı content-addressed key üzerinde idempotent olmalıdır.
- Staging silme, original DB commit sonrasında yapılır.
- Production filesystem read-only flag WORM yerine kabul edilemez.
- S3-compatible production storage Object Lock/WORM politikası sağlamalıdır.

# 33. Processing Bounded Context

- OCR/PDF business orchestration Documents modülüne konulamaz.
- Processing başka context'in tablolarına JOIN yapamaz.
- OriginalStored event'i Processing'in giriş sınırıdır.
- Her processing job tek DocumentVersion'a aittir.
- DocumentVersion başına bir aktif processing job idempotency ile korunur.
- PDF/OCR worker request'leri Outbox üzerinden yayımlanır.
- Unsupported format sessizce başarısız olmaz; explicit state olur.
- Engine/model/version bilgisi processing sonucunda saklanmalıdır.

# 34. PDF/OCR Workers

- PDF/OCR workers cannot connect directly to application PostgreSQL.
- Worker input/output crosses versioned integration-event + object-storage boundaries only.
- Worker result is ACKed only after result publish confirm succeeds.
- OCR transactional DB stores aggregate metrics and artifact descriptors, not millions of word rows.
- Page/word coordinates live in immutable OCR JSON artifact and later Search index.
- Default PDF rasterizer must pass license review; current default is PDFium/pypdfium2.
- PaddleOCR is provider-specific infrastructure, never a domain dependency.
- OCR engine/model/version/languages/confidence must be recorded.

# 35. Classification and Metadata

- Official file-plan codes must not be compiled into enums/source code.
- File plans are versioned and retain effective-from/effective-to dates.
- Published metadata schema is immutable; changes require a new version.
- Dynamic metadata accepts no unknown field keys.
- Required/type validation occurs before persistence.
- JSONB is used for dynamic values, not as a replacement for core relational aggregates.
- Classification grouping nodes cannot be selected as final document classifications.
- Historical documents keep the schema/file-plan version used at classification time.

# 34. Search
- OpenSearch tek gerçek veri kaynağı değildir.
- Search bounded context başka context tablolarına JOIN yapamaz.
- Index OpenSearch kaybında Search PostgreSQL projection'dan yeniden üretilebilir olmalıdır.
- OCR word bounding box'ları OpenSearch'e gereksiz yere kopyalanmaz; immutable OCR artifact kaynak kabul edilir.
- Dinamik metadata alanları mapping explosion oluşturacak şekilde dynamic top-level field yapılmaz.
- Türkçe dil analizi title/body/page text için uygulanır.
- Indexing at-least-once ve idempotent document-id upsert ile çalışır.

# 35. Archive / Retention / Access / Audit
- Original stored file is only an archive candidate until formal record declaration.
- Record declaration requires classification and retention-rule association.
- Retention eligibility can never override an active Legal Hold.
- Eligibility is not deletion authorization; destruction/transfer execution requires a separate controlled command and approval flow.
- Production authentication must use configured JWT/OIDC authority/audience.
- Permission policies use least privilege and explicit `permission:*` semantics.
- Audit integration-event journal is append-only in application code and hash chained.
- Workflow definition is immutable after publication; new behavior requires a new version.


# 34. Bounded persistence contracts

- Bounded contexts must use `IUnitOfWork<TBoundary>`, `IOutbox<TBoundary>` and
  `IInbox<TBoundary>` where applicable.
- Plain persistence interfaces may not be injected inside modules.
- This prevents the root DI container from resolving another bounded context's DbContext.

# 35. Physical archive

- Location is typed hierarchy, never a single unvalidated free-text field.
- Folder placement is allowed only on active Shelf/Box nodes.
- Loaned folders cannot be silently moved.
- Barcode identities are unique and movements are auditable.

# 36. Workflow v2

- Published definitions are immutable.
- Conditions cannot execute arbitrary C#/JavaScript/SQL/Python.
- Timers are persisted (`WakeAt`); no long-running `Task.Delay` represents business state.
- Service tasks use integration adapters/events, not direct domain HTTP calls.

# 36. Electronic Signature and Evidence

- Cryptographic validity, certificate trust, revocation and legal/qualified-signature
  status are separate concepts.
- Unknown revocation/trust result cannot be converted to `Valid`.
- RFC 3161 timestamp validation must bind the token to the exact target bytes/hash.
- Timestamp report must retain timestamp, policy OID, hash algorithm and TSA certificate.
- PDF `/ByteRange`, `/Sig` or visual signature detection is not PAdES validation.
- PAdES conformance may be reported only by a vetted standards-aware provider.
- Original signed bytes are immutable; validation stores evidence/report, not rewritten bytes.

# 37. EYP 2.1

- OPC structural validity is not EYP semantic/conformance validity.
- EYP creation/update/official validation are isolated behind current EYP API adapters.
- Unsupported/unconfigured official validator must return explicit `NotConfigured`,
  never a false success.
- Original EYP package must not be silently modified or replaced.
- EYP update packages must preserve original-package relationship/evidence as required
  by the official specification/API.
- Package expansion limits are mandatory before semantic processing.

# 38. Operations and Observability

- Operations cannot read another bounded context's tables directly.
- Operational metrics are owned and produced by the bounded context that owns the data.
- OpenTelemetry is the application telemetry boundary.
- High-cardinality identifiers such as DocumentId, UserId and full file paths are forbidden as metric labels.
- Trace attributes must not contain document contents, OCR text, passwords, tokens or sensitive metadata.
- DLQ replay cannot be automatic; root cause and idempotency must be reviewed first.
- Backup existence is not restore proof.
- Production restore credentials cannot be granted to the normal API runtime.
- Fixity verification must compare actual stored bytes against the recorded SHA-256 and size.
- Audit-chain verification must recompute the chain; checking only the latest hash is insufficient.
