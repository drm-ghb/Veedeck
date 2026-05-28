export default function ShareListLoading() {
  return (
    <div className="min-h-screen flex flex-col animate-pulse">
      {/* Navbar */}
      <div className="h-14 border-b border-border bg-background flex items-center px-4 gap-3 shrink-0">
        <div className="h-6 w-28 bg-muted rounded" />
        <div className="flex-1" />
        <div className="h-8 w-24 bg-muted rounded-lg" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (hidden on mobile) */}
        <div className="hidden md:flex md:w-56 shrink-0 border-r border-border flex-col p-3 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 bg-muted rounded-lg" />
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted rounded-lg" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>

          {/* Sections */}
          {[0, 1].map((s) => (
            <div key={s} className="space-y-3">
              <div className="h-6 w-40 bg-muted rounded-lg" />
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-border p-4 flex items-center gap-4">
                    <div className="h-14 w-14 bg-muted rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 bg-muted rounded" />
                      <div className="h-3.5 w-1/3 bg-muted rounded" />
                    </div>
                    <div className="h-5 w-20 bg-muted rounded shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
