const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let players = {};

io.on('connection', (socket) => {
    console.log('Новый игрок подключился: ' + socket.id);

    players[socket.id] = {
        x: 400,
        y: 500,
        score: 0 
    };

    io.emit('players', players);

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            io.emit('players', players);
        }
    });

    socket.on('score', () => {
        if (players[socket.id]) {
            players[socket.id].score += 10;
            io.emit('players', players);
        }
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился: ' + socket.id);
        delete players[socket.id];
        io.emit('players', players);
    });

    socket.on('collectRuby', (rubyId) => {
        io.emit('collectRuby', rubyId);
    })

    socket.on('playerWon', (winnerId) => {
        console.log("Игрок ${winnerId} собрал все рубины и победил!");
        io.emit('gameOver', winnerId);
    });
});

server.listen(8000, () => {
    console.log('Сервер запущен на http://localhost:8000');
});