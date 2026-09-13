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


def complete(client: openai.OpenAI, prompt: str, max_tokens: int = 4000) -> str:
    """One-shot completion: single user turn in, plain text out.

    Free-tier reasoning models (common on OpenRouter) can spend the whole
    max_tokens budget on hidden reasoning and never emit visible content —
    `message.content` comes back None with `finish_reason: "length"`, not
    an error. Retry once with a bigger budget before giving up, and fail
    with a clear message rather than a raw TypeError two frames down.
    """
    model = os.environ.get("LLM_MODEL")
    if not model:
        print("LLM_MODEL must be set.", file=sys.stderr)
        sys.exit(1)

    for attempt_tokens in (max_tokens, max_tokens * 3):
        resp = client.chat.completions.create(
            model=model,
            max_tokens=attempt_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        choice = resp.choices[0]
        content = choice.message.content
        if content:
            return content.strip()
        print(
            f"  ! empty completion (finish_reason={choice.finish_reason}, "
            f"max_tokens={attempt_tokens}) — "
            f"{'retrying with a bigger budget' if attempt_tokens == max_tokens else 'giving up'}",
            file=sys.stderr,
        )

    raise RuntimeError(
        f"'{model}' returned no content after retrying with a larger token budget. "
        "If this keeps happening, the model may be spending its whole budget on "
        "hidden reasoning — try a non-reasoning free model, or raise the max_tokens "
        "passed to complete()."
    )
