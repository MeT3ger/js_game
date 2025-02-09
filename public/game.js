const socket = io();
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

let player;
let cursors;
let otherPlayers = {};
let scoreText;
let background;
let rubiesGroup;
let gameStarted = false; // Флаг для блокировки движения

const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'https://labs.phaser.io/assets/sprites/mushroom2.png');
    this.load.image('object', 'https://labs.phaser.io/assets/sprites/melon.png');
    this.load.image('sky', 'https://labs.phaser.io/assets/skies/sky1.png');
}

function create() {
    background = this.add.image(400, 300, 'sky');
    background.setDisplaySize(this.sys.game.config.width, this.sys.game.config.height);
    cursors = this.input.keyboard.createCursorKeys();
    player = this.physics.add.sprite(400, 500, 'player').setCollideWorldBounds(true);
    scoreText = this.add.text(16, 16, 'Счет: 0', {
        fontSize: '32px',
        fill: '#fff',
    });
    countdownText = this.add.text(400, 300, '', {
        fontSize: '64px',
        fill: '#fff',
    }).setOrigin(0.5, 0.5);
    rubiesGroup = this.physics.add.group();

    // Обработка списка игроков
    socket.on('players', (players) => {
        for (const id in players) {
            if (id === socket.id) continue;
            if (!otherPlayers[id]) {
                otherPlayers[id] = this.physics.add.sprite(players[id].x, players[id].y, 'player');
            } else {
                otherPlayers[id].setPosition(players[id].x, players[id].y);
            }
        }
        if (players[socket.id]) {
            scoreText.setText('Счет: ' + players[socket.id].score);
        }
    });

    // Обработка списка рубинов
    socket.on('rubies', (rubiesData) => {
        rubiesGroup.clear(true, true); // Очищаем текущие рубины
        for (const rubyId in rubiesData) {
            const ruby = rubiesData[rubyId];
            rubiesGroup.create(ruby.x, ruby.y, 'object').setData('id', rubyId);
        }
        this.physics.add.overlap(player, rubiesGroup, collectRuby, null, this);
    });

    // Обработка старта таймера отсчета
    socket.on('startCountdown', () => {
        startCountdown(this);
    });

    // Обработка разрешения движения
    socket.on('startGame', () => {
        gameStarted = true; // Разрешаем движение
    });

    socket.on('gameOver', (winnerId) => {
        if (winnerId === socket.id) {
            alert('Поздравляем! Вы победили!');
        } else {
            alert(`Игрок ${winnerId} победил!`);
        }
        game.scene.pause();
    });
}

function update() {
    if (!gameStarted) return; // Блокируем движение, если игра еще не началась

    if (cursors.left.isDown) {
        player.setVelocityX(-160);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
    } else {
        player.setVelocityX(0);
    }

    if (cursors.up.isDown) {
        player.setVelocityY(-160);
    } else if (cursors.down.isDown) {
        player.setVelocityY(160);
    } else {
        player.setVelocityY(0);
    }

    if (gameStarted) {
        socket.emit('move', { x: player.x, y: player.y });
    }
}

function startCountdown(sceneInstance) {
    let countdown = 3;
    const timer = sceneInstance.time.addEvent({
        delay: 1000,
        callback: () => {
            if (countdown > 0) {
                countdownText.setText(countdown.toString());
                countdown--;
            } else {
                countdownText.setText('');
                timer.remove(false);
            }
        },
        loop: true,
    });
}

function collectRuby(_, ruby) {
    const rubyId = ruby.getData('id');
    socket.emit('collectRuby', rubyId); // Уведомляем сервер о сборе рубина
    ruby.destroy(); // Удаляем рубин с клиента
}