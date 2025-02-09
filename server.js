// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// app.use(express.static('public'));

// let players = {};

// io.on('connection', (socket) => {
//     console.log('Новый игрок подключился: ' + socket.id);

//     players[socket.id] = {
//         x: 400,
//         y: 500,
//         score: 0 
//     };

//     io.emit('players', players);

//     socket.on('move', (data) => {
//         if (players[socket.id]) {
//             players[socket.id].x = data.x;
//             players[socket.id].y = data.y;
//             io.emit('players', players);
//         }
//     });

//     socket.on('score', () => {
//         if (players[socket.id]) {
//             players[socket.id].score += 10;
//             io.emit('players', players);
//         }
//     });

//     socket.on('disconnect', () => {
//         console.log('Игрок отключился: ' + socket.id);
//         delete players[socket.id];
//         io.emit('players', players);
//     });

//     socket.on('collectRuby', (rubyId) => {
//         io.emit('collectRuby', rubyId);
//     })

//     socket.on('playerWon', (winnerId) => {
//         console.log("Игрок ${winnerId} собрал все рубины и победил!");
//         io.emit('gameOver', winnerId);
//     });
// });

// server.listen(8000, () => {
//     console.log('Сервер запущен на http://localhost:8000');
// });

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid'); // Импортируем функцию для генерации UUID

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let players = {};
let rubies = {}; // Общие рубины для всех игроков
let gameStarted = false; // Флаг для начала игры

io.on('connection', async (socket) => {
    console.log('Новый игрок подключился: ' + socket.id);
    players[socket.id] = {
        x: 400,
        y: 500,
        score: 0,
    };
    io.emit('players', players);

    console.log(Object.keys(players).length)
    // Проверяем, достаточно ли игроков для начала игры
    if (Object.keys(players).length == 2 && !gameStarted) {
        gameStarted = true;
        console.log('Начинаем игру! Генерация рубинов...');
        spawnRubies();
        await sleep(2000); // Пауза на 2 секунды
        io.emit('rubies', rubies); // Отправляем список рубинов всем игрокам
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
            delete rubies[rubyId];
            players[socket.id].score += 10;
            io.emit('players', players); // Обновляем список игроков
            io.emit('rubies', rubies); // Обновляем список рубинов
        }
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился: ' + socket.id);
        delete players[socket.id];
        io.emit('players', players);

        // Если игроков стало меньше двух, сбрасываем игру
        if (Object.keys(players).length < 2) {
            gameStarted = false;
            rubies = {}; // Очищаем рубины
            io.emit('rubies', rubies); // Уведомляем клиентов об очистке рубинов
        }
    });

    socket.on('playerWon', (winnerId) => {
        console.log(`Игрок ${winnerId} собрал все рубины и победил!`);
        io.emit('gameOver', winnerId);
    });
});

function spawnRubies() {
    for (let i = 0; i < 10; i++) {
        const rubyId = uuidv4(); // Генерируем уникальный ID для рубина
        rubies[rubyId] = {
            id: rubyId,
            x: Math.floor(Math.random() * (750 - 50 + 1)) + 50, // Случайная позиция по X
            y: Math.floor(Math.random() * (550 - 50 + 1)) + 50, // Случайная позиция по Y
        };
    }
    console.log('Сгенерированные рубины:', rubies);
}

server.listen(8000, () => {
    console.log('Сервер запущен на http://localhost:8000');
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
