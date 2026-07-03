type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="mt-4 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
