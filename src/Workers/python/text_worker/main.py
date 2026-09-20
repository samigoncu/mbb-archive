import asyncio
import json
import os

from mbb_worker_common.config import RabbitConfig, StorageConfig
from mbb_worker_common.event import utc_now_iso
from mbb_worker_common.ids import deterministic_event_id
from mbb_worker_common.rabbit import RabbitBus
from mbb_worker_common.storage import ObjectStorage
from extractors import ExtractionError, extract
from office_formats import OFFICE_FORMATS
from office_conversion import process_office
from providers import create_provider

QUEUE = os.getenv("TEXT_QUEUE", "mbb.archive.processing.text.v1")
ROUTING_KEY = "processing.text-extraction-requested.v1"
ENGINE_VERSION = "1.0.0"

COMPLETED_EVENT = "processing.text-extraction-completed.v1"
FAILED_EVENT = "processing.text-extraction-failed.v1"


async def run() -> None:
    bus = RabbitBus(RabbitConfig())
    await bus.connect()

    storage = ObjectStorage(StorageConfig())

    queue = await bus.declare_consumer_queue(QUEUE, ROUTING_KEY)
    await bus.channel.set_qos(prefetch_count=1)
    provider = create_provider()

    async with queue.iterator() as messages:
        async for message in messages:
            async with message.process(requeue=True, ignore_processed=True):
                source = json.loads(message.body)
                event_name, result = extract_document(source, storage, provider)

                # RabbitBus publisher confirms açık; yayın başarısız olursa
                # istisna yükselir ve kaynak mesaj yeniden kuyruğa alınır.
                await bus.publish(event_name, result)


def extract_document(source: dict, storage: ObjectStorage, provider=None) -> tuple[str, dict]:
    path = None

    try:
        if source["mimeType"] in OFFICE_FORMATS:
            result = process_office(source, storage, provider or create_provider())
            return COMPLETED_EVENT, {
                "eventId": deterministic_event_id(source["eventId"], "office-completed-v1"),
                "processingJobId": source["processingJobId"], "documentId": source["documentId"],
                "documentVersionId": source["documentVersionId"], "occurredAt": utc_now_iso(), **result,
            }
        path = storage.download_original(source["originalStorageKey"])
        pages, engine = extract(path, source["mimeType"])

        if not pages:
            return FAILED_EVENT, failed_event(
                source,
                "no_text_content",
                "The document contains no extractable text.",
                "text-failed-empty-v1",
            )

        full_text = "\n\n".join(pages)

        artifact = storage.put_artifact(
            "ExtractedText",
            full_text.encode("utf-8"),
            "text/plain",
        )

        return COMPLETED_EVENT, {
            "eventId": deterministic_event_id(
                source["eventId"],
                "text-completed-v1",
            ),
            "processingJobId": source["processingJobId"],
            "documentId": source["documentId"],
            "documentVersionId": source["documentVersionId"],
            "engine": engine,
            "engineVersion": ENGINE_VERSION,
            "pageCount": len(pages),
            "characterCount": len(full_text),
            "textArtifact": artifact,
            "occurredAt": utc_now_iso(),
        }
    except ExtractionError as exc:
        return FAILED_EVENT, failed_event(
            source,
            exc.code,
            exc.detail,
            f"text-failed-{exc.code}-v1",
        )
    except Exception as exc:  # noqa: BLE001 - altyapı dışı her hata kalıcıdır
        return FAILED_EVENT, failed_event(
            source,
            "text_extraction_failed",
            str(exc)[:2000],
            "text-failed-v1",
        )
    finally:
        if path is not None: storage.cleanup_download(path)


def failed_event(
    source: dict,
    code: str,
    detail: str,
    event_kind: str,
) -> dict:
    return {
        "eventId": deterministic_event_id(source["eventId"], event_kind),
        "processingJobId": source["processingJobId"],
        "documentId": source["documentId"],
        "documentVersionId": source["documentVersionId"],
        "failureCode": code,
        "failureDetail": detail,
        "occurredAt": utc_now_iso(),
    }


if __name__ == "__main__":
    asyncio.run(run())
