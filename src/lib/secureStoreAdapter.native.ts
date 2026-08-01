// Adaptateur natif : utilise expo-secure-store (chiffrement sécurisé du keychain/keystore)
import * as SecureStore from 'expo-secure-store';

export const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
