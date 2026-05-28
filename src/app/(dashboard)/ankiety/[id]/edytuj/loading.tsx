export default function SurveyEditorLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-3 bg-muted rounded" />
        <div className="h-4 w-36 bg-muted rounded" />
      </div>

      {/* Header + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-56 bg-muted rounded-lg" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-muted rounded-lg" />
          <div className="h-9 w-28 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Question sections */}
      <div className="space-y-4">
        {[0, 1].map((s) => (
          <div key={s} className="rounded-xl border border-border p-4 space-y-4">
            <div className="h-6 w-40 bg-muted rounded" />
            {[0, 1, 2].map((q) => (
              <div key={q} className="rounded-lg border border-border p-3 space-y-2">
                <div className="h-4 w-3/5 bg-muted rounded" />
                <div className="h-3.5 w-1/3 bg-muted rounded" />
              </div>
            ))}
            <div className="h-8 w-32 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
