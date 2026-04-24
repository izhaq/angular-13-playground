/**
 * Anti-corruption boundary — every external dependency the feature
 * pulls from the host app's shared UI library funnels through here.
 *
 * Why this file exists
 * --------------------
 * The feature ships with its own dumb components (`board`, `board-footer`,
 * `cmd-section`, `status-grid`, the two form components) but it also leans
 * on a few generic UI primitives the host app provides (dropdowns).
 * Re-exporting those through one file means feature code never names the
 * external path. When this feature migrates into a different host, only
 * this single file is rewritten — every selector, template, spec, and
 * module import elsewhere in the feature stays untouched.
 *
 * Migration recipe
 * ----------------
 * 1. Drop the feature folder into the target project.
 * 2. Rewrite this file's `from '…'` paths to point at the target's
 *    equivalent dropdown modules/components/types.
 * 3. If the target's symbol names differ, add `as`-aliases here so the
 *    feature keeps importing `AppDropdownModule` etc. — no rename
 *    cascade through the rest of the codebase.
 *
 * Rule of thumb
 * -------------
 * If the feature needs something from outside its own folder that is not
 * an Angular framework symbol, add the re-export here. Do not let
 * cross-folder reach-arounds creep into feature files.
 */

export { AppDropdownModule } from '../../../components/app-dropdown/app-dropdown.module';
export { AppDropdownCvaModule } from '../../../components/app-dropdown-cva/app-dropdown-cva.module';
export { AppMultiDropdownModule } from '../../../components/app-multi-dropdown/app-multi-dropdown.module';
export { AppMultiDropdownComponent } from '../../../components/app-multi-dropdown/app-multi-dropdown.component';
export { DropdownOption } from '../../../components/app-dropdown/app-dropdown.models';
