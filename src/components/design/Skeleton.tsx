/** Shimmer placeholders shown while a page loads. Shapes match the real layouts. */
export function Bone({ className = "" }: { className?: string }) {
  return <span className={`skel block ${className}`} />;
}

export function TitleSkeleton() {
  return <Bone className="h-12 w-72 rounded-xl sm:w-96" />;
}

export function CoverGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="space-y-3">
          <Bone className="aspect-[3/4] w-full rounded-xl" />
          <Bone className="h-3.5 w-2/3 rounded" />
          <Bone className="h-3 w-1/2 rounded" />
        </li>
      ))}
    </ul>
  );
}

export function CardGridSkeleton({ count = 6, cols = "md:grid-cols-2 lg:grid-cols-3" }: { count?: number; cols?: string }) {
  return (
    <ul className={`grid gap-5 ${cols}`}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="card space-y-3 p-6">
          <Bone className="h-3 w-24 rounded" />
          <Bone className="h-5 w-11/12 rounded" />
          <Bone className="h-5 w-3/4 rounded" />
          <Bone className="h-3 w-full rounded" />
          <Bone className="h-3 w-5/6 rounded" />
        </li>
      ))}
    </ul>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-slate-200 p-2 sm:p-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-2.5 p-4">
          <Bone className="h-3 w-20 rounded" />
          <Bone className="h-5 w-4/5 rounded" />
          <Bone className="h-3.5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <TitleSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-3"><Bone className="h-3.5 w-1/2 rounded" /><Bone className="h-9 w-16 rounded-lg" /></div>
        ))}
      </div>
      <ListSkeleton rows={4} />
    </div>
  );
}
