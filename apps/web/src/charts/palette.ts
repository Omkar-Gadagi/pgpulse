// Hex versions of the theme colours in index.css, for Highcharts.
// Highcharts computes hover shades and gradients itself and only understands
// hex/rgb, so it can't use the oklch CSS variables directly.
// Keep these in sync with the .dark block in src/index.css.
export const palette = {
  accent: '#4aa8ec', // --primary  oklch(0.72 0.14 240)
  success: '#3fcf8e', // --success  oklch(0.76 0.16 155)
  warning: '#f0c04a', // --warning  oklch(0.82 0.15 80)
  critical: '#f2706a', // --critical oklch(0.70 0.19 22)
  violet: '#a98af0', // --chart-4  oklch(0.70 0.15 300)

  text: '#eef1f5', // --foreground
  textMuted: '#a3abb8', // --muted-foreground
  card: '#1a1f27', // --card
  popover: '#1d232c', // --popover
  border: 'rgba(255,255,255,0.09)', // --border
  grid: 'rgba(255,255,255,0.06)',
} as const

/** Series colour order: accent first, then hues that stay distinct on dark. */
export const seriesColors = [
  palette.accent,
  palette.success,
  palette.warning,
  palette.violet,
  palette.critical,
  '#5fd4d4',
  '#f29ccb',
  '#c7d36b',
  '#8fa2ff',
  '#f5a25d',
]
