# Search Architecture

```text
Documents / Classification / Processing events
                 ↓
         Search Projection Consumer
                 ↓
 search.documents + search.inbox_messages
                 ↓
        search.index_requests
                 ↓
         Search Indexer
                 ↓
          OpenSearch 3.8
```

## Index design
- Turkish analyzer for title/body/page text
- nested pages for page-level hits
- nested metadataEntries to avoid dynamic mapping explosion
- keyword facets: MIME and file plan codes
- OCR coordinate boxes remain in immutable OCR JSON artifact; they are loaded only when viewer requests coordinates.

## APIs
- `GET /api/v1/search/documents?q=...`
- `GET /api/v1/search/documents/{documentId}/highlights?q=...&page=...`
