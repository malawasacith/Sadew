import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testFirebase() {
  try {
    const docRef = doc(db, 'settings', 'storefront');
    await setDoc(docRef, { name: 'Test Settings' });
    console.log('Settings write success!');
  } catch (err: any) {
    console.error('Settings write failed:', err.message);
  }

  try {
    const gemRef = doc(db, 'gems', 'testgem');
    await setDoc(gemRef, { test: 123 });
    console.log('Gem write success!');
  } catch (err: any) {
    console.error('Gem write failed:', err.message);
  }
}

testFirebase().catch(console.error).finally(() => process.exit(0));
