import { describe, expect, test } from 'vitest'
import { createKiroCliRunner } from './kiro-cli-runner.js'

describe('kiro cli runner', () => {
  test('creates a rich session handle', async () => {
    const runner = createKiroCliRunner()
    const handle = await runner.createSessionHandle({
      projectDirectory: '/tmp/project',
    })

    expect(handle).toEqual({
      backendId: 'kiro_cli',
      sessionId: 'kiro:/tmp/project',
      backendSessionId: undefined,
      projectDirectory: '/tmp/project',
      capabilities: runner.capabilities,
    })
  })

  test('exposes rich backend capabilities', () => {
    const runner = createKiroCliRunner()

    expect(runner.capabilities).toEqual({
      supportsStreaming: false,
      supportsAbort: false,
      supportsSessionResume: true,
      supportsModelSelection: true,
      supportsAgentSelection: true,
      supportsPermissionRequests: false,
      supportsToolTrustPolicy: true,
    })
  })

  test('reuses existing backend session id when ensuring session', async () => {
    const runner = createKiroCliRunner()
    const result = await runner.ensureSession?.({
      threadId: 'thread-1',
      projectDirectory: '/tmp/project',
      sdkDirectory: '/tmp/project',
      existingSessionId: 'kimaki-session-1',
      existingBackendSessionId: 'kiro-native-123',
    })

    if (result instanceof Error || !result) {
      throw new Error('Expected ensureSession result for Kiro runner')
    }

    expect(result.handle.backendSessionId).toBe('kiro-native-123')
    expect(result.handle.sessionId).toBe('kimaki-session-1')
  })
})
