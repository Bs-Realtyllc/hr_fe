"""
Thin LLM client shared by the doc-generation scripts.

Current provider: the org's internal LLM gateway
(https://qwen-api.bsrealtyllc.com — self-hosted, currently serving
qwen2.5:3b). Switched to this from OpenRouter's free tier because
OpenRouter caps free-model usage at 50 requests/day, which this pipeline
blew through in a single day of testing across just two repos — not
workable across 5 products' worth of baseline + ongoing runs. See
docs-generator-scaffold's project memory for that history.

This is NOT an OpenAI-compatible endpoint — it's a small custom FastAPI
wrapper with a single POST /chat route:
    request:  {"message": str, "history": [{"role","content"}]=[], "system": str|None}
    response: {"response": str, "model": str}
    auth:     `x-api-key` header
No max_tokens / output-length control exists on this endpoint — the
max_tokens argument below is accepted for interface compatibility with
callers but has no effect.

    LLM_API_KEY   required. Sent as the `x-api-key` header.
    LLM_BASE_URL  required. e.g. https://qwen-api.bsrealtyllc.com
    LLM_MODEL     not used by this endpoint (the model is fixed
                  server-side) — kept as an accepted env var so the
                  interface doesn't change if a future endpoint needs it.

Requires: `requests` pip package.

---

Previous provider (OpenRouter, OpenAI-compatible, `openai` pip package)
kept here commented out in case of a future revert — this is what every
call in this file looked like before the switch above:

    import openai
    def get_client() -> openai.OpenAI:
        return openai.OpenAI(api_key=..., base_url=...)  # e.g. https://openrouter.ai/api/v1
    def complete(client, prompt, max_tokens=4000) -> str:
        resp = client.chat.completions.create(
            model=os.environ["LLM_MODEL"],  # e.g. "deepseek/deepseek-chat-v3.1:free"
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content.strip()
    # (plus the same retry-on-empty-completion/retry-on-APIError handling
    # as the current complete() below, and the free-model finish_reason ==
    # "length" -> retry with a bigger max_tokens special case)
"""

import os
import sys
import time

import requests

RETRY_DELAYS = (5, 15, 30)


def get_client() -> dict:
    """Returns a small config dict, not a real SDK client object — this
    endpoint's shape doesn't match any SDK, so complete() just uses
    `requests` directly."""
    api_key = os.environ.get("LLM_API_KEY")
    base_url = os.environ.get("LLM_BASE_URL")
    if not api_key or not base_url:
        print(
            "LLM_API_KEY and LLM_BASE_URL must both be set "
            "(see scripts/llm_client.py for what they mean).",
            file=sys.stderr,
        )
        sys.exit(1)
    return {"api_key": api_key, "base_url": base_url.rstrip("/")}


def complete(client: dict, prompt: str, max_tokens: int = 4000) -> str:
    """One-shot completion: single user turn in, plain text out.

    max_tokens is accepted for interface compatibility with callers but
    this endpoint has no output-length control — it's unused here.
    """
    last_error = None
    for attempt, delay in enumerate((0, *RETRY_DELAYS)):
        if delay:
            print(f"  ! retrying in {delay}s ({last_error})", file=sys.stderr)
            time.sleep(delay)

        try:
            resp = requests.post(
                f"{client['base_url']}/chat",
                headers={"x-api-key": client["api_key"]},
                json={"message": prompt},
                timeout=180,  # a 3B local model can be slow on long prompts
            )
            resp.raise_for_status()
        except requests.RequestException as e:
            last_error = f"request failed: {e}"
            continue

        data = resp.json()
        content = data.get("response")
        if content:
            return content.strip()
        last_error = f"empty response (raw: {str(data)[:500]})"

    raise RuntimeError(
        f"qwen-api failed after {len(RETRY_DELAYS) + 1} attempts: {last_error}."
    )
