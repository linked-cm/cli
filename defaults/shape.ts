// TODO(plan-1.5 / Phase 3 — Shape Builder review): @_linked/core does
// not export NamedNode as a class. The template needs to be rewritten to
// match the modern @_linked/* shape pattern — see packages/schema/src/
// shapes/Person.ts (getter-only, no NamedNode annotation). Import paths
// updated to @_linked/core to flag intent; current generated output
// won't compile until the template + downstream tooling are updated.
import {Shape} from '@_linked/core/shapes/Shape';
import {NamedNode} from '@_linked/core';
import {linkedShape} from '../package.js';

@linkedShape
export class ${camel_name} extends Shape {
  static targetClass:NamedNode;
}
