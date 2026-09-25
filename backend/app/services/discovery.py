"""Bounded LAN discovery for Solplanet dongles.

Only administrators can reach this through the authenticated gateway. The scan
accepts private IPv4 ranges of at most 256 addresses to avoid an SSRF scanner.
"""

import asyncio
import ipaddress
import logging

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)
PRIVATE_NETWORKS = tuple(ipaddress.ip_network(value) for value in (
    "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"
))


async def discover_inverters(subnet: str, port: int = 8484) -> list[dict]:
    try:
        network = ipaddress.ip_network(subnet, strict=False)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid subnet") from exc
    if network.version != 4 or not any(network.subnet_of(allowed) for allowed in PRIVATE_NETWORKS) or network.num_addresses > 256:
        raise HTTPException(status_code=422, detail="Use a private IPv4 subnet with at most 256 addresses")
    if not 1 <= port <= 65535:
        raise HTTPException(status_code=422, detail="Invalid port")

    semaphore = asyncio.Semaphore(32)
    timeout = httpx.Timeout(1.5)
    found: list[dict] = []

    async with httpx.AsyncClient(timeout=timeout, trust_env=False, follow_redirects=False) as client:
        async def probe(address: ipaddress.IPv4Address):
            async with semaphore:
                try:
                    response = await client.get(f"http://{address}:{port}/getdev.cgi", params={"device": "2"})
                    response.raise_for_status()
                    payload = response.json()
                    if not isinstance(payload, dict):
                        return
                    for item in payload.get("inv", []):
                        if not isinstance(item, dict):
                            continue
                        serial = item.get("isn")
                        if isinstance(serial, str) and 4 <= len(serial) <= 64:
                            found.append({"ip_address": str(address), "port": port,
                                          "serial_number": serial.strip(), "model": str(item.get("model", "")).strip()[:100]})
                except (httpx.HTTPError, ValueError, TypeError):
                    return

        await asyncio.gather(*(probe(address) for address in network.hosts()))
    logger.info("Discovery found %d inverter(s) in %s", len(found), network)
    return sorted(found, key=lambda item: (item["ip_address"], item["serial_number"]))
