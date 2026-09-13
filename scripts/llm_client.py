"""
Thin, provider-agnostic LLM client shared by the doc-generation scripts.

Talks to any OpenAI-compatible chat completions endpoint — OpenRouter,
Groq, Together, a local Ollama server, or Anthropic's own OpenAI-compat
endpoint — so swapping providers or models is a config change (env vars),
never a code change:

    LLM_API_KEY   required. API key for whichever endpoint LLM_BASE_URL points at.
    LLM_BASE_URL  required. e.g. https://openrouter.ai/api/v1
    LLM_MODEL     required. e.g. "deepseek/deepseek-chat-v3.1:free" (OpenRouter),
                  or any model slug the endpoint serves. Free-tier model
                  availability changes over time — check the provider's own
                  model list rather than assuming a specific slug still exists.

Requires: `openai` pip package (works against any OpenAI-compatible API,
not just OpenAI itself).
"""

import os
import sys
import time

import openai


def get_client() -> openai.OpenAI:
    api_key = os.environ.get("LLM_API_KEY")
    base_url = os.environ.get("LLM_BASE_URL")
    if not api_key or not base_url:
        print(
            "LLM_API_KEY and LLM_BASE_URL must both be set "
            "(see scripts/llm_client.py for what they mean).",
            file=sys.stderr,
        )
        sys.exit(1)
    return openai.OpenAI(api_key=api_key, base_url=base_url)


# Free-tier gateways (OpenRouter especially) are flaky under load: transient
# 5xx/rate-limit/upstream-provider errors are common and usually succeed on
# retry, and some of them come back as HTTP 200 with no `choices` at all
# instead of raising — so both exceptions and a malformed response body are
# treated as retryable here, not just the openai SDK's own exception types.
RETRY_DELAYS = (5, 15, 30)


def complete(client: openai.OpenAI, prompt: str, max_tokens: int = 4000) -> str:
    """One-shot completion: single user turn in, plain text out."""
    model = os.environ.get("LLM_MODEL")
    if not model:
        print("LLM_MODEL must be set.", file=sys.stderr)
        sys.exit(1)

    last_error = None
    for attempt, delay in enumerate((0, *RETRY_DELAYS)):
        if delay:
            print(f"  ! retrying in {delay}s ({last_error})", file=sys.stderr)
            time.sleep(delay)

        try:
            resp = client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
        except openai.APIError as e:
            last_error = f"API error: {e}"
            continue

        if not resp.choices:
            last_error = f"response had no choices (raw: {str(resp)[:500]})"
            continue

        choice = resp.choices[0]
        content = choice.message.content
        if content:
            return content.strip()

        # Empty content with a real choice usually means a reasoning model
        # burned its whole budget on hidden reasoning before answering —
        # give it more room rather than just retrying with the same budget.
        if choice.finish_reason == "length" and max_tokens < 20_000:
            max_tokens *= 3
        last_error = f"empty completion (finish_reason={choice.finish_reason})"

    raise RuntimeError(
        f"'{model}' failed after {len(RETRY_DELAYS) + 1} attempts: {last_error}. "
        "If this keeps happening, the free model/endpoint may be overloaded or "
        "rate-limited — try a different free model, or check the provider's status."
    )
