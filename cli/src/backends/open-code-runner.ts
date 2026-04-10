import type { BackendAvailability, BackendRunner } from './backend-runner.js'

export function createOpenCodeRunner(): BackendRunner {
  return {
    id: 'opencode',
    label: 'OpenCode',
    async isAvailable(): Promise<BackendAvailability> {
      return {
        backendId: 'opencode',
        label: 'OpenCode',
        available: true,
      }
    },
  }
}
