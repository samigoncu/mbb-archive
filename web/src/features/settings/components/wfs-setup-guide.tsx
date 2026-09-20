export function WfsSetupGuide() {
  return <details className="group rounded-lg border border-border bg-muted/20">
    <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Teknik kurulum bilgileri</summary>
    <div className="space-y-4 border-t border-border p-4 text-sm leading-6 [&_code]:break-all">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                CBS yöneticisinden WFS 2.0 servis adresini, katmanın tam adını
                (çalışma alanı dahil) ve nesne adı özniteliğini alın.
              </li>
              <li>
                API sunucusunda{" "}
                <code>
                  src/Host/Mbb.Archive.Api/appsettings.Development.json
                </code>{" "}
                içindeki <code>Geo</code> bölümünü aşağıdaki anahtarlarla
                yapılandırın. Üretimde aynı anahtarları ortam değişkeni/secret
                olarak verin.
              </li>
              <li>
                API'yi yeniden başlatın, katmanı seçip bağlantıyı test edin. Ağ
                erişimi ve kurum VPN'i API sunucusunda açık olmalıdır.
              </li>
            </ol>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <dt>WFS servis adresi</dt>
              <dd>
                <code>Geo__Wfs__BaseUrl</code>
              </dd>
              <dt>Katman adı</dt>
              <dd>
                <code>Geo__Wfs__Layers__0__Name</code>
              </dd>
              <dt>Katman başlığı</dt>
              <dd>
                <code>Geo__Wfs__Layers__0__Title</code>
              </dd>
              <dt>Nesne türü (Road, Parcel, Neighborhood…)</dt>
              <dd>
                <code>Geo__Wfs__Layers__0__EntityType</code>
              </dd>
              <dt>Ad özniteliği</dt>
              <dd>
                <code>Geo__Wfs__Layers__0__NameAttribute</code>
              </dd>
              <dt>Kimlik bilgileri (gerekiyorsa, secret)</dt>
              <dd>
                <code>Geo__Wfs__UserName</code>, <code>Geo__Wfs__Password</code>
              </dd>
              <dt>XYZ harita altlığı ve kaynak atfı</dt>
              <dd>
                <code>Geo__Basemap__TileUrl</code>,{" "}
                <code>Geo__Basemap__Attribution</code>
              </dd>
            </dl>
            <p className="text-sm">
              Yerel start.sh çalıştırırken bu değişkenleri aynı terminalde
              export edin; Compose .env dosyası API sürecine kendiliğinden
              aktarılmaz.
            </p>
    </div>
  </details>;
}
