# ShieldAI Guardrails

ShieldAI is the small, model-agnostic guardrail layer extracted from PRAMAAN BOT.
It has no runtime dependencies and can wrap Gemma, Mistral, GPT, Claude, or a
custom model client.

```python
from shieldai import GuardPipeline

guards = GuardPipeline(required_disclaimer="AI-generated information; verify before use.")
safe_input = guards.check_input(user_text)

if safe_input.allowed:
    raw_answer = model.generate(safe_input.text)
    answer = guards.protect_output(raw_answer)
```

The package currently implements configurable PII masking, simple
prompt-injection detection, and disclaimer enforcement. Citation grounding in
PRAMAAN BOT remains domain-specific because it requires access to the retrieved
legal corpus.


