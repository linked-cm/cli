import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mydomain.FILL_IN_YOUR_OWN',
  appName: 'FILL_IN_YOUR_OWN',
  webDir: 'web',
  server: {
    allowNavigation: ['yourdomain.com','sub.yourdomain.com'],
  },
  bundledWebRuntime: false,
  //Add or remove plugins that you need. Here is a starter list
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    // FirebaseAuthentication: {
    //   skipNativeAuth: false,
    //   providers: ['apple.com'],
    // },
    // FirebaseMessaging: {
    //   presentationOptions: ['badge', 'sound', 'alert'],
    // },
    // GoogleAuth: {
    //   scopes: ['profile','email'],
    //   clientId: '',
    //   androidClientId:'',
    //   iosClientId: '',
    //   forceCodeForRefreshToken: true,
    // },
    // CapacitorUpdater: {
    //   autoUpdate: true,
    ////Make sure this version matches with the version in package.json when you do a new release to app store/play store
    //   version: '0.1.0',
    //   resetWhenUpdate: false,
    //   privateKey:'',
    // },
  },
};

export default config;
