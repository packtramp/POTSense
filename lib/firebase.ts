import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBt2IL8ApfQPOCjjMp5qn5p3zjRK6lDLvw',
  authDomain: 'potsense-app.firebaseapp.com',
  projectId: 'potsense-app',
  storageBucket: 'potsense-app.firebasestorage.app',
  messagingSenderId: '438768071375',
  appId: '1:438768071375:web:95da06fa6182a04a077dba',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
