import {Shape} from '@_linked/core/shapes/Shape';
import {literalProperty} from '@_linked/core/shapes/SHACL';
import {createNameSpace} from '@_linked/core/utils/NameSpace';
// Extensionless on purpose: Metro does not map `.js` specifiers to `.ts` source.
import {linkedShape} from '../package';

const ns = createNameSpace('https://example.com/app/');

@linkedShape
export class Example extends Shape {
  static targetClass = ns('Example');

  @literalProperty({path: ns('label'), maxCount: 1})
  get label(): string {
    return '';
  }
}
