import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js'
import type { BackendId } from '../database.js'
import type { CommandContext } from './types.js'
import {
  getBackendCascade,
  getChannelBackend,
  getGlobalBackend,
  getSessionBackend,
  getThreadSession,
  setGlobalBackend,
  setSessionBackend,
} from '../database.js'
import {
  assertBackendAvailable,
  listBackendAvailability,
  parseBackendId,
} from '../backends/backend-registry.js'

function formatBackendLabel({ backendId }: { backendId: BackendId }): string {
  if (backendId === 'opencode') {
    return 'OpenCode'
  }
  if (backendId === 'codex') {
    return 'Codex'
  }
  if (backendId === 'gemini_cli') {
    return 'Gemini CLI'
  }
  return 'Kiro CLI'
}

function joinLines({ lines }: { lines: string[] }): string {
  return lines.join('\n')
}

async function replyWithBackendList({
  interaction,
}: {
  interaction: ChatInputCommandInteraction
}): Promise<void> {
  const availability = await listBackendAvailability()
  const lines = availability.map((item) => {
    if (item.available) {
      return `- ${item.label}: available`
    }
    return `- ${item.label}: unavailable (${item.reason || 'unknown reason'})`
  })
  await interaction.editReply(joinLines({ lines }))
}

async function replyWithCurrentBackend({
  interaction,
  appId,
}: {
  interaction: ChatInputCommandInteraction
  appId: string
}): Promise<void> {
  const channel = interaction.channel
  const sessionId = channel?.isThread() ? await getThreadSession(channel.id) : undefined
  const activeBackend = await getBackendCascade({
    sessionId,
    channelId: channel?.id,
    appId,
  })
  const [sessionBackend, channelBackend, globalBackend] = await Promise.all([
    sessionId ? getSessionBackend(sessionId) : Promise.resolve(undefined),
    channel ? getChannelBackend(channel.id) : Promise.resolve(undefined),
    getGlobalBackend(appId),
  ])
  await interaction.editReply(
    joinLines({
      lines: [
        `Current backend: ${activeBackend ? formatBackendLabel({ backendId: activeBackend }) : 'OpenCode (default)'}`,
        `Session override: ${sessionBackend ? formatBackendLabel({ backendId: sessionBackend }) : 'none'}`,
        `Channel default: ${channelBackend ? formatBackendLabel({ backendId: channelBackend }) : 'none'}`,
        `Machine default: ${globalBackend ? formatBackendLabel({ backendId: globalBackend }) : 'none'}`,
      ],
    }),
  )
}

async function setSelectedBackend({
  interaction,
  appId,
}: {
  interaction: ChatInputCommandInteraction
  appId: string
}): Promise<void> {
  const backendValue = interaction.options.getString('backend', true)
  const scope = interaction.options.getString('scope') || 'session'
  const backendId = parseBackendId({ value: backendValue })
  if (!backendId) {
    await interaction.editReply(`Unknown backend: ${backendValue}`)
    return
  }

  const availability = await (async () => {
    try {
      return await assertBackendAvailable({ backendId })
    } catch (error) {
      if (error instanceof Error) {
        return error
      }
      return new Error('Unknown backend availability error')
    }
  })()
  if (availability instanceof Error) {
    await interaction.editReply(
      `${formatBackendLabel({ backendId })} is unavailable: ${availability.message}`,
    )
    return
  }

  const channel = interaction.channel
  if (!channel) {
    await interaction.editReply('This command must be used in a channel')
    return
  }

  if (scope === 'machine') {
    await setGlobalBackend({ appId, backendId })
    await interaction.editReply(
      `Machine default backend set to ${formatBackendLabel({ backendId })}`,
    )
    return
  }

  if (!channel.isThread()) {
    await interaction.editReply(
      'Session backend can only be set inside a session thread. Use scope=machine in a normal channel.',
    )
    return
  }

  const sessionId = await getThreadSession(channel.id)
  if (!sessionId) {
    await interaction.editReply('This thread has no active session yet')
    return
  }

  await setSessionBackend({ sessionId, backendId })
  await interaction.editReply(
    `Session backend set to ${formatBackendLabel({ backendId })}`,
  )
}

export async function handleBackendCommand({
  command,
  appId,
}: CommandContext): Promise<void> {
  await command.deferReply({ flags: MessageFlags.Ephemeral })
  const action = command.options.getString('action', true)
  if (action === 'list') {
    await replyWithBackendList({ interaction: command })
    return
  }
  if (action === 'current') {
    await replyWithCurrentBackend({ interaction: command, appId })
    return
  }
  if (action === 'set') {
    await setSelectedBackend({ interaction: command, appId })
    return
  }
  await command.editReply(`Unknown backend action: ${action}`)
}
