import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.weighttracker.app',
  appName: 'Weight Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#8B5CF6",
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: "#8B5CF6"
    },
    Keyboard: {
      resize: 'body',
      style: 'dark'
    }
  }
};

export default config;