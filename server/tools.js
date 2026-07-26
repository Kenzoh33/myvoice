import { CATEGORY_KEYS } from '../shared/taxonomy.js'

// Tool-use instead of "return JSON and please don't wrap it in a code fence".
// The old extractJson() regex-stripped fences and called JSON.parse on the result — one
// conversational sentence from the model and the student saw a 500. Forcing a tool call
// makes the shape guaranteed by the API rather than by hope.

export const understandTool = {
  name: 'explain_need',
  description: "Explain a student's learning need back to them in warm, simple language, and match it to a standard accommodation category.",
  input_schema: {
    type: 'object',
    properties: {
      categoryKey: {
        type: 'string',
        enum: CATEGORY_KEYS,
        description: 'The closest matching accommodation category. Use "other" only if nothing genuinely fits.'
      },
      plainExplanation: {
        type: 'string',
        description: '2-3 warm, validating sentences a middle schooler reads comfortably.'
      },
      formalTerm: {
        type: 'string',
        description: 'The formal accommodation term. Only used when categoryKey is "other" — otherwise the canonical term for the category is substituted.'
      },
      whyItHelps: {
        type: 'string',
        description: 'One sentence on why this support helps them learn.'
      }
    },
    required: ['categoryKey', 'plainExplanation', 'formalTerm', 'whyItHelps']
  }
}

export const practiceTool = {
  name: 'teacher_turn',
  description: 'Reply in character as the teacher, plus one out-of-character coaching tip for the student.',
  input_schema: {
    type: 'object',
    properties: {
      teacherReply: {
        type: 'string',
        description: '1-2 sentences, fully in character as the teacher.'
      },
      coachTip: {
        type: 'string',
        description: 'One short, warm, specific out-of-character tip for the student.'
      }
    },
    required: ['teacherReply', 'coachTip']
  }
}

// Pulls the tool input out of a response, with a real error instead of a TypeError
// when the model returns something unexpected.
export function extractToolInput(message, toolName) {
  const block = message.content.find((b) => b.type === 'tool_use' && b.name === toolName)
  if (!block) {
    throw new Error(`Model did not call the ${toolName} tool`)
  }
  return block.input
}

export function extractText(message) {
  const block = message.content.find((b) => b.type === 'text')
  if (!block || !block.text.trim()) {
    throw new Error('Model returned no text')
  }
  return block.text.trim()
}
