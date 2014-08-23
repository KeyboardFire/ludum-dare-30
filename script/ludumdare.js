var phaser = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    phaser.load.spritesheet('images_sprites_player', 'images/sprites/player.png', 64, 32);
    phaser.load.image('images_sprites_minnow', 'images/sprites/minnow.png');
    phaser.load.image('images_sprites_shark', 'images/sprites/shark.png');
    phaser.load.image('images_sprites_jellyfish', 'images/sprites/jellyfish.png');

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
    var spawn = function(type, ex, ey) {
        var enemy = phaser.add.sprite(ex, ey, type);
        phaser.physics.ninja.enable(enemy);
        enemy.anchor.setTo(0.5, 1);
        switch (type) {
        case 'images_sprites_minnow':
            enemy.maxHealth = enemy.health = 1;
            break;
        case 'images_sprites_shark':
            enemy.maxHealth = enemy.health = 10;
            break;
        case 'images_sprites_jellyfish':
            enemy.anchor.setTo(0.5, 0.25);
            enemy.maxHealth = enemy.health = 150;
            break;
        }
        game.enemies.push(enemy);
    };

    var swarm = function(type, count) {
        for (var i = 0; i < count; ++i) {
            var mx = phaser.camera.view.right + Math.floor(Math.random() * 256),
                my = Math.floor(Math.random() * phaser.camera.height) + phaser.camera.view.top;
            spawn(type, mx, my);
        }
    }
    game.triggers = [
        [10, function() {
            swarm('images_sprites_minnow', 10);
        }],
        [30, function() {
            swarm('images_sprites_shark', 2);
        }],
        [40, function() {
            swarm('images_sprites_shark', 1);
        }],
        [50, function() {
            swarm('images_sprites_shark', 1);
        }],
        [80, function() {
            spawn('images_sprites_jellyfish');
            swarm('images_sprites_minnow', 5);
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
            if (sprite.key == 'images_sprites_jellyfish') {
                sprite.body.gravityScale = 0;
                //sprite.body.setZeroVelocity();
            }
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
        var fishEatFish = function(fish, dmg) { // this is a utility method for damage
            if (phaser.physics.ninja.collide(game.player, fish)) {
                if (game.player.frame == 1 && (game.player.scale.x > 0 ?
                    game.player.x < fish.x - game.player.width / 2 : game.player.x > fish.x + game.player.width / 2)) { // mouth open
                    // eat!
                    if (--fish.health <= 0) {
                        fish.exists = false;
                        return true;
                    } else {
                        fish.alpha = fish.health / fish.maxHealth;
                    }
                } else {
                    game.player.damage(dmg);
                }
            }
        };
        var trackPlayer = function(fish, spd, noVertical) { // and this one is for following the player
            if (fish.goingLeft) {
                fish.body.moveLeft(spd);
                if (fish.x < game.player.x && Math.random() > 0.001) {
                    fish.goingLeft = false;
                    fish.scale.x = -1;
                }
            } else {
                fish.body.moveRight(spd);
                if (fish.x > game.player.x && Math.random() > 0.001) {
                    fish.goingLeft = true;
                    fish.scale.x = 1;
                }
            }

            if (!noVertical) {
                if (fish.y < game.player.y) {
                    fish.body.moveDown(spd);
                } else {
                    fish.body.moveUp(spd);
                }
            }
        };
        switch (sprite.key) {
        case 'images_sprites_player':
            px = sx;
            py = sy;
            break;
        case 'images_sprites_minnow':
            trackPlayer(sprite, 2, 'only horizontal');
            if (fishEatFish(sprite, 1)) {
                game.player.damage(game.player.health - game.player.maxHealth);
                game.enemies[i] = null;
            }
            break;
        case 'images_sprites_shark':
            trackPlayer(sprite, 5);
            if (fishEatFish(sprite, 1)) {
                game.enemies[i] = null;
            }
            break;
        case 'images_sprites_jellyfish':
            var vx = sprite.x - game.player.x, vy = sprite.y - game.player.y;
            vx /= (Math.abs(vx) + Math.abs(vy));
            vy /= (Math.abs(vx) + Math.abs(vy));
            var spd = 4;

            vx > 0 ? sprite.body.moveLeft(vx * spd) : sprite.body.moveRight(-vx * spd);
            vy > 0 ? sprite.body.moveUp(vy * spd) : sprite.body.moveDown(-vy * spd);

            if (fishEatFish(sprite, 1)) {
                game.enemies[i] = null;
                console.log('you passed the level!');
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
