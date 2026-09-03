# Web

Next.js + React + TypeScript strict-mode frontend.

## Development

```bash
npm install
npm run typecheck
npm run dev
```

İlk internet erişimli `npm install` sonrasında oluşan `package-lock.json` commit edilmelidir.
Daha sonra CI `npm install` yerine `npm ci` kullanacak şekilde güncellenmelidir.

## Feature rules

- `src/app`: route composition
- `src/features`: business-facing UI feature'ları
- `src/lib`: generic frontend infrastructure
- backend authorization kuralı frontend'de kopyalanmaz
- Client Components yalnız interaktivite gerektiğinde kullanılır
