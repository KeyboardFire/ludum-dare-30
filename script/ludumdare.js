var phaser = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    phaser.load.spritesheet('images_sprites_player', 'images/sprites/player.png', 64, 32);
    phaser.load.image('images_sprites_minnow', 'images/sprites/minnow.png');

    phaser.load.image('images_particles_splash', 'images/particles/splash.png');

    phaser.load.audio('audio_splash', ['audio/splash.mp3', 'audio/splash.ogg']);

    phaser.load.tilemap('tilemaps_water', 'tilemaps/water.json', null, Phaser.Tilemap.TILED_JSON);
    phaser.load.image('images_tiles_water', 'images/tiles/water.png');
}

var game = {}
function create() {
    phaser.physics.startSystem(Phaser.Physics.NINJA);
    phaser.physics.ninja.gravity = 1; // gravityScale is used for everything

    game.map = phaser.add.tilemap('tilemaps_water');
    game.map.addTilesetImage('images_tiles_water');
    var layer = game.map.createLayer('tilemaps_water_layer');
    layer.resizeWorld();

    game.splashEmitter = phaser.add.emitter(0, 0, 100);
    game.splashEmitter.makeParticles('images_particles_splash');
    game.splashEmitter.gravity = 200;

    game.player = phaser.add.sprite(0, 0, 'images_sprites_player');
    phaser.physics.ninja.enable(game.player);
    game.player.anchor.setTo(0.5, 1);
    game.player.body.gravityScale = 0.01;
    game.player.speed = 5;
    game.player.maxHealth = game.player.health = 100;
    game.player.damage = function(amount) {
        game.player.health -= amount;
        if (game.player.health <= 0) console.log('You are dead');
        game.player.alpha = game.player.health / game.player.maxHealth;
    };
    phaser.camera.follow(game.player);

    game.enemies = [];

    game.triggers = [
        [10, function() {
            for (var i = 0; i < 10; ++i) {
                var mx = phaser.camera.view.right + Math.floor(Math.random() * 256),
                    my = Math.floor(Math.random() * phaser.camera.height) + phaser.camera.view.top;
                var minnow = phaser.add.sprite(mx, my, 'images_sprites_minnow');
                phaser.physics.ninja.enable(minnow);
                minnow.anchor.setTo(0.5, 1);
                minnow.goingLeft = true;
                game.enemies.push(minnow);
            }
        }],
        [20, function() {
            console.log(20);
        }]
    ];

    game.audio = {};
    game.audio.splash = phaser.add.audio('audio_splash');

    game.cursors = phaser.input.keyboard.createCursorKeys();
}

function update() {
    // cursor movement
    if (game.cursors.left.isDown) {
        game.player.body.moveLeft(game.player.speed);
        game.player.scale.x = -1;
    }
    if (game.cursors.right.isDown) {
        game.player.body.moveRight(game.player.speed);
        game.player.scale.x = 1;
    }
    if (game.cursors.up.isDown) {
        game.player.body.moveUp(game.player.speed);
    }
    if (game.cursors.down.isDown) {
        game.player.body.moveDown(game.player.speed);
    }

    // eating
    if (phaser.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
        if (game.player.mouthTime < 0) ++game.player.mouthTime;
        else {
            game.player.frame = 1;
            ++game.player.mouthTime;
            if (game.player.mouthTime > 50) {
                game.player.mouthTime = -50;
                game.player.frame = 0;
            }
        }
    } else {
        game.player.frame = 0;
        game.player.mouthTime = 0;
    }

    // enemy / player behavior
    var px, py;
    for (var i = 0; i <= game.enemies.length; ++i) {
        var sprite = (i == game.enemies.length ? game.player : game.enemies[i]);
        var sx = sprite.x, sy = sprite.y;
        var tx = sx / game.map.layer.data[0][0].width, ty = sy / game.map.layer.data[0][0].height;
        tx = Math.min(Math.max(Math.round(tx), 0), game.map.layer.width - 1);
        ty = Math.min(Math.max(Math.round(ty), 0), game.map.layer.height - 1);

        // tile collision events
        switch (game.map.layer.data[ty][tx].index) {
        case 0: // empty
            break;
        case 1: // water
            sprite.body.gravityScale = 0.01;
            if (sprite.key == 'images_sprites_minnow') sprite.body.gravityScale = 0;
            break;
        case 2: // surface of water
            game.splashEmitter.x = sx;
            game.splashEmitter.y = sy;
            game.splashEmitter.start(true, 1000, null, 10);

            if (phaser.camera.view.contains(sx, sy)) {
                // this happens many times in a row, so don't go crazy with splash noises
                if (!game.audio.splash.isPlaying) game.audio.splash.play();
            }
            break;
        case 3: // air
            sprite.body.gravityScale = 0.35;
            break;
        }

        // specific behavior
        switch (sprite.key) {
        case 'images_sprites_player':
            px = sx;
            py = sy;
            break;
        case 'images_sprites_minnow':
            // movement
            if (sprite.goingLeft) {
                sprite.body.moveLeft(2);
                if (sprite.x < game.player.x && Math.random() > 0.001) {
                    sprite.goingLeft = false;
                    sprite.scale.x = -1;
                }
            } else {
                sprite.body.moveRight(2);
                if (sprite.x > game.player.x && Math.random() > 0.001) {
                    sprite.goingLeft = true;
                    sprite.scale.x = 1;
                }
            }

            // attack player / get eaten
            if (phaser.physics.ninja.collide(game.player, sprite)) {
                if (game.player.frame == 1 && (game.player.scale.x > 0 ?
                    game.player.x < sprite.x - game.player.width / 2 : game.player.x > sprite.x + game.player.width / 2)) { // mouth open
                    // eat!
                    game.player.damage(game.player.health - game.player.maxHealth);
                    sprite.exists = false;
                    game.enemies[i] = null;
                } else {
                    game.player.damage(1);
                }
            }

            break;
        }
    }
    for (var i = 0; i < game.enemies.length; ++i) {
        if (game.enemies[i] == null) {
            game.enemies.splice(i--, 1);
            continue;
        }
    }

    // triggers for enemy spawns, etc.
    for (var i = 0; i < game.triggers.length; ++i) {
        var triggerSpot = game.triggers[i][0];
        if (tx < triggerSpot) continue;
        else if (tx == triggerSpot) {
            game.triggers[i][1]();
            game.triggers.splice(i, 1);
            break;
        } else break;
    }
}
