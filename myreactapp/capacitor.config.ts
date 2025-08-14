import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.806e1bd605e04069bdaebba78dfa7003',
  appName: 'journey-sync-mobile-duo',
  webDir: 'dist',
  server: {
    url: 'https://806e1bd6-05e0-4069-bdae-bba78dfa7003.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e40af',
      showSpinner: false
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;