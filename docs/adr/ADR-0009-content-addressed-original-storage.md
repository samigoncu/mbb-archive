# ADR-0009 — Content-Addressed Original Storage

**Status:** Accepted

Original object key file name veya kullanıcı metadata'sından türetilmez.

```text
originals/sha256/{00}/{11}/{full-sha256}
```

kullanılır.

Avantajlar:

- duplicate byte content doğal olarak aynı key'e gider,
- kullanıcı filename traversal riski storage key'e taşınmaz,
- integrity/fixity doğrulaması kolaylaşır,
- promotion retry idempotent olur.

Production bucket ayrıca WORM/Object Lock policy sağlamalıdır.
