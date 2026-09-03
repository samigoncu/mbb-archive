import asyncio
import json
import os

from mbb_worker_common.config import RabbitConfig, StorageConfig
from mbb_worker_common.event import utc_now_iso
from mbb_worker_common.ids import deterministic_event_id
from mbb_worker_common.rabbit import RabbitBus
from mbb_worker_common.storage import ObjectStorage
from pdf_inspector import PdfInspector

QUEUE = os.getenv("PDF_QUEUE", "mbb.archive.processing.pdf.v1")
ROUTING_KEY = "processing.pdf-inspection-requested.v1"


async def run() -> None:
    bus = RabbitBus(RabbitConfig())
    await bus.connect()

    storage = ObjectStorage(StorageConfig())
    inspector = PdfInspector()

    queue = await bus.declare_consumer_queue(
        QUEUE,
        ROUTING_KEY,
    )
    await bus.channel.set_qos(prefetch_count=2)

    async with queue.iterator() as messages:
        async for message in messages:
            async with message.process(
                requeue=True,
                ignore_processed=True,
            ):
                source = json.loads(message.body)
                event_name, result = inspect_document(
                    source,
                    storage,
                    inspector,
                )

                # Publisher confirms are enabled in RabbitBus. If this fails,
                # the exception escapes and the source message is requeued.
                await bus.publish(event_name, result)


def inspect_document(
    source: dict,
    storage: ObjectStorage,
    inspector: PdfInspector,
) -> tuple[str, dict]:
    path = storage.download_original(source["originalStorageKey"])

    try:
        inspection = inspector.inspect(path)
        text_artifact = None
        json_artifact = None

        # Gömülü metin katmanı varsa OCR istenmez; aranabilir metin burada
        # üretilmezse belge içeriği hiç indekslenmez.
        if inspection.has_embedded_text and inspection.page_texts:
            text_artifact, json_artifact = store_text_artifacts(
                storage,
                inspection,
            )

        if inspection.encrypted:
            return (
                "processing.pdf-inspection-failed.v1",
                failed_event(
                    source,
                    "pdf_encrypted",
                    "PDF is password-protected or encrypted.",
                    "pdf-failed-encrypted-v1",
                ),
            )

        return (
            "processing.pdf-inspection-completed.v1",
            {
                "eventId": deterministic_event_id(
                    source["eventId"],
                    "pdf-completed-v1",
                ),
                "processingJobId": source["processingJobId"],
                "documentId": source["documentId"],
                "documentVersionId": source["documentVersionId"],
                "pageCount": inspection.page_count,
                "pdfVersion": inspection.pdf_version,
                "isEncrypted": False,
                "hasEmbeddedText": inspection.has_embedded_text,
                "requiresOcr": inspection.requires_ocr,
                "extractedCharacterCount": inspection.extracted_character_count,
                "engine": "pypdf",
                "engineVersion": "6.16.2",
                "textArtifact": text_artifact,
                "jsonArtifact": json_artifact,
                "occurredAt": utc_now_iso(),
            },
        )
    except Exception as exc:
        return (
            "processing.pdf-inspection-failed.v1",
            failed_event(
                source,
                "pdf_inspection_failed",
                str(exc)[:2000],
                "pdf-failed-v1",
            ),
        )
    finally:
        storage.cleanup_download(path)


def store_text_artifacts(
    storage: ObjectStorage,
    inspection,
) -> tuple[dict, dict]:
    """Gömülü metin katmanını OCR çıktısıyla aynı sözleşmede saklar."""
    full_text = "\n\n".join(inspection.page_texts)

    pages = [
        {
            "pageNumber": index,
            "width": 0,
            "height": 0,
            "text": text,
            "averageConfidence": 1.0,
            "words": [],
        }
        for index, text in enumerate(inspection.page_texts, start=1)
    ]

    document = {
        "schemaVersion": "mbb.ocr.v1",
        "engine": "pypdf",
        "engineVersion": "6.16.2",
        "languages": "embedded",
        "pageCount": len(pages),
        # Gömülü metin tanıma değil doğrudan çıkarımdır; güven tam kabul edilir.
        "averageConfidence": 1.0,
        "pages": pages,
    }

    return (
        storage.put_artifact(
            "ExtractedText",
            full_text.encode("utf-8"),
            "text/plain",
        ),
        storage.put_artifact(
            "OcrJson",
            json.dumps(
                document,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8"),
            "application/json",
        ),
    )


def failed_event(
    source: dict,
    code: str,
    detail: str,
    event_kind: str,
) -> dict:
    return {
        "eventId": deterministic_event_id(
            source["eventId"],
            event_kind,
        ),
        "processingJobId": source["processingJobId"],
        "documentId": source["documentId"],
        "documentVersionId": source["documentVersionId"],
        "failureCode": code,
        "failureDetail": detail,
        "occurredAt": utc_now_iso(),
    }


if __name__ == "__main__":
    asyncio.run(run())
