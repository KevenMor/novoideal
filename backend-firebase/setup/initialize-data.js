const { testFirebaseConnection, getFirestore } = require('../config/firebase');
const User = require('../models/User');

// 📝 INSERIR DADOS INICIAIS
async function initializeData() {
    console.log('🚀 Iniciando configuração do Firebase...');
    
    try {
        // Testar conexão (pulando teste por enquanto)
        console.log('⚠️ Pulando teste de conexão - prosseguindo com inicialização...');

        const db = getFirestore();

        // 🏢 CRIAR UNIDADES
        console.log('🏢 Criando unidades...');
        const units = [
            { id: 'admin-unit', code: 'administrador', name: 'Administração Geral' },
            { id: 'aparecidinha-unit', code: 'aparecidinha', name: 'Aparecidinha' },
            { id: 'coop-unit', code: 'coop', name: 'Coop' },
            { id: 'julio-unit', code: 'julio de mesquita', name: 'Julio de Mesquita' },
            { id: 'vila-haro-unit', code: 'vila haro', name: 'Vila Haro' },
            { id: 'vila-helena-unit', code: 'vila helena', name: 'Vila Helena' },
            { id: 'vila-progresso-unit', code: 'vila progresso', name: 'Vila Progresso' }
        ];

        for (const unit of units) {
            const unitRef = db.collection('units').doc(unit.id);
            const unitDoc = await unitRef.get();
            
            if (!unitDoc.exists) {
                await unitRef.set({
                    ...unit,
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`✅ Unidade criada: ${unit.name}`);
            } else {
                console.log(`ℹ️ Unidade já existe: ${unit.name}`);
            }
        }

        // 👤 CRIAR USUÁRIO ADMINISTRADOR
        console.log('👤 Criando usuário administrador...');
        
        const adminEmail = 'admin@autoescolaideal.com';
        const existingAdmin = await User.findByEmail(adminEmail);
        
        if (!existingAdmin) {
            const adminUser = new User({
                email: adminEmail,
                name: 'Administrador do Sistema',
                unit: 'administrador',
                role: 'administrador',
                permissions: [
                    'cadastrar_contas',
                    'registrar_cobranca',
                    'consultar_extratos',
                    'enviar_mensagens',
                    'gerenciar_usuarios'
                ],
                status: 'active'
            });

            const result = await adminUser.save();
            if (result.success) {
                console.log('✅ Usuário administrador criado');
                console.log('📧 Email: admin@autoescolaideal.com');
                console.log('🔑 Configure a senha no Firebase Console');
            } else {
                console.error('❌ Erro ao criar administrador:', result.error);
            }
        } else {
            console.log('ℹ️ Usuário administrador já existe');
        }

        // 📊 CRIAR COLEÇÃO DE LOGS
        console.log('📊 Configurando logs de auditoria...');
        const logsRef = db.collection('audit_logs').doc('_init');
        await logsRef.set({
            action: 'SYSTEM_INIT',
            resource: 'system',
            details: {
                message: 'Sistema inicializado com sucesso',
                timestamp: new Date().toISOString()
            },
            createdAt: new Date()
        });

        console.log('🎉 ===================================');
        console.log('✅ FIREBASE CONFIGURADO COM SUCESSO!');
        console.log('🎉 ===================================');
        console.log('📧 Admin: admin@autoescolaideal.com');
        console.log('🔑 Configure a senha no Firebase Console');
        console.log('🌐 Acesse: https://console.firebase.google.com');
        console.log('🎉 ===================================');

    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    initializeData().then(() => {
        console.log('🎉 Inicialização concluída!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erro na inicialização:', error);
        process.exit(1);
    });
}

module.exports = { initializeData }; 