var phaser = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    phaser.load.image('images_sprites_player', 'images/sprites/player.png');

    phaser.load.tilemap('tilemaps_water', 'tilemaps/water.json', null, Phaser.Tilemap.TILED_JSON);
    phaser.load.image('images_tiles_water', 'images/tiles/water.png');
}

var game = {}
function create() {
    phaser.physics.startSystem(Phaser.Physics.NINJA);
    phaser.physics.ninja.gravity = 0.01;

    var map = phaser.add.tilemap('tilemaps_water');
    map.addTilesetImage('images_tiles_water');
    var layer = map.createLayer('tilemaps_water_layer');
    layer.resizeWorld();

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
}
