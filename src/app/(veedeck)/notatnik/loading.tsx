export default function NotatnikLoading() {
  return (
    <div className="flex flex-1 -mx-3 sm:-mx-6 -my-4 sm:-my-6 overflow-hidden bg-muted/30 animate-pulse">
      {/* Left panel */}
      <div className="w-full md:w-72 lg:w-80 flex-shrink-0 flex flex-col border-r border-border">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="h-7 w-7 bg-muted rounded-lg" />
          </div>
          <div className="h-8 bg-muted rounded-lg" />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <div className="h-6 w-16 bg-muted rounded-md" />
              <div className="h-6 w-20 bg-muted rounded-md" />
            </div>
            <div className="h-6 w-20 bg-muted rounded-md" />
          </div>
        </div>
        {/* Note rows */}
        <div className="flex-1 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-border space-y-1.5">
              <div className="h-3.5 w-2/3 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — editor placeholder */}
      <div className="hidden md:flex flex-1 flex-col p-6 gap-4">
        <div className="h-8 w-1/3 bg-muted rounded-lg" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-5/6 bg-muted rounded" />
          <div className="h-4 w-4/5 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
