type StatusBadgeProps = {
  status: string
}

function getStatusClass(status: string) {
  return status.toLowerCase().replaceAll(' ', '-')
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${getStatusClass(status)}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {status}
    </span>
  )
}
