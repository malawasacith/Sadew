import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { StoreSettings } from '../types';

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'settings', 'storefront');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as StoreSettings);
        } else {
          setSettings({
            name: 'Sadew Gems',
            loginPageName: 'Exclusive Gem Inventory',
            primaryColor: '#4f46e5',
            fontFamily: 'Inter, sans-serif',
            storePassword: '123'
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setSettings({
          name: 'Sadew Gems',
          loginPageName: 'Exclusive Gem Inventory',
          primaryColor: '#4f46e5',
          fontFamily: 'Inter, sans-serif',
          storePassword: '123'
        });
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      if (settings.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
      }
      if (settings.fontFamily) {
        document.documentElement.style.setProperty('--font-family', settings.fontFamily);
        document.body.style.fontFamily = settings.fontFamily;
      }
    }
  }, [settings]);

  return { settings, loading };
}
