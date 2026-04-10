import type { BackendId } from '../database.js'
import type { BackendAvailability, BackendRunner } from './backend-runner.js'
import { createOpenCodeRunner } from './open-code-runner.js'

type BackendRegistration = {
  id: BackendId
  label: string
  runner: BackendRunner
}

const backendRegistrations: BackendRegistration[] = [
  {
    id: 'opencode',
    label: 'OpenCode',
    runner: createOpenCodeRunner(),
  },
  {
    id: 'codex',
    label: 'Codex',
    runner: {
      id: 'codex',
      label: 'Codex',
      async isAvailable(): Promise<BackendAvailability> {
        return {
          backendId: 'codex',
          label: 'Codex',
          available: false,
          reason: 'Runner not implemented yet',
        }
      },
    },
  },
  {
    id: 'gemini_cli',
    label: 'Gemini CLI',
    runner: {
      id: 'gemini_cli',
      label: 'Gemini CLI',
      async isAvailable(): Promise<BackendAvailability> {
        return {
          backendId: 'gemini_cli',
          label: 'Gemini CLI',
          available: false,
          reason: 'Runner not implemented yet',
        }
      },
    },
  },
  {
    id: 'kiro_cli',
    label: 'Kiro CLI',
    runner: {
      id: 'kiro_cli',
      label: 'Kiro CLI',
      async isAvailable(): Promise<BackendAvailability> {
        return {
          backendId: 'kiro_cli',
          label: 'Kiro CLI',
          available: false,
          reason: 'Runner not implemented yet',
        }
      },
    },
  },
]

export function listBackendRegistrations(): BackendRegistration[] {
  return backendRegistrations
}

export async function listBackendAvailability(): Promise<BackendAvailability[]> {
  return Promise.all(
    backendRegistrations.map(async (registration) => {
      return registration.runner.isAvailable()
    }),
  )
}

export function getBackendRegistration({
  backendId,
}: {
  backendId: BackendId
}): BackendRegistration | undefined {
  return backendRegistrations.find((registration) => {
    return registration.id === backendId
  })
}

export async function assertBackendAvailable({
  backendId,
}: {
  backendId: BackendId
}): Promise<BackendAvailability> {
  const registration = getBackendRegistration({ backendId })
  if (!registration) {
    throw new Error(`Unknown backend: ${backendId}`)
  }
  const availability = await registration.runner.isAvailable()
  if (!availability.available) {
    throw new Error(
      availability.reason || `${registration.label} is not available on this machine`,
    )
  }
  return availability
}

export function parseBackendId({
  value,
}: {
  value: string
}): BackendId | undefined {
  const normalized = value.trim().toLowerCase().replace(/-/g, '_')
  if (
    normalized === 'opencode' ||
    normalized === 'codex' ||
    normalized === 'gemini_cli' ||
    normalized === 'kiro_cli'
  ) {
    return normalized
  }
  return undefined
}
