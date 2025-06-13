
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// Adicione os serviços do Firebase que você precisa aqui
// import { getAnalytics } from "firebase/analytics";

// TODO: Adicione a configuração do seu projeto Firebase aqui
// Substitua pelos dados do seu projeto Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  // measurementId: "YOUR_MEASUREMENT_ID" // Opcional, para Analytics
};

// Check for placeholder values and log a warning
if (firebaseConfig.apiKey === "YOUR_API_KEY" || 
    firebaseConfig.projectId === "YOUR_PROJECT_ID" || 
    firebaseConfig.authDomain === "YOUR_AUTH_DOMAIN") {
  console.error("\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! FIREBASE CONFIGURATION IS MISSING OR STILL USING PLACEHOLDERS !!!");
  console.error("!!! Please update src/lib/firebase/config.ts with your actual Firebase project credentials. !!!");
  console.error("!!! The application, especially the Investigations page, will not work correctly         !!!");
  console.error("!!! with Firebase functionalities until this is properly configured.                     !!!");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n");
}

// Inicializa o Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Opcional: inicializar outros serviços como Analytics
// const analytics = getAnalytics(app);

export { app, firebaseConfig };
