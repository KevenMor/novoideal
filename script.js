// 🔐 SISTEMA DE GESTÃO DE USUÁRIOS
const API_URL = "https://sistema-interno-ideal-atualizado-production.up.railway.app/api";

class UserManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('🔐 UserManager inicializado');
    }

    // Autenticação via backend
    async login(email, password, selectedUnit) {
        try {
            const response = await fetch(API_URL + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.success) {
                this.token = data.token;
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                return { success: true, user: data.user, message: 'Login realizado com sucesso' };
            } else {
                return { success: false, message: data.message || 'E-mail ou senha incorretos' };
            }
        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, message: 'Erro ao conectar ao servidor' };
        }
    }

    // Obter todos os usuários via backend
    async getAllUsers() {
        try {
            const response = await fetch(API_URL + '/users', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            if (data.success) {
                return data.users;
            } else {
                console.error('Erro ao buscar usuários:', data.message);
                return [];
            }
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
    }

    // Cadastrar novo usuário via backend
    async createUser(userData) {
        try {
            const response = await fetch(API_URL + '/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(userData)
            });
            const data = await response.json();
            if (data.success) {
                return { success: true, user: data.user, message: 'Usuário cadastrado com sucesso' };
            } else {
                return { success: false, message: data.message || 'Erro ao cadastrar usuário' };
            }
        } catch (error) {
            console.error('Erro ao cadastrar usuário:', error);
            return { success: false, message: 'Erro ao conectar ao servidor' };
        }
    }

    // Atualizar usuário via backend
    async updateUser(userId, userData) {
        try {
            const response = await fetch(API_URL + `/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(userData)
            });
            const data = await response.json();
            if (data.success) {
                return { success: true, user: data.user, message: 'Usuário atualizado com sucesso' };
            } else {
                return { success: false, message: data.message || 'Erro ao atualizar usuário' };
            }
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            return { success: false, message: 'Erro ao conectar ao servidor' };
        }
    }

    // Desativar usuário via backend
    async deactivateUser(userId) {
        try {
            const response = await fetch(API_URL + `/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            if (data.success) {
                return { success: true, message: 'Usuário desativado com sucesso' };
            } else {
                return { success: false, message: data.message || 'Erro ao desativar usuário' };
            }
        } catch (error) {
            console.error('Erro ao desativar usuário:', error);
            return { success: false, message: 'Erro ao conectar ao servidor' };
        }
    }

    // Ativar usuário via backend (usando PUT para atualizar status)
    async activateUser(userId) {
        return this.updateUser(userId, { status: 'active' });
    }

    // Buscar usuários (filtragem no frontend após buscar todos)
    async searchUsers(query) {
        const users = await this.getAllUsers();
        if (!query) return users;
        const searchTerm = query.toLowerCase();
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.unit.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm)
        );
    }

    // Formatar nome da unidade
    formatUnitName(unit) {
        const unitNames = {
            'administrador': 'Administrador',
            'vila helena': 'Vila Helena',
            'vila progresso': 'Vila Progresso',
            'aparecidinha': 'Aparecidinha',
            'julio de mesquita': 'Julio de Mesquita',
            'vila haro': 'Vila Haro',
            'coop': 'Coop'
        };
        return unitNames[unit] || unit.charAt(0).toUpperCase() + unit.slice(1);
    }

    // Configurar event listeners
    setupEventListeners() {
        // Event listeners serão configurados quando a aba for inicializada
    }
}

// Instância global do UserManager
let userManager = null;

class ExtratoManager {
    constructor() {
        this.dados = [];
        this.dadosFiltrados = [];
        this.unidades = [];
        this.competencias = [];
        
        // 🔐 ADMINISTRADOR: Verificar se é acesso administrativo
        const selectedUnit = localStorage.getItem('selectedUnit');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        
        if (isAdmin) {
            this.isAdmin = true;
            this.unidadeDoLogin = null; // Administrador não tem restrição de unidade
            console.log('🔐 ADMINISTRADOR detectado - Acesso TOTAL liberado!');
            console.log('🌟 Todas as unidades e dados serão visíveis');
        } else {
            this.isAdmin = false;
            this.unidadeDoLogin = selectedUnit;
            console.log(`🔒 Usuário comum - Limitado à unidade: ${this.unidadeDoLogin}`);
        }
        
        this.filtros = {
            unidade: this.isAdmin ? 'todas' : (selectedUnit || 'todas'), // Admin pode ver todas por padrão
            dataInicio: '',
            dataFim: '',
            competencia: ''
        };
        this.estatisticas = null;
        this.isLoading = false; // Flag para evitar múltiplas chamadas
        
        // Base URL da API
        this.API_BASE_URL = '/api';
        
        if (this.isAdmin) {
            console.log('🔐 ExtratoManager configurado para ADMINISTRADOR');
            console.log('🌟 PERMISSÃO TOTAL: Extratos de todas as unidades serão exibidos');
        } else {
            console.log(`🔒 ExtratoManager configurado para unidade: ${this.unidadeDoLogin}`);
            console.log('🛡️ SEGURANÇA: Apenas extratos desta unidade serão exibidos.');
        }
        console.log('🔍 Debug - localStorage completo:', localStorage);
        
        // 🗺️ Configurar mapeamento de unidades
        this.configurarMapeamentoUnidades();
        
        this.init();
    }

    configurarMapeamentoUnidades() {
        // 🗺️ MAPEAMENTO: Palavra-chave -> possíveis variações no banco
        this.mapeamentoUnidades = {
            'aparecidinha': ['aparecidinha', 'ideal aparecidinha'],
            'vila helena': ['vila helena', 'ideal vila helena'],
            'vila progresso': ['vila progresso', 'ideal vila progresso'],
            'julio de mesquita': ['julio de mesquita', 'ideal julio de mesquita', 'julio mesquita'],
            'vila haro': ['vila haro', 'ideal vila haro'],
            'coop': ['coop', 'ideal coop']
        };
        
        console.log('🗺️ Mapeamento de unidades configurado:', this.mapeamentoUnidades);
    }

    // 🔍 FUNÇÃO: Verificar se uma unidade do banco corresponde à unidade do login
    verificarCorrespondenciaUnidade(unidadeBanco, unidadeLogin) {
        if (!unidadeBanco || !unidadeLogin) return false;
        
        const unidadeBancoLower = unidadeBanco.toLowerCase().trim();
        const unidadeLoginLower = unidadeLogin.toLowerCase().trim();
        
        // 1. Verificação direta
        if (unidadeBancoLower === unidadeLoginLower) {
            return true;
        }
        
        // 2. Verificação por mapeamento
        const variacoesPermitidas = this.mapeamentoUnidades[unidadeLoginLower];
        if (variacoesPermitidas) {
            return variacoesPermitidas.some(variacao => 
                unidadeBancoLower === variacao.toLowerCase()
            );
        }
        
        // 3. Verificação por palavra-chave (fallback)
        return unidadeBancoLower.includes(unidadeLoginLower) || 
               unidadeLoginLower.includes(unidadeBancoLower);
    }

    init() {
        this.bindEvents();
        this.carregarUnidades();
        this.gerarCompetencias();
        this.verificarConexaoAPI();
    }

    async verificarConexaoAPI() {
        console.log('🔍 Verificando conexão com API...');
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/health`);
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ API de extratos funcionando:', result.detalhes);
                this.carregarDados();
            } else {
                console.warn('⚠️ API com problemas:', result.message);
                this.showError('Sistema de extratos com problemas. Verifique a conexão.');
            }
        } catch (error) {
            console.error('❌ Erro ao conectar com API:', error);
            this.showError('Não foi possível conectar com o sistema de extratos.');
        }
    }

    bindEvents() {
        // Botão de atualizar
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', () => this.carregarDados());

        // Campo de busca
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.filtrarDados(e.target.value));

        // Filtros
        const unidadeSelect = document.getElementById('unidadeSelect');
        unidadeSelect.addEventListener('change', (e) => {
            this.filtros.unidade = e.target.value;
            this.carregarDados();
        });

        const competenciaSelect = document.getElementById('competenciaSelect');
        competenciaSelect.addEventListener('change', (e) => {
            this.filtros.competencia = e.target.value;
            this.carregarDados();
        });

        const dataInicio = document.getElementById('dataInicio');
        dataInicio.addEventListener('change', (e) => {
            this.filtros.dataInicio = e.target.value;
            this.carregarDados();
        });

        const dataFim = document.getElementById('dataFim');
        dataFim.addEventListener('change', (e) => {
            this.filtros.dataFim = e.target.value;
            this.carregarDados();
        });

        // Botão limpar filtros
        const limparFiltrosBtn = document.getElementById('limparFiltrosBtn');
        limparFiltrosBtn.addEventListener('click', () => this.limparFiltros());
    }

    async carregarUnidades() {
        try {
            console.log('🏢 Carregando unidades via API...');
            
            const response = await fetch(`${this.API_BASE_URL}/unidades`);
            const result = await response.json();
            
            if (result.success) {
                this.unidades = result.data;
                console.log('✅ Unidades carregadas:', this.unidades);
                this.popularSeletorUnidades();
            } else {
                console.error('❌ Erro ao carregar unidades:', result.message);
                this.showError('Erro ao carregar unidades disponíveis.');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar unidades:', error);
            this.showError('Não foi possível carregar as unidades.');
        }
    }

    formatarNomeUnidade(unidade) {
        return unidade
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    popularSeletorUnidades() {
        const unidadeSelect = document.getElementById('unidadeSelect');
        
        // Limpar todas as opções existentes
        unidadeSelect.innerHTML = '';

        // 🔐 ADMINISTRADOR: Se é admin, mostrar TODAS as unidades
        if (this.isAdmin) {
            // Opção "Todas as Unidades" para admin
            const todasOption = document.createElement('option');
            todasOption.value = 'todas';
            todasOption.textContent = '🌟 Todas as Unidades (Admin)';
            todasOption.selected = true;
            unidadeSelect.appendChild(todasOption);

            // Adicionar opções das unidades individuais
            this.unidades.forEach(unidade => {
                const option = document.createElement('option');
                option.value = unidade.codigo;
                option.textContent = unidade.nome;
                unidadeSelect.appendChild(option);
            });
            
            console.log('🔐 ADMINISTRADOR: Lista completa de unidades disponível');
        } else if (this.unidadeDoLogin) {
            // 🔒 USUÁRIO COMUM: Se há unidade do login, mostrar APENAS ela
            const option = document.createElement('option');
            option.value = this.unidadeDoLogin;
            option.textContent = this.formatarNomeUnidade(this.unidadeDoLogin);
            option.selected = true;
            unidadeSelect.appendChild(option);
            
            console.log(`🔒 Lista de unidades limitada a: ${this.formatarNomeUnidade(this.unidadeDoLogin)}`);
        } else {
            // Fallback: Se não há unidade do login, mostrar todas (comportamento original)
            const todasOption = document.createElement('option');
            todasOption.value = 'todas';
            todasOption.textContent = 'Todas as Unidades';
            unidadeSelect.appendChild(todasOption);

            // Adicionar opções das unidades
            this.unidades.forEach(unidade => {
                const option = document.createElement('option');
                option.value = unidade.codigo;
                option.textContent = unidade.nome;
                unidadeSelect.appendChild(option);
            });
        }
    }

    async carregarDados() {
        // 🛡️ PROTEÇÃO: Evitar múltiplas chamadas simultâneas
        if (this.isLoading) {
            console.log('⚠️ Carregamento já em andamento, ignorando nova chamada');
            return;
        }
        
        const refreshBtn = document.getElementById('refreshBtn');
        const loadingSpinner = document.getElementById('loadingSpinner');
        const errorMessage = document.getElementById('errorMessage');
        
        try {
            this.isLoading = true; // Flag de proteção
            
            // Mostrar loading
            refreshBtn.disabled = true;
            loadingSpinner.style.display = 'inline-block';
            errorMessage.style.display = 'none';
            
            // Mostrar mensagem de carregamento na tabela
            const tableBody = document.getElementById('tableBody');
            const noDataMessage = document.getElementById('noDataMessage');
            const table = document.getElementById('extratosTable');
            
            table.style.display = 'none';
            noDataMessage.style.display = 'block';
            noDataMessage.innerHTML = `
                <i class="bi bi-arrow-clockwise" style="animation: spin 1s linear infinite;"></i>
                <p>Carregando dados via API...</p>
                <small>Isso pode levar alguns segundos.</small>
            `;

            console.log('🚀 Carregando dados via API...');
            console.log('📋 Filtros atuais:', this.filtros);

            // 🔐 ADMINISTRADOR vs 🔒 USUÁRIO COMUM: Aplicar filtros de segurança
            if (this.isAdmin) {
                console.log('🔐 ADMINISTRADOR: Sem restrições de unidade aplicadas');
                console.log('🌟 Carregando dados de TODAS as unidades conforme filtros selecionados');
            } else if (this.unidadeDoLogin) {
                // 🔒 SEGURANÇA: Forçar sempre o filtro da unidade do login para usuários comuns
                this.filtros.unidade = this.unidadeDoLogin;
                console.log(`🛡️ FILTRO DE SEGURANÇA: Forçando unidade ${this.unidadeDoLogin}`);
            }

            // Construir parâmetros da query
            const params = new URLSearchParams();
            
            // 🔐 ADMINISTRADOR: Permitir acesso a todas as unidades
            // 🔒 USUÁRIO COMUM: SEMPRE aplicar filtro da unidade (não permitir "todas" se há unidade do login)
            if (this.isAdmin) {
                // Admin pode escolher qualquer unidade, incluindo "todas"
                if (this.filtros.unidade && this.filtros.unidade !== 'todas') {
                    params.append('unidade', this.filtros.unidade);
                }
            } else if (this.unidadeDoLogin) {
                params.append('unidade', this.unidadeDoLogin);
            } else if (this.filtros.unidade && this.filtros.unidade !== 'todas') {
                params.append('unidade', this.filtros.unidade);
            }
            
            if (this.filtros.dataInicio) {
                params.append('dataInicio', this.filtros.dataInicio);
            }
            
            if (this.filtros.dataFim) {
                params.append('dataFim', this.filtros.dataFim);
            }
            
            if (this.filtros.competencia) {
                params.append('competencia', this.filtros.competencia);
            }

            // Fazer chamada para API
            const url = `${this.API_BASE_URL}/extrato?${params.toString()}`;
            console.log('📡 Chamando API:', url);
            
            const response = await fetch(url);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Erro HTTP: ${response.status}`);
            }

            if (result.success) {
                // Processar dados recebidos da API
                this.dados = result.data || [];
                this.dadosFiltrados = [...this.dados];
                this.estatisticas = result.estatisticas || null;
                
                console.log(`✅ ${this.dados.length} registros carregados via API`);
                
                // Renderizar resultados
                this.renderizarTabela();
                this.atualizarEstatisticas();
                this.atualizarInfoPeriodo();
                
                // Mensagem de sucesso
                if (this.dados.length > 0) {
                    const mensagem = `✅ ${this.dados.length} registros carregados com sucesso!`;
                    this.showMessage(mensagem, 'success');
                } else {
                    this.showMessage('⚠️ Nenhum registro encontrado com os filtros aplicados.', 'info');
                }
            } else {
                throw new Error(result.message || 'Erro desconhecido na API');
            }

        } catch (error) {
            console.error('❌ Erro ao carregar dados via API:', error);
            this.showError(`Erro ao carregar dados: ${error.message}`);
        } finally {
            // Esconder loading e liberar flag
            refreshBtn.disabled = false;
            loadingSpinner.style.display = 'none';
            this.isLoading = false; // Liberar flag de proteção
        }
    }

    gerarCompetencias() {
        const competenciaSelect = document.getElementById('competenciaSelect');
        const hoje = new Date();
        
        // Gerar últimos 24 meses
        for (let i = 0; i < 24; i++) {
            const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const ano = data.getFullYear();
            const mes = (data.getMonth() + 1).toString().padStart(2, '0');
            const valor = `${ano}-${mes}`;
            const texto = data.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
            
            const option = document.createElement('option');
            option.value = valor;
            option.textContent = texto;
            competenciaSelect.appendChild(option);
        }
    }

    limparFiltros() {
        // 🔐 ADMINISTRADOR vs 🔒 USUÁRIO COMUM: Diferentes comportamentos
        if (this.isAdmin) {
            // Admin pode limpar todos os filtros, incluindo unidade
            this.filtros = {
                unidade: 'todas', // Admin sempre pode ver todas
                dataInicio: '',
                dataFim: '',
                competencia: ''
            };
            console.log('🔐 ADMINISTRADOR: Todos os filtros limpos, mantendo acesso total');
        } else {
            // 🔒 SEGURANÇA: Manter sempre a unidade do login para usuários comuns
            this.filtros = {
                unidade: this.unidadeDoLogin || 'todas', // Não permitir limpar unidade
                dataInicio: '',
                dataFim: '',
                competencia: ''
            };
            console.log(`🔒 Filtros limpos, mas unidade mantida: ${this.unidadeDoLogin}`);
        }

        // Resetar campos
        const unidadeSelect = document.getElementById('unidadeSelect');
        if (unidadeSelect && unidadeSelect.options.length > 0) {
            if (this.isAdmin) {
                // Admin: selecionar "Todas as Unidades"
                unidadeSelect.value = 'todas';
            } else {
                // Usuário comum: selecionar a primeira (e única) opção
                unidadeSelect.selectedIndex = 0;
            }
        }
        
        document.getElementById('competenciaSelect').value = '';
        document.getElementById('dataInicio').value = '';
        document.getElementById('dataFim').value = '';
        document.getElementById('searchInput').value = '';

        this.carregarDados();
    }

    filtrarDados(termo) {
        if (!termo.trim()) {
            this.dadosFiltrados = [...this.dados];
        } else {
            const termoLower = termo.toLowerCase();
            this.dadosFiltrados = this.dados.filter(item => {
                return (
                    (item['Nome do Aluno'] && item['Nome do Aluno'].toLowerCase().includes(termoLower)) ||
                    (item['Forma de Pagamento'] && item['Forma de Pagamento'].toLowerCase().includes(termoLower)) ||
                    (item['Unidade'] && item['Unidade'].toLowerCase().includes(termoLower)) ||
                    (item['Descrição'] && item['Descrição'].toLowerCase().includes(termoLower)) ||
                    // Compatibilidade com formato antigo
                    (item.aluno && item.aluno.toLowerCase().includes(termoLower)) ||
                    (item.formaPagamento && item.formaPagamento.toLowerCase().includes(termoLower)) ||
                    (item.unidade && item.unidade.toLowerCase().includes(termoLower)) ||
                    (item.descricao && item.descricao.toLowerCase().includes(termoLower))
                );
            });
        }
        
        this.renderizarTabela();
        this.calcularEstatisticas();
        this.atualizarEstatisticas();
    }

    renderizarTabela() {
        const tableBody = document.getElementById('tableBody');
        const noDataMessage = document.getElementById('noDataMessage');
        const table = document.getElementById('extratosTable');
        
        if (this.dadosFiltrados.length === 0) {
            table.style.display = 'none';
            noDataMessage.style.display = 'block';
            noDataMessage.innerHTML = `
                <i class="bi bi-inbox"></i>
                <p>Nenhum registro encontrado.</p>
                <small>Tente ajustar os filtros ou verificar a conexão.</small>
            `;
            return;
        }
        
        table.style.display = 'table';
        noDataMessage.style.display = 'none';
        
        // Limpar completamente a tabela antes de renderizar
        tableBody.innerHTML = '';
        
        this.dadosFiltrados.forEach(item => {
            // 🔐 ADMINISTRADOR vs 🔒 USUÁRIO COMUM: Diferentes validações de segurança
            const unidadeItem = item['Unidade'] || item.unidade;
            
            if (this.isAdmin) {
                // 🔐 ADMINISTRADOR: Sem restrições, pode ver todos os registros
                console.log(`🔐 Admin processando registro de: ${unidadeItem}`);
            } else if (this.unidadeDoLogin && unidadeItem) {
                // 🔒 USUÁRIO COMUM: 🔍 VERIFICAÇÃO INTELIGENTE por palavra-chave
                const pertenceAUnidade = this.verificarCorrespondenciaUnidade(unidadeItem, this.unidadeDoLogin);
                
                if (!pertenceAUnidade) {
                    console.log(`🚫 Registro bloqueado - Unidade: ${unidadeItem} não corresponde a: ${this.unidadeDoLogin}`);
                    return; // Pular registros de outras unidades
                }
            }
            
            const row = document.createElement('tr');
            row.className = 'fade-in';
            
            // Usar campos da API ou campos antigos para compatibilidade
            const data = item['Data de Pagamento'] || item.data;
            const aluno = item['Nome do Aluno'] || item.aluno;
            const formaPagamento = item['Forma de Pagamento'] || item.formaPagamento;
            const valor = item['Valor'] || item.valor;
            const unidade = item['Unidade'] || item.unidade;
            const descricao = item['Descrição'] || item.descricao;
            
            row.innerHTML = `
                <td>${this.formatarData(data)}</td>
                <td>${aluno || '-'}</td>
                <td>${formaPagamento || '-'}</td>
                <td class="valor-cell">${this.formatarValor(valor)}</td>
                <td>${unidade || '-'}</td>
                <td>${descricao || '-'}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    calcularEstatisticas() {
        // Se já temos estatísticas da API e não estamos filtrando localmente, usar elas
        if (this.estatisticas && this.dadosFiltrados.length === this.dados.length) {
            return;
        }

        // Calcular estatísticas localmente (para buscas ou filtros locais)
        const valores = this.dadosFiltrados.map(item => 
            this.extrairValorNumerico(item['Valor'] || item.valor || item['ValorNumerico'])
        );
        const valoresValidos = valores.filter(v => !isNaN(v) && v !== null);
        
        this.estatisticas = {
            totalRegistros: this.dadosFiltrados.length,
            valorTotal: valoresValidos.reduce((sum, val) => sum + val, 0),
            valorMedio: valoresValidos.length > 0 ? valoresValidos.reduce((sum, val) => sum + val, 0) / valoresValidos.length : 0
        };
    }

    atualizarEstatisticas() {
        if (!this.estatisticas) {
            this.calcularEstatisticas();
        }
        
        document.getElementById('totalRecords').textContent = this.estatisticas.totalRegistros.toLocaleString('pt-BR');
        document.getElementById('totalValue').textContent = this.formatarMoeda(this.estatisticas.valorTotal);
        document.getElementById('averageValue').textContent = this.formatarMoeda(this.estatisticas.valorMedio);
    }

    atualizarInfoPeriodo() {
        const periodoInfo = document.getElementById('periodoInfo');
        let texto = 'Todos os dados';
        
        if (this.filtros.dataInicio && this.filtros.dataFim) {
            const inicio = new Date(this.filtros.dataInicio).toLocaleDateString('pt-BR');
            const fim = new Date(this.filtros.dataFim).toLocaleDateString('pt-BR');
            texto = `${inicio} - ${fim}`;
        } else if (this.filtros.dataInicio) {
            const inicio = new Date(this.filtros.dataInicio).toLocaleDateString('pt-BR');
            texto = `A partir de ${inicio}`;
        } else if (this.filtros.dataFim) {
            const fim = new Date(this.filtros.dataFim).toLocaleDateString('pt-BR');
            texto = `Até ${fim}`;
        } else if (this.filtros.competencia) {
            const [ano, mes] = this.filtros.competencia.split('-');
            const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
            texto = data.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
        }
        
        if (this.filtros.unidade !== 'todas') {
            texto += ` - ${this.formatarNomeUnidade(this.filtros.unidade)}`;
        }
        
        // 🔐 Adicionar indicação de acesso administrativo ou segurança por unidade
        if (this.isAdmin) {
            texto += ` 🔐 (Admin)`;
        } else if (this.unidadeDoLogin) {
            texto += ` 🔒`;
        }
        
        periodoInfo.textContent = texto;
    }

    formatarData(data) {
        if (!data) return '-';
        
        // Se já está no formato ISO (YYYY-MM-DD), converter diretamente
        if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [ano, mes, dia] = data.split('-');
            return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia)).toLocaleDateString('pt-BR');
        }
        
        // Tentar parser para outros formatos
        const dataObj = this.parseData(data);
        return dataObj ? dataObj.toLocaleDateString('pt-BR') : String(data);
    }

    parseData(dataStr) {
        if (!dataStr) return null;
        
        // Tentar diferentes formatos de data
        const formatos = [
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
        ];
        
        for (const formato of formatos) {
            const match = String(dataStr).match(formato);
            if (match) {
                let dia, mes, ano;
                if (formato === formatos[1]) { // YYYY-MM-DD
                    [, ano, mes, dia] = match;
                } else { // DD/MM/YYYY ou DD-MM-YYYY
                    [, dia, mes, ano] = match;
                }
                return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
            }
        }
        
        return null;
    }

    formatarValor(valor) {
        const numerico = this.extrairValorNumerico(valor);
        return isNaN(numerico) ? String(valor || '-') : this.formatarMoeda(numerico);
    }

    extrairValorNumerico(valor) {
        if (typeof valor === 'number') return valor;
        if (!valor) return 0;
        
        const str = String(valor).replace(/[^\d,-]/g, '').replace(',', '.');
        return parseFloat(str) || 0;
    }

    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    showMessage(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Funcionalidade de navegação entre abas
function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = button.dataset.tab;

            // Update active states
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show target tab
            tabContents.forEach(tab => tab.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');
            
            // Ajustar layout do container para aba de extratos ou gestão de usuários
            const mainContainer = document.querySelector('.main-container');
            if (targetTab === 'statementTab' || targetTab === 'userManagementTab') {
                mainContainer.style.maxWidth = '95vw';
                mainContainer.style.width = '95vw';
                
                // Se for a aba de extratos, inicializar se necessário
                if (targetTab === 'statementTab' && !window.extratoManager) {
                    window.extratoManager = new ExtratoManager();
                }
            } else {
                mainContainer.style.maxWidth = '800px';
                mainContainer.style.width = '';
            }

            // Reconfigurar campos de unidade quando trocar de aba (garantir que permaneçam travados)
            const selectedUnit = localStorage.getItem('selectedUnit');
            if (selectedUnit) {
                setTimeout(() => {
                    // Reconfigurar campos relevantes baseado na aba ativa
                    if (targetTab === 'paymentTab') {
                        const paymentUnit = document.getElementById('paymentUnit');
                        const isAdmin = localStorage.getItem('isAdmin') === 'true';
                        if (paymentUnit && !isAdmin) {
                            paymentUnit.value = selectedUnit;
                            paymentUnit.disabled = true;
                            paymentUnit.style.backgroundColor = '#f8f9fa';
                            paymentUnit.style.color = '#6c757d';
                            paymentUnit.style.cursor = 'not-allowed';
                        } else if (paymentUnit && isAdmin) {
                            paymentUnit.disabled = false;
                            paymentUnit.style.backgroundColor = '';
                            paymentUnit.style.color = '';
                            paymentUnit.style.cursor = '';
                        }
                    } else if (targetTab === 'chargeTab') {
                        const branch = document.getElementById('branch');
                        if (branch && !branch.disabled) {
                            branch.value = selectedUnit;
                            branch.disabled = true;
                            branch.style.backgroundColor = '#f8f9fa';
                            branch.style.color = '#6c757d';
                            branch.style.cursor = 'not-allowed';
                        }
                    }
                }, 100);
            }
        });
    });

    // Exibir abas/menus conforme permissões do usuário
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userPermissions = currentUser.permissions || [];
    // Mapear abas e permissões
    const tabPermissionMap = {
        'paymentTab': 'cadastrar_contas',
        'chargeTab': 'registrar_cobranca',
        'statementTab': 'consultar_extratos',
        'messageTab': 'enviar_mensagens',
        'userManagementTab': 'gerenciar_usuarios'
    };
    document.querySelectorAll('.nav-button').forEach(btn => {
        const tab = btn.dataset.tab;
        if (!tab) return;
        if (isAdmin || tab === 'messageTab') {
            btn.style.display = '';
        } else if (tabPermissionMap[tab] && userPermissions.includes(tabPermissionMap[tab])) {
            btn.style.display = '';
        } else if (tab === 'userManagementTab' && isAdmin) {
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
        }
    });
}

// 🔐 CONFIGURAR GESTÃO DE USUÁRIOS
async function setupUserManagement() {
    console.log('🔐 Configurando gestão de usuários...');
    
    // Formulário de cadastro de usuário
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(userForm);
            const permissions = [];
            
            // Coletar permissões selecionadas
            document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
                permissions.push(checkbox.value);
            });
            
            const userData = {
                email: document.getElementById('userEmail').value,
                name: document.getElementById('userName').value,
                unit: document.getElementById('userUnit').value,
                role: document.getElementById('userRole').value,
                permissions: permissions,
                password: document.getElementById('userPassword').value
            };
            
            const result = await userManager.createUser(userData);
            
            if (result.success) {
                showToast('Usuário cadastrado com sucesso!', 'success');
                userForm.reset();
                await loadUsersTable();
            } else {
                showToast(result.message, 'error');
            }
        });
    }
    
    // Botão limpar formulário
    const clearUserForm = document.getElementById('clearUserForm');
    if (clearUserForm) {
        clearUserForm.addEventListener('click', function() {
            document.getElementById('userForm').reset();
        });
    }
    
    // Botão atualizar lista de usuários
    const refreshUsersBtn = document.getElementById('refreshUsersBtn');
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', loadUsersTable);
    }
    
    // Campo de busca de usuários
    const usersSearchInput = document.getElementById('usersSearchInput');
    if (usersSearchInput) {
        usersSearchInput.addEventListener('input', async function() {
            const query = this.value;
            const users = await userManager.searchUsers(query);
            renderUsersTable(users);
        });
    }
    
    // Carregar tabela inicial
    await loadUsersTable();
}

// Carregar e exibir tabela de usuários
async function loadUsersTable() {
    const users = await userManager.getAllUsers();
    renderUsersTable(users);
}

// Renderizar tabela de usuários
function renderUsersTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    const noUsersMessage = document.getElementById('noUsersMessage');
    const usersTable = document.getElementById('usersTable');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (users.length === 0) {
        usersTable.style.display = 'none';
        noUsersMessage.style.display = 'block';
        return;
    }
    
    usersTable.style.display = 'table';
    noUsersMessage.style.display = 'none';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        const statusBadge = user.status === 'active' 
            ? '<span class="user-status-badge user-status-active">Ativo</span>'
            : '<span class="user-status-badge user-status-inactive">Inativo</span>';
            
        const lastAccess = user.lastAccess 
            ? new Date(user.lastAccess).toLocaleDateString('pt-BR')
            : 'Nunca';
            
        const unitName = userManager.formatUnitName(user.unit);
        const roleName = formatRoleName(user.role);
        
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${unitName}</td>
            <td>${roleName}</td>
            <td>${statusBadge}</td>
            <td>${lastAccess}</td>
            <td>
                <div class="user-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="editUser('${user.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="resetUserPassword('${user.id}')">
                        <i class="bi bi-key"></i>
                    </button>
                    ${user.status === 'active' 
                        ? `<button class="btn btn-sm btn-outline-danger" onclick="deactivateUser('${user.id}')">
                             <i class="bi bi-person-x"></i>
                           </button>`
                        : `<button class="btn btn-sm btn-outline-success" onclick="activateUser('${user.id}')">
                             <i class="bi bi-person-check"></i>
                           </button>`
                    }
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Formatar nome da função/cargo
function formatRoleName(role) {
    const roleNames = {
        'administrador': 'Administrador Geral',
        'gerente': 'Gerente de Unidade',
        'operador': 'Operador',
        'financeiro': 'Financeiro',
        'atendimento': 'Atendimento'
    };
    return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

// Funções de ação dos usuários
async function editUser(userId) {
    // TODO: Implementar modal de edição
    showToast('Funcionalidade de edição em desenvolvimento', 'info');
}

async function resetUserPassword(userId) {
    if (confirm('Deseja redefinir a senha deste usuário?')) {
        const newPassword = prompt('Digite a nova senha temporária:');
        if (newPassword) {
            const result = await userManager.updateUser(userId, { password: newPassword });
            if (result.success) {
                showToast('Senha redefinida com sucesso!', 'success');
            } else {
                showToast(result.message, 'error');
            }
        }
    }
}

async function deactivateUser(userId) {
    if (confirm('Deseja desativar este usuário?')) {
        const result = await userManager.deactivateUser(userId);
        if (result.success) {
            showToast('Usuário desativado com sucesso!', 'success');
            await loadUsersTable();
        } else {
            showToast(result.message, 'error');
        }
    }
}

async function activateUser(userId) {
    if (confirm('Deseja ativar este usuário?')) {
        const result = await userManager.activateUser(userId);
        if (result.success) {
            showToast('Usuário ativado com sucesso!', 'success');
            await loadUsersTable();
        } else {
            showToast(result.message, 'error');
        }
    }
}

// Função para mostrar toast notifications
function showToast(message, type = 'info') {
    // Criar elemento de toast
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '300px';
    
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Funcionalidade original do sistema (templates, etc.)
function setupOriginalSystem() {
    if (!localStorage.getItem('isLoggedIn') || !localStorage.getItem('currentUser')) {
        window.location = 'login.html';
        return;
    }
    // 🔐 ADMINISTRADOR vs 🔒 USUÁRIO COMUM: Configurar sistema baseado no tipo de acesso
    const selectedUnit = localStorage.getItem('selectedUnit');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (isAdmin) {
        // 🔐 ADMINISTRADOR: Acesso total - não aplicar restrições
        console.log('🔐 ADMINISTRADOR detectado no sistema principal');
        console.log('🌟 Configuração de ACESSO TOTAL - sem restrições de unidade');
        
        // Mostrar mensagem de administrador
        const adminIndicator = document.createElement('div');
        adminIndicator.id = 'admin-indicator';
        adminIndicator.innerHTML = `
            <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 8px 16px; border-radius: 6px; text-align: center; margin-bottom: 20px; font-weight: 500; box-shadow: 0 2px 8px rgba(220,53,69,0.3);">
                🔐 MODO ADMINISTRADOR ATIVO - Acesso Total a Todas as Unidades
            </div>
        `;
        
        // Inserir indicador após o logo
        const logoContainer = document.querySelector('.logo-container');
        if (logoContainer) {
            logoContainer.parentNode.insertBefore(adminIndicator, logoContainer.nextSibling);
        }
        
        // Garantir que o campo de unidade do pagamento esteja habilitado para admin
        const paymentUnit = document.getElementById('paymentUnit');
        if (paymentUnit) {
            paymentUnit.disabled = false;
            paymentUnit.style.backgroundColor = '';
            paymentUnit.style.color = '';
            paymentUnit.style.cursor = '';
            // Remover indicador de campo travado, se existir
            const parentDiv = paymentUnit.parentElement;
            if (parentDiv) {
                const lockedIndicator = parentDiv.querySelector('.unit-locked-indicator');
                if (lockedIndicator) lockedIndicator.remove();
            }
        }
    } else if (selectedUnit) {
        // 🔒 USUÁRIO COMUM: Aplicar restrições de unidade
        console.log(`🔒 Sistema configurado para a unidade: ${selectedUnit.toUpperCase()}`);
        console.log('📌 TODOS os campos de unidade foram travados automaticamente baseados no seu login.');
        console.log('🛡️ Segurança ativada: Usuário só pode acessar dados da própria unidade.');
        
        // Função para configurar e travar campos de unidade
        function configureUnitField(elementId, shouldDisable = true) {
            const element = document.getElementById(elementId);
            if (element) {
                element.value = selectedUnit;
                if (shouldDisable) {
                    element.disabled = true;
                    // Adicionar estilo visual para indicar que está travado
                    element.style.backgroundColor = '#f8f9fa';
                    element.style.color = '#6c757d';
                    element.style.cursor = 'not-allowed';
                    
                    // Adicionar um ícone ou texto indicativo
                    const parentDiv = element.parentElement;
                    if (parentDiv && !parentDiv.querySelector('.unit-locked-indicator')) {
                        const indicator = document.createElement('small');
                        indicator.className = 'unit-locked-indicator text-muted mt-1';
                        indicator.innerHTML = `<i class="bi bi-lock-fill"></i> Travado pela unidade do login: <strong>${formatUnitName(selectedUnit)}</strong>`;
                        indicator.style.display = 'block';
                        indicator.style.fontSize = '0.85em';
                        indicator.style.color = '#6c757d';
                        parentDiv.appendChild(indicator);
                    }
                }
                console.log(`✅ Campo ${elementId} configurado com a unidade: ${selectedUnit}`);
            }
        }

        // Função para formatar nome da unidade
        function formatUnitName(unitValue) {
            const unitNames = {
                'vila helena': 'Vila Helena',
                'vila progresso': 'Vila Progresso',
                'aparecidinha': 'Aparecidinha',
                'julio de mesquita': 'Julio de Mesquita',
                'vila haro': 'Vila Haro',
                'coop': 'Coop'
            };
            return unitNames[unitValue] || unitValue.charAt(0).toUpperCase() + unitValue.slice(1);
        }

        // Configurar todos os campos de unidade apenas para usuários comuns
        configureUnitField('branch', true);           // Aba "Registrar Cobrança"
        
        // Para o campo de extratos, apenas aguardar inicialização
        // O ExtratoManager agora gerencia automaticamente a unidade
    }
    
    // 🔐 GESTÃO DE USUÁRIOS: Configurar aba de gestão (apenas para admins)
    if (isAdmin) {
        // Mostrar aba de gestão de usuários
        const userManagementNavBtn = document.getElementById('userManagementNavBtn');
        if (userManagementNavBtn) {
            userManagementNavBtn.style.display = 'block';
        }
        
        // Inicializar UserManager
        if (!userManager) {
            userManager = new UserManager();
        }
        
        // Configurar funcionalidades da gestão de usuários
        setupUserManagement();
    }
    
    // Configurar templates de mensagem
    const templates = {
        'boas-vindas': [
            {
                id: 'boas-vindas-1',
                title: 'Boas-vindas',
                text: `Bem-vindo(a) à Autoescola Ideal {{primeiro nome}}!
É uma alegria ter você como nosso aluno! A partir de agora, começa sua jornada rumo à conquista da CNH com uma equipe pronta para te orientar em todas as etapas.

📲 Acompanhe tudo pelo app "Minha Habilitação". Nele, você acessa agendamentos, exames, andamento do processo e pendências.

Seu acesso é o CPF e a senha padrão 123456.

🩺 Agende seus exames obrigatórios o quanto antes! Quanto mais rápido realizar, mais cedo poderá avançar.

📍Caso tenha dúvidas, nossa equipe está à disposição para te ajudar!

👩‍🏫 Conte com a equipe Ideal para uma experiência prática, tranquila e de qualidade em cada etapa.

💙 Seja muito bem-vindo(a) mais uma vez — você está em boas mãos!`
            }
        ],
        'recado-importante': [
            {
                id: 'recado-importante-1',
                title: 'Recado Importante',
                text: `Temos um recado importante pra você!

Olá {{primeiro nome}}! Nossa equipe precisa falar com você sobre o seu processo na Autoescola Ideal.

Para conseguirmos dar continuidade no atendimento, precisamos que selecione o botão abaixo. É rapidinho! 😊

Clique para ativar a conversa!`
            }
        ]
    };
    
    // Configurar formulário de mensagens
    const messageTypeSelect = document.getElementById('messageType');
    const templateSection = document.getElementById('templateSection');
    const templateOptions = templateSection?.querySelector('.template-options');
    const fullNameInput = document.getElementById('fullName');
    
    if (messageTypeSelect && templateSection && fullNameInput) {
        function getFirstName(fullName) {
            const first = (fullName || '').split(' ')[0] || '';
            return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
        }

        function showTemplates(type, firstName) {
            if (!templateOptions) return;
            templateOptions.innerHTML = '';
            if (!type || !templates[type]) {
                templateSection.style.display = 'none';
                return;
            }
            templates[type].forEach(template => {
                const contentWithName = template.text.replace(/{{primeiro nome}}/g, firstName).replace(/\n/g, '<br>');
                const card = document.createElement('div');
                card.className = 'template-card';
                card.innerHTML = `
                    <input type="radio" name="template" id="${template.id}" value="${template.id}" required>
                    <div class="template-content">
                        <h6>${template.title}</h6>
                        <p>${contentWithName}</p>
                    </div>
                `;
                card.addEventListener('click', function() {
                    const radio = this.querySelector('input[type="radio"]');
                    radio.checked = true;
                    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                });
                templateOptions.appendChild(card);
            });
            const firstCard = templateOptions.querySelector('.template-card');
            if (firstCard) {
                firstCard.classList.add('selected');
                firstCard.querySelector('input[type="radio"]').checked = true;
            }
            templateSection.style.display = 'block';
        }

        messageTypeSelect.addEventListener('change', function() {
            showTemplates(this.value, getFirstName(fullNameInput.value));
        });

        fullNameInput.addEventListener('input', function() {
            if (messageTypeSelect.value) {
                showTemplates(messageTypeSelect.value, getFirstName(this.value));
            }
        });
    }
    
    // Configurar formulários de pagamento
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        const paymentTypeRadios = paymentForm.querySelectorAll('input[name="paymentType"]');
        const pixFields = document.getElementById('pixFields');
        const boletoFields = document.getElementById('boletoFields');
        const paymentUnitSelect = document.getElementById('paymentUnit');

        // Configurar campo de unidade para admin
        if (isAdmin) {
            paymentUnitSelect.disabled = false;
        } else {
            paymentUnitSelect.value = currentUser.unit;
            paymentUnitSelect.disabled = true;
        }

        function togglePaymentFields() {
            const selected = paymentForm.querySelector('input[name="paymentType"]:checked');
            if (selected && selected.value === 'pix') {
                pixFields.style.display = 'block';
                boletoFields.style.display = 'none';
                pixFields.querySelectorAll('input,select').forEach(el => el.required = true);
                boletoFields.querySelectorAll('input,select').forEach(el => el.required = false);
            } else if (selected && selected.value === 'boleto') {
                pixFields.style.display = 'none';
                boletoFields.style.display = 'block';
                pixFields.querySelectorAll('input,select').forEach(el => el.required = false);
                boletoFields.querySelectorAll('input,select').forEach(el => el.required = true);
            } else {
                pixFields.style.display = 'none';
                boletoFields.style.display = 'none';
                pixFields.querySelectorAll('input,select').forEach(el => el.required = false);
                boletoFields.querySelectorAll('input,select').forEach(el => el.required = false);
            }
        }

        paymentTypeRadios.forEach(radio => {
            radio.addEventListener('change', togglePaymentFields);
        });

        paymentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const selectedType = paymentForm.querySelector('input[name="paymentType"]:checked').value;
            const unidade = paymentUnitSelect.value;
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const usuario = currentUser.login || '';

            let payload = {
                tipo: selectedType,
                unidade,
                usuario,
            };

            if (selectedType === 'pix') {
                let tipoChave = document.getElementById('pixKeyType').value;
                let chavePix = document.getElementById('pixKey').value;
                if (tipoChave === 'celular') {
                    // Validação do formato (DDD)XXXXX-XXXX
                    const celularPattern = /^\(\d{2}\)\d{5}-\d{4}$/;
                    if (!celularPattern.test(chavePix)) {
                        showToast('Digite o celular no formato (DDD)XXXXX-XXXX', 'error');
                        btn.disabled = false;
                        if (spinner) spinner.classList.add('d-none');
                        return;
                    }
                    // Extrair apenas números e adicionar +55
                    let celularNumeros = chavePix.replace(/\D/g, '');
                    chavePix = '+55' + celularNumeros;
                } else if (tipoChave === 'cpf') {
                    // Validar CPF: 11 dígitos
                    let cpfNumeros = chavePix.replace(/\D/g, '').slice(0, 11);
                    if (cpfNumeros.length !== 11) {
                        showToast('Digite um CPF válido (11 dígitos)', 'error');
                        btn.disabled = false;
                        if (spinner) spinner.classList.add('d-none');
                        return;
                    }
                    chavePix = cpfNumeros;
                } else if (tipoChave === 'cnpj') {
                    // Validar CNPJ: 14 dígitos
                    let cnpjNumeros = chavePix.replace(/\D/g, '').slice(0, 14);
                    if (cnpjNumeros.length !== 14) {
                        showToast('Digite um CNPJ válido (14 dígitos)', 'error');
                        btn.disabled = false;
                        if (spinner) spinner.classList.add('d-none');
                        return;
                    }
                    chavePix = cnpjNumeros;
                }
                let favorecido = document.getElementById('favorecidoPix').value.toUpperCase();
                let valor = parseFloat(document.getElementById('valorPix').value).toFixed(2);
                payload = {
                    tipo: 'pix',
                    tipoChave,
                    chavePix,
                    favorecido,
                    cpfCnpj: document.getElementById('cpfCnpjFavorecidoPix').value.replace(/\D/g, ''),
                    valor,
                    vencimento: document.getElementById('vencimentoPix').value,
                    descricao: document.getElementById('descricaoPix').value,
                    unidade,
                    usuario
                };
            } else {
                payload = {
                    ...payload,
                    codigoBarras: document.getElementById('codigoBarrasBoleto').value.replace(/\D/g, ''),
                    valor: document.getElementById('valorBoleto').value,
                    dataPagamento: document.getElementById('dataPagamentoBoleto').value,
                    descricao: document.getElementById('descricaoBoleto').value
                };
            }

            // Desabilitar botão e mostrar loading
            const btn = paymentForm.querySelector('button[type="submit"]');
            const spinner = btn.querySelector('.spinner-border');
            btn.disabled = true;
            if (spinner) spinner.classList.remove('d-none');

            try {
                const response = await fetch('https://hook.us2.make.com/vvxwshprzsw06ba5z9kdu490ha47gmcy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    showToast('Enviado com sucesso!', 'success');
                    paymentForm.reset();
                    togglePaymentFields();
                } else {
                    showToast('Falha ao enviar. Tente novamente.', 'error');
                }
            } catch (err) {
                showToast('Falha ao enviar. Verifique sua conexão.', 'error');
            } finally {
                btn.disabled = false;
                if (spinner) spinner.classList.add('d-none');
            }
        });
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.clear();
            window.location = 'login.html';
        });
    }

    // Envio de mensagem para o webhook Make.com
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const whatsapp = document.getElementById('whatsapp').value;
            let templateId = '';
            const templateRadio = document.querySelector('input[name="template"]:checked');
            if (templateRadio) templateId = templateRadio.value;

            // Pegar usuário logado
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const unidade = currentUser.unit || '';
            const usuario = currentUser.login || '';

            // Extrair firstName do nome completo preenchido
            let firstName = fullName.split(' ')[0] || '';
            firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

            // Montar payload
            const payload = {
                firstName,
                whatsapp,
                templateId,
                unidade,
                usuario
            };

            // Desabilitar botão e mostrar loading
            const btn = messageForm.querySelector('button[type="submit"]');
            const spinner = btn.querySelector('.spinner-border');
            btn.disabled = true;
            if (spinner) spinner.classList.remove('d-none');

            try {
                const response = await fetch('https://hook.us2.make.com/vvxwshprzsw06ba5z9kdu490ha47gmcy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    showToast('Mensagem enviada com sucesso!', 'success');
                    messageForm.reset();
                } else {
                    showToast('Erro ao enviar mensagem!', 'error');
                }
            } catch (err) {
                showToast('Erro ao enviar mensagem!', 'error');
            } finally {
                btn.disabled = false;
                if (spinner) spinner.classList.add('d-none');
            }
        });
    }

    // Máscara e validação para código de barras do boleto
    const codigoBarrasInput = document.getElementById('codigoBarrasBoleto');
    const codigoBarrasFormatado = document.getElementById('codigoBarrasFormatado');
    if (codigoBarrasInput && codigoBarrasFormatado) {
        codigoBarrasInput.addEventListener('input', function() {
            // Apenas números
            let value = this.value.replace(/\D/g, '').slice(0, 44);
            this.value = value;
            // Formatar
            let formatado = '';
            if (value.length > 0) formatado += value.slice(0, 5) + '.';
            if (value.length > 5) formatado += value.slice(5, 10) + ' ';
            if (value.length > 10) formatado += value.slice(10, 15) + '.';
            if (value.length > 15) formatado += value.slice(15, 20) + ' ';
            if (value.length > 20) formatado += value.slice(20, 25) + '.';
            if (value.length > 25) formatado += value.slice(25, 30) + ' ';
            if (value.length > 30) formatado += value.slice(30, 31) + ' ';
            if (value.length > 31) formatado += value.slice(31);
            codigoBarrasFormatado.textContent = formatado.trim();
        });
        codigoBarrasInput.addEventListener('blur', function() {
            if (this.value.length !== 44) {
                showToast('O código de barras deve conter exatamente 44 números.', 'error');
                this.focus();
            }
        });
    }

    // Máscara automática para chave Pix do tipo celular
    const pixKeyType = document.getElementById('pixKeyType');
    const pixKeyInput = document.getElementById('pixKey');
    if (pixKeyType && pixKeyInput) {
        pixKeyType.addEventListener('change', function() {
            if (this.value === 'celular') {
                pixKeyInput.setAttribute('maxlength', '15');
                pixKeyInput.placeholder = '(11)99999-9999';
            } else if (this.value === 'cpf') {
                pixKeyInput.setAttribute('maxlength', '14');
                pixKeyInput.placeholder = '123.456.789-00';
            } else if (this.value === 'cnpj') {
                pixKeyInput.setAttribute('maxlength', '18');
                pixKeyInput.placeholder = '12.345.678/0001-00';
            } else {
                pixKeyInput.removeAttribute('maxlength');
                pixKeyInput.placeholder = '';
            }
        });
        pixKeyInput.addEventListener('input', function() {
            if (pixKeyType.value === 'celular') {
                let value = this.value.replace(/\D/g, '').slice(0, 11);
                if (value.length > 2 && value.length <= 7) {
                    value = `(${value.slice(0,2)})${value.slice(2)}`;
                } else if (value.length > 7) {
                    value = `(${value.slice(0,2)})${value.slice(2,7)}-${value.slice(7)}`;
                }
                this.value = value;
            } else if (pixKeyType.value === 'cpf') {
                let value = this.value.replace(/\D/g, '').slice(0, 11);
                if (value.length > 9) {
                    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                } else if (value.length > 6) {
                    value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                } else if (value.length > 3) {
                    value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                }
                this.value = value;
            } else if (pixKeyType.value === 'cnpj') {
                let value = this.value.replace(/\D/g, '').slice(0, 14);
                if (value.length > 12) {
                    value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                } else if (value.length > 8) {
                    value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
                } else if (value.length > 5) {
                    value = value.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
                } else if (value.length > 2) {
                    value = value.replace(/(\d{2})(\d{1,3})/, '$1.$2');
                }
                this.value = value;
            }
        });
    }
}

// Inicializar o sistema quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Verificar login
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }
    
    // Configurar navegação entre abas
    setupTabNavigation();
    
    // Configurar funcionalidades originais
    setupOriginalSystem();
    
    // Não inicializar o ExtratoManager automaticamente - será inicializado quando a aba for clicada
});

document.addEventListener('DOMContentLoaded', function() {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (isAdmin) {
        const paymentUnit = document.getElementById('paymentUnit');
        if (paymentUnit) {
            paymentUnit.disabled = false;
            paymentUnit.style.backgroundColor = '';
            paymentUnit.style.color = '';
            paymentUnit.style.cursor = '';
            // Remover indicador de campo travado, se existir
            const parentDiv = paymentUnit.parentElement;
            if (parentDiv) {
                const lockedIndicator = parentDiv.querySelector('.unit-locked-indicator');
                if (lockedIndicator) lockedIndicator.remove();
            }
        }
    }
}); 