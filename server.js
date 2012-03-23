// Constants
var WALK_SPEED = 5;
var FPS = 30;

// Globals
var id = 0;
var map;

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
});

io.sockets.on('connection', function (socket) {
    socket.emit('map', map); 
    
    var player = new Entity({ x: 10, y: 10 }, 'green', false, socket.id);
    entities.push(player);
    
    socket.on('direction-update', function (data) {
        if (data == 'N') {
            player.orientation = 'up';
        } else if (data == 'S') {
            player.orientation = 'down';
        } else if (data == 'W') {
            player.orientation = 'left';
        } else if (data == 'E') {
            player.orientation = 'right';
        } else if (data == '') {
            player.orientation = null;
        }
    });
});

var Entity = function(pos, team, npc, socketId) {
    this.id = id++;
    this.pos = pos;
    this.team = team;
    this.action = 'walk';
    this.socketId = socketId;
    this.isViewingPage = false;

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
        if (impassableObjects.length == 0) {
            return true;
        } else {
            return false;
        }
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

