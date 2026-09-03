# Physical Archive

Hierarchy:

```text
Institution Archive
  → Building
  → Archive Area
  → Room
  → Aisle
  → Cabinet
  → Shelf
  → Box
  → Physical Folder
```

The bounded context owns:

```text
physical_archive.locations
physical_archive.folders
physical_archive.folder_documents
physical_archive.loans
physical_archive.outbox_messages
```

A physical folder can only live on an active Shelf or Box. A folder on loan
cannot be relocated through the normal move command. Barcode identity is unique.
