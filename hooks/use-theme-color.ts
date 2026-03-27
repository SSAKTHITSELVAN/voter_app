/**
 * A lightweight hook to get themed colors.
 * Since we use a unified dark theme throughout the app,
 * this simply returns the provided override or falls back to the default.
 */

export function useThemeColor(
  props: { light?: string; dark?: string },
  fallback?: string
): string {
  return props.dark ?? props.light ?? fallback ?? '#FFFFFF';
}
