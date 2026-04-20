# LLM Gateway + Fallback Best Practices

## Referências
- [Retry/Fallback/Circuit Breaker](https://ranjankumar.in/harness-engineering-retry-fallback-circuit-breaking-llm-resilience)
- [AI Agent Resilience](https://aiworkflowlab.dev/article/ai-agent-resilience-production-retry-fallback-circuit-breaker-python)
- [Reliable LLM Pipelines](https://ilovedevops.substack.com/p/building-reliable-llm-pipelines-error)

## Arquitetura de Fallback

```
Requisição
    │
    ▼
LLM_PROVIDER=?
    │
 ┌──┴──┐
 │ollama │
 └──┬───┘
  │[timeout/erro]
  ▼
 ┌──┴──┐
 │gemini │
 └──┬───┘
  │[erro]
  ▼
 ┌──┴──┐
 │claude │
 └──┬───┘
  │[erro]
  ▼
Mensagem de erro amigável
```

## Retry com Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const isRetryable = isErrorRetryable(error);
      if (!isRetryable) throw error;

      // Jitter para evitar thundering herd
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random()),
        maxDelayMs
      );

      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

function isErrorRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502')
    );
  }
  return false;
}
```

## Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold = 5,
    private resetTimeoutMs = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailure?.getTime() ?? 0) > this.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = new Date();
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}
```

## Fallback Chain

```typescript
type LLMProvider = 'ollama' | 'gemini' | 'claude';

async function llmWithFallback(
  prompt: string,
  config: {
    preferredProvider?: LLMProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const providers: LLMProvider[] = config.preferredProvider
    ? [config.preferredProvider, ...(['gemini', 'claude'] as LLMProvider[]).filter(p => p !== config.preferredProvider)]
    : ['ollama', 'gemini', 'claude'];

  const errors: Error[] = [];

  for (const provider of providers) {
    try {
      switch (provider) {
        case 'ollama':
          return await callOllama(prompt, config);
        case 'gemini':
          return await callGemini(prompt, config);
        case 'claude':
          return await callClaude(prompt, config);
      }
    } catch (error) {
      errors.push(error as Error);
      console.warn(`Provider ${provider} failed:`, error);
    }
  }

  throw new Error(`All providers failed: ${errors.map(e => e.message).join('; ')}`);
}
```

## Configuração de Environment

```bash
# .env
LLM_PROVIDER=ollama
LLM_FALLBACK_PROVIDER=claude
LLM_TIMEOUT_MS=120000
LLM_ALLOW_FALLBACK=true

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# Gemini
GEMINI_API_KEY=
GEMINI_FLASH_MODEL=gemini-1.5-flash-latest

# Claude (fallback)
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-haiku-4-5
```

## Caching (Opcional)

```typescript
const cache = new Map<string, { value: string; expires: number }>();

async function llmWithCache(
  prompt: string,
  ttlMs: number = 3600000
): Promise<string> {
  const key = hash(prompt);
  const cached = cache.get(key);

  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const result = await llmWithFallback(prompt);
  cache.set(key, { value: result, expires: Date.now() + ttlMs });
  return result;
}
```

## Graceful Degradation

```typescript
// Se nenhum LLM disponível
async function askWithDegradation(
  question: string
): Promise<{ answer: string; source: 'llm' | 'cache' | 'fallback' }> {
  // 1. Tentar LLM
  try {
    const answer = await llmWithFallback(question);
    return { answer, source: 'llm' };
  } catch {
    // 2. Tentar cache
    const cached = getFromCache(question);
    if (cached) {
      return { answer: cached, source: 'cache' };
    }
  }

  // 3. Fallback estruturado (nãoresponder com erro)
  return {
    answer: 'Desculpe, o assistente de IA está temporariamente indisponível. Por favor, tente novamente mais tarde ou entre em contato com o suporte.',
    source: 'fallback'
  };
}
```

## Referências Adicionais
- [Unprompted Mind - LLM Fallback](https://www.unpromptedmind.com/llm-fallback-retry-logic-production/)
- [LiteLLM](https://litellm.ai/) - Abstração unificada