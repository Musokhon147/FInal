import { notFound } from "next/navigation";

// Any unknown address under /uz, /ru or /en shows the styled 404 page.
export default function CatchAll() {
  notFound();
}
