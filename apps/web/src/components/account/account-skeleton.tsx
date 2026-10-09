/** Same footprint as the signed-out layout, so the page does not jump when the session arrives. */
export function AccountSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
      <div className="h-96 rounded-3xl bg-line/50 motion-safe:animate-pulse" />
      <div className="hidden h-96 rounded-3xl bg-line/30 lg:block" />
    </div>
  );
}
