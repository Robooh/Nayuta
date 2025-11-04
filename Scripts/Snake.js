document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('snake-score');
    const highScoreElement = document.getElementById('snake-high-score');
    const startButton = document.getElementById('start-button');
    const congratsModal = document.getElementById('congrats-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const finalScoreMessage = document.getElementById('final-score-message');
    
    // Configurações do Jogo
    const GRID_SIZE = 20; // 20x20 células
    const TILE_SIZE = 10; // Tamanho em pixels de cada célula (ajuste no CSS/Board size)
    const WINNING_SCORE = 200;
    
    let snake = [{ x: 10, y: 10 }]; // Posição inicial da cobra
    let food = {};
    let dx = 1; // Direção X inicial (direita)
    let dy = 0; // Direção Y inicial
    let score = 0;
    let highScore = localStorage.getItem('snakeHighScore') ? parseInt(localStorage.getItem('snakeHighScore')) : 0;
    let gameInterval;
    let gameSpeed = 150; // Velocidade inicial (ms)
    let isGameRunning = false;

    highScoreElement.textContent = highScore;
    
    // Estiliza o tabuleiro para ter 20x20
    gameBoard.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;
    gameBoard.style.width = `${GRID_SIZE * TILE_SIZE}px`;
    gameBoard.style.height = `${GRID_SIZE * TILE_SIZE}px`;

    // Função para sortear a posição da comida
    function generateFood() {
        food = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        // Garante que a comida não apareça no corpo da cobra
        while (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
            food = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
        }
    }

    // Renderiza o tabuleiro no HTML
    function drawGame() {
        gameBoard.innerHTML = ''; // Limpa o tabuleiro

        // Desenha a cobra
        snake.forEach(segment => {
            const snakeElement = document.createElement('div');
            snakeElement.style.gridColumnStart = segment.x + 1;
            snakeElement.style.gridRowStart = segment.y + 1;
            snakeElement.classList.add('snake');
            gameBoard.appendChild(snakeElement);
        });

        // Desenha a comida
        const foodElement = document.createElement('div');
        foodElement.style.gridColumnStart = food.x + 1;
        foodElement.style.gridRowStart = food.y + 1;
        foodElement.classList.add('food');
        gameBoard.appendChild(foodElement);

        scoreElement.textContent = score;
    }

    // Lógica principal do jogo
    function moveSnake() {
        // Nova cabeça da cobra
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };

        // Insere a nova cabeça no início
        snake.unshift(head);

        // Verifica colisão com a parede ou consigo mesma
        if (checkCollision(head)) {
            gameOver();
            return;
        }

        // Verifica se comeu a comida
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            // Aumenta a velocidade
            gameSpeed = Math.max(50, gameSpeed - 5); 
            clearInterval(gameInterval);
            gameInterval = setInterval(moveSnake, gameSpeed);

            if (score >= WINNING_SCORE) {
                showCongratsModal();
            }

            generateFood(); // Gera nova comida
        } else {
            // Remove a cauda se não comeu a comida
            snake.pop();
        }

        drawGame();
    }

    function checkCollision(head) {
        // Colisão com a parede
        const wallCollision = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;

        // Colisão consigo mesma (começa a verificar a partir do 2º segmento)
        const selfCollision = snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);

        return wallCollision || selfCollision;
    }

    function gameOver() {
        clearInterval(gameInterval);
        isGameRunning = false;
        startButton.textContent = 'Restart Game';
        
        // Atualiza o High Score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            highScoreElement.textContent = highScore;
        }

        // Alerta simples para Game Over se o score for menor que o de vitória
        if (score < WINNING_SCORE) {
            alert(`Game Over! Seu Score: ${score}. Pressione Restart para jogar de novo.`);
        }
    }

    // Função para lidar com a mudança de direção
    function changeDirection(event) {
        if (!isGameRunning) return;

        const keyPressed = event.key;
        const goingUp = dy === -1;
        const goingDown = dy === 1;
        const goingLeft = dx === -1;
        const goingRight = dx === 1;

        switch (keyPressed) {
            case 'ArrowUp':
            case 'w':
                if (!goingDown) { dx = 0; dy = -1; }
                break;
            case 'ArrowDown':
            case 's':
                if (!goingUp) { dx = 0; dy = 1; }
                break;
            case 'ArrowLeft':
            case 'a':
                if (!goingRight) { dx = -1; dy = 0; }
                break;
            case 'ArrowRight':
            case 'd':
                if (!goingLeft) { dx = 1; dy = 0; }
                break;
        }
    }
    

    function startGame() {
        if (isGameRunning) return;

        
        snake = [{ x: 10, y: 10 }];
        dx = 1; 
        dy = 0;
        score = 0;
        gameSpeed = 150;
        isGameRunning = true;
        startButton.textContent = 'Playing...';
        
        generateFood();
        drawGame();

     
        gameInterval = setInterval(moveSnake, gameSpeed);
    }
    
  
    function showCongratsModal() {
        gameOver(); 
        finalScoreMessage.textContent = `Você alcançou um score de ${score} pontos!`;
        congratsModal.setAttribute('aria-hidden', 'false');
    }
    
 
    function hideCongratsModal() {
        congratsModal.setAttribute('aria-hidden', 'true');
    }
    
    // Event Listeners
    startButton.addEventListener('click', startGame);
    document.addEventListener('keydown', changeDirection);
    closeModalBtn.addEventListener('click', hideCongratsModal);


    generateFood();
    drawGame();
});