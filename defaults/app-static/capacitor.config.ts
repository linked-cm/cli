import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mydomain.FILL_IN_YOUR_OWN',
  appName: 'FILL_IN_YOUR_OWN',
  webDir: 'web',
  server: {
    allowNavigation: ['yourdomain.com', 'sub.yourdomain.com'],
  },
  bundledWebRuntime: false,
  //Add or remove plugins that you need. Here is a starter list
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    // FirebaseMessaging: {
    //   presentationOptions: ['badge', 'sound', 'alert'],
    // },
    // GoogleAuth: {
    //   scopes: ['profile', 'email'],
    //   //self created production web client
    //   clientId: '...',
    //   //For these lines use the auto generated web client "Web client  (auto created by Google Service)"
    //   serverClientId: '....',
    //   androidClientId: '...',
    //   iosClientId: '...',
    //   forceCodeForRefreshToken: true,
    // },
    // SplashScreen: {
    //   launchShowDuration: 400,
    //   launchAutoHide: true,
    //   backgroundColor: '#F7E5FF',
    //   androidSplashResourceName: 'splash',
    //   showSpinner: false,
    //   splashFullScreen: true,
    //   splashImmersive: true,
    //   // launchFadeOutDuration: 500,
    //   // androidScaleType: 'CENTER',
    //   // androidSpinnerStyle: 'large',
    //   // iosSpinnerStyle: 'small',
    //   // spinnerColor: '#999999',
    //   // layoutName: 'launch_screen',
    //   // useDialog: true,
    // },
  },
};

export default config;
