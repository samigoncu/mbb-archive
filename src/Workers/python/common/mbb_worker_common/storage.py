from __future__ import annotations
import hashlib, os
from pathlib import Path
from tempfile import NamedTemporaryFile
import boto3
from .config import StorageConfig

class ObjectStorage:
    def __init__(self, config: StorageConfig): self.config=config; self._s3=None
    def _client(self):
        if self._s3 is None:
            self._s3=boto3.client("s3",endpoint_url=self.config.service_url,region_name=self.config.region,aws_access_key_id=self.config.access_key,aws_secret_access_key=self.config.secret_key)
        return self._s3
    def download_original(self,key:str)->Path:
        if self.config.provider=="local": return self._resolve(self.config.original_root,key)
        temp=NamedTemporaryFile(delete=False,suffix=".bin"); temp.close(); self._client().download_file(self.config.bucket,key,temp.name); return Path(temp.name)
    def cleanup_download(self,path:Path):
        if self.config.provider!="local": path.unlink(missing_ok=True)
    def put_artifact(self,artifact_type:str,data:bytes,mime_type:str)->dict:
        sha=hashlib.sha256(data).hexdigest(); key=f"artifacts/sha256/{sha[:2]}/{sha[2:4]}/{sha}.{self._extension(mime_type)}"
        if self.config.provider=="local":
            path=self._resolve(self.config.artifact_root,key); path.parent.mkdir(parents=True,exist_ok=True)
            if not path.exists():
                temp=path.with_suffix(path.suffix+f".{os.getpid()}.part"); temp.write_bytes(data); os.replace(temp,path)
        else:
            bucket=self.config.artifact_bucket or self.config.bucket
            self._client().put_object(Bucket=bucket,Key=key,Body=data,ContentType=mime_type,Metadata={"sha256":sha,"artifact-type":artifact_type})
        return {"artifactType":artifact_type,"storageKey":key,"mimeType":mime_type,"sha256Hash":sha,"sizeBytes":len(data)}
    @staticmethod
    def _resolve(root:str,key:str)->Path:
        base=Path(root).resolve(); full=(base/key).resolve()
        if base not in full.parents and full!=base: raise ValueError("Storage key escapes configured root.")
        return full
    @staticmethod
    def _extension(mime:str)->str:
        return {"text/plain":"txt","application/json":"json","application/pdf":"pdf"}.get(mime,"bin")
