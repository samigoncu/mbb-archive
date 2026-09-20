using Mbb.Archive.BuildingBlocks.Domain;
namespace Mbb.Archive.Modules.Archive.Domain.Records;
public sealed class ArchiveRecord:AggregateRoot<ArchiveRecordId>
{
    private ArchiveRecord(){}
    private ArchiveRecord(ArchiveRecordId id,Guid documentId,Guid versionId,string storageKey,string sha256,string mimeType,long sizeBytes,string? ownerUnitPath,DateTimeOffset createdAt):base(id){if(documentId==Guid.Empty||versionId==Guid.Empty)throw new DomainRuleViolationException("Document and version ids are required.");if(string.IsNullOrWhiteSpace(storageKey))throw new DomainRuleViolationException("Original storage key is required.");if(string.IsNullOrWhiteSpace(sha256)||sha256.Length!=64)throw new DomainRuleViolationException("SHA-256 is required.");DocumentId=documentId;DocumentVersionId=versionId;OriginalStorageKey=storageKey.Trim();Sha256Hash=sha256.ToLowerInvariant();MimeType=mimeType.Trim();SizeBytes=sizeBytes;OwnerUnitPath=Normalize(ownerUnitPath);Status=ArchiveRecordStatus.Candidate;CreatedAt=createdAt;ConcurrencyVersion=1;}
    public Guid DocumentId{get;private set;} public Guid DocumentVersionId{get;private set;} public string OriginalStorageKey{get;private set;}=string.Empty;public string Sha256Hash{get;private set;}=string.Empty;public string MimeType{get;private set;}=string.Empty;public long SizeBytes{get;private set;}
    /// <summary>
    /// Kaydın sahibi birimin yolu. Kapsam süzgeci belgeye gitmeden burada
    /// uygulanabilsin diye kopyalanır; sahibi belirlenmemiş kayıtta null olur
    /// ve o kayıt kapsamlı kullanıcıya görünmez.
    /// </summary>
    public string? OwnerUnitPath{get;private set;} public ArchiveRecordStatus Status{get;private set;} public string? ClassificationCode{get;private set;} public string? RetentionRuleCode{get;private set;} public DateTimeOffset CreatedAt{get;private set;} public DateTimeOffset? DeclaredAt{get;private set;} public long ConcurrencyVersion{get;private set;}
    public static ArchiveRecord RegisterCandidate(Guid documentId,Guid versionId,string storageKey,string sha256,string mimeType,long sizeBytes,string? ownerUnitPath,DateTimeOffset now)=>new(ArchiveRecordId.New(),documentId,versionId,storageKey,sha256,mimeType,sizeBytes,ownerUnitPath,now);

    /// <summary>
    /// Birim taşındığında ya da geriye dönük doldurmada sahibi yolunu tazeler.
    /// Kaydın kendisi değişmez; yalnızca görünürlük kopyası güncellenir.
    /// </summary>
    public void RefreshOwnerUnitPath(string? ownerUnitPath){var normalized=Normalize(ownerUnitPath);if(string.Equals(OwnerUnitPath,normalized,StringComparison.Ordinal))return;OwnerUnitPath=normalized;ConcurrencyVersion++;}

    private static string? Normalize(string? path)=>string.IsNullOrWhiteSpace(path)?null:path.Trim();
    public void Declare(string classificationCode,string retentionRuleCode,DateTimeOffset now){if(Status==ArchiveRecordStatus.Declared){if(ClassificationCode!=classificationCode.Trim()||RetentionRuleCode!=retentionRuleCode.Trim())throw new DomainRuleViolationException("Beyan edilmiş kaydın sınıflandırması veya saklama kuralı değiştirilemez.");return;}if(string.IsNullOrWhiteSpace(classificationCode))throw new DomainRuleViolationException("Classification code is required before record declaration.");if(string.IsNullOrWhiteSpace(retentionRuleCode))throw new DomainRuleViolationException("Retention rule code is required before record declaration.");ClassificationCode=classificationCode.Trim();RetentionRuleCode=retentionRuleCode.Trim();DeclaredAt=now;Status=ArchiveRecordStatus.Declared;ConcurrencyVersion++;}
}
