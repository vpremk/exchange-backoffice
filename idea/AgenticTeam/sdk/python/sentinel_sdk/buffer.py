# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""Offline disk buffer for air-gapped and unreliable-network environments.

Traces are serialised to a local directory as JSON files and flushed to
the backend when connectivity is restored.  Safe for concurrent writers.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("sentinel_sdk.buffer")


class DiskBuffer:
    """Append-only, crash-safe buffer backed by a local directory."""

    def __init__(self, directory: Optional[str] = None, max_files: int = 10_000):
        if directory:
            self.directory = Path(directory)
        else:
            self.directory = Path(tempfile.gettempdir()) / "sentinel_sdk_buffer"
        self.directory.mkdir(parents=True, exist_ok=True)
        self.max_files = max_files

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def append(self, payload: Dict[str, Any]) -> str:
        """Write a payload to disk.  Returns the file path."""
        if self._count() >= self.max_files:
            logger.warning("Buffer full (%d files), dropping oldest", self.max_files)
            self._evict_oldest()

        fname = f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}.json"
        fpath = self.directory / fname

        # Atomic write via rename
        tmp = fpath.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload), encoding="utf-8")
        tmp.rename(fpath)

        return str(fpath)

    # ------------------------------------------------------------------
    # Read / drain
    # ------------------------------------------------------------------

    def drain(self, batch_size: int = 100) -> List[Dict[str, Any]]:
        """Read and remove up to ``batch_size`` buffered payloads (oldest first)."""
        items: List[Dict[str, Any]] = []
        files = sorted(self.directory.glob("*.json"))[:batch_size]
        for fpath in files:
            try:
                items.append(json.loads(fpath.read_text(encoding="utf-8")))
                fpath.unlink()
            except Exception as exc:
                logger.warning("Failed to read buffered file %s: %s", fpath, exc)
        return items

    def peek(self, batch_size: int = 100) -> List[Dict[str, Any]]:
        """Read up to ``batch_size`` buffered payloads without removing them."""
        items: List[Dict[str, Any]] = []
        files = sorted(self.directory.glob("*.json"))[:batch_size]
        for fpath in files:
            try:
                items.append(json.loads(fpath.read_text(encoding="utf-8")))
            except Exception:
                pass
        return items

    # ------------------------------------------------------------------
    # Housekeeping
    # ------------------------------------------------------------------

    @property
    def size(self) -> int:
        return self._count()

    @property
    def is_empty(self) -> bool:
        return self._count() == 0

    def clear(self) -> int:
        """Delete all buffered files.  Returns the count removed."""
        count = 0
        for fpath in self.directory.glob("*.json"):
            fpath.unlink(missing_ok=True)
            count += 1
        return count

    def _count(self) -> int:
        return len(list(self.directory.glob("*.json")))

    def _evict_oldest(self) -> None:
        files = sorted(self.directory.glob("*.json"))
        if files:
            files[0].unlink(missing_ok=True)
