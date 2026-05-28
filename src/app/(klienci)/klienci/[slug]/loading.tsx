export default function KlientDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      {/* Back nav + header */}
      <div className="mb-6 space-y-2">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="flex items-center justify-between gap-3 mt-2">
          <div className="h-7 w-56 bg-muted rounded-lg" />
          <div className="h-8 w-40 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {[120, 96, 104, 108, 88].map((w, i) => (
          <div key={i} className="h-9 bg-muted rounded-md mb-px" style={{ width: w }} />
        ))}
      </div>

      {/* Form content */}
      <div className="space-y-6">
        {/* Info section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3.5 w-16 bg-muted rounded" />
            <div className="h-9 bg-muted rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-24 bg-muted rounded" />
            <div className="h-20 bg-muted rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3.5 w-20 bg-muted rounded" />
              <div className="h-9 bg-muted rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-20 bg-muted rounded" />
              <div className="h-9 bg-muted rounded-lg" />
            </div>
          </div>
        </div>

        {/* Modules section */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="h-5 w-32 bg-muted rounded" />
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-3 w-44 bg-muted rounded" />
              </div>
              <div className="h-6 w-10 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
