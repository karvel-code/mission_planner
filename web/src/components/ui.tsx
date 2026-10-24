import type { ReactNode } from 'react'
import { planetColourByName } from '../lib/planets'

type Tone = 'ok' | 'warn' | 'error' | 'neutral'

const chipTones: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  error: 'bg-error-soft text-error',
  neutral: 'bg-panel-2 text-muted',
}

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap ${chipTones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Feasibility as icon and text, never colour alone. */
export function FeasibilityBadge({ feasible }: { feasible: boolean | null }) {
  if (feasible === null) return <Chip tone="neutral">Not calculated</Chip>

  return feasible ? (
    <Chip tone="ok">
      <span aria-hidden="true">✓</span> Feasible
    </Chip>
  ) : (
    <Chip tone="error">
      <span aria-hidden="true">!</span> Not feasible
    </Chip>
  )
}

/** A route as coloured planet dots, with the names for screen readers and on hover. */
export function RouteDots({ names }: { names: string[] }) {
  return (
    <span className="flex items-center gap-[5px]" role="img" aria-label={`Route: ${names.join(', ')}`}>
      {names.map((name, i) => (
        <span
          key={i}
          title={name}
          className="inline-block size-[9px] flex-none rounded-full"
          style={{ background: planetColourByName(name), boxShadow: `0 0 8px ${planetColourByName(name)}` }}
        />
      ))}
    </span>
  )
}

/** Full-screen message for loading and fatal states. */
export function StatusScreen({ eyebrow, title, children }: { eyebrow: string; title?: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-[60dvh] place-content-center gap-2.5 p-6 text-center">
      <p className="eyebrow">{eyebrow}</p>
      {title && <h1 className="text-[32px] font-medium tracking-[-0.02em]">{title}</h1>}
      {children}
    </div>
  )
}
