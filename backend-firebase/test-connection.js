// 🔥 SCRIPT SIMPLES PARA TESTAR FIREBASE
require('dotenv').config();

async function testarFirebase() {
    console.log('🔥 Testando conexão com Firebase...\n');
    
    try {
        // Verificar variáveis de ambiente
        console.log('📋 Verificando configurações...');
        const requiredVars = [
            'FIREBASE_PROJECT_ID',
            'FIREBASE_PRIVATE_KEY_ID', 
            'FIREBASE_PRIVATE_KEY',
            'FIREBASE_CLIENT_EMAIL',
            'FIREBASE_CLIENT_ID'
        ];
        
        const missing = requiredVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
            console.error('❌ Variáveis de ambiente faltando:');
            missing.forEach(varName => console.error(`   - ${varName}`));
            console.error('\n💡 Verifique o arquivo .env');
            return;
        }
        
        console.log('✅ Todas as variáveis de ambiente estão configuradas\n');
        
        // Testar conexão Firebase
        console.log('🔗 Testando conexão com Firebase...');
        const { testFirebaseConnection } = require('./config/firebase');
        
        const connected = await testFirebaseConnection();
        
        if (connected) {
            console.log('✅ Conexão com Firebase estabelecida com sucesso!\n');
            
            // Testar operações básicas
            console.log('📊 Testando operações básicas...');
            const { getFirestore } = require('./config/firebase');
            const db = getFirestore();
            
            // Testar escrita
            await db.collection('_test').doc('connection-test').set({
                message: 'Teste de conexão',
                timestamp: new Date(),
                status: 'success'
            });
            console.log('✅ Escrita no Firestore: OK');
            
            // Testar leitura
            const doc = await db.collection('_test').doc('connection-test').get();
            if (doc.exists) {
                console.log('✅ Leitura do Firestore: OK');
            }
            
            // Limpar teste
            await db.collection('_test').doc('connection-test').delete();
            console.log('✅ Limpeza de dados: OK\n');
            
            console.log('🎉 ===================================');
            console.log('✅ FIREBASE FUNCIONANDO PERFEITAMENTE!');
            console.log('🎉 ===================================');
            console.log('🚀 Próximo passo: npm run dev');
            console.log('🌐 Depois acesse: http://localhost:3001');
            
        } else {
            console.error('❌ Falha na conexão com Firebase');
            console.error('💡 Verifique as credenciais no arquivo .env');
        }
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('\n🔍 Possíveis causas:');
        console.error('   1. Arquivo .env não configurado corretamente');
        console.error('   2. Credenciais do Firebase inválidas');
        console.error('   3. Projeto Firebase não existe');
        console.error('   4. Firestore não foi ativado no projeto');
        console.error('\n💡 Siga o guia GUIA_FIREBASE_COMPLETO.md');
    }
}

// Executar teste
testarFirebase().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
}); 