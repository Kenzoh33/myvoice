// Client-side embedding classifier for Stage 1. PARKED — not wired into the live app.
//
// Blocked on a Vite/onnxruntime-web bundling issue. The taxonomy it was built around now
// lives in shared/taxonomy.js and IS live: the server constrains Claude to the same
// category keys via a tool-use enum (server/tools.js), then overrides the model's formal
// term with the canonical one. That ships the consistency benefit — same need, same
// bucket, same term, every time — without the bundling problem.
//
// What this file would still add if unblocked: classification with no API call and no
// token cost, and an auditable similarity score instead of a model's judgment.

import { CATEGORIES } from '../../shared/taxonomy.js'

export { CATEGORIES }

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

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
