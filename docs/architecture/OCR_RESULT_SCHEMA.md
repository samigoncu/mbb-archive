# OCR Result Schema v1

OCR worker stores a compact immutable JSON artifact rather than thousands of word rows in the transactional database.

```json
{
  "schemaVersion": "mbb.ocr.v1",
  "engine": "Tesseract",
  "engineVersion": "5.x",
  "languages": "tur+eng",
  "pageCount": 2,
  "averageConfidence": 0.91,
  "pages": [
    {
      "page_number": 1,
      "width": 1654,
      "height": 2339,
      "text": "...",
      "average_confidence": 0.93,
      "words": [
        {"text":"Malatya","confidence":0.98,"x":100,"y":120,"width":140,"height":35}
      ]
    }
  ]
}
```

PostgreSQL stores artifact descriptors and aggregate-level OCR metrics. OpenSearch v0.9 will index the JSON/text artifact and preserve page/word positions for viewer highlighting.
