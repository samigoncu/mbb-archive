/** Paylaşımın hedeflediği kaynak türü. Sunucudaki enum ile birebir aynıdır. */
export const grantResourceTypes = [
  "Document",
  "FilePlanItem",
  "Collection",
  "PhysicalFolder",
] as const;

export const grantSubjectTypes = ["User", "Group", "OrganizationUnit"] as const;

export const grantPermissions = ["Read", "Download", "Export"] as const;

export type GrantResourceType = (typeof grantResourceTypes)[number];
export type GrantSubjectType = (typeof grantSubjectTypes)[number];
export type GrantPermission = (typeof grantPermissions)[number];

export const resourceTypeLabels: Record<GrantResourceType, string> = {
  Document: "Belge",
  FilePlanItem: "Dosya planı başlığı",
  Collection: "Koleksiyon",
  PhysicalFolder: "Fiziksel klasör",
};

export const subjectTypeLabels: Record<GrantSubjectType, string> = {
  User: "Kullanıcı",
  Group: "Dizin grubu",
  OrganizationUnit: "Birim",
};

export const permissionLabels: Record<GrantPermission, string> = {
  Read: "Görüntüleme",
  Download: "İndirme",
  Export: "Dışa aktarma",
};

/** Kaynak anahtarının hangi biçimde beklendiğini kullanıcıya söyler. */
export const resourceKeyHints: Record<GrantResourceType, string> = {
  Document: "Belge kimliği (GUID)",
  FilePlanItem: "Dosya planı kodu (örn. 903.01)",
  Collection: "Koleksiyon kimliği (GUID)",
  PhysicalFolder: "Klasör kimliği (GUID)",
};

export type AccessGrant = {
  id: string;
  resourceType: string;
  resourceKey: string;
  subjectType: string;
  subjectKey: string;
  permission: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  grantedBy: string;
  reason: string | null;
  createdAt: string;
};

export type SubjectVisibility = {
  subjectId: string;
  unrestricted: boolean;
  permissions: string[];
  units: {
    id: string;
    code: string;
    name: string;
    path: string;
    isActive: boolean;
    isPrimary: boolean;
  }[];
  unitPaths: string[];
  grants: AccessGrant[];
  /** Kaldırılmış paylaşımlar listede kalır ama bu sayıya girmez. */
  activeGrants: number;
  seesNothing: boolean;
  /** Dizin grubu üzerinden gelen paylaşımlar rapora giremez. */
  groupGrantsResolved: boolean;
  /** Geliştirme kimliği açıkken rapor gerçek yetkinin tamamını göstermez. */
  developmentBootstrapActive: boolean;
};
