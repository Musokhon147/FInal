import { CardGridSkeleton, TitleSkeleton } from "@/components/design/Skeleton";

export default function Loading() {
  return <div className="space-y-10" aria-busy="true"><TitleSkeleton /><CardGridSkeleton count={4} cols="md:grid-cols-2" /></div>;
}
