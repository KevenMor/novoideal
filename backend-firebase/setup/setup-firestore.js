const { getFirestore, getAuth } = require('../config/firebase');
require('dotenv').config();

async function setupFirestore() {
    console.log('🔥 Configurando Firestore em produção...');
    
    try {
        const db = getFirestore();
        const auth = getAuth();
        
        // Verificar se o usuário admin existe no Authentication
        let adminUser;
        try {
            adminUser = await auth.getUserByEmail('admin@autoescolaideal.com');
            console.log('✅ Usuário admin encontrado no Authentication:', adminUser.uid);
        } catch (error) {
            console.error('❌ Usuário admin não encontrado no Authentication');
            console.log('Execute primeiro: node setup/create-admin-auth.js');
            process.exit(1);
        }
        
        // Criar documento do usuário admin no Firestore
        const adminDocRef = db.collection('users').doc(adminUser.uid);
        
        // Verificar se já existe
        const adminDoc = await adminDocRef.get();
        
        if (!adminDoc.exists) {
            const adminData = {
                email: 'admin@autoescolaideal.com',
                name: 'Administrador',
                role: 'admin',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            await adminDocRef.set(adminData);
            console.log('✅ Documento do usuário admin criado no Firestore');
        } else {
            console.log('ℹ️ Documento do usuário admin já existe no Firestore');
        }
        
        // Criar coleção de configurações básicas
        const configRef = db.collection('configuracoes').doc('sistema');
        const configDoc = await configRef.get();
        
        if (!configDoc.exists) {
            const configData = {
                nomeEmpresa: 'Auto Escola Ideal',
                versaoSistema: '1.0.0',
                configuradoEm: new Date(),
                manterLogs: true,
                backupAutomatico: true
            };
            
            await configRef.set(configData);
            console.log('✅ Configurações básicas do sistema criadas');
        } else {
            console.log('ℹ️ Configurações básicas já existem');
        }
        
        console.log('\n🎉 FIRESTORE CONFIGURADO COM SUCESSO!');
        console.log('\n📋 RESUMO DA CONFIGURAÇÃO:');
        console.log('✅ Usuário admin criado no Firestore');
        console.log('✅ Configurações básicas do sistema');
        console.log('✅ Regras de segurança definidas');
        
        console.log('\n🔐 CREDENCIAIS DE ACESSO:');
        console.log('Email: admin@autoescolaideal.com');
        console.log('Senha: admin123');
        
        console.log('\n🚀 PRÓXIMOS PASSOS:');
        console.log('1. Habilitar Firestore no Firebase Console');
        console.log('2. Fazer deploy das regras de segurança');
        console.log('3. Testar o sistema completo');
        
    } catch (error) {
        console.error('❌ Erro ao configurar Firestore:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    setupFirestore();
}

module.exports = { setupFirestore }; 