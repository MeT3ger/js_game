const socket = io();

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let player;
let cursors;
let otherPlayers = {};
let scoreText;
let background;
let rubies;
const backgrounds = ["background1", "background2", "background3", "background4"];
let gameStarted = false

const game = new Phaser.Game(config);

function preload() {
    this.load.image('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png');
    this.load.image('object', 'https://labs.phaser.io/assets/sprites/shinyball.png');

    this.load.image('background1', 'https://labs.phaser.io/assets/skies/space4.png');
    this.load.image('background2', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('background3', 'https://labs.phaser.io/assets/skies/space2.png');
    this.load.image('background4', 'https://labs.phaser.io/assets/skies/space1.png');
}

function create() {

    background = this.add.image(400, 400, backgrounds[0]);
    background.setDisplaySize(this.sys.game.config.width, this.sys.game.config.height);

    changeBackground()


    cursors = this.input.keyboard.createCursorKeys();


    player = this.physics.add.sprite(400, 500, 'player').setCollideWorldBounds(true);


    scoreText = this.add.text(16, 16, 'Счет: 0', {
        fontSize: '32px',
        fill: '#fff'
    });

    countdownText = this.add.text(400, 300, '', {
        fontSize: '64px',
        fill: '#fff'
    }).setOrigin(0.5, 0.5);

    rubies = this.physics.add.group();

    socket.on('players', (players) => {
        const playerCount = Object.keys(players).length;


        if (playerCount >= 2 && gameStarted === false) {
            gameStarted = true
            startCountdown(this)
        }

        for (const id in players) {
            if (id === socket.id) continue;

            if (!otherPlayers[id]) {
                otherPlayers[id] = this.physics.add.sprite(players[id].x, players[id].y, 'player');
            } else {
                otherPlayers[id].setPosition(players[id].x, players[id].y);
            }
        }
    });

    socket.on('players', (players) => {
        for (const id in players) {
            if (id === socket.id) {
                scoreText.setText('Счет: ' + players[id].score);
            }
        }
    });
}

function update() {
    // Движение игрока
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

    socket.emit('move', { x: player.x, y: player.y });
}

function changeBackground() {
    const randomIndex = Phaser.Math.Between(0, backgrounds.length - 1);
    background.setTexture(backgrounds[randomIndex]);
}

function startCountdown(sceneInstance) {
    countdown = 3
    const timer = sceneInstance.time.addEvent({
        delay: 1000,
        callback: () => {
            if (countdown > 0) {
                countdownText.setText(countdown.toString());
                countdown--;
            } else {
                countdownText.setText('');
                timer.remove(false);
                spawnRubies(sceneInstance)
            }
        },
        loop: true
    });
    socket.emit('startCountdown')
}

function spawnRubies(sceneInstance) {
    for (let i = 0; i < 10; i++) {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(50, 550);
        const ruby = rubies.create(x, y, 'object');
        ruby.setCollideWorldBounds(true);
        ruby.ownerId = socket.id;
        ruby.id = Phaser.Math.RND.uuid()
    }

    sceneInstance.physics.add.overlap(player, rubies, (_, ruby) => {
        if (ruby && ruby.active && ruby.ownerId === socket.id) {
            collectRuby(ruby)
        }
    }, null, sceneInstance)
}

function collectRuby(Ruby) {
    console.log(rubies.getChildren())
    console.log(Ruby)
    const ruby = rubies.getChildren().find(r => r.id === Ruby.id)
    if (ruby) {
        socket.emit('collectRuby', ruby.id);
    }
}

socket.on('removeRuby', (rubyId) => {
    const ruby = rubies.getChildren().find((r) => r.id === rubyId);
    if (ruby) {
        ruby.destroy();
        rubies.remove(ruby)
        if (rubies.getChildren().length === 0) {
            socket.emit('playerWon', socket.id);
        }
    }
});


// Слушаем сообщение о победителе
socket.on('gameOver', (winnerId) => {
    if (winnerId === socket.id) {
        alert('Поздравляем! Вы победили!');
    } else {
        alert(`Игрок ${winnerId} победил!`);
    }
    game.scene.pause();
});
socket.on('startCountdown', () => {
    startCountdown(this.scene)
});

// При сборе рубина
socket.on('collectRuby', (rubyId) => {
    console.log(rubyId)
    const ruby = rubies.getChildren().find(r => r.id === rubyId)
    console.log(ruby)
    ruby.destroy();
    rubies.remove(ruby)
    console.log(rubies.getChildren())
    console.log(rubies.getChildren().length)
    if (rubies.getChildren().length === 0) {
        console.log("я зашел")
        socket.emit('playerWon', socket.id);
    }

    socket.emit('score', player.id)
    player.score += 10;
});