// @_linked/react/native first: it installs the React Native render defaults before any component renders. Modules
// that need the API store import ./src/shell/storage themselves, which imports ./src/shell/env.
import '@_linked/react/native';
import { Example } from 'app-shapes';

import { StyleSheet, Text, View } from 'react-native';
import { getShapeClass } from '@_linked/core/utils/ShapeClass';
import { PersonOverview } from './src/components/PersonOverview';

export default function App() {
  const registered = getShapeClass(Example.shape.id) === Example;
  return (
    <View style={styles.container}>
      {/* @linkedShape adds static packageName at runtime; it is not on the class type. */}
      <Text>{(Example as any).packageName}</Text>
      <Text>{registered ? 'shapes registered' : 'shapes not registered'}</Text>
      <PersonOverview />
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
