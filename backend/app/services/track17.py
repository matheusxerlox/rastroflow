import os
import httpx
import hashlib
import json
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SEVENTEEN_TRACK_API_KEY")
BASE_URL = "https://api.17track.net/track/v2.2"

logger = logging.getLogger(__name__)

async def register_shipments(shipments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Registra um lote de encomendas no 17TRACK.
    shipments é uma lista de dicionários no formato:
    [{"number": "...", "carrier": 0, "tag": "shipment_uuid_...", "lang": "pt"}]
    """
    if not API_KEY:
        logger.error("SEVENTEEN_TRACK_API_KEY não configurada.")
        return []

    url = f"{BASE_URL}/register"
    headers = {
        "17token": API_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=shipments, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") in [0, 100]:
                # Retorna os itens aceitos
                return data.get("data", {}).get("accepted", [])
            else:
                logger.error(f"Erro na API 17TRACK (register): {data}")
                return []
    except Exception as e:
        logger.error(f"Exceção ao chamar 17TRACK register: {e}")
        return []

async def push_shipments(shipments_payload: List[Dict[str, Any]]) -> bool:
    """
    Força a atualização no 17TRACK para um lote.
    shipments_payload = [{"number": "...", "carrier": 0}]
    """
    if not API_KEY:
        return False

    url = f"{BASE_URL}/push"
    headers = {
        "17token": API_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=shipments_payload, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data.get("code") == 0
    except Exception as e:
        logger.error(f"Exceção ao chamar 17TRACK push: {e}")
        return False

def verify_17track_signature(event_name: str, payload_json_str: str, signature: str) -> bool:
    """
    Verifica a assinatura do webhook do 17TRACK.
    SHA256(event + "/" + data_json + "/" + api_key)
    """
    if not API_KEY:
        return False
        
    concat_str = f"{event_name}/{payload_json_str}/{API_KEY}"
    expected_hash = hashlib.sha256(concat_str.encode("utf-8")).hexdigest()
    
    return expected_hash == signature

async def get_quota_17track() -> int:
    if not API_KEY: return 0
    url = f"{BASE_URL}/getquota"
    headers = {
        "17token": API_KEY,
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json={}, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == 0:
                    return data.get("data", {}).get("quantity", 0)
    except Exception:
        pass
    return 0

async def delete_shipments_17track(tracking_numbers: List[str], carrier: int = 0) -> bool:
    if not tracking_numbers or not API_KEY: return False
    url = f"{BASE_URL}/delete"
    headers = {"17token": API_KEY, "Content-Type": "application/json"}
    payload = [{"number": num, "carrier": carrier} for num in tracking_numbers]
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if response.status_code == 200: return True
    except:
        pass
    return False
