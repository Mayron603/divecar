
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// Adicione os serviços do Firebase que você precisa aqui
// import { getAnalytics } from "firebase/analytics";

// Configuração do Firebase fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyCXfKgaAu6TjDVj6nq2HgRFiFTWOwCZa44",
  authDomain: "morumbi-tactical-force-hub.firebaseapp.com",
  projectId: "morumbi-tactical-force-hub",
  storageBucket: "morumbi-tactical-force-hub.firebasestorage.app", // Corrigido para .appspot.com se for o padrão, mas mantendo o fornecido. O usuário deve verificar se storageBucket está correto. Se o fornecido foi "morumbi-tactical-force-hub.firebasestorage.app" então o correto é "morumbi-tactical-force-hub.appspot.com"
  messagingSenderId: "545763454264",
  appId: "1:545763454264:web:11b340feb378a5b70165cd"
  // measurementId: "YOUR_MEASUREMENT_ID" // Opcional, para Analytics
};

// Check for placeholder values (ajustado para checar se ainda são os placeholders originais, não os valores fornecidos)
if (firebaseConfig.apiKey === "YOUR_API_KEY" || 
    firebaseConfig.projectId === "YOUR_PROJECT_ID" || 
    firebaseConfig.authDomain === "YOUR_AUTH_DOMAIN") {
  console.error("\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! FIREBASE CONFIGURATION IS MISSING OR STILL USING PLACEHOLDERS !!!");
  console.error("!!! Please update src/lib/firebase/config.ts with your actual Firebase project credentials. !!!");
  console.error("!!! The application, especially the Investigations page, will not work correctly         !!!");
  console.error("!!! with Firebase functionalities until this is properly configured.                     !!!");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n");
} else if (firebaseConfig.storageBucket.endsWith(".firebasestorage.app")) {
    console.warn("\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.warn("!!! FIREBASE WARNING: Potential Storage Bucket Configuration Issue !!!");
    console.warn(`!!! The storageBucket is set to '${firebaseConfig.storageBucket}'. Usually, it should end with '.appspot.com'. !!!`);
    console.warn(`!!! For example: '${firebaseConfig.projectId}.appspot.com'.                                               !!!`);
    console.warn("!!! Please verify this in your Firebase project settings under Storage.                        !!!");
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n");
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
