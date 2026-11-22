# Quickstart: validate slides as JSX

1. Copy `src/presets/slides/bar-chart.tsx` to `src/slides/14-my-chart.tsx` and change its words. It shows as slide 14.
2. Add a second language with its words in every `copy`. The switcher shows, and a missing word fails `npm run check`.
3. Type a word directly into a slide's JSX. `npm run gate` fails and names the file.
4. `npm run gate` passes, with the strips within tolerance.
