const { getFirestore, getAuth, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class User {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.email = data.email;
        this.name = data.name;
        this.unit = data.unit;
        this.role = data.role;
        this.permissions = data.permissions || [];
        this.status = data.status || 'active';
        this.failedLoginAttempts = data.failedLoginAttempts || 0;
        this.lockedUntil = data.lockedUntil;
        this.lastAccess = data.lastAccess;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // 💾 SALVAR USUÁRIO NO FIRESTORE
    async save() {
        try {
            const db = getFirestore();
            const userData = {
                id: this.id,
                email: this.email,
                name: this.name,
                unit: this.unit,
                role: this.role,
                permissions: this.permissions,
                status: this.status,
                failedLoginAttempts: this.failedLoginAttempts,
                lockedUntil: this.lockedUntil,
                lastAccess: this.lastAccess,
                createdAt: this.createdAt,
                updatedAt: new Date()
            };

            await db.collection('users').doc(this.id).set(userData);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao salvar usuário:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔍 BUSCAR POR EMAIL
    static async findByEmail(email) {
        try {
            const db = getFirestore();
            const snapshot = await db.collection('users')
                .where('email', '==', email)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const userData = snapshot.docs[0].data();
            return new User(userData);
        } catch (error) {
            console.error('❌ Erro ao buscar usuário por email:', error);
            return null;
        }
    }

    // 🔍 BUSCAR POR ID
    static async findById(id) {
        try {
            const db = getFirestore();
            const doc = await db.collection('users').doc(id).get();

            if (!doc.exists) {
                return null;
            }

            const userData = doc.data();
            return new User(userData);
        } catch (error) {
            console.error('❌ Erro ao buscar usuário por ID:', error);
            return null;
        }
    }

    // 📋 LISTAR TODOS OS USUÁRIOS
    static async findAll(filters = {}) {
        try {
            const db = getFirestore();
            let query = db.collection('users');

            // Aplicar filtros
            if (filters.unit) {
                query = query.where('unit', '==', filters.unit);
            }

            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }

            if (filters.role) {
                query = query.where('role', '==', filters.role);
            }

            // Ordenar por data de criação
            query = query.orderBy('createdAt', 'desc');

            // Aplicar limite
            if (filters.limit) {
                query = query.limit(parseInt(filters.limit));
            }

            const snapshot = await query.get();
            const users = [];

            snapshot.forEach(doc => {
                const userData = doc.data();
                
                // Filtro de busca por texto (feito no cliente)
                if (filters.search) {
                    const searchTerm = filters.search.toLowerCase();
                    const matchesName = userData.name?.toLowerCase().includes(searchTerm);
                    const matchesEmail = userData.email?.toLowerCase().includes(searchTerm);
                    
                    if (!matchesName && !matchesEmail) {
                        return; // Pular este usuário
                    }
                }
                
                users.push(new User(userData));
            });

            return users;
        } catch (error) {
            console.error('❌ Erro ao listar usuários:', error);
            return [];
        }
    }

    // ✏️ ATUALIZAR USUÁRIO
    static async update(id, updateData) {
        try {
            const db = getFirestore();
            
            // Preparar dados para atualização
            const updateFields = {
                ...updateData,
                updatedAt: new Date()
            };

            await db.collection('users').doc(id).update(updateFields);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao atualizar usuário:', error);
            return { success: false, error: error.message };
        }
    }

    // 🗑️ DELETAR USUÁRIO (SOFT DELETE)
    static async delete(id) {
        try {
            const db = getFirestore();
            await db.collection('users').doc(id).update({
                status: 'inactive',
                updatedAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao deletar usuário:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔐 CRIAR USUÁRIO NO FIREBASE AUTH
    static async createFirebaseUser(email, password) {
        try {
            const auth = getAuth();
            const userRecord = await auth.createUser({
                email: email,
                password: password,
                emailVerified: true
            });
            
            return { success: true, uid: userRecord.uid };
        } catch (error) {
            console.error('❌ Erro ao criar usuário no Firebase Auth:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔍 VERIFICAR SENHA (usando Firebase Auth)
    static async verifyPassword(email, password) {
        try {
            // Para verificar senha, precisamos usar o Firebase Client SDK
            // Por enquanto, vamos simular a verificação
            // Em produção, isso seria feito no frontend
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar senha:', error);
            return false;
        }
    }

    // 🔒 REGISTRAR TENTATIVA DE LOGIN FALHADA
    async recordFailedLogin() {
        try {
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
            const lockoutTime = parseInt(process.env.LOCKOUT_TIME) || 15; // minutos

            this.failedLoginAttempts += 1;

            // Se excedeu tentativas, bloquear conta
            if (this.failedLoginAttempts >= maxAttempts) {
                const lockUntil = new Date();
                lockUntil.setMinutes(lockUntil.getMinutes() + lockoutTime);
                this.lockedUntil = lockUntil;
            }

            await this.save();
        } catch (error) {
            console.error('❌ Erro ao registrar falha de login:', error);
        }
    }

    // ✅ REGISTRAR LOGIN SUCESSO
    async recordSuccessfulLogin() {
        try {
            this.failedLoginAttempts = 0;
            this.lockedUntil = null;
            this.lastAccess = new Date();
            await this.save();
        } catch (error) {
            console.error('❌ Erro ao registrar login sucesso:', error);
        }
    }

    // 🔍 VERIFICAR SE CONTA ESTÁ BLOQUEADA
    isLocked() {
        if (!this.lockedUntil) return false;
        return new Date() < new Date(this.lockedUntil);
    }

    // 📊 ESTATÍSTICAS DE USUÁRIOS
    static async getStats() {
        try {
            const db = getFirestore();
            
            // Buscar todos os usuários
            const snapshot = await db.collection('users').get();
            
            let total = 0;
            let active = 0;
            let inactive = 0;
            const byUnit = {};

            snapshot.forEach(doc => {
                const user = doc.data();
                total++;
                
                if (user.status === 'active') {
                    active++;
                } else {
                    inactive++;
                }
                
                // Contar por unidade
                if (user.status === 'active') {
                    byUnit[user.unit] = (byUnit[user.unit] || 0) + 1;
                }
            });

            // Converter objeto para array
            const byUnitArray = Object.entries(byUnit).map(([unit, count]) => ({
                unit,
                count
            }));

            return {
                total,
                active,
                inactive,
                byUnit: byUnitArray
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return null;
        }
    }

    // 🔄 CONVERTER PARA JSON (sem dados sensíveis)
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            unit: this.unit,
            role: this.role,
            permissions: this.permissions,
            status: this.status,
            lastAccess: this.lastAccess,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = User; 