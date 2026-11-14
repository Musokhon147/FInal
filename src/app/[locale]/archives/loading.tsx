import { CoverGridSkeleton, TitleSkeleton } from "@/components/design/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-12" aria-busy="true">
      <TitleSkeleton />
      <CoverGridSkeleton count={5} />
      <CoverGridSkeleton count={5} />
    </div>
  );
}
