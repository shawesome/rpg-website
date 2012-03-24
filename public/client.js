$(function () {
    var server = 'http://localhost:8080';
    var socket = io.connect(server);
    var canvas = document.getElementById('main');
    var context = canvas.getContext('2d');
    var map = null;

    // Sprite constants
    var spriteWidth = 24;
    var spriteHeight = 32;
    var spriteOffsetMap = {
        'stationary-up': {y: 128, x: 24},
        'stationary-right': {y: 160, x: 24},
        'stationary-down': {y: 192, x: 24},
        'stationary-left': {y: 224, x: 24},
        'walk-up': {y: 128, x: 0},
        'walk-right': {y: 160, x: 0},
        'walk-down': {y: 192, x: 0},
        'walk-left': {y: 224, x: 0},
    };
    
    var clear = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    var draw = function (players) {
        context.canvas.width  = window.innerWidth;
        context.canvas.height = window.innerHeight;

        renderLayer('Grass');
        renderLayer('Buildings');

        _.each(players, function (player) {
            renderPlayer(player);
        });
    };
    
    var renderPlayer = function(player) {
        var img = document.getElementById('link_' + player.colour);

        var spritePos = spriteOffsetMap[player.action + '-' + player.orientation];
        
        context.drawImage(img, spritePos.x, spritePos.y, spriteWidth, spriteHeight, player.pos.x - spriteWidth/2, player.pos.y - spriteHeight/2, spriteWidth, spriteHeight);
    }

    var renderLayer = function(layerName) {
        var layer = getLayer(map, layerName);
        
        var tileset = map.tilesets[0];

        var imageWidthInTiles = tileset.imagewidth / tileset.tilewidth;
        var imageHeightInTiles = tileset.imageheight / tileset.tileheight;

        for (var i = 0; i < map.height; i++) {
            for (var j = 0; j < map.width; j++) {
                renderTile(j, i, layer.data[j + i * map.width]);
            }
        }
    };

    var renderTile = function(x, y, tileNo) {
        // If 0 then no tile to render
        if (tileNo == 0) {
            return;
        }

        var tileset = map.tilesets[0];

        var imageWidthInTiles = tileset.imagewidth / tileset.tilewidth;
        var imageHeightInTiles = tileset.imageheight / tileset.tileheight;
        
        var targetX = x * tileset.tilewidth;
        var targetY = y * tileset.tileheight;

        // Increment the value since we index from 1, not 0
        var sourceX = ((tileNo % imageWidthInTiles) - 1) * tileset.tilewidth;
        var sourceY = (Math.floor(tileNo / imageHeightInTiles)) * tileset.tileheight;

        var img = document.getElementById('tileset');
        context.drawImage(img, sourceX, sourceY, tileset.tilewidth, tileset.tileheight, targetX, targetY, tileset.tilewidth, tileset.tileheight);
    }
    
    socket.on('update', function (data) {
        clear();
        draw(data);
        
    });
    
    socket.on('map', function (data) {
        map = data;
    });

    socket.on('show-content', function(data) {
        $('#' + data).fadeIn(2000);
    });

    socket.on('hide-content', function(data) {
        $('#content div').fadeOut(2000);
    });
    
    /**
     * Keyboard Interaction
     */
     var current_orientation = '';
     $('body').keydown(function (data) {
         var up = [87, 38];
         var down = [83, 40];
         var right = [39, 68];
         var left = [37, 65];
         
         var key = data.which;
         
         var orientation;
         
         if (_.include(up, key)) {
             orientation = 'N';
         } else if (_.include(down, key)) {
             orientation = 'S';
         } else if (_.include(left, key)) {
             orientation = 'W';
         } else if (_.include(right, key)) {
             orientation = 'E';
         }
         
         if (orientation) {
             socket.emit('direction-update', orientation);
             data.preventDefault();
         }
     });
     
     $('body').keyup(function (data) {
         socket.emit('direction-update', '');
     });


});
