// A deterministic, hand-written parser for a narrow domain (medication
// timing instructions) — deliberately not an LLM. See
// docs/superpowers/specs/... discussion: sub-1B local models are large
// downloads with inconsistent mobile WebGPU support and weaker structured
// extraction than this fixed grammar covers for the phrasings that
// actually occur here. Anything outside the covered grammar produces a
// warning, never a silent guess — the caller always shows the parsed
// result for review before saving anything.

export type AnchorKind = 'meal' | 'wake' | 'sleep' | 'medication' | 'custom'
export type AnchorRef = { id: string; label: string; kind: AnchorKind }

export type ParsedDose =
  | { timingType: 'fixed'; fixedTime: string }
  | {
      timingType: 'relative'
      anchorId: string
      anchorLabel: string
      relation: 'before' | 'after'
      ruleType: 'exact' | 'minimum' | 'range'
      minMinutes: number
      maxMinutes?: number
    }

export type ParsedMedication = {
  displayName: string
  strengthValue?: number
  strengthUnit?: string
  doses: ParsedDose[]
  warnings: string[]
}

const WAKE_SYNONYMS = ['wake', 'wake up', 'waking up', 'waking', 'wakeup']
const SLEEP_SYNONYMS = ['bed', 'bedtime', 'sleep', 'going to bed']
const ALL_MEALS_PHRASES = ['each meal', 'every meal', 'meals', 'each meals']

// Order matters: more specific alternatives (exactly/at least/immediately/
// with/during/a fixed time/a range) must be tried before the bare-number
// fallback, since a bare \d+ would otherwise match inside any of them.
const CLAUSE_HEAD_SOURCE = String.raw`(?:exactly\s+\d+|at\s+least\s+\d+|immediately\b|\bwith\b|\bduring\b|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b|\d+(?:\.\d+)?\s*(?:-|to)\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?)`

export function parseMedicationText(text: string, anchors: AnchorRef[]): ParsedMedication {
  const cleaned = text
    .replace(/^(please\s+)?(take|takes|taking)\s+/i, '')
    .replace(/\b(every day|each day|daily)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  const { name, strengthValue, strengthUnit, rest } = extractNameAndRest(cleaned)
  const warnings: string[] = []
  const doses: ParsedDose[] = []

  if (!rest) {
    warnings.push('No timing information found — add a dose manually below.')
    return { displayName: name, strengthValue, strengthUnit, doses, warnings }
  }

  const clauses = splitClauses(rest)
  if (clauses.length === 0) {
    warnings.push(`Couldn't understand: "${rest}"`)
    return { displayName: name, strengthValue, strengthUnit, doses, warnings }
  }

  for (const clause of clauses) {
    const result = parseClause(clause, anchors)
    doses.push(...result.doses)
    if (result.warning) warnings.push(result.warning)
  }

  return { displayName: name, strengthValue, strengthUnit, doses, warnings }
}

function extractNameAndRest(s: string): { name: string; strengthValue?: number; strengthUnit?: string; rest: string } {
  const strengthMatch = s.match(/\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?)\b/i)
  if (strengthMatch && strengthMatch.index !== undefined) {
    const name = s.slice(0, strengthMatch.index).trim()
    const rest = s.slice(strengthMatch.index + strengthMatch[0].length).trim()
    return { name, strengthValue: Number(strengthMatch[1]), strengthUnit: strengthMatch[2].toLowerCase(), rest }
  }

  const headMatch = s.match(new RegExp(CLAUSE_HEAD_SOURCE, 'i'))
  if (headMatch && headMatch.index !== undefined && headMatch.index > 0) {
    return { name: s.slice(0, headMatch.index).trim(), rest: s.slice(headMatch.index).trim() }
  }
  if (headMatch && headMatch.index === 0) {
    return { name: '', rest: s }
  }
  return { name: s.trim(), rest: '' }
}

function splitClauses(rest: string): string[] {
  const re = new RegExp(CLAUSE_HEAD_SOURCE, 'gi')
  const indices: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(rest)) !== null) {
    indices.push(m.index)
    if (m[0].length === 0) re.lastIndex++
  }
  if (indices.length === 0) return []
  return indices.map((start, i) => rest.slice(start, indices[i + 1] ?? rest.length).trim())
}

function toMinutes(value: number, unit: string): number {
  return /^h/i.test(unit) ? value * 60 : value
}

function to24Hour(hourStr: string, minStr: string | undefined, ampm: string | undefined): string {
  let hour = Number(hourStr)
  const minute = minStr ? Number(minStr) : 0
  if (ampm) {
    const isPM = ampm.toLowerCase() === 'pm'
    if (isPM && hour !== 12) hour += 12
    if (!isPM && hour === 12) hour = 0
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function resolveAnchorWord(word: string, anchors: AnchorRef[]): AnchorRef | 'ALL_MEALS' | undefined {
  const w = word.trim().toLowerCase().replace(/[.,?!]+$/, '')
  if (ALL_MEALS_PHRASES.includes(w)) return 'ALL_MEALS'
  const exact = anchors.find((a) => a.label.toLowerCase() === w)
  if (exact) return exact
  if (WAKE_SYNONYMS.includes(w)) return anchors.find((a) => a.kind === 'wake')
  if (SLEEP_SYNONYMS.includes(w)) return anchors.find((a) => a.kind === 'sleep')
  return undefined
}

function splitAnchorList(text: string): string[] {
  return text
    .split(/,|\band\b|&/i)
    .map((w) => w.trim().replace(/[.,?!]+$/, ''))
    .filter((w) => w.length > 0)
}

type DoseBase = { relation: 'before' | 'after'; ruleType: 'exact' | 'minimum' | 'range'; minMinutes: number; maxMinutes?: number }

function resolveAnchorsAndBuild(anchorText: string, anchors: AnchorRef[], base: DoseBase): { doses: ParsedDose[]; warning?: string } {
  const words = splitAnchorList(anchorText)
  const doses: ParsedDose[] = []
  const unresolved: string[] = []
  for (const word of words) {
    const resolved = resolveAnchorWord(word, anchors)
    if (resolved === 'ALL_MEALS') {
      for (const a of anchors.filter((a) => a.kind === 'meal')) {
        doses.push({ timingType: 'relative', anchorId: a.id, anchorLabel: a.label, ...base })
      }
    } else if (resolved) {
      doses.push({ timingType: 'relative', anchorId: resolved.id, anchorLabel: resolved.label, ...base })
    } else {
      unresolved.push(word)
    }
  }
  if (unresolved.length === 0) return { doses }
  const warning = `Couldn't find "${unresolved.join(', ')}" in your plan's meals/wake/bedtime.`
  return { doses, warning }
}

function parseClause(raw: string, anchors: AnchorRef[]): { doses: ParsedDose[]; warning?: string } {
  const text = raw.trim()

  let m = text.match(/^(with|during)\s+(.+)$/i)
  if (m) return resolveAnchorsAndBuild(m[2], anchors, { ruleType: 'exact', minMinutes: 0, maxMinutes: 0, relation: 'before' })

  if (!/^at\s+least\b/i.test(text)) {
    m = text.match(/^at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
    if (m) return { doses: [{ timingType: 'fixed', fixedTime: to24Hour(m[1], m[2], m[3]) }] }
  }

  m = text.match(/^immediately\s+(before|after)\s+(.+)$/i)
  if (m) return resolveAnchorsAndBuild(m[2], anchors, { ruleType: 'exact', minMinutes: 0, maxMinutes: 0, relation: m[1].toLowerCase() as 'before' | 'after' })

  m = text.match(/^exactly\s+(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|hours?|hrs?)\s+(before|after)\s+(.+)$/i)
  if (m) {
    const minutes = toMinutes(Number(m[1]), m[2])
    return resolveAnchorsAndBuild(m[4], anchors, { ruleType: 'exact', minMinutes: minutes, maxMinutes: minutes, relation: m[3].toLowerCase() as 'before' | 'after' })
  }

  m = text.match(/^at\s+least\s+(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|hours?|hrs?)\s+(before|after)\s+(.+)$/i)
  if (m) {
    const minutes = toMinutes(Number(m[1]), m[2])
    return resolveAnchorsAndBuild(m[4], anchors, { ruleType: 'minimum', minMinutes: minutes, relation: m[3].toLowerCase() as 'before' | 'after' })
  }

  m = text.match(/^(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|hours?|hrs?)\s+(before|after)\s+(.+)$/i)
  if (m) {
    const a = toMinutes(Number(m[1]), m[3])
    const b = toMinutes(Number(m[2]), m[3])
    return resolveAnchorsAndBuild(m[5], anchors, { ruleType: 'range', minMinutes: Math.min(a, b), maxMinutes: Math.max(a, b), relation: m[4].toLowerCase() as 'before' | 'after' })
  }

  m = text.match(/^(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|hours?|hrs?)\s+(before|after)\s+(.+)$/i)
  if (m) {
    const minutes = toMinutes(Number(m[1]), m[2])
    return resolveAnchorsAndBuild(m[4], anchors, { ruleType: 'minimum', minMinutes: minutes, relation: m[3].toLowerCase() as 'before' | 'after' })
  }

  return { doses: [], warning: `Couldn't understand: "${raw.trim()}"` }
}
