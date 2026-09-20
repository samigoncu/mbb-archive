# Existing document filing changes — 2026-09-06

Previously, the dossier endpoint only supported first-time filing: `Document.FileIn` rejected a document already in another dossier, classification rejected another SDP code, and physical folders had no unlink/replacement workflow. The document viewer also had no filing editor.

The viewer now exposes **Künye → Dosyalamayı değiştir**. It loads current assignments, offers only the owning unit's assigned active SDP entries, filters digital dossiers and physical folders by that selection, and requires a reason. Choosing another SDP or dossier resets the physical selection visibly. Leaving physical folders empty removes the digital links; it does not claim a paper document has moved. The owning unit and original file versions are preserved.

`GET /api/v1/documents/{id}/filing` returns the editable snapshot. `PUT` requires `documents.write` and `documents.metadata.write`, writable unit scope, expected document version and expected physical folder IDs. Physical changes additionally enforce `physical-archive.manage`, both source and destination scopes, folder availability, unit, SDP and dossier matching. Grouping, expired or unassigned SDP entries are rejected.

Documents coordinates Classification and PhysicalArchive through public contracts. Each module uses only its own context. The sequential operations enlist in one serializable ambient transaction on the monolith's shared PostgreSQL database. A failed destination check rolls back document, primary classification, physical links and outbox writes. This is not a distributed-database transaction design; deployment must retain the shared-database connection configuration. [Npgsql transaction documentation](https://www.npgsql.org/doc/basic-usage.html#systemtransactions-and-distributed-transactions).

Previous classification rows remain as non-primary entries. Search replaces the previous primary classification, and background document/search projections resolve the current primary rather than restoring an old code from a delayed event. A filing-change event records the document title, actor, reason and previous/new assignments; the authenticated access audit also records the action.

## Verification

- PostgreSQL integration suite: 21 passed, no skips. Six new cases cover an archived document moving all assignments while preserving the original, missing destination rollback including classification outbox, stale version, another unit's destination, missing physical permission and a loaned source folder.
- Search regression verifies old primary SDP removal while preserving a secondary classification.
- Frontend: 101 tests passed; production build and type checking passed. The editor tests cover existing values, filtered dependent selections, concurrency payload, backend conflict and authorization failure.
- Architecture verification and `git diff --check` passed.
- Live API: a previous Office test document was assigned to test dossier/folder A; a stale save was rejected with 409; a nonexistent destination returned 404 and the complete previous snapshot was unchanged.
- Real Chrome: the editor moved the same document from test dossier/folder A to B, displayed success and retained B after a full reload. Original SHA-256 remained unchanged; the authenticated filing audit entry was present and OCR search still found the document.

Evidence lives in `/tmp/mbb-refiling-{integration,backend-tests,search-tests,web-tests,web-build,architecture,live,ui}.log` and `/tmp/mbb-refiling-ui.png`. Live test records are clearly named `Dosyalama Testi A/B`, with physical barcodes `TEST-REFILE-0609-A/B`; IDs are in `/tmp/mbb-refiling-live.json`. Only the previously generated `Office PDF Testi DOCX` record was changed during live verification.

The live Bilgi İşlem unit currently has only `934.01 · İhale Dosyaları` assigned. Selecting another SDP requires the unit administrator to add that topic under the unit's SDP assignments first. This change does not alter those assignments. The separate, previously reported missing Archive owner-unit migration remains outside this change.
