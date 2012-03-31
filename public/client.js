$(function () {
    var server = 'http://localhost:8080';
    var socket = io.connect(server);
    var canvas = document.getElementById('main');
    var context = canvas.getContext('2d');
    var map = null;
    var gameLoopsInBetweenAnimationFrames = 2;
    var playerAnimation = {};

    // Sprite constants
    var spriteWidth = 24;
    var spriteHeight = 32;
    var spriteAnimationMap = {
        'stationary-up': {
            frames: [
                {y: 128, x: 24},
            ], 
            type: 'circular', 
        },
        'stationary-right': {
            frames: [
                {y:160, x: 24},
            ], 
            type: 'circular', 
        },
        'stationary-down':  {
            frames: [
                {y:192, x: 24},
            ], 
            type: 'circular', 
        },
        'stationary-left':  {
            frames: [
                {y:224, x: 24},
            ], 
            type: 'circular', 
        },
        'walk-up':          {
            frames: [
                {y:128, x: 0},
                {y:128, x: 24},
                {y:128, x: 48},
                {y:128, x: 24},
            ], 
            type: 'circular', 
        },
        'walk-right':       {
            frames: [
                {y:160, x: 0},
                {y:160, x: 24},
                {y:160, x: 48},
                {y:160, x: 24},
            ], 
            type: 'circular', 
        },
        'walk-down':        {
            frames: [
                {y:192, x: 0},
                {y:192, x: 24},
                {y:192, x: 48},
                {y:192, x: 24},
            ], 
            type: 'circular', 
        },
        'walk-left':        {
            frames: [
                {y:224, x: 0},
                {y:224, x: 24},
                {y:224, x: 48},
                {y:224, x: 24},
            ], 
            type: 'circular', 
        },
    };
    
    var clear = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    var draw = function (players) {
        context.canvas.width  = window.innerWidth;
        context.canvas.height = window.innerHeight;

        renderLayer('Background');
        _.each(players, function (player) {
            renderPlayer(player);
        });
        renderLayer('Foreground');

    };
    
    var renderPlayer = function(player) {
        var img = document.getElementById('link_' + player.colour);

        var spritePos = getSpritePos(player);
        
        if (!player.isViewingPage) {
            context.drawImage(img, spritePos.x, spritePos.y, spriteWidth, spriteHeight, player.pos.x - spriteWidth/2, player.pos.y - spriteHeight/2, spriteWidth, spriteHeight);
        }
    }

    var getSpritePos = function(player) {
        var frames = spriteAnimationMap[player.action + '-' + player.orientation].frames;
        var animationData = playerAnimation[player.id];

        if(player.action != animationData.lastAction) {
            // A player has changed action so animation variables need to be reset.
            animationData.lastAction = player.action;
            animationData.currentFrame = 0;
            animationData.frameCounter = 0;
        }
    

        if (++animationData.frameCounter == gameLoopsInBetweenAnimationFrames) {
            // Reset the frame counter
            animationData.frameCounter = 0;

            var nextFrame = animationData.currentFrame + 1;
            if (nextFrame >= frames.length) {
                // We've reached the end of the animation.

                if (animationData.type = "circular") {
                    // If we need to repeat the animation just reset the current frame.
                    animationData.currentFrame = 0;
                } else {
                    // TODO We currently only have animations which repeat.
                }
            } else {
                animationData.currentFrame = nextFrame;
            }
        }

        return frames[animationData.currentFrame];
    };

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

    socket.on('players', function (data) {
        _.each(data, function(player) {
            playerAnimation[player] = { currentFrame: 0, lastAction: 'stationary', frameCounter: 0 };
        });
    });

    socket.on('new-player', function (data) {
        playerAnimation[data] = { currentFrame: 0, lastAction: 'stationary', frameCounter: 0 };

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
