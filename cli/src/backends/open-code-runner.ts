import type {
  BackendAbortSessionArgs,
  BackendAvailability,
  BackendCapabilities,
  BackendExecutor,
  BackendEnsureSessionArgs,
  BackendEnsureSessionResult,
  BackendPromptResponse,
  BackendSessionHandle,
  BackendSendPromptArgs,
} from './backend-runner.js'
import * as errore from 'errore'
import {
  buildSessionPermissions,
  getOpencodeClient,
  initializeOpencodeForDirectory,
  parsePermissionRules,
  writeInjectionGuardConfig,
} from '../opencode.js'

const OPENCODE_CAPABILITIES: BackendCapabilities = {
  supportsStreaming: true,
  supportsAbort: true,
  supportsSessionResume: true,
  supportsModelSelection: true,
  supportsAgentSelection: true,
  supportsPermissionRequests: true,
  supportsToolTrustPolicy: true,
}

export function createOpenCodeRunner(): BackendExecutor {
  return {
    kind: 'executor',
    id: 'opencode',
    label: 'OpenCode',
    capabilities: OPENCODE_CAPABILITIES,
    async isAvailable(): Promise<BackendAvailability> {
      return {
        backendId: 'opencode',
        label: 'OpenCode',
        available: true,
      }
    },
    async createSessionHandle({
      projectDirectory,
    }: {
      projectDirectory: string
    }): Promise<BackendSessionHandle> {
      return {
        backendId: 'opencode',
        projectDirectory,
        capabilities: OPENCODE_CAPABILITIES,
      }
    },
    async ensureSession({
      threadId,
      projectDirectory,
      sdkDirectory,
      channelId,
      existingSessionId,
      originalRepoDirectory,
      permissions,
      injectionGuardPatterns,
    }: BackendEnsureSessionArgs): Promise<Error | BackendEnsureSessionResult> {
      const getClientResult = await initializeOpencodeForDirectory(projectDirectory, {
        originalRepoDirectory,
        channelId,
      })
      if (getClientResult instanceof Error) {
        return getClientResult
      }
      const getClient = getClientResult

      let session = undefined as { id: string } | undefined
      let createdNewSession = false

      if (existingSessionId) {
        const sessionResponse = await errore.tryAsync(() => {
          return getClient().session.get({
            sessionID: existingSessionId,
            directory: sdkDirectory,
          })
        })
        if (!(sessionResponse instanceof Error) && sessionResponse.data) {
          session = sessionResponse.data
        }
      }

      if (!session) {
        const sessionPermissions = [
          ...buildSessionPermissions({
            directory: sdkDirectory,
            originalRepoDirectory,
          }),
          ...parsePermissionRules(permissions ?? []),
        ]
        const sessionResponse = await getClient().session.create({
          directory: sdkDirectory,
          permission: sessionPermissions,
        })
        session = sessionResponse.data
        if (session && injectionGuardPatterns?.length) {
          writeInjectionGuardConfig({
            sessionId: session.id,
            scanPatterns: injectionGuardPatterns,
          })
        }
        createdNewSession = true
      }

      if (!session) {
        return new Error('Failed to create or get session')
      }

      return {
        handle: {
          backendId: 'opencode',
          sessionId: session.id,
          projectDirectory,
          capabilities: OPENCODE_CAPABILITIES,
        },
        createdNewSession,
        runtimeAdapter: {
          kind: 'opencode',
          getClient,
        },
      }
    },
    async abortSession({
      sessionId,
      projectDirectory,
      sdkDirectory,
    }: BackendAbortSessionArgs): Promise<void> {
      const client = getOpencodeClient(projectDirectory)
      if (!client) {
        return
      }
      await client.session.abort({
        sessionID: sessionId,
        directory: sdkDirectory,
      })
    },
    async sendPrompt({
      projectDirectory,
      request,
    }: BackendSendPromptArgs): Promise<Error | BackendPromptResponse> {
      const client = getOpencodeClient(projectDirectory)
      if (!client) {
        return new Error('No OpenCode client available for project directory')
      }
      const promptResult = await errore.tryAsync(() => {
        return client.session.promptAsync(request)
      })
      if (promptResult instanceof Error) {
        return promptResult
      }
      if (promptResult.error) {
        const errorMessage = (() => {
          const err = promptResult.error
          if (err && typeof err === 'object') {
            if (
              'data' in err
              && err.data
              && typeof err.data === 'object'
              && 'message' in err.data
            ) {
              return String(err.data.message)
            }
            if (
              'errors' in err
              && Array.isArray(err.errors)
              && err.errors.length > 0
            ) {
              return JSON.stringify(err.errors)
            }
          }
          return 'Unknown OpenCode API error'
        })()
        return new Error(errorMessage)
      }
      return { accepted: true }
    },
  }
}
