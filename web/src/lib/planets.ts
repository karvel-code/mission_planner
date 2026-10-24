// Display colours per body, from the TEC concept, keyed by slug.
const COLOURS: Record<string, string> = {
  sun: '#fc6a18',
  mercury: '#a8a29e',
  venus: '#e7b36a',
  earth: '#3b82f6',
  mars: '#dc5a3a',
  jupiter: '#d6a77a',
  saturn: '#e3c98b',
  uranus: '#7dd3d8',
  neptune: '#4f6ee8',
}

/** Unknown bodies (e.g. from a new catalog) get a neutral tone. */
export const planetColour = (slug: string) => COLOURS[slug] ?? '#94a3b8'

/** The colour for a body known only by name, e.g. a mission plan's stop. */
export const planetColourByName = (name: string) => planetColour(name.toLowerCase())
