import type { BackendId } from '../database.js'
import type { OpencodeClient } from '@opencode-ai/sdk/v2'

export type BackendAvailability = {
  backendId: BackendId
  label: string
  available: boolean
  reason?: string
}

export type BackendRunner = {
  id: BackendId
  label: string
  isAvailable(): Promise<BackendAvailability>
}

export type BackendCapabilities = {
  supportsStreaming: boolean
  supportsAbort: boolean
  supportsSessionResume: boolean
  supportsModelSelection: boolean
  supportsPermissionRequests: boolean
}

export type BackendSessionHandle = {
  backendId: BackendId
  sessionId?: string
  projectDirectory: string
  capabilities: BackendCapabilities
}

export type BackendRuntimeAdapter = {
  kind: 'opencode'
  getClient: () => OpencodeClient
}

export type BackendEnsureSessionArgs = {
  threadId: string
  projectDirectory: string
  sdkDirectory: string
  channelId?: string
  existingSessionId?: string
  originalRepoDirectory?: string
  permissions?: string[]
  injectionGuardPatterns?: string[]
}

export type BackendEnsureSessionResult = {
  handle: BackendSessionHandle & { sessionId: string }
  createdNewSession: boolean
  runtimeAdapter?: BackendRuntimeAdapter
}

export type BackendAbortSessionArgs = {
  sessionId: string
  projectDirectory: string
  sdkDirectory: string
}

export type BackendPromptRequest = Parameters<
  OpencodeClient['session']['promptAsync']
>[0]

export type BackendPromptResponse = {
  accepted: boolean
}

export type BackendSendPromptArgs = {
  projectDirectory: string
  sdkDirectory: string
  request: BackendPromptRequest
}

export type BackendExecutor = BackendRunner & {
  kind: 'executor'
  capabilities: BackendCapabilities
  createSessionHandle(args: { projectDirectory: string }): Promise<BackendSessionHandle>
  ensureSession?(args: BackendEnsureSessionArgs): Promise<Error | BackendEnsureSessionResult>
  abortSession?(args: BackendAbortSessionArgs): Promise<void>
  sendPrompt?(args: BackendSendPromptArgs): Promise<Error | BackendPromptResponse>
}

export function isBackendExecutor(runner: BackendRunner): runner is BackendExecutor {
  return 'kind' in runner && runner.kind === 'executor'
}
