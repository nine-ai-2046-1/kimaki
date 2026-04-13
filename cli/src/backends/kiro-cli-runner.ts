import { execAsync } from '../exec-async.js'
import type {
  BackendAvailability,
  BackendCapabilities,
  BackendExecutor,
  BackendEnsureSessionArgs,
  BackendEnsureSessionResult,
  BackendListAgentsResult,
  BackendListModelsResult,
  BackendPromptResponse,
  BackendSendPromptArgs,
  BackendSessionHandle,
} from './backend-runner.js'

const KIRO_CAPABILITIES: BackendCapabilities = {
  supportsStreaming: false,
  supportsAbort: false,
  supportsSessionResume: true,
  supportsModelSelection: true,
  supportsAgentSelection: true,
  supportsPermissionRequests: false,
  supportsToolTrustPolicy: true,
}

function escapeShellArg(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

function parseJson<T>({
  text,
  errorMessage,
}: {
  text: string
  errorMessage: string
}): Error | T {
  try {
    return JSON.parse(text) as T
  } catch (error) {
    return new Error(errorMessage, { cause: error })
  }
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/gu, '')
}

export function createKiroCliRunner(): BackendExecutor {
  return {
    kind: 'executor',
    id: 'kiro_cli',
    label: 'Kiro CLI',
    capabilities: KIRO_CAPABILITIES,
    async isAvailable(): Promise<BackendAvailability> {
      const binaryResult = await execAsync('which kiro-cli', {
        timeout: 5_000,
      }).catch((error: unknown) => {
        return error instanceof Error ? error : new Error('Failed to locate kiro-cli binary')
      })
      if (binaryResult instanceof Error) {
        return {
          backendId: 'kiro_cli',
          label: 'Kiro CLI',
          available: false,
          reason: 'kiro-cli binary not found in PATH',
        }
      }

      const identityResult = await execAsync('kiro-cli whoami', {
        timeout: 15_000,
      }).catch((error: unknown) => {
        return error instanceof Error ? error : new Error('Failed to query kiro-cli identity')
      })
      if (identityResult instanceof Error) {
        return {
          backendId: 'kiro_cli',
          label: 'Kiro CLI',
          available: false,
          reason: 'Run `kiro-cli login` to authenticate Kiro CLI',
        }
      }

      return {
        backendId: 'kiro_cli',
        label: 'Kiro CLI',
        available: true,
      }
    },
    async createSessionHandle({
      projectDirectory,
    }: {
      projectDirectory: string
    }): Promise<BackendSessionHandle> {
      return {
        backendId: 'kiro_cli',
        sessionId: `kiro:${projectDirectory}`,
        backendSessionId: undefined,
        projectDirectory,
        capabilities: KIRO_CAPABILITIES,
      }
    },
    async ensureSession({
      threadId,
      projectDirectory,
      existingSessionId,
      existingBackendSessionId,
    }: BackendEnsureSessionArgs): Promise<Error | BackendEnsureSessionResult> {
      if (!existingSessionId && !existingBackendSessionId) {
        const availability = await this.isAvailable()
        if (!availability.available) {
          return new Error(availability.reason || 'Kiro CLI is unavailable')
        }
      }
      return {
        handle: {
          backendId: 'kiro_cli',
          sessionId: existingSessionId || `kiro:${threadId}`,
          backendSessionId: existingBackendSessionId || existingSessionId || `kiro:${threadId}`,
          projectDirectory,
          capabilities: KIRO_CAPABILITIES,
        },
        createdNewSession: !existingSessionId,
      }
    },
    async sendPrompt({
      projectDirectory,
      request,
    }: BackendSendPromptArgs): Promise<Error | BackendPromptResponse> {
      const textParts = (request.parts || [])
        .flatMap((part) => {
          if (part.type !== 'text') {
            return []
          }
          return [part.text || '']
        })
        .filter((part) => {
          return part.trim().length > 0
        })
      const joinedPrompt = textParts.join('\n\n')
      const modelArg = request.model?.modelID ? ` --model ${escapeShellArg(request.model.modelID)}` : ''
      const agentArg = request.agent ? ` --agent ${escapeShellArg(request.agent)}` : ''
      const command = `kiro-cli chat ${escapeShellArg(joinedPrompt)} --no-interactive${modelArg}${agentArg}`
      const result = await execAsync(command, {
        cwd: projectDirectory,
        timeout: 120_000,
      }).catch((error: unknown) => {
        return error instanceof Error ? error : new Error('Kiro CLI execution failed')
      })
      if (result instanceof Error) {
        return result
      }
      return {
        accepted: true,
        text: result.stdout.trim() || result.stderr.trim() || 'Kiro returned no output.',
      }
    },
    async listModels(): Promise<Error | BackendListModelsResult> {
      const result = await execAsync('kiro-cli chat --list-models --format json', {
        timeout: 30_000,
      }).catch((error: unknown) => {
        return error instanceof Error ? error : new Error('Failed to list Kiro models')
      })
      if (result instanceof Error) {
        return result
      }
      const parsed = parseJson<{ models?: Array<{ model_id?: string }>; default_model?: string }>({
        text: result.stdout,
        errorMessage: 'Failed to parse Kiro model list',
      })
      if (parsed instanceof Error) {
        return parsed
      }
      const models = (parsed.models || [])
        .map((model) => {
          return model.model_id || ''
        })
        .filter((modelId) => {
          return modelId.length > 0
        })
      return {
        models,
        defaultModel: parsed.default_model,
      }
    },
    async listAgents({
      projectDirectory,
    }: {
      projectDirectory: string
    }): Promise<Error | BackendListAgentsResult> {
      const result = await execAsync('kiro-cli agent list', {
        cwd: projectDirectory,
        timeout: 30_000,
      }).catch((error: unknown) => {
        return error instanceof Error ? error : new Error('Failed to list Kiro agents')
      })
      if (result instanceof Error) {
        return result
      }
      const agents = result.stdout
        .split(/\r?\n/u)
        .map((line) => {
          return stripAnsi(line).trimEnd()
        })
        .filter((line) => {
          return line.startsWith('* ') || /^\s{2,}\S/u.test(line)
        })
        .map((line) => {
          return (line.replace(/^\*\s+/u, '').replace(/^\s+/u, '').split(/\s{2,}/u)[0] || '').trim()
        })
        .filter((line) => {
          return line.length > 0 && !line.startsWith('Workspace:') && !line.startsWith('Global:')
        })
      return {
        agents,
      }
    },
  }
}
