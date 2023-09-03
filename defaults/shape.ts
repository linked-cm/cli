import {Shape} from 'lincd/lib/shapes/Shape';
import {NamedNode} from 'lincd/lib/models';
import {linkedShape} from '../package';

@linkedShape
export class ${camel_name} extends Shape
{
  static targetClass: NamedNode;
}
