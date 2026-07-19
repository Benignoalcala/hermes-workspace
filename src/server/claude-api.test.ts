import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  delete process.env.HERMES_API_TOKEN
  delete process.env.CLAUDE_API_TOKEN
  delete process.env.HERMES_DASHBOARD_BASIC_AUTH_PASSWORD
})

describe('streamChat gateway authentication', () => {
  it('uses the runtime gateway token, never dashboard credentials', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          new ReadableStream({ start: (controller) => controller.close() }),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          },
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { streamChat } = await import('./claude-api')
    process.env.HERMES_API_TOKEN = 'runtime-gateway-token'
    process.env.HERMES_DASHBOARD_BASIC_AUTH_PASSWORD = 'dashboard-password'

    await streamChat(
      'session-1',
      { message: 'hello' },
      { onEvent: vi.fn() },
    )

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/sessions/session-1/chat/stream'),
    )
    expect(request).toBeDefined()
    const [url, init] = request as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(url).toContain('/api/sessions/session-1/chat/stream')
    expect(headers.get('Authorization')).toBe('Bearer runtime-gateway-token')
    expect(headers.get('Authorization')).not.toContain('dashboard-password')
    expect(headers.get('Cookie')).toBeNull()
  })
})
