// Constants
var WALK_SPEED = 4;
var FPS = 30;

// Globals
var id = 0;
var map;
var mapSize = {x: 0, y: 0};

var express = require('express');
var app = express.createServer()
var io = require('socket.io').listen(app);
var fs = require('fs');
var _ = require('./public/underscore.js')._;
eval(fs.readFileSync('public/common.js') + '');


io.set('log level', 1); // Reduce the log messages

app.configure(function() {
  app.use(express.static(__dirname + '/public'));
});

app.listen(8080);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

fs.readFile(__dirname + '/public/map.json', function(err, data) {
	map = JSON.parse(data);
    mapSize.x = map.width * map.tilewidth - map.tilewidth;
    mapSize.y = map.height * map.tileheight - 16;
});

io.sockets.on('connection', function (socket) {
    socket.emit('map', map); 

    socket.emit('players', _.map(entities, function(entity) {
	return entity.id;
    }));

    var player = new Entity({ x: 110, y: 135 }, 'blue', false, socket.id);
    entities.push(player);
    
    io.sockets.emit('new-player', player.id); 

    socket.on('direction-update', function (data) {
        if (data == 'N') {
	    player.action = 'walk'
            player.orientation = 'up';
        } else if (data == 'S') {
	    player.action = 'walk'
            player.orientation = 'down';
        } else if (data == 'W') {
	    player.action = 'walk'
            player.orientation = 'left';
        } else if (data == 'E') {
	    player.action = 'walk'
            player.orientation = 'right';
        } else if (data == '') {
            player.action = 'stationary';
        }
    });

    socket.emit('show-content', 'welcome');
});

var Entity = function(pos, colour, npc, socketId) {
    this.id = id++;
    this.pos = pos;
    this.colour = colour;
    this.socketId = socketId;
    this.isViewingPage = true;
    this.action = 'stationary';
    this.orientation = 'down';
    

    this.update = function() {
        switch(this.action) {
            case 'walk': this.walk(); break;
        }
    }

    this.isColliding = function () {
        return _.any(entities, function (entity) {
            if (entity.id == this.id) return false;
            
            var d_x = entity.pos.x - this.pos.x;
            var d_y = entity.pos.y - this.pos.y;
            
            var d = Math.sqrt(Math.pow(d_x, 2) + Math.pow(d_y, 2));
            
            return d <= 10;
        }, this);
    }

    // ACTIONS
    this.walk = function() {
        direction = { x: 0, y: 0 };
        
        switch (this.orientation) {
            case 'left':  this._walk({x: -WALK_SPEED, y: 0}); break;
            case 'right': this._walk({x:  WALK_SPEED, y: 0}); break;
            case 'up':    this._walk({x: 0, y: -WALK_SPEED}); break;
            case 'down':  this._walk({x: 0, y:  WALK_SPEED}); break;
        }

        var page = this.getObjectsAt(this.pos, "Page");
        if (!this.isViewingPage) {
            if (page.length == 1) {
                this.isViewingPage = true;
                // There is some content which needs to be displayed.
                var contentToShow = page[0].properties.content;
	    	io.sockets.socket(this.socketId).emit('show-content', contentToShow);
            }
        } else {
            if (page.length == 0) {
                io.sockets.socket(this.socketId).emit('hide-content');
                this.isViewingPage = false;
            }
        }
    }

    this._walk = function(direction) {
        newPos = {
            x: this.pos.x + direction.x,
            y: this.pos.y + direction.y
        };

        if(this.canMoveTo(newPos)) {
            this.pos = newPos;
        }
    }

    this.canMoveTo = function(pos) {
        var impassableObjects = this.getObjectsAt(pos, "Impassable");

        // Can't move outside the map boundary
        if (pos.x > mapSize.x || pos.y > mapSize.y || pos.x < 0 || pos.y < 0) {
            return false;
        }

        // Can't move through impassable terrain
        if (impassableObjects.length != 0) {
            return false;
        }

        // We can move to this position
        return true;

    }

    this.getObjectsAt = function(pos, layerName) {
        var layer = getLayer(map, layerName);
        objects = [];
        _.each(layer.objects, function (object) {
            if (object.x <= pos.x &&
                pos.x <= object.x + object.width &&
                object.y <= pos.y &&
                pos.y <= object.y + object.height) {
                objects.push(object);
            }
        });
        return objects;
    }
}

function updateEntities() {
    for (var i in entities) {
        var entity = entities[i];
        entity.update();
    }
}

function gameLoop() {
    updateEntities();
    io.sockets.emit('update', entities); 
    setTimeout(gameLoop, 1000/FPS); 
}


// Create all the entities in the game (initially a bunch of bots)
var entities = [];

// Enter gameloop
gameLoop();

