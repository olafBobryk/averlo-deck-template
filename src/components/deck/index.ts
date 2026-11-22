// The deck's components (feature 003, T311), template-owned: each draws one
// evidence pattern in the Averlo look, from the ports (Panel, Text, Icon)
// and the deck's CSS. A slide file (src/slides/NN-name.tsx) imports them
// from `@/components/deck` and passes its words from `copy` as plain
// strings; body text may mark key phrases `**…**`, drawn bold. The data
// blocks (src/deck/SlideBody.tsx, src/presets/index.ts) draw through them
// too.
export { Lead, Note } from "./Lead";
export { Points, type PointsProps } from "./Points";
export { Steps, type StepItem, type StepsProps } from "./Steps";
export { Facts, type FactItem } from "./Facts";
export { Org, Fork, type BranchesProps } from "./Branches";
export { Week, type DayItem } from "./Week";
export { Plan, type PlanMark, type PlanProps } from "./Plan";
export { Chart, type ChartProps, type ChartSeries } from "./charts/Chart";
export { Stat, type StatItem, type StatProps } from "./charts/Stat";
export { Flow, type FlowProps } from "./diagrams/Flow";
export { Timeline, type TimelineProps } from "./diagrams/Timeline";
export { Cycle, type CycleProps } from "./diagrams/Cycle";
export { OrgChart, type OrgChartProps } from "./diagrams/OrgChart";
export { Table, type TableProps } from "./diagrams/Table";
export { Matrix, type MatrixProps } from "./diagrams/Matrix";
export { Quote, type QuoteProps } from "./text/Quote";
export { Agenda, type AgendaProps } from "./text/Agenda";
export { Compare, type CompareProps } from "./text/Compare";
export { Image, type ImageProps } from "./images/Image";
export { ImageGrid, type ImageGridProps } from "./images/ImageGrid";
export type { PointItem } from "./parts";
export type { Entry } from "./diagrams/parts";
