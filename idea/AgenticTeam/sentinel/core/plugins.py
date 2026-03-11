# SPDX-License-Identifier: Apache-2.0
# Copyright 2025 Compliance Sentinel Contributors

"""Plugin interface for custom compliance rule functions.

A plugin is any callable with the signature::

    def my_rule(span: dict, rule: Rule) -> bool:
        ...

Plugins can be registered in two ways:

1. **Decorator** — at import time::

    @register_plugin("mymodule.check_pii")
    def check_pii(span, rule):
        return "pii" in span.get("attributes", {})

2. **Dotted-path resolution** — the engine will attempt to import the
   function referenced by ``rule.plugin`` (e.g.
   ``"sentinel.plugins.hipaa.check_phi"``).

"""

from __future__ import annotations

import importlib
from typing import Any, Callable, Protocol

from sentinel.models.compliance import Rule


# ---------------------------------------------------------------------------
# Protocol for plugin functions
# ---------------------------------------------------------------------------

class PluginFunction(Protocol):
    def __call__(self, span: dict[str, Any], rule: Rule) -> bool: ...


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

_REGISTRY: dict[str, PluginFunction] = {}


def register_plugin(name: str) -> Callable:
    """Decorator to register a plugin function by name."""

    def decorator(fn: PluginFunction) -> PluginFunction:
        _REGISTRY[name] = fn
        return fn

    return decorator


def get_plugin(name: str) -> PluginFunction | None:
    """Look up a plugin by name, falling back to dynamic import."""
    if name in _REGISTRY:
        return _REGISTRY[name]

    # Try dynamic import: "package.module.function"
    parts = name.rsplit(".", 1)
    if len(parts) == 2:
        module_path, func_name = parts
        try:
            module = importlib.import_module(module_path)
            fn = getattr(module, func_name, None)
            if callable(fn):
                _REGISTRY[name] = fn
                return fn
        except (ImportError, AttributeError):
            pass

    return None


def list_plugins() -> list[str]:
    """Return all registered plugin names."""
    return list(_REGISTRY.keys())


def clear_plugins() -> None:
    """Clear the plugin registry (useful for testing)."""
    _REGISTRY.clear()
