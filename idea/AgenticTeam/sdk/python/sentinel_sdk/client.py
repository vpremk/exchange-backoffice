# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""HTTP client for communicating with the Compliance Sentinel backend."""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger("sentinel_sdk.client")

_DEFAULT_TIMEOUT = 10  # seconds


class SentinelClient:
    """Lightweight HTTP client — uses only stdlib ``urllib`` + optional ``requests``."""

    def __init__(
        self,
        endpoint: str,
        api_key: str,
        tenant: str,
        timeout: int = _DEFAULT_TIMEOUT,
    ):
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key
        self.tenant = tenant
        self.timeout = timeout
        self._session = None  # lazy-init requests.Session if available

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def send_traces(self, traces: List[Dict[str, Any]]) -> Dict[str, Any]:
        """POST a batch of traces to ``/api/v1/traces``."""
        return self._post("/api/v1/traces", {"traces": traces, "tenant": self.tenant})

    def check_compliance(self, attributes: Dict[str, Any]) -> Dict[str, Any]:
        """POST a real-time compliance check to ``/api/v1/check``."""
        return self._post(
            "/api/v1/check",
            {"attributes": attributes, "tenant": self.tenant},
        )

    def send_cost_events(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """POST cost-tracking events to ``/api/v1/costs``."""
        return self._post("/api/v1/costs", {"events": events, "tenant": self.tenant})

    def health(self) -> Dict[str, Any]:
        """GET ``/api/v1/health``."""
        return self._get("/api/v1/health")

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Sentinel-Tenant": self.tenant,
        }

    def _post(self, path: str, body: Any) -> Dict[str, Any]:
        url = f"{self.endpoint}{path}"
        data = json.dumps(body).encode("utf-8")
        try:
            req = Request(url, data=data, headers=self._headers(), method="POST")
            with urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as exc:
            logger.error("Sentinel API error %s %s: %s", exc.code, url, exc.reason)
            return {"error": exc.reason, "status": exc.code}
        except URLError as exc:
            logger.warning("Sentinel API unreachable %s: %s", url, exc.reason)
            return {"error": str(exc.reason), "status": 0}
        except Exception as exc:
            logger.warning("Sentinel API request failed: %s", exc)
            return {"error": str(exc), "status": 0}

    def _get(self, path: str) -> Dict[str, Any]:
        url = f"{self.endpoint}{path}"
        try:
            req = Request(url, headers=self._headers(), method="GET")
            with urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            logger.warning("Sentinel API GET failed: %s", exc)
            return {"error": str(exc), "status": 0}
