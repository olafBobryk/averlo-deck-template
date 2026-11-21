// The deck's own route map, not a copy of the source app's. It exports
// exactly what route-transition.tsx imports, with the source app's
// signatures. The deck has one
// route and its slide changes never navigate (they use startRouteTransition),
// so no route change takes a direction and every route change is sideways.

export type RouteIntent = "complete" | "close";

export type RouteHow = { intent?: RouteIntent; traverse?: boolean };

const intentDirections = { complete: "forward", close: "back" } as const;

/** The way a route change moves: always sideways. */
export function routeAxisBetween(
  from: string,
  to: string,
): "x" | "y" | "depth" {
  void from;
  void to;
  return "x";
}

/** The source app's history, emptied: no route change takes a direction. */
export function createRouteHistory(limit = 50) {
  void limit;
  return {
    take(
      from: string,
      to: string,
      how: RouteHow = {},
    ): "forward" | "back" | null {
      void from;
      void to;
      void how;
      return null;
    },
    /** Remembers nothing; returns the intent's direction, as the source app's does,
        because route-transition.tsx assigns it. */
    retake(intent: RouteIntent): "forward" | "back" {
      return intentDirections[intent];
    },
  };
}
