import path from 'node:path'
import { execAsync } from '../exec-async.js'
import { resolveGeminiApiKey } from '../database.js'
import type {
  BackendAvailability,
  BackendCapabilities,
  BackendExecutor,
  BackendEnsureSessionArgs,
  BackendEnsureSessionResult,
  BackendPromptResponse,
  BackendSendPromptArgs,
  BackendSessionHandle,
} from './backend-runner.js'

const GEMINI_CAPABILITIES: BackendCapabilities = {
  supportsStreaming: false,
  supportsAbort: false,
  supportsSessionResume: false,
  supportsModelSelection: false,
  supportsAgentSelection: false,
  supportsPermissionRequests: false,
  supportsToolTrustPolicy: false,
}

function escapeShellArg(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

function buildGeminiPrompt({
  system,
  prompt,
}: {
  system: string
  prompt: string
}): string {
  return [
    'You are running inside kimaki Discord self-host mode.',
    'Keep replies concise and practical.',
    'Do not claim tool execution, file edits, or command execution unless you explicitly state you cannot do them in this backend mode.',
    '',
    'System context:',
    system,
    '',
    'User prompt:',
    prompt,
  ].join('\n')
}

export function createGeminiCliRunner({
  appId,
}: {
  appId?: string
} = {}): BackendExecutor {
  return {
    kind: 'executor',
    id: 'gemini_cli',
    label: 'Gemini CLI',
    capabilities: GEMINI_CAPABILITIES,
    async isAvailable(): Promise<BackendAvailability> {
      const binaryResult = await execAsync('which gemini', {
        timeout: 5_000,
      }).catch((error: unknown) => {
        return error instanceof Error ? error : new Error('Failed to locate gemini binary')
      })
      if (binaryResult instanceof Error) {
        return {
          backendId: 'gemini_cli',
          label: 'Gemini CLI',
          available: false,
          reason: 'gemini binary not found in PATH',
        }
      }

      if (!appId) {
        const envKey = process.env.GEMINI_API_KEY?.trim()
        if (!envKey) {
          return {
            backendId: 'gemini_cli',
            label: 'Gemini CLI',
            available: false,
            reason: 'Gemini API key is not configured',
          }
        }
      }

      if (appId) {
        const apiKey = await resolveGeminiApiKey(appId)
        if (!apiKey) {
          return {
            backendId: 'gemini_cli',
            label: 'Gemini CLI',
            available: false,
            reason: 'Set a Gemini API key with /transcription-key or GEMINI_API_KEY',
          }
        }
      }

      return {
        backendId: 'gemini_cli',
        label: 'Gemini CLI',
        available: true,
      }
    },
    async createSessionHandle({
      projectDirectory,
    }: {
      projectDirectory: string
    }): Promise<BackendSessionHandle> {
      return {
        backendId: 'gemini_cli',
        sessionId: `gemini:${projectDirectory}`,
        projectDirectory,
        capabilities: GEMINI_CAPABILITIES,
      }
    },
    async ensureSession({
      threadId,
      projectDirectory,
      existingSessionId,
    }: BackendEnsureSessionArgs): Promise<Error | BackendEnsureSessionResult> {
      const availability = await this.isAvailable()
      if (!availability.available) {
        return new Error(availability.reason || 'Gemini CLI is unavailable')
      }
      return {
        handle: {
          backendId: 'gemini_cli',
          sessionId: existingSessionId || `gemini:${threadId}`,
          projectDirectory,
          capabilities: GEMINI_CAPABILITIES,
        },
        createdNewSession: !existingSessionId,
      }
    },
    async sendPrompt({
      projectDirectory,
      request,
    }: BackendSendPromptArgs): Promise<Error | BackendPromptResponse> {
      const apiKey = appId ? await resolveGeminiApiKey(appId) : process.env.GEMINI_API_KEY?.trim()
      if (!apiKey) {
        return new Error('Gemini API key is not configured')
      }

      const promptParts = request.parts
        ?.flatMap((part) => {
          if (part.type === 'text') {
            return [part.text || '']
          }
          if (part.type === 'file') {
            return [`[Attached file: ${part.filename || path.basename(part.url || 'file')}]`]
          }
          return []
        })
        .filter((value) => {
          return value.trim().length > 0
        }) || []

      const prompt = buildGeminiPrompt({
        system: request.system || '',
        prompt: promptParts.join('\n\n'),
      })
      const command = `GEMINI_API_KEY=${escapeShellArg(apiKey)} gemini -p ${escapeShellArg(prompt)} --output-format text`
      const result = await execAsync(command, {
        cwd: projectDirectory,
        timeout: 120_000,
      }).catch((error: unknown) => {
        return error instanceof Error ? error : new Error('Gemini CLI execution failed')
      })
      if (result instanceof Error) {
        return result
      }
      return {
        accepted: true,
        text: result.stdout.trim() || result.stderr.trim() || 'Gemini returned no output.',
      }
    },
  }
}
