import { getCategory, CATEGORIES } from '../shared/taxonomy.js'

// Demo-safe fixture mode. `MOCK=1 npm run dev` runs the full four-stage flow with no API
// keys and no network — so the app is evaluable by anyone who clones the repo, and a dead
// conference wifi connection can't kill a live demo.
//
// These are hand-written to be representative, not flattering: the busy teacher pushes
// back, and the practice-mode reflection acknowledges it was a rehearsal.

export const MOCK_MODE = process.env.MOCK === '1' || process.env.MOCK === 'true'

// Crude keyword match — good enough for fixtures, and deliberately not an LLM.
function guessCategory(needText) {
  const text = needText.toLowerCase()
  const hit = CATEGORIES.find((c) =>
    c.label.toLowerCase().split(/\W+/).filter((w) => w.length > 4).some((w) => text.includes(w))
  )
  return hit || getCategory('extended_time')
}

export function mockUnderstand(needText) {
  const category = guessCategory(needText)
  return {
    categoryKey: category.key,
    plainExplanation: `You're saying you need ${category.label.toLowerCase()} — that makes complete sense. Lots of students need this, and needing it doesn't say anything about how smart you are. It's about getting a fair shot at showing what you actually know.`,
    formalTerm: category.formalTerm,
    whyItHelps: `It removes a barrier that has nothing to do with what you've learned, so your work reflects your understanding instead of the conditions around you.`
  }
}

export function mockPractice(studentMessage, mode) {
  if (mode === 'busy') {
    return {
      teacherReply: `Sorry — say that again? I'm trying to get everyone started. Which class are we talking about, and how much time are you asking for?`,
      coachTip: `Good — you spoke up even though I was clearly distracted, and that's the hardest part. Try adding the class and the exact amount of time, like "for Friday's math test, about 20 extra minutes." Me being busy isn't you doing it wrong.`
    }
  }
  return {
    teacherReply: `Thanks for coming to tell me — I'm glad you did. Can you tell me a bit more about which assignments feel hardest to finish in time?`,
    coachTip: `You asked directly and clearly, which a lot of students find really hard. Next time try naming the specific class too, like "in science," so I know exactly what to set up.`
  }
}

export function mockReflect(attemptType) {
  if (attemptType === 'practice') {
    return {
      reflectionText: `You practiced saying it out loud, and you got to a version that was specific and calm — that's the part that'll matter when it's a real teacher in front of you. You didn't just say "I need help," you named what you actually needed. You haven't had the real conversation yet, and that's okay: you're readier for it than you were ten minutes ago.`
    }
  }
  return {
    reflectionText: `You asked. That's the part most people never get to, and you did it even though it felt uncomfortable. What stands out is that you were specific about what you needed instead of hoping someone would guess. However it landed this time, you now know you can do it.`
  }
}

export function mockShare(need, formalTerm, practicedPhrase) {
  return [
    `I'm sharing this because I want to be part of how my learning gets supported.`,
    ``,
    `What I need: ${need}. ${formalTerm ? `On my plan this is usually written as "${formalTerm}."` : ''}`.trim(),
    ``,
    practicedPhrase
      ? `Here's how I've practiced asking for it: "${practicedPhrase}"`
      : `I've been practicing how to ask for this in my own words.`,
    ``,
    `It helps me because it removes something that gets in the way of showing what I actually know. I'm not asking for an advantage — I'm asking for a fair shot. Thank you for reading this.`
  ].join('\n')
}
