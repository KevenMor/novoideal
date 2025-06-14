const { getAuth } = require('../config/firebase');
require('dotenv').config();

async function createAdminUser() {
    console.log('🚀 Criando usuário admin no Firebase Authentication...');
    
    try {
        const auth = getAuth();
        
        const adminEmail = 'admin@autoescolaideal.com';
        const adminPassword = 'admin123';
        
        // Verificar se usuário já existe
        try {
            const existingUser = await auth.getUserByEmail(adminEmail);
            console.log('ℹ️ Usuário admin já existe:', existingUser.uid);
            console.log('📧 Email:', adminEmail);
            console.log('🔑 Senha: admin123');
            return;
        } catch (error) {
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
        }
        
        // Criar usuário
        const userRecord = await auth.createUser({
            email: adminEmail,
            password: adminPassword,
            displayName: 'Administrador do Sistema',
            emailVerified: true
        });
        
        // Definir claims customizados
        await auth.setCustomUserClaims(userRecord.uid, {
            role: 'administrador',
            unit: 'administrador',
            permissions: [
                'cadastrar_contas',
                'registrar_cobranca', 
                'consultar_extratos',
                'enviar_mensagens',
                'gerenciar_usuarios'
            ]
        });
        
        console.log('🎉 ===================================');
        console.log('✅ USUÁRIO ADMIN CRIADO COM SUCESSO!');
        console.log('🎉 ===================================');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Senha:', adminPassword);
        console.log('👤 UID:', userRecord.uid);
        console.log('🎉 ===================================');
        console.log('');
        console.log('🌐 Agora você pode fazer login no sistema!');
        console.log('🔗 URL do sistema: https://sistema-interno-ideal-atualizado-production.up.railway.app');
        
    } catch (error) {
        console.error('❌ Erro ao criar usuário admin:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createAdminUser().then(() => {
        console.log('🎉 Criação do admin concluída!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erro:', error);
        process.exit(1);
    });
}

module.exports = { createAdminUser }; 