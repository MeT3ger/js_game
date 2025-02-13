const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid'); // Импортируем функцию для генерации UUID

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const melonsCount = 39

app.use(express.static('public'));

let players = {};
let rubies = {}; // Общие рубины для всех игроков
let gameStarted = false; // Флаг для начала игры

io.on('connection', async (socket) => {
    console.log('Новый игрок подключился: ' + socket.id);

    // Генерируем случайный ник для игрока
    const randomNick = `Player_${Math.floor(Math.random() * 1000)}`;
    players[socket.id] = {
        x: 400,
        y: 500,
        score: 0,
        nick: randomNick, // Добавляем ник игрока
    };

    io.emit('players', players);

    // Проверяем, достаточно ли игроков для начала игры
    if (Object.keys(players).length === 2 && !gameStarted) {
        gameStarted = true;
        console.log('Начинаем игру! Генерация рубинов...');
        spawnRubies();
        await sleep(2000); // Пауза на 2 секунды перед отправкой рубинов
        io.emit('rubies', rubies); // Отправляем список рубинов всем игрокам
        io.emit('startCountdown'); // Начинаем обратный отсчет для всех клиентов
        setTimeout(() => {
            io.emit('startGame'); // Разрешаем движение после таймера
        }, 3000); // Длительность таймера (3 секунды)
    }

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            io.emit('players', players);
        }
    });

    socket.on('collectRuby', (rubyId) => {
        if (rubies[rubyId]) {
            delete rubies[rubyId]; // Удаляем рубин
            players[socket.id].score += 10; // Увеличиваем счет игрока

            // Отправляем обновленный список рубинов и игроков
            io.emit('players', players);
            io.emit('rubies', rubies);
    
            // Проверяем, остались ли рубины
            if (Object.keys(rubies).length === 0) {
                const winnerIdByScore = findWinnerByScore(players); // Находим победителя по очкам
                console.log(`Игрок ${winnerIdByScore} победил!`);
    
                // Отправляем разные сообщения игрокам
                io.to(winnerIdByScore).emit('gameOver', 'Поздравляем! Вы победили!');
                for (const playerId in players) {
                    if (playerId !== winnerIdByScore) {
                        io.to(playerId).emit('gameOver', 'Нерасстраивайтесь, получится в следующий раз!');
                    }
                }
            } else {
                // Отправляем обновленный список рубинов и игроков
                io.emit('players', players);
                io.emit('rubies', rubies);
            }
        }
    });
    
    // Функция для определения победителя по очкам
    function findWinnerByScore(players) {
        let winnerId = null;
        let maxScore = -Infinity;
        for (const playerId in players) {
            if (players[playerId].score > maxScore) {
                maxScore = players[playerId].score;
                winnerId = playerId;
            }
        }
        return winnerId;
    }

    socket.on('disconnect', () => {
        console.log('Игрок отключился: ' + socket.id);
        delete players[socket.id];
        io.emit('players', players);
        if (Object.keys(players).length < 2) {
            gameStarted = false;
            rubies = {}; // Очищаем рубины
            io.emit('rubies', rubies); // Уведомляем клиентов об очистке рубинов
        }
    });
});

function spawnRubies() {
    for (let i = 0; i < melonsCount; i++) {
        const rubyId = uuidv4(); // Генерируем уникальный ID для рубина
        rubies[rubyId] = {
            id: rubyId,
            x: Math.floor(Math.random() * (750 - 50 + 1)) + 50, // Случайная позиция по X
            y: Math.floor(Math.random() * (400 - 50 + 1)) + 50, // Случайная позиция по Y
        };
    }
    console.log('Сгенерированные рубины:', rubies);
}

server.listen(8002, () => {
    console.log('Сервер запущен на http://localhost:8001');
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
