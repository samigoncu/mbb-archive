/**
 * Giriş sonrası dönülecek adresi güvenli hâle getirir.
 *
 * <para>
 * Açık yönlendirme koruması: yalnızca uygulama içi, tek eğik çizgiyle başlayan
 * yollar kabul edilir. <c>//kotu.site</c> protokole göreli bir mutlak adrestir
 * ve tarayıcı onu dış siteye çözer; <c>/\kotu.site</c> bazı tarayıcılarda aynı
 * şekilde davranır.
 * </para>
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  if (value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }

  return value;
}
