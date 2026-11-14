/** True when motion effects should stay still: the OS asks for reduced motion, or the reader turned effects off. */
export function fxOff() {
  if (typeof window === "undefined") return true;
  return document.documentElement.classList.contains("fx-off") || matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Weaker devices get a lighter 3D scene. */
export function lowPower() {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return innerWidth < 640 || (n.deviceMemory ?? 8) <= 4 || (n.hardwareConcurrency ?? 8) <= 4 || !!n.connection?.saveData;
}
