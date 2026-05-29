interface StatusNoticeProps {
  title: string;
  description: string;
  tone?: "info" | "danger";
  actionLabel?: string;
  onAction?: () => void;
}

export function StatusNotice({
  title,
  description,
  tone = "info",
  actionLabel,
  onAction,
}: StatusNoticeProps) {
  return (
    <div className={`status-notice status-notice--${tone}`}>
      <div>
        <p className="status-notice__title">{title}</p>
        <p className="status-notice__description">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <button className="chip-button chip-button--solid" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
