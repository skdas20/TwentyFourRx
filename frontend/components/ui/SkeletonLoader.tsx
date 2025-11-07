export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-6 border border-[var(--border)]/10 shadow-sm animate-pulse">
    <div className="w-full h-32 bg-gray-200 rounded-xl mb-4" />
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="flex gap-2 mb-3">
      <div className="h-6 w-16 bg-gray-200 rounded" />
      <div className="h-6 w-24 bg-gray-200 rounded" />
    </div>
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
    <div className="flex justify-between mb-4">
      <div className="h-4 w-20 bg-gray-200 rounded" />
      <div className="h-4 w-16 bg-gray-200 rounded" />
    </div>
    <div className="h-10 bg-gray-200 rounded" />
  </div>
);

export const SkeletonList = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="p-4 bg-[var(--surface)]/30 rounded-xl border border-transparent animate-pulse"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="h-6 w-20 bg-gray-200 rounded" />
        </div>
        <div className="flex justify-between mt-2">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-white rounded-2xl border border-[var(--border)]/10 shadow-sm overflow-hidden">
    <div className="p-4 border-b border-[var(--border)]/10">
      <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
    </div>
    <div className="divide-y divide-[var(--border)]/10">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
          <div className="h-12 w-12 bg-gray-200 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonDashboardStats = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-xl p-6 border border-[var(--border)] shadow-sm animate-pulse"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
        <div className="h-8 w-32 bg-gray-200 rounded" />
      </div>
    ))}
  </div>
);
