document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const button = document.querySelector('button[type="submit"]');
    
    // Desabilitar o botão durante o processo de login
    button.disabled = true;
    button.textContent = 'Entrando...';
    
    // Simular um pequeno delay para melhor UX
    setTimeout(() => {
        // Aqui você pode implementar sua própria lógica de autenticação
        // Por exemplo, verificar contra um banco de dados ou uma API
        
        // Por enquanto, vamos usar um exemplo simples
        if (username === 'admin' && password === 'admin123') {
            // Login bem-sucedido
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            window.location.href = 'index.html';
        } else {
            // Login falhou
            alert('Usuário ou senha incorretos!');
            button.disabled = false;
            button.textContent = 'Entrar';
            document.getElementById('password').value = '';
        }
    }, 1000);
}); 