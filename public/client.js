$(function () {
    var server = 'http://localhost:8080';
    var socket = io.connect(server);
    var canvas = document.getElementById('main');
    var context = canvas.getContext('2d');
    var map = null;
    
    var colour = {
        red: 'red',
        blue: 'blue',
        green: 'green',
        white: 'white'
    }

    var clear = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    var draw = function (players) {
        context.canvas.width  = window.innerWidth;
        context.canvas.height = window.innerHeight;

        renderLayer('Grass');
        renderLayer('Buildings');

        _.each(players, function (player) {
            var size = 5;
            
            var team = 'red';
            var x = player.pos.x - size/2;
            var y = player.pos.y - size/2;

            context.fillStyle = colour[team];
            context.strokeStyle = colour[team];
            
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2, true); 
            context.closePath();
            context.fill();
            
            context.textAlign = 'center';
            context.textBaseline = 'top';
            context.fillText("#" + player.id, x, y + size);
        });
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

    socket.on('page', function(data) {
        $('#content').html(data);
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