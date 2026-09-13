import { Shape } from '@_linked/core/shapes/Shape';
import { getShapeClass } from '@_linked/core/utils/ShapeClass';
import { Example } from 'app-shapes';

// A @linkedShape-decorated class gains static packageName, targetClass and shape;
// shape.id is the key into the global shape registry.
describe('shapes package', () => {
  test('exports the shape class', () => {
    expect(typeof Example).toBe('function');
  });

  test('the shape class extends Shape', () => {
    expect(Example.prototype instanceof Shape).toBe(true);
  });

  test('the shape belongs to the shapes package', () => {
    expect((Example as any).packageName).toBe('app-shapes');
  });

  test('the shape is registered at runtime', () => {
    expect(getShapeClass((Example as any).shape.id)).toBe(Example);
  });

  test('the decorated properties are registered', () => {
    expect([...(Example as any).shape.propertyShapes].length).toBeGreaterThan(0);
  });
});
