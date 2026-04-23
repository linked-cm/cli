import {Shape} from 'lincd/shapes/Shape';
import {NamedNode} from 'lincd/models';
import {linkedShape} from '../package.js';

@linkedShape
export class ${camel_name} extends Shape {
  static targetClass:NamedNode;
}
