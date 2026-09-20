namespace Mbb.Archive.Modules.Documents.Application.Settings;

/// <summary>
/// Arşiv nesnelerinin nerede tutulduğu ve ne kadar yer kapladığı.
/// </summary>
/// <remarks>
/// Salt okunur bir görünümdür: depolama yeri bir dağıtım kararıdır, yönetim
/// ekranından değiştirilmez. Yol değiştirmek var olan nesneleri taşımadığı
/// için tek bir alan, geri alınamaz görünen toplu bir belge kaybına dönüşürdü.
/// Yöneticinin ihtiyacı olan şey burayı <em>görmek</em>: nerede duruyor,
/// doluyor mu, korumalı mı, erişilebilir mi.
/// </remarks>
public sealed record StorageStatus(
    /// <summary>"Local" ya da "S3".</summary>
    string Provider,
    /// <summary>Yerelde kök dizin, S3'te kova adı.</summary>
    string Location,
    /// <summary>Benzersiz nesne sayısı; aynı içerik tek kez saklanır.</summary>
    int ObjectCount,
    /// <summary>Benzersiz nesnelerin toplam boyutu.</summary>
    long StoredBytes,
    /// <summary>Bu nesnelere işaret eden belge sürümü sayısı.</summary>
    int ReferenceCount,
    /// <summary>Tekilleştirme sayesinde yazılmayan bayt.</summary>
    long DeduplicatedBytes,
    WormStatus Worm,
    /// <summary>Yerel birimin doluluğu; S3'te tanımsız.</summary>
    VolumeStatus? Volume,
    /// <summary>Geçici yükleme alanı: burada bekleyen dosya taranmayı bekliyordur.</summary>
    StagingStatus Staging,
    /// <summary>Depoya erişilebiliyor mu; erişilemiyorsa neden.</summary>
    bool IsReachable,
    string? Problem);

public sealed record WormStatus(bool Enabled, string Mode, int RetentionDays, bool Supported);

public sealed record VolumeStatus(string Root, long TotalBytes, long AvailableBytes)
{
    public double UsedPercent => TotalBytes == 0 ? 0 : Math.Round(100.0 * (TotalBytes - AvailableBytes) / TotalBytes, 1);
}

public sealed record StagingStatus(string Root, int FileCount, long Bytes);

public interface IStorageStatusQuery
{
    Task<StorageStatus> GetAsync(CancellationToken ct);
}
