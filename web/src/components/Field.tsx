import type { ReactNode } from 'react'

/** A labelled input from the TEC concept, with an error or a hint underneath. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid content-start gap-1.5">
      <span className="label">{label}</span>
      {children}
      {error ? (
        <span className="text-[12.5px] text-error">{error}</span>
      ) : (
        hint && <span className="text-[12.5px] text-muted">{hint}</span>
      )}
    </label>
  )
}

export const inputClass =
  'min-h-[38px] w-full rounded border border-line-strong bg-panel px-2.5 py-2 transition-colors duration-300 ease-io ' +
  'hover:border-white/30 focus:border-blue focus:shadow-[0_0_0_3px_var(--color-blue-soft)] focus:outline-none ' +
  'aria-invalid:border-error'
