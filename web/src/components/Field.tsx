import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

/**
 * A labelled input from the TEC concept, with an error or a hint underneath.
 * The hint or error describes the input (aria-describedby) rather than being
 * part of its name, so screen readers announce "Mission name" on its own.
 */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  const noteId = useId()
  const note = error ?? hint
  const input =
    note && isValidElement(children)
      ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': noteId })
      : children

  return (
    <div className="grid content-start gap-1.5">
      <label className="grid gap-1.5">
        <span className="label">{label}</span>
        {input}
      </label>
      {note && (
        <span id={noteId} className={`text-[12.5px] ${error ? 'text-error' : 'text-muted'}`}>
          {note}
        </span>
      )}
    </div>
  )
}

export const inputClass =
  'min-h-[38px] w-full rounded border border-line-strong bg-panel px-2.5 py-2 transition-colors duration-300 ease-io ' +
  'hover:border-white/30 focus:border-blue focus:shadow-[0_0_0_3px_var(--color-blue-soft)] focus:outline-none ' +
  'aria-invalid:border-error'
