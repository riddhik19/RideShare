import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';

// Initialize Capacitor
export const initializeCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    // Configure status bar
    await StatusBar.setStyle({ style: Style.Default });
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
    
    // Hide splash screen after app loads
    await SplashScreen.hide();
    
    // Request permissions
    await requestPermissions();
  }
};

// Request necessary permissions
const requestPermissions = async () => {
  try {
    // Camera permissions
    await Camera.requestPermissions();
    
    // Location permissions
    await Geolocation.requestPermissions();
    
    // Push notification permissions
    await PushNotifications.requestPermissions();
  } catch (error) {
    console.warn('Permission request failed:', error);
  }
};

// Platform detection utilities
export const isNative = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isWeb = () => Capacitor.getPlatform() === 'web';

// Camera utilities
export const takePicture = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    return image.webPath;
  } catch (error) {
    console.error('Error taking picture:', error);
    throw error;
  }
};

export const selectImage = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });
    return image.webPath;
  } catch (error) {
    console.error('Error selecting image:', error);
    throw error;
  }
};

// Location utilities
export const getCurrentLocation = async () => {
  try {
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      latitude: coordinates.coords.latitude,
      longitude: coordinates.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

// Storage utilities (replaces localStorage for native)
export const setStorageItem = async (key: string, value: string) => {
  if (isNative()) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
};

export const getStorageItem = async (key: string): Promise<string | null> => {
  if (isNative()) {
    const result = await Preferences.get({ key });
    return result.value;
  } else {
    return localStorage.getItem(key);
  }
};

export const removeStorageItem = async (key: string) => {
  if (isNative()) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
};

// Push notification utilities
export const initializePushNotifications = async () => {
  if (!isNative()) return;

  try {
    const permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      const permRequest = await PushNotifications.requestPermissions();
      if (permRequest.receive !== 'granted') {
        throw new Error('Push notification permission denied');
      }
    }

    await PushNotifications.register();

    // Listen for registration
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
    });

    // Listen for push notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
    });

    // Listen for notification actions
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification.actionId, notification.inputValue);
    });

  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

// Safe area utilities for mobile layouts
export const getSafeAreaInsets = () => {
  if (isIOS()) {
    return {
      top: 'env(safe-area-inset-top)',
      bottom: 'env(safe-area-inset-bottom)',
      left: 'env(safe-area-inset-left)',
      right: 'env(safe-area-inset-right)',
    };
  }
  return { top: '0px', bottom: '0px', left: '0px', right: '0px' };
};