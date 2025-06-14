const express = require('express');
const { getAuth } = require('../config/firebase');
const { getFirestore } = require('../config/firebase');
const auth = require('../middleware/auth');

const router = express.Router();
const adminAuth = getAuth();
const db = getFirestore();

// Listar todos os usuários (apenas admin)
router.get('/', auth, async (req, res) => {
    try {
        // Verificar se o usuário é admin
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem listar usuários.' });
        }

        // Buscar todos os usuários no Firestore
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data(),
                // Remover campos sensíveis
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate()
            });
        });

        res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar novo usuário (apenas admin)
router.post('/', auth, async (req, res) => {
    try {
        // Verificar se o usuário é admin
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar usuários.' });
        }

        const { email, password, name, role = 'user' } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
        }

        // Criar usuário no Firebase Authentication
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name
        });

        // Criar documento do usuário no Firestore
        const userData = {
            email,
            name,
            role,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        res.status(201).json({
            id: userRecord.uid,
            ...userData,
            message: 'Usuário criado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ error: 'Este email já está em uso' });
        }
        
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar usuário
router.put('/:id', auth, async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, role, active } = req.body;

        // Verificar se o usuário pode editar (próprio perfil ou admin)
        const isOwner = req.user.uid === userId;
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const isAdmin = userDoc.exists && userDoc.data().role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        // Buscar usuário atual
        const targetUserDoc = await db.collection('users').doc(userId).get();
        if (!targetUserDoc.exists) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Preparar dados para atualização
        const updateData = {
            updatedAt: new Date()
        };

        if (name) updateData.name = name;
        
        // Apenas admin pode alterar role e status
        if (isAdmin) {
            if (role) updateData.role = role;
            if (typeof active === 'boolean') updateData.active = active;
        }

        // Atualizar no Firestore
        await db.collection('users').doc(userId).update(updateData);

        // Atualizar displayName no Authentication se necessário
        if (name) {
            await adminAuth.updateUser(userId, { displayName: name });
        }

        // Buscar dados atualizados
        const updatedDoc = await db.collection('users').doc(userId).get();
        const updatedData = updatedDoc.data();

        res.json({
            id: userId,
            ...updatedData,
            createdAt: updatedData.createdAt?.toDate(),
            updatedAt: updatedData.updatedAt?.toDate(),
            message: 'Usuário atualizado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Excluir usuário (apenas admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        // Verificar se o usuário é admin
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' });
        }

        const userId = req.params.id;

        // Não permitir que admin exclua a si mesmo
        if (userId === req.user.uid) {
            return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
        }

        // Verificar se o usuário existe
        const targetUserDoc = await db.collection('users').doc(userId).get();
        if (!targetUserDoc.exists) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Excluir do Authentication
        await adminAuth.deleteUser(userId);

        // Excluir do Firestore
        await db.collection('users').doc(userId).delete();

        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Obter dados do usuário atual
router.get('/me', auth, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Dados do usuário não encontrados' });
        }

        const userData = userDoc.data();
        res.json({
            id: req.user.uid,
            ...userData,
            createdAt: userData.createdAt?.toDate(),
            updatedAt: userData.updatedAt?.toDate()
        });
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router; 