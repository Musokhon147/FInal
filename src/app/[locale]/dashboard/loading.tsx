import { PanelSkeleton } from "@/components/design/Skeleton";

export default function Loading() {
  return <div aria-busy="true"><PanelSkeleton /></div>;
}
