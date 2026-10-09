"use client";

import { useRef, useState } from "react";
import { downloadImage } from "@/lib/account-client";
import type { Dictionary, Locale } from "@/lib/i18n";
import { PhotoField } from "./photo-field";
import { preparePhoto, type Photo } from "./prepare-photo";
import { RoomField, type RoomOption } from "./room-field";
import { ResultPane } from "./result-pane";
import { StyleField, type StyleOption } from "./style-field";
import { SubmitBar } from "./submit-bar";
import { useGeneration } from "./use-generation";
import { useQueryChoice } from "./use-query-choice";

export type { RoomOption, StyleOption };

/**
 * The tool: photo, room and style on the left, the result on the right. Landing pages link here
 * with ?room=&style= preselected (useQueryChoice). The run itself lives in useGeneration.
 */
export function RedesignTool({ locale, rooms, styles, t }: { locale: Locale; rooms: RoomOption[]; styles: StyleOption[]; t: Dictionary }) {
  const [room, setRoom] = useQueryChoice("room", rooms);
  const [style, setStyle] = useQueryChoice("style", styles);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const generation = useGeneration(locale, t);
  const stylesRef = useRef<HTMLFieldSetElement>(null);
  const styleName = styles.find((s) => s.slug === style)?.name ?? "";

  async function onFile(file?: File) {
    if (!file) return;
    generation.reset();
    try {
      const next = await preparePhoto(file);
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto(next);
    } catch {
      generation.reset(t.toolErrorImage);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photo) generation.generate(photo.blob, room, style);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-12">
      <form onSubmit={onSubmit} className="space-y-8">
        <PhotoField t={t} photo={photo} disabled={generation.busy} onFile={onFile} />
        <RoomField t={t} rooms={rooms} value={room} onChange={setRoom} disabled={generation.busy} />
        <StyleField ref={stylesRef} t={t} styles={styles} room={room} value={style} onChange={setStyle} disabled={generation.busy} />
        <SubmitBar
          t={t}
          locale={locale}
          phase={generation.phase}
          canSubmit={photo !== null && !generation.busy}
          quota={generation.quota}
          error={generation.error}
          nextStep={generation.nextStep}
          room={room}
          style={style}
        />
      </form>

      <ResultPane
        t={t}
        photo={photo}
        phase={generation.phase}
        result={generation.result}
        styleName={styleName}
        onDownload={() => generation.result && downloadImage(generation.result.after, `restyle-${room}-${style}.jpg`)}
        onAnotherStyle={() => stylesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />
    </div>
  );
}
