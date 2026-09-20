#!/usr/bin/env bash
# Model ile migration'ların aynı commit'te kalmasını zorlar.
#
# Modeli değiştirip migration eklememek, şemayı sessizce geride bırakır:
# uygulama açılışta "pending model changes" ile durur ve ekranlar hata verir.
# Bu, kod incelemesinde gözden kaçar çünkü derleme ve testler yeşil kalır —
# hata ancak veritabanı güncellenirken ortaya çıkar.
#
# Her modülün DbContext'i migration snapshot dosyasından keşfedilir; yeni
# modül eklendiğinde liste kendiliğinden büyür.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Bağlantı dizesi yalnız tasarım zamanı fabrikasını memnun etmek için gerekir;
# komut veritabanına bağlanmaz.
PLACEHOLDER="Host=localhost;Port=5432;Database=design-time-only;Username=none;Password=none"

failed=0
checked=0

while IFS= read -r snapshot; do
  context="$(basename "$snapshot" | sed 's/ModelSnapshot\.cs$//')"
  project="$(dirname "$(dirname "$(dirname "$snapshot")")")"
  module="$(basename "$project" | sed 's/^Mbb\.Archive\.Modules\.//; s/\.Infrastructure$//')"

  # Her modül kendi bağlantı adını okur; hepsi aynı yer tutucuyu alır.
  output="$(env ASPNETCORE_ENVIRONMENT=Development \
      "ConnectionStrings__${module}=$PLACEHOLDER" \
      "ConnectionStrings__Operations=$PLACEHOLDER" \
    dotnet ef migrations has-pending-model-changes \
      --project "$project" \
      --startup-project src/Host/Mbb.Archive.Api \
      --context "$context" \
      --no-build 2>&1)"

  checked=$((checked + 1))

  if grep -q "No changes have been made" <<<"$output"; then
    printf "  %-24s ✓\n" "$module"
  elif grep -q "Changes have been made" <<<"$output"; then
    printf "  %-24s ✗ modelde migration'ı olmayan değişiklik var\n" "$module"
    failed=1
  else
    printf "  %-24s ? denetlenemedi\n" "$module"
    printf "%s\n" "$output" | tail -3 | sed 's/^/      /'
    failed=1
  fi
done < <(find src/Modules -name "*ModelSnapshot.cs" -not -path "*/obj/*" -not -path "*/bin/*" | sort)

echo
if [ "$failed" -eq 0 ]; then
  echo "Migration doğrulaması geçti: $checked modülün modeli migration'larıyla uyumlu."
else
  echo "Migration doğrulaması BAŞARISIZ."
  echo "Modeli değiştiren commit, migration'ını da içermelidir:"
  echo "  dotnet ef migrations add <Ad> --project <modül>.Infrastructure \\"
  echo "    --startup-project src/Host/Mbb.Archive.Api --context <Context>"
fi

exit "$failed"
