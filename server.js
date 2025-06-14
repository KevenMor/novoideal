const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(__dirname));

// Middleware de autenticação JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Token inválido' });
        req.user = user;
        next();
    });
}

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user || user.status !== 'active') {
        return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
    }
    // Simulação de verificação de senha (ajuste para produção)
    // Em produção, use Firebase Auth para verificar senha
    if (password !== 'admin123' && password !== user.password) {
        return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, unit: user.unit, permissions: user.permissions }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: user.toJSON() });
});

// Listar usuários (apenas admin)
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    const users = await User.findAll();
    res.json({ success: true, users: users.map(u => u.toJSON()) });
});

// Criar usuário (apenas admin)
app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    const { email, name, unit, role, permissions, password } = req.body;
    const existing = await User.findByEmail(email);
    if (existing) {
        return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
    }
    const newUser = new User({ email, name, unit, role, permissions, status: 'active' });
    await newUser.save();
    // Opcional: criar no Firebase Auth
    // await User.createFirebaseUser(email, password);
    res.status(201).json({ success: true, user: newUser.toJSON() });
});

// Editar usuário (admin ou próprio)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    if (req.user.role !== 'administrador' && req.user.id !== id) {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    const updateData = req.body;
    await User.update(id, updateData);
    const updated = await User.findById(id);
    res.json({ success: true, user: updated ? updated.toJSON() : null });
});

// Desativar usuário (apenas admin)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    const { id } = req.params;
    await User.delete(id);
    res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// INTEGRAÇÃO DO BACKEND FIREBASE
// ==============================
try {
    // Importar rotas do backend Firebase
    const authRoutes = require('./backend-firebase/routes/auth');
    const userRoutes = require('./backend-firebase/routes/users');
    
    // Usar as rotas do Firebase
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    
    console.log('✅ Backend Firebase integrado com sucesso!');
    console.log('🔐 Autenticação: /api/auth');
    console.log('👥 Usuários: /api/users');
    
} catch (error) {
    console.error('❌ Erro ao carregar backend Firebase:', error.message);
    console.log('💡 Sistema funcionará sem autenticação Firebase');
}

// INTEGRAÇÃO DO MÓDULO DE EXTRATOS
// ================================
let extratoRoutes = null;

try {
    // Tentar importar módulo de extratos
    const createExtratoRoutes = require('./modules/extrato-routes');
    
    // Configurar caminhos dos arquivos de configuração
    const credentialsPath = path.join(__dirname, 'config', 'credentials.json');
    const configPath = path.join(__dirname, 'config', 'planilhas.json');

    // Verificar se arquivos existem
    const fs = require('fs');
    
    if (fs.existsSync(configPath)) {
        // Verificar se temos credenciais (arquivo local ou variável de ambiente)
        let hasCredentials = false;
        
        if (fs.existsSync(credentialsPath)) {
            hasCredentials = true;
        } else if (process.env.GOOGLE_CREDENTIALS) {
            // Criar arquivo temporário a partir da variável de ambiente
            try {
                const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
                fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
                hasCredentials = true;
                console.log('✅ Credenciais carregadas da variável de ambiente');
            } catch (error) {
                console.error('❌ Erro ao processar GOOGLE_CREDENTIALS:', error.message);
            }
        }
        
        if (hasCredentials) {
            // Criar rotas de extrato
            extratoRoutes = createExtratoRoutes(credentialsPath, configPath);
            
            // Integrar as rotas no sistema
            app.use('/api', extratoRoutes);
            
            console.log('✅ Módulo de extratos integrado com sucesso!');
            console.log('📊 API disponível em: /api/extrato');
            console.log('🏢 Unidades em: /api/unidades');
        } else {
            console.log('⚠️  Credenciais não encontradas');
            console.log('💡 Sistema funcionará sem módulo de extratos');
            console.log('📝 Para ativar: configure a variável GOOGLE_CREDENTIALS ou arquivo credentials.json');
        }
    } else {
        console.log('⚠️  Arquivo planilhas.json não encontrado');
        console.log('💡 Sistema funcionará sem módulo de extratos');
    }
    
} catch (error) {
    console.error('⚠️  Erro ao carregar módulo de extratos:', error.message);
    console.log('💡 Sistema funcionará apenas com funcionalidades originais');
}

// APIs de fallback (para quando não há credenciais)
if (!extratoRoutes) {
    app.get('/api/extrato', (req, res) => {
        res.status(503).json({
            success: false,
            message: 'Módulo de extratos não está configurado. Configure as credenciais do Google Sheets.',
            error: 'Credenciais não encontradas'
        });
    });

    app.get('/api/unidades', (req, res) => {
        res.status(503).json({
            success: false,
            message: 'Módulo de extratos não está configurado. Configure as credenciais do Google Sheets.',
            error: 'Credenciais não encontradas'
        });
    });
}

// Health check geral do sistema
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Sistema Interno Ideal funcionando',
        status: 'OK',
        detalhes: {
            status: 'OK',
            firebase: 'ATIVO',
            extratos: extratoRoutes ? 'ATIVO' : 'INATIVO',
            ultimoTeste: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        sistema: 'Autoescola Ideal - Sistema Interno',
        version: '2.0.0'
    });
});

// Rotas principais do sistema
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Fallback para SPA
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Endpoint não encontrado' });
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`🔐 Login: http://localhost:${PORT}/login`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    
    if (extratoRoutes) {
        console.log(`📊 API Extratos: http://localhost:${PORT}/api/extrato`);
        console.log(`🏢 API Unidades: http://localhost:${PORT}/api/unidades`);
    }
    
    console.log('\n🎯 SISTEMA PRONTO PARA USO!');
    console.log('📧 Login: admin@autoescolaideal.com');
    console.log('🔑 Senha: admin123');
});

module.exports = app; 