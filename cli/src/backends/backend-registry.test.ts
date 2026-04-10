import { describe, expect, test } from 'vitest'
import { getBackendExecutor, getBackendRegistration } from './backend-registry.js'

describe('backend registry', () => {
  test('returns an executor for opencode', async () => {
    const registration = getBackendRegistration({ backendId: 'opencode' })
    expect(registration).toBeDefined()

    const executor = getBackendExecutor({ backendId: 'opencode' })
    expect(executor).toBeDefined()
    expect(executor?.id).toBe('opencode')
    expect(executor?.kind).toBe('executor')
    expect(executor?.capabilities.supportsStreaming).toBe(true)

    const sessionHandle = await executor?.createSessionHandle({
      projectDirectory: '/tmp/project',
    })
    expect(sessionHandle).toEqual({
      backendId: 'opencode',
      projectDirectory: '/tmp/project',
      capabilities: executor?.capabilities,
    })
  })

  test('returns an executor for gemini cli and keeps placeholders undefined', () => {
    const geminiExecutor = getBackendExecutor({ backendId: 'gemini_cli' })
    expect(geminiExecutor).toBeDefined()
    expect(geminiExecutor?.id).toBe('gemini_cli')
    expect(geminiExecutor?.capabilities.supportsStreaming).toBe(false)

    expect(getBackendExecutor({ backendId: 'codex' })).toBeUndefined()
    expect(getBackendExecutor({ backendId: 'kiro_cli' })).toBeUndefined()
  })
})
