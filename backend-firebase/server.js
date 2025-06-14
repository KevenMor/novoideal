const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

app.use(cors());
app.use(bodyParser.json());

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

app.listen(PORT, () => {
    console.log(`🚀 Backend Firebase rodando na porta ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}/api`);
}); 