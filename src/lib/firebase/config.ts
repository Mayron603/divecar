
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// Adicione os serviços do Firebase que você precisa aqui
// import { getAnalytics } from "firebase/analytics";

// Configuração do Firebase fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyCXfKgaAu6TjDVj6nq2HgRFiFTWOwCZa44",
  authDomain: "morumbi-tactical-force-hub.firebaseapp.com",
  projectId: "morumbi-tactical-force-hub",
  storageBucket: "morumbi-tactical-force-hub.firebasestorage.app", // REVERTIDO para o valor original do usuário
  messagingSenderId: "545763454264",
  appId: "1:545763454264:web:11b340feb378a5b70165cd"
  // measurementId: "YOUR_MEASUREMENT_ID" // Opcional, para Analytics
};

// Check for placeholder values - Manter este bloco para garantir que o usuário preencheu o resto.
if (firebaseConfig.apiKey === "YOUR_API_KEY" || 
    firebaseConfig.projectId === "YOUR_PROJECT_ID" || 
    firebaseConfig.authDomain === "YOUR_AUTH_DOMAIN" ||
    firebaseConfig.apiKey === "AIzaSyCXfKgaAu6TjDVj6nq2HgRFiFTWOwCZa44" && firebaseConfig.projectId === "morumbi-tactical-force-hub" && firebaseConfig.authDomain === "morumbi-tactical-force-hub.firebaseapp.com" && (firebaseConfig.storageBucket === "morumbi-tactical-force-hub.appspot.com" || firebaseConfig.storageBucket === "YOUR_STORAGE_BUCKET") ) { // Adicionada verificação para o storageBucket de placeholder também
  console.warn("\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! FIREBASE CONFIGURATION MIGHT BE INCOMPLETE OR USING PLACEHOLDERS !!!");
  console.warn("!!! Please ensure all Firebase project credentials in src/lib/firebase/config.ts are correct and do not use placeholders. !!!");
  if (firebaseConfig.storageBucket === "morumbi-tactical-force-hub.appspot.com" || firebaseConfig.storageBucket === "YOUR_STORAGE_BUCKET"){
    console.warn("!!! Specifically, double-check the 'storageBucket' value. It's currently set to: " + firebaseConfig.storageBucket);
    console.warn("!!! Verify the correct bucket name in your Firebase Console (Storage -> Files, it starts with gs://) and update it here if necessary.");
  }
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
