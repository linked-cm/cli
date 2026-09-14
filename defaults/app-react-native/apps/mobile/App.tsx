// Import order matters: env sets SITE_ROOT/DATA_ROOT before any Linked import; @_linked/react/native installs
// React Native render defaults; storage registers the API store before shapes and linked components are used.
import './src/shell/env';
import '@_linked/react/native';
import './src/shell/storage';
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
