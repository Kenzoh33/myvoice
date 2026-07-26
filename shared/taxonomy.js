// Canonical accommodation taxonomy — the single source of truth for both the server
// (constrains what formalTerm Claude is allowed to return) and the client (menu labels,
// reflection bucketing).
//
// Why this exists: growth tracking only accumulates if "extra time" and "more time on my
// math test" land in the SAME bucket. Free-text keys fragment a student's history silently.
// Every reflection is keyed on `key` below, never on what the student happened to type.
//
// `embedText` is used by the (parked) embedding classifier in src/lib/classifier.js.
// The live path constrains Claude to these same keys via a tool-use enum, which gets us
// the consistency benefit without the onnxruntime-web bundling problem.

export const CATEGORIES = [
  { key: 'extended_time', label: 'Extra time on tests or assignments', formalTerm: 'Extended time', embedText: 'extra time to finish tests, quizzes, or assignments without feeling rushed' },
  { key: 'written_instructions', label: 'Instructions repeated or written down', formalTerm: 'Instructions provided in writing', embedText: 'instructions repeated and also written down or shown on the board' },
  { key: 'quiet_space', label: 'A quiet space to work', formalTerm: 'Reduced-distraction testing environment', embedText: 'a quiet space away from noise and distractions to work or take a test' },
  { key: 'movement_breaks', label: 'Movement breaks', formalTerm: 'Scheduled movement breaks', embedText: 'short breaks to stand up, stretch, or move around during class' },
  { key: 'read_aloud', label: 'Reading passages read aloud', formalTerm: 'Text-to-speech / read-aloud accommodation', embedText: 'reading passages or questions read aloud instead of reading them alone' },
  { key: 'translated_instructions', label: 'Instructions translated', formalTerm: 'Translated instructional materials', embedText: 'instructions translated into another language' },
  { key: 'preferential_seating', label: 'Seating near the front or away from distractions', formalTerm: 'Preferential seating', embedText: 'sitting near the front of the class or away from distractions' },
  { key: 'chunked_instructions', label: 'Breaking assignments into smaller steps', formalTerm: 'Task chunking', embedText: 'breaking a big assignment into smaller, more manageable steps' },
  { key: 'visual_schedule', label: 'A visual schedule or checklist', formalTerm: 'Visual schedule/checklist support', embedText: 'a visual schedule or checklist to know what is happening next' },
  { key: 'sensory_tools', label: 'Fidget or sensory tools', formalTerm: 'Sensory/fidget tool accommodation', embedText: 'fidget tools or sensory items to help with focus' },
  { key: 'assistive_tech', label: 'Typing or speech-to-text instead of handwriting', formalTerm: 'Assistive technology', embedText: 'using a computer, tablet, or speech-to-text instead of handwriting' },
  { key: 'extended_deadlines', label: 'More time to turn in homework or projects', formalTerm: 'Extended assignment deadlines', embedText: 'more days, not just extra minutes, to turn in homework or projects' },
  { key: 'alternative_format', label: 'Materials in a different format', formalTerm: 'Alternative format materials', embedText: 'materials in a different format like audio, large print, or braille' },
  { key: 'frequent_check_ins', label: 'More frequent check-ins from the teacher', formalTerm: 'Frequent teacher check-ins', embedText: 'the teacher checking in more often during class to see how things are going' },
  { key: 'simplified_language', label: 'Directions explained in simpler language', formalTerm: 'Simplified/plain-language instructions', embedText: 'directions explained in simpler, shorter language' },
  { key: 'calm_down_space', label: 'A place to calm down when overwhelmed', formalTerm: 'Access to a calm-down/break space', embedText: 'a place to go to calm down when feeling overwhelmed or anxious' },
  { key: 'peer_support', label: 'Working with a partner or peer buddy', formalTerm: 'Peer support / buddy system', embedText: 'working with a partner or peer buddy for support' },
  { key: 'reduced_workload', label: 'A shorter version of an assignment', formalTerm: 'Reduced/modified workload', embedText: 'fewer problems or a shorter version of an assignment that still covers the same material' }
]

// Escape hatch: a student's need genuinely may not be in the list. Better an honest
// "other" bucket than forcing a bad match and printing a wrong formal term on a
// document they hand to a teacher.
export const OTHER_KEY = 'other'

export const CATEGORY_KEYS = [...CATEGORIES.map((c) => c.key), OTHER_KEY]

export function getCategory(key) {
  return CATEGORIES.find((c) => c.key === key) || null
}

// The six needs shown as quick-pick buttons on Stage 1. Ordered by how often they come up.
export const FEATURED_KEYS = [
  'extended_time',
  'written_instructions',
  'quiet_space',
  'movement_breaks',
  'read_aloud',
  'translated_instructions'
]

export const FEATURED_CATEGORIES = FEATURED_KEYS.map(getCategory).filter(Boolean)
