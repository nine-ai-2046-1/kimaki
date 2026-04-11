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

function buildBackendUsageHint(): string {
  return joinLines({
    lines: [
      'Usage:',
      '- /backend action:list',
      '- /backend action:current',
      '- /backend action:set backend:opencode|gemini-cli|codex|kiro-cli scope:session|machine',
    ],
  })
}

async function replyWithBackendList({
  interaction,
  appId,
}: {
  interaction: ChatInputCommandInteraction
  appId: string
}): Promise<void> {
  const availability = await listBackendAvailability({ appId })
  const lines = availability.map((item) => {
    if (item.available) {
      if (item.backendId === 'gemini_cli') {
        return `- ${item.label}: available (text-mode backend)`
      }
      if (item.backendId === 'kiro_cli') {
        return `- ${item.label}: available (rich CLI backend)`
      }
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
  const backendValue = interaction.options.getString('backend')
  if (!backendValue) {
    await interaction.editReply(
      `Missing backend selection.\n${buildBackendUsageHint()}`,
    )
    return
  }
  const scope = interaction.options.getString('scope') || 'session'
  const backendId = parseBackendId({ value: backendValue })
  if (!backendId) {
    await interaction.editReply(
      `Unknown backend: ${backendValue}\n${buildBackendUsageHint()}`,
    )
    return
  }

  const availability = await (async () => {
    try {
      return await assertBackendAvailable({ backendId, appId })
    } catch (error) {
      if (error instanceof Error) {
        return error
      }
      return new Error('Unknown backend availability error')
    }
  })()
  if (availability instanceof Error) {
    await interaction.editReply(
      backendId === 'gemini_cli'
        ? `${formatBackendLabel({ backendId })} is unavailable: ${availability.message}\nSet a Gemini API key with /transcription-key or GEMINI_API_KEY, then try again.`
        : backendId === 'kiro_cli'
        ? `${formatBackendLabel({ backendId })} is unavailable: ${availability.message}\nRun \`kiro-cli login\` and make sure your Kiro CLI session is active, then try again.`
        : `${formatBackendLabel({ backendId })} is unavailable: ${availability.message}`,
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
      backendId === 'gemini_cli'
        ? 'Machine default backend set to Gemini CLI. Phase 2 Gemini runs in text-mode and does not provide full OpenCode tool/runtime parity.'
        : backendId === 'kiro_cli'
        ? 'Machine default backend set to Kiro CLI. Kiro is treated as a rich CLI backend, but the current implementation still uses the phase 1 Discord text reply path.'
        : `Machine default backend set to ${formatBackendLabel({ backendId })}`,
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
    backendId === 'gemini_cli'
      ? 'Session backend set to Gemini CLI. Phase 2 Gemini runs in text-mode and does not provide full OpenCode tool/runtime parity.'
      : backendId === 'kiro_cli'
      ? 'Session backend set to Kiro CLI. Kiro is treated as a rich CLI backend, but the current implementation still uses the phase 1 Discord text reply path.'
      : `Session backend set to ${formatBackendLabel({ backendId })}`,
  )
}

export async function handleBackendCommand({
  command,
  appId,
}: CommandContext): Promise<void> {
  await command.deferReply({ flags: MessageFlags.Ephemeral })
  const action = command.options.getString('action', true)
  if (action === 'list') {
    await replyWithBackendList({ interaction: command, appId })
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
