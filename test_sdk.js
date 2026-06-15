import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc } from "firebase/firestore";
import fs from "fs";

const configRaw = fs.readFileSync("firebase-applet-config.json", "utf-8");
const config = JSON.parse(configRaw);

const app = initializeApp(config);
const db = getFirestore(app);

async function testFirebase() {
  try {
    const docRef = doc(db, "settings", "storefront");
    const docSnap = await getDoc(docRef);
    console.log("Settings Doc exists:", docSnap.exists());
    if (docSnap.exists()) {
      console.log("Settings Data:", docSnap.data());
    }
  } catch (err) {
    console.error("Settings Error:", err);
  }

  try {
    const docRef = await addDoc(collection(db, "gems"), { name: "test gem" });
    console.log("Gems write success, id:", docRef.id);
  } catch (err) {
    console.error("Gems Write Error:", err);
  }
  
  process.exit(0);
}

testFirebase();
