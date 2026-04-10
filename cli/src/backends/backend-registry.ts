import type { BackendId } from '../database.js'
import type {
  BackendAvailability,
  BackendExecutor,
  BackendRunner,
} from './backend-runner.js'
import { isBackendExecutor } from './backend-runner.js'
import { createGeminiCliRunner } from './gemini-cli-runner.js'
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

export function listBackendRegistrations({
  appId,
}: {
  appId?: string
} = {}): BackendRegistration[] {
  return backendRegistrations.map((registration) => {
    if (registration.id !== 'gemini_cli') {
      return registration
    }
    return {
      ...registration,
      runner: createGeminiCliRunner({ appId }),
    }
  })
}

export async function listBackendAvailability({
  appId,
}: {
  appId?: string
} = {}): Promise<BackendAvailability[]> {
  return Promise.all(
    listBackendRegistrations({ appId }).map(async (registration) => {
      return registration.runner.isAvailable()
    }),
  )
}

export function getBackendRegistration({
  backendId,
  appId,
}: {
  backendId: BackendId
  appId?: string
}): BackendRegistration | undefined {
  return listBackendRegistrations({ appId }).find((registration) => {
    return registration.id === backendId
  })
}

export function getBackendExecutor({
  backendId,
  appId,
}: {
  backendId: BackendId
  appId?: string
}): BackendExecutor | undefined {
  const registration = getBackendRegistration({ backendId, appId })
  if (!registration || !isBackendExecutor(registration.runner)) {
    return undefined
  }
  return registration.runner
}

export async function assertBackendAvailable({
  backendId,
  appId,
}: {
  backendId: BackendId
  appId?: string
}): Promise<BackendAvailability> {
  const registration = getBackendRegistration({ backendId, appId })
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
