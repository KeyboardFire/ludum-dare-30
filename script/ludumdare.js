var phaser = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    phaser.load.image('images_sprites_player', 'images/sprites/player.png');
    phaser.load.image('images_sprites_minnow', 'images/sprites/minnow.png');

    phaser.load.image('images_particles_splash', 'images/particles/splash.png');

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
    game.player.body.gravityScale = 0.01;
    game.player.speed = 5;
    phaser.camera.follow(game.player);

    game.enemies = [];

    game.triggers = [
        [10, function() {
            for (var i = 0; i < 10; ++i) {
                var mx = phaser.camera.view.right + Math.floor(Math.random() * 256),
                    my = Math.floor(Math.random() * phaser.camera.height) + phaser.camera.view.top;
                var minnow = phaser.add.sprite(mx, my, 'images_sprites_minnow');
                phaser.physics.ninja.enable(minnow);
                game.enemies.push(minnow);
            }
        }],
        [20, function() {
            console.log(20);
        }]
    ];

    game.cursors = phaser.input.keyboard.createCursorKeys();
}

function update() {
    // cursor movement
    if (game.cursors.left.isDown) {
        game.player.body.moveLeft(game.player.speed);
    }
    if (game.cursors.right.isDown) {
        game.player.body.moveRight(game.player.speed);
    }
    if (game.cursors.up.isDown) {
        game.player.body.moveUp(game.player.speed);
    }
    if (game.cursors.down.isDown) {
        game.player.body.moveDown(game.player.speed);
    }

    // enemy / player behavior
    var px, py;
    for (var i = 0; i <= game.enemies.length; ++i) {
        var sprite = (i == game.enemies.length ? game.player : game.enemies[i]);
        var sx = sprite.x + sprite.width / 2, sy = sprite.y + sprite.height / 2;
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
            sprite.body.moveLeft(0.5);
            break;
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
