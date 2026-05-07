import { NgModule } from '@angular/core';

import { CellFlashOnChangeCssDirective } from './cell-flash-on-change-css.directive';
import { CellFlashOnChangeWaapiDirective } from './cell-flash-on-change-waapi.directive';

/**
 * Cell Flash on Change feature module.
 *
 * Declares both implementations of the directive:
 * - CellFlashOnChangeCssDirective   ([appFlashOnChangeCss])   — CSS @keyframes + setTimeout
 * - CellFlashOnChangeWaapiDirective ([appFlashOnChangeWaapi]) — Web Animations API
 *
 * Both ship together for side-by-side evaluation; the loser will be
 * deleted post-evaluation per ADR-1.
 *
 * See: specs/cell-flash-on-change/plan.md
 */
@NgModule({
  declarations: [
    CellFlashOnChangeCssDirective,
    CellFlashOnChangeWaapiDirective,
  ],
  exports: [
    CellFlashOnChangeCssDirective,
    CellFlashOnChangeWaapiDirective,
  ],
})
export class CellFlashOnChangeModule {}
