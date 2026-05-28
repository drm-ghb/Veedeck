export default function AnkietyLoading() {
  return (
    <div className="flex flex-col animate-pulse -mx-6 -my-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="h-6 w-24 bg-muted rounded-lg" />
        <div className="h-9 w-32 bg-muted rounded-lg" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <div className="h-8 flex-1 max-w-72 bg-muted rounded-lg" />
        <div className="h-8 w-28 bg-muted rounded-lg" />
        <div className="h-8 w-36 bg-muted rounded-lg" />
        <div className="ml-auto h-8 w-16 bg-muted rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-border">
        <div className="h-9 w-24 bg-muted rounded-md mb-px" />
        <div className="h-9 w-36 bg-muted rounded-md mb-px" />
        <div className="h-9 w-24 bg-muted rounded-md mb-px" />
      </div>

      {/* Content */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <div className="h-5 w-3/4 bg-muted rounded" />
                <div className="h-3.5 w-1/2 bg-muted rounded" />
              </div>
              <div className="h-7 w-7 bg-muted rounded-md" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="h-5 w-20 bg-muted rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
