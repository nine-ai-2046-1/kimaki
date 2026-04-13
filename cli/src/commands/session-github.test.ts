import { describe, expect, test } from 'vitest'
import { handleSessionGithubCommand } from './session-github.js'

describe('session-github command', () => {
  test('requires a thread session', async () => {
    const replies: string[] = []
    const interaction = {
      channel: null,
      options: {
        getString: (name: string, required?: boolean) => {
          if (name === 'action') {
            return 'current'
          }
          if (required) {
            throw new Error(`Unexpected required option lookup for ${name}`)
          }
          return null
        },
      },
      reply: async ({ content }: { content: string }) => {
        replies.push(content)
      },
    }

    await handleSessionGithubCommand({
      interaction: interaction as never,
      appId: 'app-1',
    })

    expect(replies[0]).toBe('This command must be used inside a session thread.')
  })
})
