// Constants
var WALK_SPEED = 5;
var FPS = 30;

// Globals
var id = 0;

var express = require('express');
var app = express.createServer()
var io = require('socket.io').listen(app);
var _ = require('./public/underscore.js')._;

io.set('log level', 1); // Reduce the log messages

app.configure(function() {
  app.use(express.static(__dirname + '/public'));
});

app.listen(8080);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
    socket.emit('message', 'Welcome to the game'); 
    
    var player = new Entity({ x: 10, y: 10 }, 'green', false);
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
    })
});

var Entity = function(pos, team, npc) {
    this.id = id++;
    this.pos = pos;
    this.team = team;
    this.action = 'walk';

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
            case 'left':  this._walk('x', -WALK_SPEED); break;
            case 'right': this._walk('x',  WALK_SPEED); break;
            case 'up':    this._walk('y', -WALK_SPEED); break;
            case 'down':  this._walk('y',  WALK_SPEED); break;
        }
    }

    this._walk = function(axis, speed) {
        switch(axis) {
            case 'x':
                this.pos.x += speed;
                break;
            case 'y':
                this.pos.y += speed;
                break;
        }
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

