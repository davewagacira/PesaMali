// Message compression to maintain conversation focus
// Similar to how Claude/ChatGPT handle long conversations

export interface CompressedSection {
  isCompressed: true
  summary: string
  messageCount: number
  expanded: boolean
}

export interface DisplayMessage {
  id?: string
  who: 'user' | 'ai'
  text: string
  compressed?: boolean
}

export function compressMessages(
  messages: Array<{ who: 'user' | 'ai'; text: string }>,
  keepRecent: number = 6
): Array<DisplayMessage | CompressedSection> {
  if (messages.length <= keepRecent + 3) {
    return messages as DisplayMessage[]
  }

  const compressUpTo = messages.length - keepRecent
  const toCompress = messages.slice(0, compressUpTo)
  const toKeep = messages.slice(compressUpTo)

  // Extract key points from compressed messages
  const userQuestions = toCompress
    .filter((m) => m.who === 'user')
    .map((m) => m.text.split('?')[0].slice(0, 50))
    .slice(0, 3)

  const aiAnswers = toCompress
    .filter((m) => m.who === 'ai')
    .map((m) => m.text.split('.')[0].slice(0, 60))
    .slice(0, 2)

  const summary =
    `Earlier in this conversation, you asked about: ${userQuestions.join(', ')}. ` +
    `I provided insights on: ${aiAnswers.join(', ')}. ` +
    `You can expand above to see the full earlier discussion.`

  return [
    {
      isCompressed: true,
      summary,
      messageCount: toCompress.length,
      expanded: false,
    } as CompressedSection,
    ...toKeep,
  ]
}

export function getCompressedContext(
  messages: Array<{ who: 'user' | 'ai'; text: string }>,
  keepRecent: number = 6
): string {
  if (messages.length <= keepRecent + 3) {
    return ''
  }

  const compressUpTo = messages.length - keepRecent
  const toCompress = messages.slice(0, compressUpTo)

  const userQuestions = toCompress
    .filter((m) => m.who === 'user')
    .map((m) => m.text)
    .slice(0, 3)
    .join('\n')

  const aiAnswers = toCompress
    .filter((m) => m.who === 'ai')
    .map((m) => m.text.slice(0, 100))
    .slice(0, 2)
    .join('\n')

  return `Earlier conversation context (compressed):\nUser previously asked about: ${userQuestions}\nI answered with insights on: ${aiAnswers}`
}
