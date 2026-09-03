import uuid
NAMESPACE=uuid.UUID("72c109b4-f9a4-4df9-b91a-138d1d67a513")
def deterministic_event_id(source_event_id: str, event_kind: str) -> str:
    return str(uuid.uuid5(NAMESPACE,f"{source_event_id}:{event_kind}"))
