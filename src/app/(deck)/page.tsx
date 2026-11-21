import { Deck } from "@/deck/Deck";
import { parseLang } from "@/deck/model";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    s?: string;
    lang?: string;
  }>;
}) {
  const { s, lang } = await searchParams;
  const slide = Number.parseInt(s ?? "1", 10);
  return (
    <Deck
      initialIndex={Number.isFinite(slide) ? slide - 1 : 0}
      initialLang={parseLang(lang)}
    />
  );
}
