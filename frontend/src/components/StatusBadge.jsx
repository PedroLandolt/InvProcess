export default function StatusBadge({ status }) {
  const styles = {
    ok: 'text-ok bg-ok-light',
    review: 'text-accent bg-accent-light',
    error: 'text-signal bg-signal-light',
  }
  const labels = { ok: 'OK', review: 'REVIEW', error: 'ERROR' }

  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-sm ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
