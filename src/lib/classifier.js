// Client-side embedding classifier for Stage 1.
// Runs entirely in-browser via WASM — no server round trip, no extra API cost.
// Splits the pipeline: this file does classification (consistent, auditable),
// Claude (server-side) does generation (fluent, empathetic explanation copy).

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

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

let extractorPromise = null
let taxonomyEmbeddingsPromise = null

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', MODEL_ID, { quantized: true })
    )
  }
  return extractorPromise
}

async function embed(extractor, text) {
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

function getTaxonomyEmbeddings(extractor) {
  if (!taxonomyEmbeddingsPromise) {
    taxonomyEmbeddingsPromise = Promise.all(
      CATEGORIES.map(async (category) => ({
        category,
        vector: await embed(extractor, category.embedText)
      }))
    )
  }
  return taxonomyEmbeddingsPromise
}

function cosineSimilarity(a, b) {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot // both vectors are already normalized, so dot product == cosine similarity
}

// Kicks off model + taxonomy loading without blocking anything — call once at app startup
// so the ~90MB model is warm in cache before the student ever hits submit.
export function warmClassifier() {
  getExtractor()
    .then((extractor) => getTaxonomyEmbeddings(extractor))
    .catch((err) => console.warn('Classifier warm-up failed (will retry on submit):', err))
}

// Classifies free text against the fixed taxonomy. Returns the best-match category
// plus a 0-1 cosine similarity score. Never classifies with an LLM — that's the point.
export async function classifyNeed(text) {
  const extractor = await getExtractor()
  const taxonomyEmbeddings = await getTaxonomyEmbeddings(extractor)
  const inputVector = await embed(extractor, text)

  let best = null
  for (const { category, vector } of taxonomyEmbeddings) {
    const score = cosineSimilarity(inputVector, vector)
    if (!best || score > best.score) best = { category, score }
  }
  return best
}
