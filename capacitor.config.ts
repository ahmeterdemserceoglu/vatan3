import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.collabo.app',
  appName: 'Collabo',
  webDir: 'out',
  server: {
    url: 'https://ydyo.vercel.app',
    cleartext: true
  },
  android: {
    // WebView performans optimizasyonları
    webContentsDebuggingEnabled: false,
    allowMixedContent: true,
    captureInput: true,
    // Hardware acceleration
    useLegacyBridge: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
      androidSpinnerStyle: "small",
      spinnerColor: "#999999",
      launchFadeOutDuration: 300,
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#ffffff",
    }
  }
};

export default config;
