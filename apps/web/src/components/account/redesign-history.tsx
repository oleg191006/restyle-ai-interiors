import Link from "next/link";
import { CompareSlider } from "@/components/compare-slider";
import { button } from "@/components/ui/button";
import { downloadImage, formatDate, type HistoryItem } from "@/lib/account-client";
import { paths, type Dictionary, type Locale } from "@/lib/i18n";

export type Names = { rooms: Record<string, string>; styles: Record<string, string> };

/** "Your redesigns": the last 7 days of finished jobs (ADR 0014); `items` is null while loading. */
export function RedesignHistory({ t, locale, names, items }: { t: Dictionary; locale: Locale; names: Names; items: HistoryItem[] | null }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-3xl font-semibold">{t.historyTitle}</h2>
        <p className="text-sm text-muted">{t.historyNote}</p>
      </div>
      {items === null ? (
        <div aria-hidden className="grid gap-6 sm:grid-cols-2">
          <div className="aspect-4/3 rounded-2xl bg-line/50 motion-safe:animate-pulse" />
          <div className="aspect-4/3 rounded-2xl bg-line/50 motion-safe:animate-pulse" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-line-strong px-6 py-14 text-center">
          <p className="font-display text-2xl font-semibold">{t.historyEmptyTitle}</p>
          <p className="max-w-sm text-muted">{t.historyEmptyText}</p>
          <Link href={paths.redesign(locale)} className={button("primary", "lg")}>
            {t.ctaShort}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
          {items.map((item) => (
            <HistoryCard key={item.id} t={t} locale={locale} item={item} room={names.rooms[item.room] ?? item.room} style={names.styles[item.style] ?? item.style} />
          ))}
        </ul>
      )}
    </section>
  );
}

function HistoryCard({ t, locale, item, room, style }: { t: Dictionary; locale: Locale; item: HistoryItem; room: string; style: string }) {
  return (
    <li className="space-y-3">
      <CompareSlider
        label={t.compareLabel}
        beforeLabel={t.toolBefore}
        afterLabel={t.toolAfter}
        // eslint-disable-next-line @next/next/no-img-element -- a short-lived storage URL
        before={<img src={item.before} alt="" loading="lazy" className="h-full w-full object-cover" />}
        // eslint-disable-next-line @next/next/no-img-element
        after={<img src={item.after} alt={`${room} · ${style}`} loading="lazy" className="h-full w-full object-cover" />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {room} · {style}
          </p>
          <p className="text-sm text-muted">{formatDate(locale, item.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadImage(item.after, `restyle-${item.room}-${item.style}.jpg`)} className={button("dark", "sm")}>
            {t.toolDownload}
          </button>
          <Link href={paths.redesign(locale, item.room)} className={button("outline", "sm")}>
            {t.historyAgain}
          </Link>
        </div>
      </div>
    </li>
  );
}
