// The module layout: the heading over one wide block; an org, one node
// over the roles that report to it.
import { Block, Body, Heading, Org } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "module",
};

export const copy = {
  en: {
    title: "Placeholder title",
    section: "Placeholder text",
    headline: "Placeholder text",
    root: "Placeholder title",
    rootText: "Placeholder text",
    role1: "Placeholder title",
    role1Text: "Placeholder text",
    role2: "Placeholder text",
    role2Text: "Placeholder text",
  },
} satisfies Copy;

export default function Module({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="org">
          <Org
            root={{ label: t.root, text: t.rootText }}
            items={[
              { label: t.role1, text: t.role1Text },
              { label: t.role2, text: t.role2Text },
            ]}
          />
        </Block>
      </Body>
    </>
  );
}
