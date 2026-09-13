// @_linked/react's built-in loader and error elements render <svg>, which crashes on React Native
// ("View config getter callback for component 'svg'"). Replace them app-wide. App.tsx imports this
// module first. Delete it once @_linked/react ships React Native defaults.
import { LinkedComponentDefaults } from '@_linked/react';
import { ActivityIndicator, Text } from 'react-native';

LinkedComponentDefaults.loader = <ActivityIndicator testID="linked-loader" />;
LinkedComponentDefaults.errorElement = (
  <Text testID="linked-error" accessibilityRole="alert">Failed to load</Text>
);
