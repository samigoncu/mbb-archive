from dataclasses import dataclass
import os

@dataclass(frozen=True)
class RabbitConfig:
    host: str=os.getenv("RABBITMQ_HOST","localhost"); port: int=int(os.getenv("RABBITMQ_PORT","5672")); user: str=os.getenv("RABBITMQ_USER","mbb_archive"); password: str=os.getenv("RABBITMQ_PASSWORD","change-me-local-only"); virtual_host: str=os.getenv("RABBITMQ_VHOST","/"); exchange: str=os.getenv("RABBITMQ_EXCHANGE","mbb.archive.events"); dlx: str=os.getenv("RABBITMQ_DLX","mbb.archive.dlx")

@dataclass(frozen=True)
class StorageConfig:
    provider: str=os.getenv("STORAGE_PROVIDER","local").lower(); original_root: str=os.getenv("ORIGINAL_STORAGE_ROOT","/data/originals"); artifact_root: str=os.getenv("ARTIFACT_STORAGE_ROOT","/data/artifacts"); bucket: str=os.getenv("STORAGE_BUCKET",""); artifact_bucket: str=os.getenv("ARTIFACT_BUCKET",""); service_url: str|None=os.getenv("STORAGE_SERVICE_URL") or None; region: str|None=os.getenv("STORAGE_REGION") or None; access_key: str|None=os.getenv("STORAGE_ACCESS_KEY") or None; secret_key: str|None=os.getenv("STORAGE_SECRET_KEY") or None
