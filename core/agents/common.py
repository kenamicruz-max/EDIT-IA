from dataclasses import dataclass
from typing import Any
@dataclass
class AgentResult:
    name: str
    data: dict[str, Any]
    ok: bool = True
    error: str | None = None

def safe_float(v: Any, default=0.0):
    try: return float(v)
    except (TypeError, ValueError): return default
