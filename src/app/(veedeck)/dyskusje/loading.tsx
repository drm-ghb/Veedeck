export default function DyskusjeLoading() {
  return (
    <div className="flex flex-1 min-h-0 -mx-3 sm:-mx-6 -my-4 sm:-my-6 overflow-hidden bg-muted/30 animate-pulse">
      {/* Left sidebar */}
      <div className="hidden md:flex flex-col md:w-72 flex-shrink-0 border-r border-border">
        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="h-7 w-7 bg-muted rounded-lg" />
          </div>
          <div className="h-8 bg-muted rounded-lg" />
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-muted rounded-full" />
            <div className="h-6 w-20 bg-muted rounded-full" />
          </div>
        </div>
        {/* Discussion rows */}
        <div className="flex-1 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-border">
              <div className="h-8 w-8 bg-muted rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3.5 w-3/4 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
              <div className="h-3 w-10 bg-muted rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — empty state placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="h-12 w-12 bg-muted rounded-full" />
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-3 w-36 bg-muted rounded" />
      </div>
    </div>
  );
}
