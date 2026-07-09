import { ColumnHighlightStore } from './column-highlight.store';
import { COL_IDS, GridColId } from './ids';

/**
 * ColumnHighlightStore is the tiny per-board store that lets the detached
 * header and the scrolling body agree on which column is hovered (transient)
 * or pinned (clicked). Contract this spec pins:
 *   - hover sets / clears the hovered column
 *   - hovering the same column twice emits only once (distinctUntilChanged)
 *   - toggleSelect pins a column, toggles it off on re-click, and moves the
 *     pin when a different column is clicked
 */
describe('ColumnHighlightStore', () => {
  let store: ColumnHighlightStore;

  const colA: GridColId = COL_IDS.left[0];
  const colB: GridColId = COL_IDS.left[1];

  /** Capture the latest emitted value synchronously (BehaviorSubject-backed). */
  function latest<T>(obs: { subscribe: (fn: (v: T) => void) => unknown }): () => T {
    let value!: T;
    obs.subscribe((v) => (value = v));
    return () => value;
  }

  beforeEach(() => {
    store = new ColumnHighlightStore();
  });

  it('starts with nothing hovered or selected', () => {
    expect(latest(store.hovered$)()).toBeNull();
    expect(latest(store.selected$)()).toBeNull();
    expect(store.selected).toBeNull();
  });

  it('hover sets and clears the hovered column', () => {
    const hovered = latest(store.hovered$);

    store.hover(colA);
    expect(hovered()).toBe(colA);

    store.hover(null);
    expect(hovered()).toBeNull();
  });

  it('hovering the same column twice emits only once', () => {
    let emissions = 0;
    store.hovered$.subscribe(() => emissions++);
    emissions = 0; // ignore the initial replay

    store.hover(colA);
    store.hover(colA);

    expect(emissions).toBe(1);
  });

  it('toggleSelect pins a column and clears it on a second click', () => {
    const selected = latest(store.selected$);

    store.toggleSelect(colA);
    expect(selected()).toBe(colA);
    expect(store.selected).toBe(colA);

    store.toggleSelect(colA);
    expect(selected()).toBeNull();
    expect(store.selected).toBeNull();
  });

  it('toggleSelect moves the pin when a different column is clicked', () => {
    const selected = latest(store.selected$);

    store.toggleSelect(colA);
    store.toggleSelect(colB);

    expect(selected()).toBe(colB);
  });

  it('hover and selection are independent', () => {
    store.toggleSelect(colA);
    store.hover(colB);

    expect(latest(store.selected$)()).toBe(colA);
    expect(latest(store.hovered$)()).toBe(colB);
  });
});
