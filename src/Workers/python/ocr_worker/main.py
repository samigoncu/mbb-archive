import asyncio
import json
import os

from mbb_worker_common.config import RabbitConfig, StorageConfig
from mbb_worker_common.event import utc_now_iso
from mbb_worker_common.ids import deterministic_event_id
from mbb_worker_common.rabbit import RabbitBus
from mbb_worker_common.storage import ObjectStorage
from providers import create_provider
from renderer import render_pages
from searchable_pdf import create_searchable_pdf

QUEUE = os.getenv("OCR_QUEUE", "mbb.archive.processing.ocr.v1")
ROUTING_KEY = "processing.ocr-requested.v1"


async def run() -> None:
    bus = RabbitBus(RabbitConfig())
    await bus.connect()

    storage = ObjectStorage(StorageConfig())
    provider = create_provider()

    queue = await bus.declare_consumer_queue(
        QUEUE,
        ROUTING_KEY,
    )
    await bus.channel.set_qos(prefetch_count=1)

    async with queue.iterator() as messages:
        async for message in messages:
            async with message.process(
                requeue=True,
                ignore_processed=True,
            ):
                source = json.loads(message.body)
                event_name, result = process_document(
                    source,
                    storage,
                    provider,
                )

                # Publish failure must not be transformed into an OCR business
                # failure. It escapes this callback and RabbitMQ redelivers input.
                await bus.publish(event_name, result)


def process_document(
    source: dict,
    storage: ObjectStorage,
    provider,
) -> tuple[str, dict]:
    path = storage.download_original(source["originalStorageKey"])
    searchable_pdf = None

    try:
        dpi = int(os.getenv("OCR_RENDER_DPI", "200"))
        pages = [
            provider.recognize(page_number, image)
            for page_number, image in render_pages(
                path,
                source["mimeType"],
                dpi,
            )
        ]

        if not pages:
            raise RuntimeError("OCR input produced no pages.")

        full_text = "\n\n".join(page.text for page in pages)
        average_confidence = sum(
            page.average_confidence for page in pages
        ) / len(pages)

        ocr_json = {
            "schemaVersion": "mbb.ocr.v1",
            "engine": provider.name,
            "engineVersion": provider.version,
            "languages": provider.languages,
            "pageCount": len(pages),
            "averageConfidence": average_confidence,
            "pages": [page.as_dict() for page in pages],
        }

        text_artifact = storage.put_artifact(
            "ExtractedText",
            full_text.encode("utf-8"),
            "text/plain",
        )
        json_artifact = storage.put_artifact(
            "OcrJson",
            json.dumps(
                ocr_json,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8"),
            "application/json",
        )

        searchable_descriptor = None
        searchable_pdf = create_searchable_pdf(
            path,
            provider.languages,
            source["mimeType"],
        )

        if searchable_pdf is not None:
            searchable_descriptor = storage.put_artifact(
                "SearchablePdf",
                searchable_pdf.read_bytes(),
                "application/pdf",
            )

        return (
            "processing.ocr-completed.v1",
            {
                "eventId": deterministic_event_id(
                    source["eventId"],
                    "ocr-completed-v1",
                ),
                "processingJobId": source["processingJobId"],
                "documentId": source["documentId"],
                "documentVersionId": source["documentVersionId"],
                "engine": provider.name,
                "engineVersion": provider.version,
                "languages": provider.languages,
                "pageCount": len(pages),
                "averageConfidence": average_confidence,
                "textArtifact": text_artifact,
                "jsonArtifact": json_artifact,
                "searchablePdfArtifact": searchable_descriptor,
                "occurredAt": utc_now_iso(),
            },
        )
    except Exception as exc:
        return (
            "processing.ocr-failed.v1",
            {
                "eventId": deterministic_event_id(
                    source["eventId"],
                    "ocr-failed-v1",
                ),
                "processingJobId": source["processingJobId"],
                "documentId": source["documentId"],
                "documentVersionId": source["documentVersionId"],
                "failureCode": "ocr_failed",
                "failureDetail": str(exc)[:2000],
                "occurredAt": utc_now_iso(),
            },
        )
    finally:
        if searchable_pdf is not None:
            searchable_pdf.unlink(missing_ok=True)

        storage.cleanup_download(path)


if __name__ == "__main__":
    asyncio.run(run())
