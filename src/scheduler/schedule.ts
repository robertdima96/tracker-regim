import type {
  Conflict,
  EventTemplate,
  Explanation,
  ExplanationFact,
  Instant,
  LocalDate,
  RelativeConstraint,
  ScheduleEvent,
  TimeWindow,
} from '../domain/types'
import { addMinutes, localTimeToInstant } from './time'

export type ActualEvent = { templateId: string; actualAt: Instant }

export type CalculateScheduleInput = {
  templates: EventTemplate[]
  constraints: RelativeConstraint[]
  date: LocalDate
  timezone: string
  actualEvents: ActualEvent[]
  previousSchedule?: ScheduleEvent[]
  engineVersion: string
  revisionId: string
}

export type ScheduleDiffEntry = {
  eventId: string
  changeKind: 'added' | 'window_changed' | 'status_changed' | 'removed'
}

export type CalculateScheduleResult = {
  events: ScheduleEvent[]
  conflicts: Conflict[]
  explanations: Explanation[]
  diff: ScheduleDiffEntry[]
}

type NodeState = {
  template: EventTemplate
  /** Current best-known window. Starts undefined for derived-only nodes with no default. */
  window: TimeWindow | undefined
  /** True once window is a fixed point sourced from an actual event — never tightened further. */
  hasActual: boolean
  actualAt?: Instant
  /** True if `window` originated from the template's own preferredWindow/fixedLocalTime. */
  hasDefault: boolean
  preferredPoint?: Instant
  facts: ExplanationFact[]
}

const MAX_PASSES_MULTIPLIER = 3

function windowIntersect(a: TimeWindow, b: TimeWindow): TimeWindow | null {
  const earliest = a.earliest > b.earliest ? a.earliest : b.earliest
  const latest = a.latest < b.latest ? a.latest : b.latest
  if (earliest > latest) return null
  return { earliest, latest }
}

function dayBounds(date: LocalDate, timezone: string): TimeWindow {
  return {
    earliest: localTimeToInstant(date, '00:00', timezone),
    latest: addMinutes(localTimeToInstant(date, '00:00', timezone), 24 * 60 - 1),
  }
}

/**
 * For a constraint, identifies which side is chronologically "later" and
 * "earlier" regardless of which field is named source/target — this is
 * what lets propagation work in either direction (see design doc: a fixed
 * source→target order breaks when an actual event on the source pushes
 * the target, as in the spec's own T3 example).
 */
function laterEarlierSides(constraint: RelativeConstraint): { later: 'source' | 'target'; earlier: 'source' | 'target' } {
  return constraint.relation === 'before'
    ? { later: 'target', earlier: 'source' }
    : { later: 'source', earlier: 'target' }
}

function templateIdFor(constraint: RelativeConstraint, side: 'source' | 'target'): string {
  return side === 'source' ? constraint.sourceTemplateId : constraint.targetTemplateId
}

export function calculateSchedule(input: CalculateScheduleInput): CalculateScheduleResult {
  const { templates, constraints, date, timezone, actualEvents, engineVersion, revisionId } = input
  const bounds = dayBounds(date, timezone)
  const conflicts: Conflict[] = []

  // Step 1 + 2: instantiate nodes and seed with actual events / defaults.
  const nodes = new Map<string, NodeState>()
  for (const template of templates) {
    const actual = actualEvents.find((a) => a.templateId === template.id)
    if (actual) {
      nodes.set(template.id, {
        template,
        window: { earliest: actual.actualAt, latest: actual.actualAt },
        hasActual: true,
        actualAt: actual.actualAt,
        hasDefault: false,
        facts: [],
      })
      continue
    }

    if (template.preferredWindow) {
      nodes.set(template.id, {
        template,
        window: { ...template.preferredWindow },
        hasActual: false,
        hasDefault: true,
        preferredPoint: template.preferredWindow.earliest,
        facts: [],
      })
      continue
    }

    if (template.fixedLocalTime) {
      const point = localTimeToInstant(date, template.fixedLocalTime, timezone)
      nodes.set(template.id, {
        template,
        window: { earliest: point, latest: point },
        hasActual: false,
        hasDefault: true,
        preferredPoint: point,
        facts: [],
      })
      continue
    }

    nodes.set(template.id, {
      template,
      window: undefined,
      hasActual: false,
      hasDefault: false,
      facts: [],
    })
  }

  // Self-referencing constraints (minimum spacing between administrations
  // of the same template) are not graph edges — a node cannot
  // topologically depend on itself. Exclude them from the worklist below;
  // they're applied in a dedicated pass after propagation.
  const crossTemplateConstraints = constraints.filter((c) => c.sourceTemplateId !== c.targetTemplateId)

  // Step 3-5: bidirectional worklist propagation.
  const maxPasses = Math.max(1, nodes.size * MAX_PASSES_MULTIPLIER)
  let pass = 0
  let changed = true
  while (changed && pass < maxPasses) {
    changed = false
    pass++
    for (const constraint of crossTemplateConstraints) {
      const { later, earlier } = laterEarlierSides(constraint)
      const laterId = templateIdFor(constraint, later)
      const earlierId = templateIdFor(constraint, earlier)
      const laterNode = nodes.get(laterId)
      const earlierNode = nodes.get(earlierId)
      if (!laterNode || !earlierNode) continue

      const max = constraint.maxOffsetMinutes ?? Infinity
      const min = constraint.minOffsetMinutes

      // Derive a bound on `earlier` from an already-known `later` window.
      if (laterNode.window && !earlierNode.hasActual) {
        const derived: TimeWindow = {
          earliest: max === Infinity ? bounds.earliest : addMinutes(laterNode.window.earliest, -max),
          latest: addMinutes(laterNode.window.latest, -min),
        }
        const next = earlierNode.window ? windowIntersect(earlierNode.window, derived) : derived
        if (next === null) {
          conflicts.push({
            id: `conflict-${constraint.id}`,
            involvedEventIds: [earlierId, laterId],
            reason: 'empty_window',
            message: `${earlierNode.template.label} and ${laterNode.template.label} cannot both be satisfied by constraint ${constraint.id}.`,
          })
        } else if (!earlierNode.window || next.earliest !== earlierNode.window.earliest || next.latest !== earlierNode.window.latest) {
          earlierNode.window = next
          earlierNode.facts.push({
            sourceEventId: laterId,
            constraintId: constraint.id,
            textKey: 'derived_from_anchor',
            params: { anchorLabel: laterNode.template.label, relation: constraint.relation, min, max: constraint.maxOffsetMinutes },
          })
          changed = true
        }
      }

      // Derive a bound on `later` from an already-known `earlier` window —
      // this is the backward case (T3): an actual event on the earlier
      // side pushes the later side forward.
      if (earlierNode.window && !laterNode.hasActual) {
        const derived: TimeWindow = {
          earliest: addMinutes(earlierNode.window.earliest, min),
          latest: max === Infinity ? bounds.latest : addMinutes(earlierNode.window.latest, max),
        }
        const next = laterNode.window ? windowIntersect(laterNode.window, derived) : derived
        if (next === null) {
          conflicts.push({
            id: `conflict-${constraint.id}`,
            involvedEventIds: [earlierId, laterId],
            reason: 'empty_window',
            message: `${earlierNode.template.label} and ${laterNode.template.label} cannot both be satisfied by constraint ${constraint.id}.`,
          })
        } else if (!laterNode.window || next.earliest !== laterNode.window.earliest || next.latest !== laterNode.window.latest) {
          laterNode.window = next
          laterNode.facts.push({
            sourceEventId: earlierId,
            constraintId: constraint.id,
            textKey: 'derived_from_actual',
            params: { sourceLabel: earlierNode.template.label, sourceActualAt: earlierNode.actualAt, relation: constraint.relation, min, max: constraint.maxOffsetMinutes },
          })
          changed = true
        }
      }
    }
  }

  const unresolvedCycleCandidates = pass >= maxPasses
  for (const [id, node] of nodes) {
    if (!node.window) {
      conflicts.push({
        id: `conflict-missing-anchor-${id}`,
        involvedEventIds: [id],
        reason: unresolvedCycleCandidates ? 'cycle' : 'missing_anchor',
        message: `${node.template.label} could not be resolved — no default and no satisfiable constraint reached it.`,
      })
    }
  }

  // Step 6: same-template minimum-spacing pass for self-referencing
  // constraints. Simplified for this sub-project: an
  // 'interval_actual_relative'-recurrence template with a logged actual
  // event produces a second synthesized "next due" node
  // (`${templateId}::next`); without an actual event yet, "next due" is
  // left unconstrained within the day. Multi-instance-per-day generation
  // for as-needed dosing is deliberately out of scope here (see design
  // doc "Out of scope").
  const selfConstraints = constraints.filter((c) => c.sourceTemplateId === c.targetTemplateId)
  const syntheticNodes: Array<{ id: string; node: NodeState }> = []
  for (const constraint of selfConstraints) {
    const templateId = constraint.sourceTemplateId
    const node = nodes.get(templateId)
    if (!node) continue
    if (node.hasActual && node.actualAt) {
      const nextWindow: TimeWindow = { earliest: addMinutes(node.actualAt, constraint.minOffsetMinutes), latest: bounds.latest }
      syntheticNodes.push({
        id: `${templateId}::next`,
        node: {
          template: node.template,
          window: nextWindow,
          hasActual: false,
          hasDefault: false,
          facts: [
            {
              sourceEventId: templateId,
              constraintId: constraint.id,
              textKey: 'min_spacing_from_previous',
              params: { previousActualAt: node.actualAt, minOffsetMinutes: constraint.minOffsetMinutes },
            },
          ],
        },
      })
    }
  }
  for (const { id, node } of syntheticNodes) nodes.set(id, node)

  // Step 7: assemble ScheduleEvent output. Anchors collapse to a concrete
  // point closest to their own preferred point; derived (non-anchor,
  // non-actual) nodes keep their full computed window.
  const events: ScheduleEvent[] = []
  const explanations: Explanation[] = []
  for (const [id, node] of nodes) {
    if (!node.window) continue // already reported as a conflict above
    let currentWindow = node.window
    if (node.hasDefault && node.preferredPoint) {
      const clamped: Instant = node.preferredPoint < node.window.earliest
        ? node.window.earliest
        : node.preferredPoint > node.window.latest
          ? node.window.latest
          : node.preferredPoint
      currentWindow = { earliest: clamped, latest: clamped }
    }

    events.push({
      id,
      templateId: node.template.id,
      date,
      kind: node.template.kind,
      plannedWindow: currentWindow,
      currentWindow,
      actualAt: node.actualAt,
      status: node.hasActual ? 'taken' : 'upcoming',
      revisionId,
    })

    if (node.facts.length > 0) {
      explanations.push({
        eventId: id,
        headline: `${node.template.label}: ${currentWindow.earliest}${currentWindow.earliest !== currentWindow.latest ? ` – ${currentWindow.latest}` : ''}`,
        facts: node.facts,
      })
    }
  }

  const diff = computeDiff(events, input.previousSchedule ?? [])

  return { events, conflicts, explanations, diff }
}

function computeDiff(events: ScheduleEvent[], previous: ScheduleEvent[]): ScheduleDiffEntry[] {
  const diff: ScheduleDiffEntry[] = []
  const previousById = new Map(previous.map((e) => [e.id, e]))
  const currentIds = new Set(events.map((e) => e.id))

  for (const event of events) {
    const prior = previousById.get(event.id)
    if (!prior) {
      diff.push({ eventId: event.id, changeKind: 'added' })
      continue
    }
    if (prior.status !== event.status) {
      diff.push({ eventId: event.id, changeKind: 'status_changed' })
      continue
    }
    if (prior.currentWindow.earliest !== event.currentWindow.earliest || prior.currentWindow.latest !== event.currentWindow.latest) {
      diff.push({ eventId: event.id, changeKind: 'window_changed' })
    }
  }
  for (const prior of previous) {
    if (!currentIds.has(prior.id)) diff.push({ eventId: prior.id, changeKind: 'removed' })
  }
  return diff
}
