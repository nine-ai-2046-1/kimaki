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

  test('does not return an executor for placeholder backends', () => {
    expect(getBackendExecutor({ backendId: 'gemini_cli' })).toBeUndefined()
    expect(getBackendExecutor({ backendId: 'codex' })).toBeUndefined()
    expect(getBackendExecutor({ backendId: 'kiro_cli' })).toBeUndefined()
  })
})
