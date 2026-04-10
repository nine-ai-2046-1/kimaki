import type { BackendId } from '../database.js'

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
