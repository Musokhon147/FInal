import { Bone, CardGridSkeleton, TitleSkeleton } from "@/components/design/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-10" aria-busy="true">
      <TitleSkeleton />
      <div className="card flex items-center gap-6 p-8"><Bone className="h-28 w-28 rounded-full" /><div className="flex-1 space-y-3"><Bone className="h-3 w-24 rounded" /><Bone className="h-8 w-72 rounded-lg" /><Bone className="h-4 w-56 rounded" /></div></div>
      <CardGridSkeleton count={3} />
    </div>
  );
}
