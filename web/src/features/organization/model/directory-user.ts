/**
 * Kullanıcının uygulamadaki künyesi.
 *
 * <para>
 * Kimlik doğrulama hesabı değildir; dizindeki kişinin yansımasıdır. Kaydın
 * olması erişim vermez: rol ve birim ataması ayrıdır.
 * </para>
 */
export type DirectoryUser = {
  subjectId: string;
  displayName: string;
  email: string | null;
  title: string | null;
  unitReference: string | null;
  isActive: boolean;
  /** "Directory": dizinden eşitlendi · "Manual": yönetici elle girdi. */
  source: string;
  createdAt: string;
  lastSyncedAt: string | null;
  lastSeenAt: string | null;
};

export const directorySourceLabels: Record<string, string> = {
  Directory: "Dizinden",
  Manual: "Elle",
};
