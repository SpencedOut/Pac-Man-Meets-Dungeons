var game = new Phaser.Game(1216, 1344, Phaser.AUTO, "game");

var PacmanGame = function (game) {    
    this.map = null;
    this.obstacles = null;
    this.keycollected = 0;
    this.numPills = 0;
    this.score = 0;
    this.scoreText = null;
    
    this.pacman = null; 
    this.clyde = null;
    this.pinky = null;
    this.inky = null;
    this.blinky = null;
    this.isInkyOut = false;
    this.isClydeOut = false;
    this.ghosts = [];

    this.safetile = [21, 70, 45, 74, 20, 29, 30, 31, 22, 36, 75, 11, 12, 13, 22, 20, 64, 61, 65];
    this.gridsize = 64;
    this.threshold = 3;
    
    /* this.SPECIAL_TILES = [
        { x: 12, y: 11 },
        { x: 15, y: 11 },
        { x: 12, y: 23 },
        { x: 15, y: 23 }
    ]; */
    
    this.TIME_MODES = [
        {
            mode: "scatter",
            time: 7000
        },
        {
            mode: "chase",
            time: 20000
        },
        {
            mode: "scatter",
            time: 7000
        },
        {
            mode: "chase",
            time: 20000
        },
        {
            mode: "scatter",
            time: 5000
        },
        {
            mode: "chase",
            time: 20000
        },
        {
            mode: "scatter",
            time: 5000
        },
        {
            mode: "chase",
            time: -1 // -1 = infinite
        }
    ];
    this.changeModeTimer = 0;
    this.remainingTime = 0;
    this.currentMode = 0;
    this.isPaused = false;
    this.FRIGHTENED_MODE_TIME = 7000;

    this.DEBUG_ON = true;
    
    this.KEY_COOLING_DOWN_TIME = 250;
    this.lastKeyPressed = 0;
    
    this.game = game;
};

PacmanGame.prototype = {

    init: function () {
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;

        Phaser.Canvas.setImageRenderingCrisp(this.game.canvas);

        this.physics.startSystem(Phaser.Physics.ARCADE);
    },

    preload: function () {
        this.load.image('dot', 'assets/dot.png');
        this.load.image("pill", "assets/pill16.png");
        this.load.image('tiles', 'assets/tile2.png');
        this.load.image('key', 'assets/key64.png');
        this.load.spritesheet('pacman', 'assets/pacman.png', 32, 32);
        this.load.spritesheet("ghosts", "assets/ghosts32.png", 32, 32);
        this.load.tilemap('map', 'assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
    },

    create: function () {
        this.map = this.add.tilemap('map');
        this.map.addTilesetImage('pacman-tiles', 'tiles');

        this.obstacles = this.map.createLayer('obstacle');
        this.map.setCollisionByExclusion([], this.obstacles);

        this.keys = this.add.physicsGroup();
        this.keys.enableBody = true;
        this.key1 = this.keys.create((4 * this.gridsize) + this.gridsize/2, (14 * this.gridsize) + this.gridsize/2, 'key');
        this.key2 = this.keys.create((14 * this.gridsize) + this.gridsize/2, (14 * this.gridsize) + this.gridsize/2, 'key');
        this.key3 = this.keys.create((4 * this.gridsize) + this.gridsize/2, (6 * this.gridsize) + this.gridsize/2, 'key');
        this.key4 = this.keys.create((14 * this.gridsize) + this.gridsize/2, (6 * this.gridsize) + this.gridsize/2, 'key');
        this.keycollected = 0;

        this.pills = this.add.physicsGroup();
        this.pills.enableBody = true;
        this.pill1 = this.pills.create((4 * this.gridsize) + this.gridsize/2, (10 * this.gridsize) + this.gridsize/2, 'pill');
        this.pill2 = this.pills.create((14 * this.gridsize) + this.gridsize/2, (10 * this.gridsize) + this.gridsize/2, 'pill');
        this.pill3 = this.pills.create((9 * this.gridsize) + this.gridsize/2, (14 * this.gridsize) + this.gridsize/2, 'pill');
        this.pill4 = this.pills.create((9 * this.gridsize) + this.gridsize/2, (6 * this.gridsize) + this.gridsize/2, 'pill');
        this.numPills = 4;

		// Our hero
        this.pacman = new Pacman(this, "pacman");

        // Score and debug texts
        this.scoreText = game.add.text(8, 272, "Score: " + this.score, { fontSize: "16px", fill: "#fff" });
        this.debugText = game.add.text(375, 260, "", { fontSize: "12px", fill: "#fff" });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors["d"] = this.input.keyboard.addKey(Phaser.Keyboard.D);
        this.cursors["b"] = this.input.keyboard.addKey(Phaser.Keyboard.B);

        this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;

        // Ghosts
        this.blinky = new Ghost(this, "ghosts", "blinky", {x:8, y:10}, Phaser.RIGHT);
        this.pinky = new Ghost(this, "ghosts", "pinky", {x:8, y:10}, Phaser.LEFT);
        this.inky = new Ghost(this, "ghosts", "inky", {x:9, y:10}, Phaser.RIGHT);
        this.clyde = new Ghost(this, "ghosts", "clyde", {x:9, y:8}, Phaser.LEFT);
        this.ghosts.push(this.clyde, this.pinky, this.inky, this.blinky);

        this.sendExitOrder(this.pinky);
        this.sendExitOrder(this.clyde);
        this.sendExitOrder(this.inky);
    },

    checkKeys: function () {
        this.pacman.checkKeys(this.cursors);

        if (this.lastKeyPressed < this.time.time) {
            if (this.cursors.d.isDown) {
                this.DEBUG_ON = (this.DEBUG_ON) ? false : true;
                this.lastKeyPressed = this.time.time + this.KEY_COOLING_DOWN_TIME;
            }
        }
    },

    checkMouse: function() {
        if (this.input.mousePointer.isDown) {
            var x = this.game.math.snapToFloor(Math.floor(this.input.x), this.gridsize) / this.gridsize;
            var y = this.game.math.snapToFloor(Math.floor(this.input.y), this.gridsize) / this.gridsize;
            this.debugPosition = new Phaser.Point(x * this.gridsize, y * this.gridsize);
            console.log(x, y);
        }
    },

    dogEatsDog: function(pacman, ghost) {
        if (this.isPaused) {
            this[ghost.name].mode = this[ghost.name].RETURNING_HOME;
            this[ghost.name].ghostDestination = new Phaser.Point(9 * this.gridsize, 10 * this.gridsize);
            this.score += 10;
        } else {
            this.killPacman();
        }
    },

    getCurrentMode: function() {
        if (!this.isPaused) {
            if (this.TIME_MODES[this.currentMode].mode === "scatter") {
                return "scatter";
            } else {
                return "chase";
            }
        } else {
            return "random";
        }
    },

    gimeMeExitOrder: function(ghost) {
        this.game.time.events.add(Math.random() * 3000, this.sendExitOrder, this, ghost);
    },

    killPacman: function() {
        this.pacman.isDead = true;
        this.stopGhosts();
    },

    stopGhosts: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].mode = this.ghosts[i].STOP;
        }
    },

    update: function () {
        this.scoreText.text = "Score: " + this.score;
        if (this.DEBUG_ON) {
            this.debugText.text = "Debug ON";
        } else {
            this.debugText.text = "";
        }

        if (!this.pacman.isDead) {
            for (var i=0; i<this.ghosts.length; i++) {
                if (this.ghosts[i].mode !== this.ghosts[i].RETURNING_HOME) {
                    this.physics.arcade.overlap(this.pacman.sprite, this.ghosts[i].ghost, this.dogEatsDog, null, this);
                }
            }

            if (this.TIME_MODES[this.currentMode].time !== -1 && !this.isPaused && this.changeModeTimer < this.time.time) {
                this.currentMode++;
                this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;
                if (this.TIME_MODES[this.currentMode].mode === "chase") {
                    this.sendAttackOrder();
                } else {
                    this.sendScatterOrder();
                }
                //console.log("new mode:", this.TIME_MODES[this.currentMode].mode, this.TIME_MODES[this.currentMode].time);
            }
            if (this.isPaused && this.changeModeTimer < this.time.time) {
                this.changeModeTimer = this.time.time + this.remainingTime;
                this.isPaused = false;
                if (this.TIME_MODES[this.currentMode].mode === "chase") {
                    this.sendAttackOrder();
                } else {
                    this.sendScatterOrder();
                }
                //console.log("new mode:", this.TIME_MODES[this.currentMode].mode, this.TIME_MODES[this.currentMode].time);
            }
        }

        this.pacman.update();
		this.updateGhosts();

        this.checkKeys();
        this.checkMouse();
    },

    enterFrightenedMode: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].enterFrightenedMode();
        }
        if (!this.isPaused) {
            this.remainingTime = this.changeModeTimer - this.time.time;
        }
        this.changeModeTimer = this.time.time + this.FRIGHTENED_MODE_TIME;
        this.isPaused = true;
        console.log(this.remainingTime);
    },

    /*isSpecialTile: function(tile) {
        for (var q=0; q<this.SPECIAL_TILES.length; q++) {
            if (tile.x === this.SPECIAL_TILES[q].x && tile.y === this.SPECIAL_TILES[q].y) {
                return true;
            }
        }
        return false;
    }, */

    updateGhosts: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].update();
        }
    },

    render: function() {
        if (this.DEBUG_ON) {
            for (var i=0; i<this.ghosts.length; i++) {
                var color = "rgba(0, 255, 255, 0.6)";
                switch (this.ghosts[i].name) {
                    case "blinky":
                        color = "rgba(255, 0, 0, 0.6";
                        break;
                    case "pinky":
                        color = "rgba(255, 105, 180, 0.6";
                        break;
                    case "clyde":
                        color = "rgba(255, 165, 0, 0.6";
                        break;
                }
                if (this.ghosts[i].ghostDestination) {
                    var x = this.game.math.snapToFloor(Math.floor(this.ghosts[i].ghostDestination.x), this.gridsize);
                    var y = this.game.math.snapToFloor(Math.floor(this.ghosts[i].ghostDestination.y), this.gridsize);
                    this.game.debug.geom(new Phaser.Rectangle(x, y, this.gridsize, this.gridsize), color);
                }
            }
            if (this.debugPosition) {
                this.game.debug.geom(new Phaser.Rectangle(this.debugPosition.x, this.debugPosition.y, this.gridsize, this.gridsize), "#00ff00");
            }
        } else {
            this.game.debug.reset();
        }
    },

    sendAttackOrder: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].attack();
        }
    },

    sendExitOrder: function(ghost) {
        ghost.mode = this.clyde.EXIT_HOME;
    },

    sendScatterOrder: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].scatter();
        }
    }
};

game.state.add('Game', PacmanGame, true);
