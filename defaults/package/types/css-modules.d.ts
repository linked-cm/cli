/**
 * Lets `import style from './X.module.css'` typecheck.
 *
 * Deliberately OUTSIDE `src`. This is an ambient declaration, which means it is global to
 * whoever loads it — and if it were emitted into `lib` and published, every consumer that
 * declares `*.module.css` itself would collide with it:
 *
 *   error TS2300: Duplicate identifier 'classes'
 *
 * That is not hypothetical: a package with no CSS at all shipped this declaration and broke a
 * consumer that legitimately needed its own. Keeping it out of `rootDir` means tsc uses it to
 * build and never emits it.
 *
 * Delete this file if the package has no CSS modules — nothing else references it.
 */
declare module '*.module.css' {
  const classes: {[key: string]: string};
  export default classes;
}
