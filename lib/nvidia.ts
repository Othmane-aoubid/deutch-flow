/**
 * Shared NVIDIA chat-completions provider chain.
 * Tries each configured key/model pair in order; first non-empty content wins.
 * `moonshotai/kimi-k3` is included as a later link with a strict timeout since
 * it has been observed to hang server-side; the guard keeps requests bounded.
 */

export type NvidiaAttempt = { key: string; model: string; ok: boolean; detail?: string }

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1'

const THINKING_OFF = { enable_thinking: false }

function keyChain(primaryModel: string, fallbackModel: string) {
  const chain: Array<{ key: string; model: string; timeoutMs: number }> = []
  const primary = process.env.NVIDIA_API_KEY
  const fallbackKey = process.env.NVIDIA_API_KEY_FALLBACK
  const extraKey = process.env.NVIDIA_API_KEY_2

  if (primary) chain.push({ key: primary, model: primaryModel, timeoutMs: 30000 })
  if (fallbackKey) chain.push({ key: fallbackKey, model: fallbackModel, timeoutMs: 30000 })
  if (extraKey) chain.push({ key: extraKey, model: primaryModel, timeoutMs: 30000 })

  // Vision-capable model as a later text link, timeout-guarded (has hung server-side).
  const kimiKey = fallbackKey ?? primary ?? extraKey
  if (kimiKey) chain.push({ key: kimiKey, model: 'moonshotai/kimi-k3', timeoutMs: 25000 })

  return chain
}

export async function nvidiaChatCompletion(
  body: { messages: Array<{ role: string; content: string }>; temperature?: number; maxTokens?: number },
  options: { primaryModel?: string; fallbackModel?: string; chain?: Array<{ key: string; model: string; timeoutMs: number }> } = {},
): Promise<{ content: string | null; attempts: NvidiaAttempt[] }> {
  const baseUrl = process.env.NVIDIA_BASE_URL?.replace(/\/$/, '') || DEFAULT_BASE_URL
  const primaryModel = options.primaryModel ?? process.env.NVIDIA_LLM_MODEL ?? 'meta/muse-glimmer-30b'
  const fallbackModel = options.fallbackModel ?? process.env.NVIDIA_LLM_MODEL_FALLBACK ?? 'nvidia/nemotron-3-ultra-550b-a55b'
  const chain = options.chain ?? keyChain(primaryModel, fallbackModel)

  const attempts: NvidiaAttempt[] = []
  for (const link of chain) {
    const isKimi = link.model === 'moonshotai/kimi-k3'
    const payload: Record<string, unknown> = {
      model: link.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.2,
      max_tokens: body.maxTokens ?? 2000,
      // Reasoning models otherwise burn the budget on reasoning_content and return content: null.
      chat_template_kwargs: THINKING_OFF,
    }
    try {
      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${link.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(link.timeoutMs),
      })
      if (!upstream.ok) {
        const detail = (await upstream.text().catch(() => '')).slice(0, 120)
        attempts.push({ key: link.key.slice(0, 10), model: link.model, ok: false, detail: `HTTP ${upstream.status}${detail ? `: ${detail}` : ''}` })
        continue
      }
      const result = await upstream.json()
      const content: string | null = result.choices?.[0]?.message?.content ?? null
      attempts.push({ key: link.key.slice(0, 10), model: link.model, ok: Boolean(content) })
      if (content) return { content, attempts }
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 120) : 'failed'
      attempts.push({ key: link.key.slice(0, 10), model: link.model, ok: false, detail })
    }
  }
  return { content: null, attempts }
}

/**
 * NVIDIA vision call (image + text) via chat models that accept image_url
 * content parts, e.g. moonshotai/kimi-k3. Timeout-guarded; returns null on
 * any failure so callers can fall through to the next provider.
 */
export async function nvidiaVisionCompletion(
  prompt: string,
  imageDataUrl: string,
): Promise<{ content: string | null; detail?: string }> {
  const baseUrl = process.env.NVIDIA_BASE_URL?.replace(/\/$/, '') || DEFAULT_BASE_URL
  const key = process.env.NVIDIA_API_KEY_FALLBACK ?? process.env.NVIDIA_API_KEY ?? process.env.NVIDIA_API_KEY_2
  if (!key) return { content: null, detail: 'not configured' }
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k3',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
        chat_template_kwargs: THINKING_OFF,
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!upstream.ok) {
      const detail = (await upstream.text().catch(() => '')).slice(0, 120)
      return { content: null, detail: `HTTP ${upstream.status}${detail ? `: ${detail}` : ''}` }
    }
    const result = await upstream.json()
    return { content: result.choices?.[0]?.message?.content ?? null }
  } catch (error) {
    return { content: null, detail: error instanceof Error ? error.message.slice(0, 120) : 'failed' }
  }
}
