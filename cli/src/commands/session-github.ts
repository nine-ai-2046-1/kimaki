import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import { getSessionGithubCredentials, getThreadSession, setSessionGithubCredentials } from '../database.js'

function buildGithubTokenModal({
  sessionId,
}: {
  sessionId: string
}): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`session_github_token_modal:${sessionId}`)
    .setTitle('Session GitHub Token')

  const tokenInput = new TextInputBuilder()
    .setCustomId('github_token')
    .setLabel('GitHub Token')
    .setPlaceholder('ghp_... or github_pat_...')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(tokenInput))
  return modal
}

function buildGithubIdentityModal({
  sessionId,
}: {
  sessionId: string
}): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`session_github_identity_modal:${sessionId}`)
    .setTitle('Session Git Identity')

  const nameInput = new TextInputBuilder()
    .setCustomId('git_user_name')
    .setLabel('Git user.name')
    .setPlaceholder('Your Name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)

  const emailInput = new TextInputBuilder()
    .setCustomId('git_user_email')
    .setLabel('Git user.email')
    .setPlaceholder('you@example.com')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput),
  )
  return modal
}

async function requireThreadSession({
  interaction,
}: {
  interaction: ChatInputCommandInteraction
}): Promise<string | undefined> {
  const channel = interaction.channel
  if (!channel?.isThread()) {
    await interaction.reply({
      content: 'This command must be used inside a session thread.',
      flags: MessageFlags.Ephemeral,
    })
    return undefined
  }
  const sessionId = await getThreadSession(channel.id)
  if (!sessionId) {
    await interaction.reply({
      content: 'This thread has no active session yet.',
      flags: MessageFlags.Ephemeral,
    })
    return undefined
  }
  return sessionId
}

export async function handleSessionGithubCommand({
  interaction,
}: {
  interaction: ChatInputCommandInteraction
  appId: string
}): Promise<void> {
  const action = interaction.options.getString('action', true)
  const sessionId = await requireThreadSession({ interaction })
  if (!sessionId) {
    return
  }

  if (action === 'current') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const credentials = await getSessionGithubCredentials(sessionId)
    const tokenStatus = credentials?.githubToken ? 'configured' : 'missing'
    const nameStatus = credentials?.gitUserName || 'missing'
    const emailStatus = credentials?.gitUserEmail || 'missing'
    await interaction.editReply(
      `Session GitHub token: ${tokenStatus}\nGit user.name: ${nameStatus}\nGit user.email: ${emailStatus}`,
    )
    return
  }

  if (action === 'set-token') {
    await interaction.showModal(buildGithubTokenModal({ sessionId }))
    return
  }

  if (action === 'set-identity') {
    await interaction.showModal(buildGithubIdentityModal({ sessionId }))
    return
  }

  await interaction.reply({
    content: 'Unknown session-github action.',
    flags: MessageFlags.Ephemeral,
  })
}

export async function handleSessionGithubTokenModalSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.customId.startsWith('session_github_token_modal:')) {
    return
  }
  const sessionId = interaction.customId.slice('session_github_token_modal:'.length).trim()
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  if (!sessionId) {
    await interaction.editReply('Missing session id for GitHub token setup.')
    return
  }
  const githubToken = interaction.fields.getTextInputValue('github_token').trim()
  if (!githubToken) {
    await interaction.editReply('GitHub token is required.')
    return
  }
  const existing = await getSessionGithubCredentials(sessionId)
  await setSessionGithubCredentials({
    sessionId,
    githubToken,
    gitUserName: existing?.gitUserName,
    gitUserEmail: existing?.gitUserEmail,
  })
  await interaction.editReply('Session GitHub token saved.')
}

export async function handleSessionGithubIdentityModalSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.customId.startsWith('session_github_identity_modal:')) {
    return
  }
  const sessionId = interaction.customId.slice('session_github_identity_modal:'.length).trim()
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })
  if (!sessionId) {
    await interaction.editReply('Missing session id for Git identity setup.')
    return
  }
  const gitUserName = interaction.fields.getTextInputValue('git_user_name').trim()
  const gitUserEmail = interaction.fields.getTextInputValue('git_user_email').trim()
  if (!gitUserName || !gitUserEmail) {
    await interaction.editReply('Git user.name and user.email are required.')
    return
  }
  const existing = await getSessionGithubCredentials(sessionId)
  await setSessionGithubCredentials({
    sessionId,
    githubToken: existing?.githubToken,
    gitUserName,
    gitUserEmail,
  })
  await interaction.editReply('Session Git identity saved.')
}
