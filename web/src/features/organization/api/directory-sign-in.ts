import { getServerApiBaseUrl } from "@/lib/api/api-client";

/**
 * Giriş yapan kullanıcının künyesini arşive yazdırır.
 *
 * <para>
 * Kayıt olmadan arayüz ve denetim izleri kullanıcıyı ham dizin kimliğiyle
 * (örn. <code>a.yilmaz</code>) göstermek zorunda kalıyordu. Kayıt açılması
 * erişim vermez: rol ve birim ataması yöneticide kalır.
 * </para>
 * <para>
 * Özneyi API jetondan okur; burada gövde göndermiyoruz. Başarısızlık girişi
 * engellemez — kimlik doğrulaması zaten tamamlanmıştır, künye bir sonraki
 * girişte ya da dizin eşitlemesinde tamamlanır.
 * </para>
 */
export async function recordDirectorySignIn(accessToken?: string): Promise<void> {
  try {
    const response = await fetch(
      `${getServerApiBaseUrl()}/organization/directory/users/sign-in`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        cache: "no-store",
        // Dizin yanıt vermiyorsa kullanıcı giriş ekranında beklemesin.
        signal: AbortSignal.timeout(5000),
      },
    );

    // 409: yönetici "ilk girişte kayıt aç" seçeneğini kapatmış; beklenen durum.
    if (!response.ok && response.status !== 409) {
      console.warn("Kullanıcı künyesi yazılamadı", response.status);
    }
  } catch (exception) {
    console.warn("Kullanıcı künyesi yazılamadı", exception);
  }
}
