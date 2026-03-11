"""Testing Agent - Runs Gherkin BDD tests using behave."""

import subprocess
import os
import time
import re


class TestingAgent:
    name = "Testing Agent"

    def __init__(self, config=None):
        self.config = config or {}

    def run(self, context):
        start = time.time()
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        features_dir = os.path.join(project_root, "tests", "features")

        result = subprocess.run(
            ["python3", "-m", "behave", "--no-capture", features_dir],
            capture_output=True,
            text=True,
            cwd=project_root,
        )

        output = result.stdout + result.stderr
        passed, failed, skipped = self._parse_results(output)
        total = passed + failed + skipped
        success = result.returncode == 0

        context["test_results"] = {
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "behave_output": output,
        }

        elapsed = round(time.time() - start, 3)
        context.setdefault("report", []).append({
            "agent": self.name,
            "status": "success" if success else "failure",
            "duration_s": elapsed,
            "output": f"{passed}/{total} scenarios passed, {failed} failed",
        })
        return context

    def _parse_results(self, output):
        passed = failed = skipped = 0
        # Match the scenario summary line, e.g. "9 scenarios passed, 0 failed, 0 skipped"
        match = re.search(r"(\d+) scenarios? passed, (\d+) failed(?:, (\d+) skipped)?", output)
        if match:
            passed = int(match.group(1))
            failed = int(match.group(2))
            skipped = int(match.group(3)) if match.group(3) else 0
        else:
            # Fallback: parse the "N scenario" summary line
            scenario_match = re.search(r"(\d+) scenarios? (?:passed)", output)
            if scenario_match:
                passed = int(scenario_match.group(1))
        return passed, failed, skipped
