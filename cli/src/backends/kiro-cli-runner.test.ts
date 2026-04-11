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
})
