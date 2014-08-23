var phaser = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    phaser.load.image('images_sprites_player', 'images/sprites/player.png');

    phaser.load.image('images_particles_splash', 'images/particles/splash.png');

    phaser.load.tilemap('tilemaps_water', 'tilemaps/water.json', null, Phaser.Tilemap.TILED_JSON);
    phaser.load.image('images_tiles_water', 'images/tiles/water.png');
}

var game = {}
function create() {
    // phaser.physics.startSystem(Phaser.Physics.ARCADE); // particles

    phaser.physics.startSystem(Phaser.Physics.NINJA);
    phaser.physics.ninja.gravity = 0.01;

    game.map = phaser.add.tilemap('tilemaps_water');
    game.map.addTilesetImage('images_tiles_water');
    var layer = game.map.createLayer('tilemaps_water_layer');
    layer.resizeWorld();

    game.splashEmitter = phaser.add.emitter(0, 0, 100);
    game.splashEmitter.makeParticles('images_particles_splash');
    game.splashEmitter.gravity = 200;

    game.player = phaser.add.sprite(0, 0, 'images_sprites_player');
    phaser.physics.ninja.enable(game.player);
    phaser.camera.follow(game.player);

    game.cursors = phaser.input.keyboard.createCursorKeys();
}

function update() {
    if (game.cursors.left.isDown) {
        game.player.body.moveLeft(20);
    }
    if (game.cursors.right.isDown) {
        game.player.body.moveRight(20);
    }
    if (game.cursors.up.isDown) {
        game.player.body.moveUp(20);
    }
    if (game.cursors.down.isDown) {
        game.player.body.moveDown(20);
    }

    var px = game.player.x + game.player.width / 2, py = game.player.y + game.player.height / 2;
    var tx = px / game.map.layer.data[0][0].width, ty = py / game.map.layer.data[0][0].height;
    tx = Math.min(Math.max(Math.round(tx), 0), game.map.layer.width - 1);
    ty = Math.min(Math.max(Math.round(ty), 0), game.map.layer.height - 1);
    switch (game.map.layer.data[ty][tx].index) {
    case 0: // empty
        break;
    case 1: // water
        phaser.physics.ninja.gravity = 0.01;
        break;
    case 2: // surface of water
        game.splashEmitter.x = px;
        game.splashEmitter.y = py;
        game.splashEmitter.start(true, 1000, null, 10);
        break;
    case 3: // air
        phaser.physics.ninja.gravity = 0.5;
        break;
    }
}
