import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDZp4rC_LYox1YlBW8eDqsycmqH08i4zP8",
  authDomain: "nutriai-f081c.firebaseapp.com",
  projectId: "nutriai-f081c",
  storageBucket: "nutriai-f081c.firebasestorage.app",
  messagingSenderId: "841982374698",
  appId: "1:841982374698:web:0289d0aac7d926b07ce453"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
export const appId = rawAppId.replace(/\//g, '_');
