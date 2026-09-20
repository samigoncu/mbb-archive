from __future__ import annotations
import json
from datetime import datetime, timezone
import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message
from .config import RabbitConfig

class RabbitBus:
    def __init__(self,config:RabbitConfig): self.config=config; self.connection=None; self.channel=None; self.exchange=None
    async def connect(self):
        self.connection=await aio_pika.connect_robust(host=self.config.host,port=self.config.port,login=self.config.user,password=self.config.password,virtualhost=self.config.virtual_host)
        self.channel=await self.connection.channel(publisher_confirms=True,on_return_raises=True); self.exchange=await self.channel.declare_exchange(self.config.exchange,ExchangeType.TOPIC,durable=True); await self.channel.declare_exchange(self.config.dlx,ExchangeType.TOPIC,durable=True)
    async def declare_consumer_queue(self,queue_name:str,routing_key:str,dead_letter_queue:str|None=None):
        # Dead-letter routing key kuyruk adından türetilir. Bir kuyruk birden
        # fazla routing key ile bind edilebildiği için routing key'den türetmek
        # ikinci declare'de PRECONDITION_FAILED verir; .NET tarafı da aynı
        # kuralı uygular ve iki taraf aynı kuyruğu tanımlar.
        dlq=dead_letter_queue or f"{queue_name}.dead"
        queue=await self.channel.declare_queue(queue_name,durable=True,arguments={"x-dead-letter-exchange":self.config.dlx,"x-dead-letter-routing-key":dlq}); await queue.bind(self.exchange,routing_key); return queue
    async def publish(self,event_name:str,payload:dict):
        body=json.dumps(payload,separators=(",",":"),ensure_ascii=False).encode("utf-8")
        # AMQP timestamp denetim kaydının occurredAt kaynagidir. None birakilirsa
        # broker 0 gonderir ve audit journal olayi 1970-01-01 olarak yazar.
        msg=Message(body,content_type="application/json",delivery_mode=DeliveryMode.PERSISTENT,message_id=payload["eventId"],type=event_name,timestamp=_event_timestamp(payload))
        await self.exchange.publish(msg,routing_key=event_name,mandatory=True)
    async def close(self):
        if self.connection: await self.connection.close()


def _event_timestamp(payload:dict)->datetime:
    """Olayin occurredAt alanini kullanir; yoksa yayin anina duser."""
    raw=payload.get("occurredAt")
    if isinstance(raw,str) and raw:
        try:
            return datetime.fromisoformat(raw.replace("Z","+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)
