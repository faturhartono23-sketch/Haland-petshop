type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({ title = 'Memuat...', description = 'Mohon tunggu sebentar.' }: LoadingStateProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center" role="status" aria-live="polite">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>
    </div>
  );
}
