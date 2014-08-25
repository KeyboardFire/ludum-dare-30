// globals
var phaser, game;

var levels = {
    water: {
        name: 'water',
        preload: function() {
            phaser.load.spritesheet('images_sprites_player', 'images/sprites/player.png', 64, 32);
            phaser.load.image('images_sprites_minnow', 'images/sprites/minnow.png');
            phaser.load.image('images_sprites_shark', 'images/sprites/shark.png');
            phaser.load.image('images_sprites_jellyfish', 'images/sprites/jellyfish.png');

            phaser.load.image('images_particles_splash', 'images/particles/splash.png');

            phaser.load.audio('audio_splash', ['audio/splash.mp3', 'audio/splash.ogg']);

            phaser.load.tilemap('tilemaps_water', 'tilemaps/water.json', null, Phaser.Tilemap.TILED_JSON);
            phaser.load.image('images_tiles_water', 'images/tiles/water.png');
        },
        create: function() {
            phaser.physics.ninja.gravity = 1;

            game.splashEmitter = phaser.add.emitter(0, 0, 100);
            game.splashEmitter.makeParticles('images_particles_splash');
            game.splashEmitter.gravity = 200;

            game.player.anchor.setTo(0.5, 1);
            game.player.body.gravityScale = 0.01;

            game.audio.splash = phaser.add.audio('audio_splash');

            game.triggers = [
                [10, function() {
                    game.swarm('images_sprites_minnow', 10);
                    msg('Eat the minnows to restore your health!');
                }],
                [30, function() {
                    game.swarm('images_sprites_shark', 2);
                    msg('Watch out for sharks! Don\'t swim too fast.');
                }],
                [40, function() {
                    game.swarm('images_sprites_shark', 1);
                }],
                [50, function() {
                    game.swarm('images_sprites_shark', 1);
                }],
                [80, function() {
                    game.spawn('images_sprites_jellyfish');
                    game.swarm('images_sprites_minnow', 5);
                    msg('Kill the jellyfish boss to teleport to the connected Fire World!');
                }]
            ];
        },
        eachSprite: function(sprite, sx, sy, tx, ty, i) {
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
                    _GAME(levels.fire.name);
                    return true;
                }

                break;
            }
        }
    }, fire: {
        name: 'fire',
        preload: function() {
            phaser.load.spritesheet('images_sprites_player', 'images/sprites/player2.png', 28, 60);

            phaser.load.tilemap('tilemaps_fire', 'tilemaps/fire.json', null, Phaser.Tilemap.TILED_JSON);
            phaser.load.image('images_tiles_fire', 'images/tiles/fire.png');
        },
        create: function() {
            game.triggers = [];

            msg('Use the arrow keys to move, and hold the up arrow for a longer amount of time to jump longer. Get through the fire to the end to win!');
        },
        eachSprite: function(sprite, sx, sy, tx, ty, i) {
            switch (game.map.layer.data[ty][tx].index) {
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                sprite.damage(1);
                break;
            case 9:
                phaser.destroy();
                msg('You win!');
                break;
            default:
                break;
            }
        }
    }
}

function _GAME(level) {
    if (phaser) phaser.destroy();
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    phaser = new Phaser.Game(800, 600, Phaser.AUTO, '', {
        preload: function() { preload(level) },
        create: function() { create(level) },
        update: function() { update(level) }
    });
    game = {};
}

function msg(x) {
    var msgEl = document.createElement('div');
    msgEl.style.fontSize = '2em';
    if (msg.oldMsg && msg.oldMsg.style) msg.oldMsg.style.fontSize = '0.5em';
    document.body.insertBefore(msgEl, document.body.firstChild);
    msg.oldMsg = msgEl;
    msgEl.innerHTML = x;
}
window.onload = function() {
    _GAME(levels.water.name);
    msg('Controls: arrow keys to swim around, space to eat things');
};

function preload(level) {
    levels[level].preload();
}

function create(level) {
    phaser.physics.startSystem(Phaser.Physics.NINJA);

    phaser.stage.backgroundColor = 0x333333;

    game.map = phaser.add.tilemap('tilemaps_' + level);
    game.map.addTilesetImage('images_tiles_' + level);
    game.layer = game.map.createLayer('tilemaps_' + level + '_layer');
    game.layer.resizeWorld();
    if (level == 'fire') {
        game.map.setCollision(1);
        // the array at the end isn't actually optional; bug in Phaser methinks
        game.tiles = phaser.physics.ninja.convertTilemap(game.map, game.layer, [null, 1, 0, 0, 0, 0, 0, 0, 0]);
    }

    game.player = phaser.add.sprite(0, 0, 'images_sprites_player');
    phaser.physics.ninja.enable(game.player);
    game.player.speed = 5;
    game.player.maxHealth = game.player.health = 100;
    game.player.damage = function(amount) {
        game.player.health -= amount;
        if (game.player.health <= 0) {
            phaser.destroy();
            msg('You died! Refresh your browser to restart.');
        }
        game.player.alpha = game.player.health / game.player.maxHealth;
    };
    phaser.camera.follow(game.player);

    game.enemies = [];
    game.spawn = function(type, ex, ey) {
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
    game.swarm = function(type, count) {
        for (var i = 0; i < count; ++i) {
            var mx = phaser.camera.view.right + Math.floor(Math.random() * 256),
                my = Math.floor(Math.random() * phaser.camera.height) + phaser.camera.view.top;
            game.spawn(type, mx, my);
        }
    }

    game.audio = {};

    game.cursors = phaser.input.keyboard.createCursorKeys();

    levels[level].create();
}

function update(level) {
    // cursor movement
    if (game.cursors.left.isDown) {
        game.player.body.moveLeft(game.player.speed);
        game.player.scale.x = -1;
    }
    if (game.cursors.right.isDown) {
        game.player.body.moveRight(game.player.speed);
        game.player.scale.x = 1;
    }
    game.player.tryingToJump = false;
    if (game.cursors.up.isDown || game.player.jumpTimeout) {
        if (level == 'water') {
            game.player.body.moveUp(game.player.speed);
        } else if (level == 'fire') {
            if (!game.player.jumpTimeout) {
                // jump
                game.player.tryingToJump = true;
            } else if (game.player.jumpTimeout > 0) {
                // continue jumping
                if (--game.player.jumpTimeout < 1 || !game.cursors.up.isDown) game.player.jumpTimeout = 0;
                else game.player.body.moveUp(game.player.speed * 5);
            }
        }
    }
    if (game.cursors.down.isDown) {
        game.player.body.moveDown(game.player.speed);
    }

    if (level == 'fire') {
        for (var i = 0; i < game.tiles.length; ++i) {
            if (game.player.body.aabb.collideAABBVsTile(game.tiles[i].tile)) {
                if (game.player.tryingToJump && game.player.body.touching.down) {
                    game.player.jumpTimeout = 18;
                    game.player.body.moveUp(game.player.speed * 5);
                }
            }
        }
    }

    // bypass (for testing purposes)
    if (phaser.input.keyboard.isDown(Phaser.Keyboard.B)) {
        _GAME(levels.fire.name);
        return;
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

        if (levels[level].eachSprite(sprite, sx, sy, tx, ty, i)) return;
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
