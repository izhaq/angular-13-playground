/**
 * Shared types and constants for the Cell Flash on Change feature.
 *
 * Both implementations (CSS + setTimeout, Web Animations API) import
 * from this single source of truth so the public types and the visual
 * contract cannot drift between versions.
 *
 * See: specs/cell-flash-on-change/spec.md §5
 */

export type FlashableValue = string | number | boolean | null;

export const FLASH_CLASS = 'cell-flash-on-change--flashing';

export const DEFAULT_FLASH_DURATION_MS = 10_000;

/**
 * Soft amber — universally read as "data changed" without being alarming.
 * Used by both directives (Version A via SCSS @keyframes; Version B inline
 * in the keyframes array passed to Element.animate).
 *
 * Kept in sync with the start-frame color in
 * `src/styles/_cell-flash-on-change.scss`. If you change one, change both.
 */
export const FLASH_COLOR_RGBA = 'rgba(255, 213, 128, 0.85)';
