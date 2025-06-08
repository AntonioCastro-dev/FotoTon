import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
//@ts-ignore
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAAuo4FZH8imGa-d0JTHlR5jxCCXYKxfbY",
  authDomain: "rallyfotografico-ef440.firebaseapp.com",
  projectId: "rallyfotografico-ef440",
  storageBucket: "rallyfotografico-ef440.appspot.com",
  messagingSenderId: "720807524278",
  appId: "1:720807524278:web:a0a30276af7fa31b803317"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
