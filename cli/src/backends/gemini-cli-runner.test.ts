import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { createGeminiCliRunner } from './gemini-cli-runner.js'

describe('gemini cli runner', () => {
  test('creates a text-mode session handle', async () => {
    const runner = createGeminiCliRunner()
    const handle = await runner.createSessionHandle({
      projectDirectory: '/tmp/project',
    })

    expect(handle).toEqual({
      backendId: 'gemini_cli',
      sessionId: 'gemini:/tmp/project',
      projectDirectory: '/tmp/project',
      capabilities: runner.capabilities,
    })
  })

  test('reports missing API key when no app key or env key exists', async () => {
    const previousValue = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY

    const runner = createGeminiCliRunner()
    const availability = await runner.isAvailable()

    expect(availability.available).toBe(false)
    expect(availability.reason).toBe('Gemini API key is not configured')

    if (previousValue) {
      process.env.GEMINI_API_KEY = previousValue
    }
  })

  test('executes gemini command wrapper and returns text output', async () => {
    const tmpDir = path.join(process.cwd(), 'tmp', 'gemini-runner-test')
    fs.mkdirSync(tmpDir, { recursive: true })
    const fakeGeminiPath = path.join(tmpDir, 'gemini')
    fs.writeFileSync(
      fakeGeminiPath,
      '#!/bin/sh\nif [ -z "$GEMINI_API_KEY" ]; then\n  echo "missing key" >&2\n  exit 1\nfi\nprintf "Gemini fake reply"\n',
      'utf8',
    )
    fs.chmodSync(fakeGeminiPath, 0o755)

    const previousPath = process.env.PATH
    const previousKey = process.env.GEMINI_API_KEY
    process.env.PATH = `${tmpDir}:${previousPath || ''}`
    process.env.GEMINI_API_KEY = 'test-key'

    const runner = createGeminiCliRunner()
    const response = await runner.sendPrompt?.({
      projectDirectory: process.cwd(),
      sdkDirectory: process.cwd(),
      request: {
        sessionID: 'gemini:test',
        directory: process.cwd(),
        parts: [{ type: 'text', text: 'Hello Gemini' }],
        system: 'System context',
      },
    })

    expect(response).toEqual({
      accepted: true,
      text: 'Gemini fake reply',
    })

    process.env.PATH = previousPath
    if (previousKey) {
      process.env.GEMINI_API_KEY = previousKey
    } else {
      delete process.env.GEMINI_API_KEY
    }
  })
})
