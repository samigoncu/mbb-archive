export type AuditEvent = {
  actorDisplayName?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
  resourceUrl?: string | null;
  actor?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  outcome?: string | null;
  ipAddress?: string | null;
  correlationId?: string | null;
  sequence: number;
  messageId: string;
  eventName: string;
  documentId: string | null;
  occurredAt: string;
  receivedAt: string;
  /** Zincirin önceki halkası; ilk girdide boş olabilir. */
  previousHash: string | null;
  entryHash: string;
};

/**
 * Olay adları `<modül>.<olay>.v<sürüm>` biçimindedir. Bilinmeyen ad olduğu gibi
 * gösterilir; eşleşmeyen olay gizlenmez.
 */
const eventLabels: Record<string, string> = {
  "access.document-version-text-viewed.v1": "Belge sürümünün OCR metni görüntülendi",
  "documents.relation-changed.v1": "Belge ilişkisi değiştirildi",
  "access.document-relation-created.v1": "Belge ilişkisi oluşturuldu",
  "access.document-relation-updated.v1": "Belge ilişkisi güncellendi",
  "access.document-relation-removed.v1": "Belge ilişkisi kaldırıldı",
  "access.document-workflow-viewed.v1": "Belge iş akışı geçmişi görüntülendi",
  "documents.cancelled.v1": "Yanlış yüklenen belge iptal edildi",
  "documents.cancellation-restored.v1": "Belge iptali geri alındı",
  "access.document-cancelled.v1": "Belge iptal işlemi",
  "access.document-cancellation-restored.v1": "Belge iptalini geri alma işlemi",
  "access.file-plan-retired.v1": "Dosya planı aktif kullanımdan kaldırıldı",
  "access.file-plan-created.v1": "Dosya planı oluşturuldu",
  "access.file-plan-item-added.v1": "Dosya planı başlığı ekleme işlemi",
  "documents.version-cancelled.v1": "Belge sürümü gerekçesiyle iptal edildi",
  "access.document-version-cancelled.v1": "Belge sürümü iptal işlemi",
  "access.document-filing-changed.v1": "Belgenin SDP ve dosya atamaları değiştirildi",
  "documents.filing-changed.v1": "Belgenin dosyalaması gerekçesiyle güncellendi",
  "access.document-pdf-previewed.v1": "Belgenin PDF kopyası görüntülendi",
  "access.document-pdf-downloaded.v1": "Belgenin PDF kopyası indirildi",
  "access.document-reprocess-requested.v1": "Belgenin yeniden işlenmesi istendi",
  "access.unit-file-plans-changed.v1": "Birimin SDP eşleştirmesi değiştirildi",
  "access.organization-unit-deleted.v1": "Birim kaldırıldı",
  "access.organization-unit-created.v1": "Birim oluşturuldu",
  "access.organization-unit-changed.v1": "Birim bilgileri değiştirildi",
  "access.organization-unit-moved.v1": "Birim taşındı",
  "access.document-created.v1": "Belge oluşturuldu",
  "access.dossier-created.v1": "Dijital dosya oluşturuldu",
  "access.dossier-viewed.v1": "Dijital dosya açıldı",
  "access.dossier-document-added.v1": "Belge dijital dosyaya eklendi",
  "access.folder-created.v1": "Fiziksel klasör oluşturuldu",
  "access.folder-viewed.v1": "Fiziksel klasör açıldı",
  "access.folder-document-added.v1": "Belge fiziksel klasöre eklendi",
  "access.folder-moved.v1": "Fiziksel klasör taşındı",
  "access.folder-checked-out.v1": "Fiziksel klasör ödünç verildi",
  "documents.dossier-filed.v1": "Dijital dosyalama kaydedildi",
  "physical-archive.folder-owner-assigned.v1": "Fiziksel klasörün birimi atandı",
  "access.resource-viewed.v1": "Kayıt / liste görüntülendi",
  "access.collection-created.v1": "Koleksiyon oluşturuldu",
  "access.collection-changed.v1": "Koleksiyon / paylaşım güncellendi",
  "access.collection-deleted.v1": "Koleksiyon kaldırıldı",
  "access.collection-viewed.v1": "Koleksiyon görüntülendi",
  "access.collection-document-added.v1": "Koleksiyona belge eklendi",
  "access.collection-document-removed.v1": "Koleksiyondan belge çıkarıldı",
  "access.search-performed.v1": "Arama yapıldı",
  "access.document-text-viewed.v1": "Belge metni okundu",
  "access.request-denied.v1": "Erişim reddedildi",
  "access.geo-entity-status-changed.v1": "Harita nesnesi durumu değişti",
  "access.geo-feature-imported.v1": "WFS nesnesi kataloğa alındı",
  "documents.created.v1": "Belge kaydı açıldı",
  "documents.file-staged.v1": "Dosya hazırlık alanına alındı",
  "documents.file-security-approved.v1": "Güvenlik taraması geçti",
  "documents.file-security-rejected.v1": "Güvenlik taraması reddetti",
  "documents.file-promotion-requested.v1": "Arşive alma istendi",
  "documents.original-stored.v1": "Orijinal dosya saklandı",
  "processing.started.v1": "İşleme başladı",
  "processing.pdf-inspection-requested.v1": "PDF incelemesi istendi",
  "processing.pdf-inspection-completed.v1": "PDF incelemesi tamamlandı",
  "processing.ready-for-index.v1": "İndekslemeye hazır",
  "search.document-indexed.v1": "Aramaya indekslendi",
  "classification.document-classified.v1": "Dosya planına bağlandı",
  "classification.document-metadata-changed.v1": "Üstveri güncellendi",
  "physical-archive.folder-registered.v1": "Arşiv dosyası kaydedildi",
  "physical-archive.loan-changed.v1": "Ödünç durumu değişti",
  "processing.text-extraction-requested.v1": "Metin çıkarma istendi",
  "processing.text-extraction-completed.v1": "Metin çıkarma tamamlandı",
  "processing.text-extraction-failed.v1": "Metin çıkarma başarısız",
  "access.document-viewed.v1": "Belge görüntülendi",
  "access.document-previewed.v1": "Belge önizlendi",
  "access.document-downloaded.v1": "Belge indirildi",
  "access.permission-changed.v1": "Yetki değişti",
  "access.role-assigned.v1": "Rol atandı",
};

export function auditEventLabel(eventName: string): string {
  return eventLabels[eventName] ?? eventName;
}

export function auditActorLabel(event: AuditEvent): string {
  if (event.actorDisplayName) return event.actorDisplayName;
  if (!event.actor) return event.eventName.startsWith("access.") ? "Kullanıcı bilgisi kaydedilmemiş" : "Sistem işlemi";
  if (event.actor === "anonymous") return "Oturum açılmamış";
  return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(event.actor) ? "Kullanıcı adı kaydedilmemiş" : event.actor;
}

export function auditOutcomeLabel(outcome?: string | null): string {
  return ({ succeeded: "Başarılı", denied: "Erişim reddedildi", failed: "Başarısız" } as Record<string, string>)[outcome ?? ""] ?? outcome ?? "Olay kaydı";
}

export function auditResourceKind(event: AuditEvent): string {
  return ({ document: "Belge", dossier: "Dijital dosya", folder: "Fiziksel klasör", collection: "Koleksiyon", request: "Ekran / liste", role: "Rol", user: "Kullanıcı" } as Record<string, string>)[event.resourceType ?? event.entityType ?? ""] ?? "Kayıt";
}

export function auditResourceLabel(event: AuditEvent): string {
  if (event.resourceName) return event.resourceName;
  const type = event.resourceType ?? event.entityType;
  if (type === "request") {
    const path = event.resourceId ?? event.entityId ?? "";
    const screens: Record<string, string> = {
      "/api/v1/documents": "Tüm belgeler", "/api/v1/documents/dossiers": "Dijital dosyalar",
      "/api/v1/physical-archive/folders": "Fiziksel klasörler", "/api/v1/physical-archive/locations": "Fiziksel arşiv yerleşimleri",
      "/api/v1/access/archive-units": "Yetkili birimler", "/api/v1/access/me": "Oturum bilgileri",
      "/api/v1/classification/file-plans": "Standart Dosya Planı", "/api/v1/classification/metadata-schemas": "Üstveri şemaları",
      "/api/v1/collections": "Koleksiyonlar", "/api/v1/organization/units/tree": "Birim ağacı",
    };
    return screens[path.replace(/\/$/, "")] ?? "Uygulama kaynağı";
  }
  return event.resourceId || event.documentId || event.entityId
    ? `${auditResourceKind(event)} adı bulunamadı veya erişiminiz yok`
    : "İlgili kayıt belirtilmemiş";
}

/** Süzgeç listesi için bilinen olay adları; yeni adlar sonuçtan tamamlanır. */
export const knownAuditEventNames: string[] = Object.keys(eventLabels).sort();

/**
 * Zincir bağının yalnızca ardışık kayıtlar arasında doğrulanabildiğini
 * belirtir. Liste süzgeçliyse ya da sayfa sınırındaysa bağ "denetlenemedi"
 * sayılır — kopuk gibi gösterilmez.
 */
export type ChainLink = "linked" | "broken" | "unchecked";

/**
 * Girdiler yeniden eskiye sıralı gelir. Bir girdinin `previousHash` alanı
 * kendisinden bir önceki sıra numarasının `entryHash` değerine eşit olmalıdır.
 */
export function auditChainLinks(events: AuditEvent[]): Map<number, ChainLink> {
  const bySequence = new Map(events.map((event) => [event.sequence, event]));
  const links = new Map<number, ChainLink>();

  for (const event of events) {
    if (event.sequence === 1) {
      links.set(event.sequence, "linked");
      continue;
    }

    const previous = bySequence.get(event.sequence - 1);

    if (!previous) {
      links.set(event.sequence, "unchecked");
      continue;
    }

    links.set(
      event.sequence,
      previous.entryHash === event.previousHash ? "linked" : "broken",
    );
  }

  return links;
}

/**
 * Python worker'lar bir dönem AMQP timestamp'ini boş bırakıyordu ve bu kayıtlar
 * denetim günlüğüne 1970 olarak yazıldı. Üretici düzeltildi; bu geri düşüş
 * geçmiş kayıtların kullanıcıya 1970 olarak görünmemesi için duruyor.
 */
export function auditEventTimestamp(event: AuditEvent): string {
  const occurred = Date.parse(event.occurredAt);
  const isPlausible =
    Number.isFinite(occurred) && occurred > Date.UTC(2000, 0, 1);

  return isPlausible ? event.occurredAt : event.receivedAt;
}
