import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

import re

def detectar_transportadora(tracking_url: str, tracking_code: str = "") -> str:
    code_upper = tracking_code.upper().strip() if tracking_code else ""
    
    # 1. Padrão Absoluto dos Correios: XX123456789BR
    if re.match(r"^[A-Z]{2}[0-9]{9}BR$", code_upper):
        return "correios"
        
    # 2. Padrão J&T Express: 14 a 15 dígitos numéricos OU começa com TX/888
    if (len(code_upper) in (14, 15) and code_upper.isdigit()) or code_upper.startswith("TX") or code_upper.startswith("888"):
        return "jtexpress-br"
        
    # 3. Padrão Jadlog: 9 dígitos numéricos
    if len(code_upper) == 9 and code_upper.isdigit():
        return "jadlog"
        
    # Caso a URL não venha vazia e nenhum regex tenha batido fatalmente
    if not tracking_url:
        return "auto"
        
    url_lower = tracking_url.lower()
    if "jadlog.com.br" in url_lower:
        return "jadlog"
    if "correios.com.br" in url_lower:
        return "correios"
    if "jtexpress.com.br" in url_lower or "jnt" in url_lower:
        return "jtexpress-br"
        
    return "auto"

def parse_keedpay_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Extrai informações relevantes do payload da Keedpay"""
    
    # Previne KeyError
    # Previne KeyError e manda código e URL para cruzar dados
    tracking_code = payload.get("tracking_code", "")
    tracking_url = payload.get("tracking_url", "")
    carrier = detectar_transportadora(tracking_url, tracking_code)
    
    return {
        "tracking_code": payload.get("tracking_code"),
        "carrier": carrier,
        "customer_name": payload.get("customer_name"),
        "customer_email": payload.get("customer_email"),
        "customer_phone": payload.get("customer_phone"),
        "customer_document": payload.get("customer_document"),
        "customer_address": payload.get("customer_address", {}),
        "product_name": payload.get("product_name"),
        "amount": payload.get("amount"),
        "transaction_id": payload.get("transaction_id"),
        "payload_keedpay": payload
    }
