"""Helpers to patch OpenAPI specs for MCP compatibility."""

from copy import deepcopy
from typing import Any


def _inline_openapi_refs(schema: Any, components: dict[str, Any], seen: set[str] | None = None) -> Any:
    if not components:
        return schema
    if seen is None:
        seen = set()
    if isinstance(schema, dict):
        ref = schema.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
            name = ref.split("/")[-1]
            if name in seen:
                return schema
            target = components.get(name)
            if target is None:
                return schema
            seen.add(name)
            resolved = _inline_openapi_refs(deepcopy(target), components, seen)
            seen.remove(name)
            return resolved
        return {key: _inline_openapi_refs(value, components, seen) for key, value in schema.items()}
    if isinstance(schema, list):
        return [_inline_openapi_refs(item, components, seen) for item in schema]
    return schema


def patch_openapi_spec_for_mcp(openapi_spec: dict[str, Any]) -> dict[str, Any]:
    components = openapi_spec.get("components", {}).get("schemas", {})
    if not components:
        return openapi_spec
    inline_operation_ids = {
        "calculate_link_budget",
        "list_modcod",
        "list_scenarios",
        "create_scenario",
        "get_scenario",
        "update_scenario",
    }
    success_statuses = {"200", "201"}
    for methods in openapi_spec.get("paths", {}).values():
        if not isinstance(methods, dict):
            continue
        for operation in methods.values():
            if not isinstance(operation, dict):
                continue
            if operation.get("operationId") not in inline_operation_ids:
                continue
            responses = operation.get("responses", {})
            if not isinstance(responses, dict):
                continue
            for status_code in success_statuses:
                response = responses.get(status_code)
                if not isinstance(response, dict):
                    continue
                content = response.get("content", {})
                if not isinstance(content, dict):
                    continue
                payload = content.get("application/json")
                if not isinstance(payload, dict):
                    continue
                schema = payload.get("schema")
                if schema is None:
                    continue
                payload["schema"] = _inline_openapi_refs(schema, components)
    return openapi_spec
