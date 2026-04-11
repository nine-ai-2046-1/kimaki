import { describe, expect, test } from 'vitest'
import { handleBackendCommand } from './backend.js'

describe('backend command', () => {
  test('replies with usage when set action is missing backend option', async () => {
    const replies: string[] = []
    const command = {
      deferReply: async () => {},
      editReply: async (message: string) => {
        replies.push(message)
      },
      options: {
        getString: (name: string, required?: boolean) => {
          if (name === 'action') {
            return 'set'
          }
          if (name === 'backend') {
            return null
          }
          if (name === 'scope') {
            return null
          }
          if (required) {
            throw new Error(`Unexpected required option lookup for ${name}`)
          }
          return null
        },
      },
    }

    await handleBackendCommand({
      command: command as never,
      appId: 'app-1',
    })

    expect(replies[0]).toMatchInlineSnapshot(`
      "Missing backend selection.
      Usage:
      - /backend action:list
      - /backend action:current
      - /backend action:set backend:opencode|gemini-cli|codex|kiro-cli scope:session|machine"
    `)
  })
})
