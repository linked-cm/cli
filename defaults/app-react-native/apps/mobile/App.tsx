// Must stay the first import: replaces @_linked/react's <svg> loader and error defaults app-wide.
import './src/shell/linkedDefaults';

import { StyleSheet, Text, View } from 'react-native';
import { getShapeClass } from '@_linked/core/utils/ShapeClass';
import { Example } from 'app-shapes';

export default function App() {
  const registered = getShapeClass(Example.shape.id) === Example;
  return (
    <View style={styles.container}>
      {/* @linkedShape adds static packageName at runtime; it is not on the class type. */}
      <Text>{(Example as any).packageName}</Text>
      <Text>{registered ? 'shapes registered' : 'shapes not registered'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
