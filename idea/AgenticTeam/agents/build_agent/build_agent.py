"""Build Agent - Compiles and packages build artifacts."""

import time
import hashlib


class BuildAgent:
    name = "Build Agent"

    def __init__(self, config=None):
        self.config = config or {}

    def run(self, context):
        start = time.time()
        source_files = context.get("source_files", [])
        artifact_hash = hashlib.sha256(",".join(source_files).encode()).hexdigest()[:12]
        context["build_artifact"] = {
            "name": f"agentic-team-v1.0.0-{artifact_hash}.tar.gz",
            "size_kb": context.get("lines_of_code", 0) * 2,
            "files_bundled": len(source_files),
        }
        elapsed = round(time.time() - start, 3)
        context.setdefault("report", []).append({
            "agent": self.name,
            "status": "success",
            "duration_s": elapsed,
            "output": f"Built artifact: {context['build_artifact']['name']}",
        })
        return context
