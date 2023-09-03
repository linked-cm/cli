import {Shape} from 'lincd/lib/shapes/Shape';
import {Literal,NamedNode} from 'lincd/lib/models';
import {linkedShape} from '../package';
import {literalProperty} from 'lincd/lib/utils/ShapeDecorators';

@linkedShape
export class ExampleShapeClass extends Shape
{
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass: NamedNode = ${camel_name}
.
  ExampleClass;

  /**
   * instances of this shape need to have exactly one value defined for the given property
   */
  @literalProperty({
    path: ${camel_name}.exampleProperty,
    required: true,
    maxCount: 1,
  })
  get name()
  {
    return this.getValue(${camel_name}.exampleProperty;
  )

  }

  set name(val: string)
  {
    this.overwrite(${camel_name}.exampleProperty, new Literal(val);
  )

  }
}
