import { Bone, ListSkeleton } from "@/components/design/Skeleton";

export default function Loading() {
  return (
    <div className="card space-y-6" aria-busy="true">
      <Bone className="h-10 w-72 rounded-xl" />
      <Bone className="h-11 w-full rounded-lg" />
      <ListSkeleton rows={4} />
    </div>
  );
}
