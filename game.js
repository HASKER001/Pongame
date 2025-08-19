// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCyv37u1wb0QchugnlLrTroa0WSI5jIo_E",
    authDomain: "pongame-46b19.firebaseapp.com",
    databaseURL: "https://pongame-46b19-default-rtdb.firebaseio.com",
    projectId: "pongame-46b19",
    storageBucket: "pongame-46b19.firebasestorage.app",
    messagingSenderId: "555550060206",
    appId: "1:555550060206:web:b6d5f9e23837da6972c73f"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Переменные игры
let canvas, ctx, playerY, opponentY, ballX, ballY;
let gameId, playerRole, gameActive = false;
let ballSpeedX = 5; // Скорость мяча по X
let ballSpeedY = 3; // Скорость мяча по Y
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
    opponentY = canvas.height / 2 - PADDLE_HEIGHT / 2;
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;

    // Обработка касаний
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;
        if (gameActive) {
            playerY = touchY - PADDLE_HEIGHT / 2;
            if (playerY < 0) playerY = 0;
            if (playerY > canvas.height - PADDLE_HEIGHT) playerY = canvas.height - PADDLE_HEIGHT;
            updatePlayerPosition();
        }
    });

    // Запускаем игровой цикл и движение мяча
    gameLoop();
    if (playerRole === 'player1') {
        setInterval(moveBall, 1000/60); // 60 FPS - двигаем мяч только у создателя игры
    }
}

// Генерируем ID игры
function generateId() {
    return Math.random().toString(36).substring(2, 8);
}

// Создать игру
function createGame() {
    gameId = generateId();
    playerRole = 'player1';
    document.getElementById('gameIdInput').value = gameId;
    
    const gameRef = database.ref('games/' + gameId);
    gameRef.set({
        player1: { y: playerY, score: 0 },
        player2: { y: opponentY, score: 0 },
        ball: { x: ballX, y: ballY },
        state: 'waiting'
    }).then(() => {
        listenToGame();
        gameActive = true;
        alert('Игра создана! ID: ' + gameId);
        // Запускаем движение мяча только у создателя игры
        setInterval(moveBall, 1000/60);
    }).catch((error) => {
        alert('Ошибка создания: ' + error.message);
    });
}

// Присоединиться к игре
function joinGame() {
    gameId = document.getElementById('gameIdInput').value;
    if (!gameId) {
        alert('Введите ID игры!');
        return;
    }
    
    playerRole = 'player2';
    const gameRef = database.ref('games/' + gameId);
    
    gameRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const updates = {
                'state': 'playing',
                'player2': { y: canvas.height / 2, score: 0 }
            };
            
            gameRef.update(updates).then(() => {
                listenToGame();
                gameActive = true;
                alert('Присоединились к игре ' + gameId);
            }).catch((error) => {
                alert('Ошибка присоединения: ' + error.message);
            });
        } else {
            alert('Игра не найдена!');
        }
    }).catch((error) => {
        alert('Ошибка: ' + error.message);
    });
}

// ДВИЖЕНИЕ МЯЧА (только у player1)
function moveBall() {
    if (playerRole !== 'player1' || !gameActive) return;
    
    // Двигаем мяч
    ballX += ballSpeedX;
    ballY += ballSpeedY;
    
    // Отскок от верхней и нижней стенки
    if (ballY <= BALL_SIZE || ballY >= canvas.height - BALL_SIZE) {
        ballSpeedY = -ballSpeedY;
    }
    
    // Отскок от левой ракетки (player1)
    if (ballX <= 30 + BALL_SIZE && 
        ballY >= playerY && 
        ballY <= playerY + PADDLE_HEIGHT) {
        ballSpeedX = Math.abs(ballSpeedX); // Меняем направление на право
    }
    
    // Отскок от правой ракетки (player2)
    if (ballX >= canvas.width - 30 - BALL_SIZE && 
        ballY >= opponentY && 
        ballY <= opponentY + PADDLE_HEIGHT) {
        ballSpeedX = -Math.abs(ballSpeedX); // Меняем направление на лево
    }
    
    // Гол за player2 (мяч ушел за левую стенку)
    if (ballX <= 0) {
        // TODO: Добавить счет
        resetBall();
    }
    
    // Гол за player1 (мяч ушел за правую стенку)
    if (ballX >= canvas.width) {
        // TODO: Добавить счет
        resetBall();
    }
    
    // Обновляем позицию мяча в Firebase
    updateBallPosition();
}

// Сброс мяча после гола
function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeedX = -ballSpeedX; // Меняем направление
    updateBallPosition();
}

// Обновить позицию мяча в Firebase
function updateBallPosition() {
    if (gameId && playerRole === 'player1') {
        const ballRef = database.ref('games/' + gameId + '/ball');
        ballRef.set({ x: ballX, y: ballY });
    }
}

// Проверить игру
function checkGame() {
    const checkId = document.getElementById('gameIdInput').value || gameId;
    if (!checkId) {
        alert('Введите ID игры');
        return;
    }
    
    const gameRef = database.ref('games/' + checkId);
    gameRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            alert('Игра найдена!\nСтатус: ' + data.state + 
                  '\nPlayer1: ' + JSON.stringify(data.player1) +
                  '\nPlayer2: ' + JSON.stringify(data.player2) +
                  '\nМяч: ' + JSON.stringify(data.ball));
        } else {
            alert('Игра не найдена!');
        }
    }).catch((error) => {
        alert('Ошибка: ' + error.message);
    });
}

// Обновить позицию игрока
function updatePlayerPosition() {
    if (gameId && playerRole) {
        const posRef = database.ref('games/' + gameId + '/' + playerRole + '/y');
        posRef.set(playerY);
    }
}

// Слушать изменения игры
function listenToGame() {
    const gameRef = database.ref('games/' + gameId);
    
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        const opponentRole = playerRole === 'player1' ? 'player2' : 'player1';
        opponentY = data[opponentRole].y;
        ballX = data.ball.x;
        ballY = data.ball.y;
        document.getElementById('score').textContent = 
            `${data.player1.score} : ${data.player2.score}`;
    });
}

// Игровой цикл (только отрисовка)
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Центральная линия
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Ракетки
    ctx.fillStyle = 'white';
    ctx.fillRect(20, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(canvas.width - 30, opponentY, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // Мяч
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_SIZE, 0, Math.PI * 2);
    ctx.fill();
    
    requestAnimationFrame(gameLoop);
}

// Запуск игры
window.onload = init;