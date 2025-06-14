const admin = require('firebase-admin');
require('dotenv').config();

// 🔥 CONFIGURAÇÃO DO FIREBASE ADMIN
let firebaseApp;

function initializeFirebase() {
    try {
        // Verificar se já foi inicializado
        if (firebaseApp) {
            return firebaseApp;
        }

        // Configuração usando variáveis de ambiente
        const serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
        };

        // Inicializar Firebase Admin
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
        });

        console.log('✅ Firebase inicializado com sucesso!');
        return firebaseApp;

    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error.message);
        throw error;
    }
}

// 🔍 TESTAR CONEXÃO
async function testFirebaseConnection() {
    try {
        const app = initializeFirebase();
        const db = admin.firestore();
        
        // Testar acesso ao Firestore
        await db.collection('_test').doc('connection').set({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'connected'
        });

        console.log('✅ Conexão com Firebase testada com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao testar conexão Firebase:', error.message);
        return false;
    }
}

// 🗃️ OBTER INSTÂNCIAS
function getFirestore() {
    initializeFirebase();
    return admin.firestore();
}

function getAuth() {
    initializeFirebase();
    return admin.auth();
}

module.exports = {
    initializeFirebase,
    testFirebaseConnection,
    getFirestore,
    getAuth,
    admin
}; 