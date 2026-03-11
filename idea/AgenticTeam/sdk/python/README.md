# sentinel-sdk

Python SDK for [Compliance Sentinel](https://sentinel.dev) — instrument your AI agents with one-line setup for real-time compliance monitoring.

## Install

```bash
pip install sentinel-sdk
```

With framework integrations:

```bash
pip install sentinel-sdk[langchain]    # LangChain
pip install sentinel-sdk[crewai]       # CrewAI
pip install sentinel-sdk[all]          # Everything
```

## Quick Start

```python
from sentinel_sdk import Sentinel

sentinel = Sentinel(
    endpoint="https://sentinel.internal.company.com",
    api_key="sk-...",
    tenant="healthcare-division",
    regulations=["HIPAA", "SOC2"],
)
```

### Decorator Tracing

```python
@sentinel.trace(name="patient-lookup-agent")
def lookup_patient(patient_id: str):
    # All LLM calls inside are automatically traced
    ...
```

### Context Manager

```python
with sentinel.span("llm-call", attributes={"model": "claude-sonnet-4", "data_category": "PHI"}):
    response = client.messages.create(...)
```

### Pre-flight Compliance Check

```python
result = sentinel.check_compliance(
    action="access_patient_record",
    attributes={"data_category": "PHI", "authorization_context": "dr-smith-auth-token"},
)
if result.get("blocked"):
    print("Blocked:", result["block_messages"])
```

### Cost Tracking

```python
sentinel.track_cost(model="claude-sonnet-4", input_tokens=1500, output_tokens=800)
print(f"Total spend: ${sentinel.total_cost:.4f}")
```

### LangChain Integration

```python
from sentinel_sdk.integrations import SentinelLangChainCallback

callback = SentinelLangChainCallback(sentinel)
chain.invoke(input, config={"callbacks": [callback]})
```

### CrewAI Integration

```python
from sentinel_sdk.integrations import SentinelCrewAIHandler

handler = SentinelCrewAIHandler(sentinel)
handler.on_crew_start("research-crew")
# ... crew runs ...
handler.on_crew_end()
```

## Air-Gap / Offline Mode

The SDK automatically buffers traces to disk when the backend is unreachable:

```python
sentinel = Sentinel(
    endpoint="https://sentinel.internal.company.com",
    api_key="sk-...",
    tenant="secure-enclave",
    buffer_dir="/opt/sentinel/buffer",
)

# When connectivity is restored:
sentinel.flush_buffer()
```

## No-Op Mode

Disable all SDK behaviour without changing your code:

```python
sentinel = Sentinel(enabled=False)
```

## Zero Dependencies

The SDK uses only Python stdlib (`urllib`, `json`, `threading`). Framework integrations (LangChain, CrewAI) are optional extras.
