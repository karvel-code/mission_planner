import { buttonStyles } from '../components/styles'

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

interface Props {
  /** True for a plan that exists in the database. */
  saved: boolean
  dirty: boolean
  status: SaveStatus
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
}

/** Save, duplicate, and delete, with what is happening to the plan right now. */
export function PlanActions({ saved, dirty, status, onSave, onDuplicate, onDelete }: Props) {
  const busy = status.kind === 'busy'

  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonStyles.primary}
          onClick={onSave}
          disabled={busy || (saved && !dirty)}
        >
          {saved ? 'Save changes' : 'Save plan'}
        </button>
        {saved && (
          <>
            <button
              type="button"
              className={buttonStyles.ghost}
              onClick={onDuplicate}
              disabled={busy || dirty}
              title={dirty ? 'Save your changes before duplicating' : undefined}
            >
              Duplicate
            </button>
            <button type="button" className={buttonStyles.danger} onClick={onDelete} disabled={busy}>
              Delete
            </button>
          </>
        )}
      </div>
      <StatusText status={status} dirty={dirty} />
    </div>
  )
}

function StatusText({ status, dirty }: { status: SaveStatus; dirty: boolean }) {
  if (status.kind === 'busy') return <p className="text-[13px] text-muted">{status.label}</p>
  if (status.kind === 'error') {
    return (
      <p role="alert" className="text-[13px] text-error">
        {status.message}
      </p>
    )
  }
  if (dirty) return <p className="text-[13px] text-warn">Unsaved changes</p>
  if (status.kind === 'saved') {
    return (
      <p role="status" className="text-[13px] text-ok">
        <span aria-hidden="true">✓</span> Saved
      </p>
    )
  }
  return null
}
