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
    """One-shot completion: single user turn in, plain text out."""
    model = os.environ.get("LLM_MODEL")
    if not model:
        print("LLM_MODEL must be set.", file=sys.stderr)
        sys.exit(1)

    resp = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content.strip()
