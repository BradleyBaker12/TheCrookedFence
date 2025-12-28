import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCRRGBCSozYnhV372OW5Ry6FEfKw_rqNpE",
  authDomain: "thecrookedfence-7aea9.firebaseapp.com",
  projectId: "thecrookedfence-7aea9",
  storageBucket: "thecrookedfence-7aea9.firebasestorage.app",
  messagingSenderId: "777578540066",
  appId: "1:777578540066:web:e6dbcb6ccf397e11cc6e7b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");
const storage = getStorage(app);

export { app, auth, db, functions, storage };
