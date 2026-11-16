/**
 * Which way a build ships the panel (2.5). Its own file because `./activation`
 * is swapped per build (angular.json `fileReplacements`), so the variants
 * cannot share a type through it.
 */
export type DebugPanelMode = 'panel' | 'headless' | 'flag';
