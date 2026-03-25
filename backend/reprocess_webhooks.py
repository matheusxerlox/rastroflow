import asyncio
import uuid
import sys
import os

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone

# Ajustar PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models.webhook_log import WebhookLog
from app.models.shipment import Shipment
from app.models.user import User

async def main():
    async with AsyncSessionLocal() as db:
        print("Buscando logs não processados da 17Track...")
        stmt = select(WebhookLog).where(
            WebhookLog.provider == "17track"
        )
        logs = (await db.execute(stmt)).scalars().all()
        
        reprocessados = 0
        
        for wlog in logs:
            try:
                payload = wlog.payload
                event_name = payload.get("event", "")
                data_dict = payload.get("data", {})
                
                if event_name == "TRACKING_UPDATED":
                    items = data_dict if isinstance(data_dict, list) else [data_dict]
                    for item in items:
                        if not isinstance(item, dict): continue
                        tag = item.get("tag", "")
                        if not tag.startswith("shipment_"):
                            continue
                            
                        shipment_id = tag.replace("shipment_", "")
                        
                        stmt_ship = select(Shipment).where(Shipment.id == shipment_id)
                        shipment = (await db.execute(stmt_ship)).scalar_one_or_none()
                        
                        if shipment:
                            track_info = item.get("track_info", {})
                            latest_status = track_info.get("latest_status", {})
                            status_code = latest_status.get("status", "NotFound")
                            sub_status = latest_status.get("sub_status", "")
                            
                            stmt_user = select(User).where(User.id == shipment.user_id)
                            user = (await db.execute(stmt_user)).scalar_one_or_none()
                            
                            shipment.status = status_code
                            shipment.sub_status = sub_status
                            shipment.events = item
                            shipment.updated_at = datetime.now(timezone.utc)
                            
                            if status_code == "OutForDelivery":
                                shipment.polling_ativo = True
                            
                            if status_code == "Delivered":
                                shipment.polling_ativo = False
                                shipment.delivered_at = datetime.now(timezone.utc)
                            
                            wlog.processed = True
                            wlog.user_id = user.id if user else None
                            wlog.tracking_number = shipment.tracking_number
                            
                            if status_code in ["Exception", "DeliveryFailure"]:
                                pass
                                        
                            reprocessados += 1
                
                elif event_name == "TRACKING_STOPPED":
                    items = data_dict if isinstance(data_dict, list) else [data_dict]
                    for item in items:
                        if not isinstance(item, dict): continue
                        tag = item.get("tag", "")
                        if tag.startswith("shipment_"):
                            shipment_id = tag.replace("shipment_", "")
                            stmt_ship = select(Shipment).where(Shipment.id == shipment_id)
                            shipment = (await db.execute(stmt_ship)).scalar_one_or_none()
                            if shipment:
                                shipment.polling_ativo = False
                                wlog.processed = True
                                wlog.user_id = shipment.user_id
                                wlog.tracking_number = shipment.tracking_number
                                reprocessados += 1
                                
            except Exception as e:
                print(f"Erro no log {wlog.id}: {e}")
                
        await db.commit()
        print(f"Sucesso! {reprocessados} registros foram reprocessados e atualizados.")

if __name__ == "__main__":
    asyncio.run(main())
