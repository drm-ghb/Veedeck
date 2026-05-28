export default function SurveyResponsesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-3 bg-muted rounded" />
        <div className="h-4 w-36 bg-muted rounded" />
        <div className="h-4 w-3 bg-muted rounded" />
        <div className="h-4 w-28 bg-muted rounded" />
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-52 bg-muted rounded-lg" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 bg-muted rounded-full" />
          <div className="h-5 w-20 bg-muted rounded-full" />
        </div>
      </div>

      {/* Response list */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="h-5 w-1/3 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((q) => (
                <div key={q} className="space-y-1">
                  <div className="h-3.5 w-2/5 bg-muted rounded" />
                  <div className="h-3 w-3/5 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
