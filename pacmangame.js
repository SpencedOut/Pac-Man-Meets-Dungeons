var game = new Phaser.Game(1216/2, 1344/2, Phaser.AUTO, "game");

var PacmanGame = function (game) {    
    this.map = null;
    this.layer = null;
    this.item = null;
    
    this.numKeys = 4;
    this.TOTAL_KEYS = 0;
    this.score = 0;
    this.scoreText = null;
    
    this.pacman = null; 
    this.clyde = null;
    this.pinky = null;
    this.inky = null;
    this.blinky = null;
    this.isInkyOut = false;
    this.isClydeOut = false;
    this.gameOver = false;
    this.gameWin = false;
    this.ghosts = [];
    this.livesImage = [];

    this.safetile = [12, 13, 14, 21, 22, 23, 30, 31, 32, 37, 46, 62, 65, 66, 71, 75, 76];
    this.gridsize = 32;
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
    
    this.ORIGINAL_OVERFLOW_ERROR_ON = false;
    this.DEBUG_ON = false;
    
    this.KEY_COOLING_DOWN_TIME = 250;
    this.lastKeyPressed = 0;

    this.isGameOver = false;
    
    this.game = game;
    this.sounds = null;
    this.killCombo = 0;

    this.treasure;
    this.chest1Unlocked = false;
    this.chest2Unlocked = false;
};

PacmanGame.prototype = {

    init: function () {
        if (this.game.sound.context.state === 'suspended') {
            this.game.sound.context.resume();
        }
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        // this.scale.pageAlignVertically = true;

        Phaser.Canvas.setImageRenderingCrisp(this.game.canvas); // full retro mode, i guess ;)

        this.physics.startSystem(Phaser.Physics.ARCADE);
        this.sound = new Sounds(this);
    },

    preload: function () {
        this.load.image('tiles', 'assets/tile32.png');
        this.load.image("lifecounter", "assets/heart32.png");
        this.load.spritesheet('key_yellow', 'assets/pickups/yellow-key-sparkle.png', 32, 32);
        this.load.spritesheet('key_red', 'assets/pickups/red-key-sparkle.png', 32, 32);
        this.load.spritesheet('key_blue', 'assets/pickups/blue-key-sparkle.png', 32, 32);
        this.load.spritesheet('key_green', 'assets/pickups/green-key-sparkle.png', 32, 32);
        this.load.image('sword', 'assets/pickups/sword-big.png');
        this.load.tilemap('map', 'assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
        this.load.spritesheet('hero', 'assets/hero/elf-right-armed.png', 32, 32);
        this.load.spritesheet('monster1', 'assets/monsters/zombie_red_sheet.png', 32, 32);
        this.load.spritesheet('monster2', 'assets/monsters/zombie_pink_sheet.png', 32, 32);
        this.load.spritesheet('monster3', 'assets/monsters/zombie_blue_sheet.png', 32, 32);
        this.load.spritesheet('monster4', 'assets/monsters/zombie_orange_sheet.png', 32, 32);
        // this.load.spritesheet('hero-new', 'assets/hero/elf-right-armed.png', 32, 32);
        this.load.spritesheet('treasure', 'assets/pickups/treasure.png', 32, 32);
        this.load.spritesheet('torch', 'assets/props/torch.png', 32, 32);
        this.load.spritesheet('grass', 'assets/props/grass.png', 32, 32);
        this.sound.loadAllSounds();
    },

    create: function () {
        this.sound.createAllInstances();
        this.map = this.add.tilemap('map');
        this.map.addTilesetImage('tile32', 'tiles');

        this.layer = this.map.createLayer('background');
        this.item = this.map.createLayer('items');

        this.keys = this.add.physicsGroup();
        this.key1 = this.map.createFromTiles(42, 22, 'key_yellow', this.item, this.keys);
        this.key2 = this.map.createFromTiles(2, 22, 'key_red', this.item, this.keys);
        this.key3 = this.map.createFromTiles(38, 21, 'key_blue', this.item, this.keys);
        this.key4 = this.map.createFromTiles(6, 22, 'key_green', this.item, this.keys);
        this.TOTAL_KEYS = this.numKeys;
        for (var i = 0; i < this.numKeys; i++) {
            this.keys.children[i].animations.add('shine', [0, 0, 0, 0, 1, 2, 3, 4, 5], 8, true);
            this.keys.children[i].play('shine');
        }
        for (var i = 1; i < this.numKeys; i++) {
            this.keys.children[i].kill();
        }

        // Very fast but inefficient solutions used here
        this.torchLeft = this.add.group();
        var torchNum = this.map.createFromTiles(58, -1, 'torch', this.item, this.torchLeft);
        for (var i = 0; i < torchNum; i++) {
            this.torchLeft.children[i].rotation = -3.141562 / 3.5;
            this.torchLeft.children[i].anchor.x = 0.5;
            this.torchLeft.children[i].anchor.y = -0.4;
            this.torchLeft.children[i].animations.add('flame', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 16, true);
            this.torchLeft.children[i].play('flame');
        }

        this.torchUp = this.add.group();
        torchNum = this.map.createFromTiles(60, -1, 'torch', this.item, this.torchUp);
        for (var i = 0; i < torchNum; i++) {
            this.torchUp.children[i].rotation = 3.141562 / 3.5;
            this.torchUp.children[i].anchor.x = 0;
            this.torchUp.children[i].anchor.y = 0.5;
            this.torchUp.children[i].animations.add('flame', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 16, true);
            this.torchUp.children[i].play('flame');
        }

        this.torchRight = this.add.group();
        torchNum = this.map.createFromTiles(50, -1, 'torch', this.item, this.torchRight);
        for (var i = 0; i < torchNum; i++) {
            this.torchRight.children[i].anchor.y = -0.2;
            this.torchRight.children[i].animations.add('flame', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 16, true);
            this.torchRight.children[i].play('flame');
        }

        this.torchDown = this.add.group();
        torchNum = this.map.createFromTiles(68, -1, 'torch', this.item, this.torchDown);
        for (var i = 0; i < torchNum; i++) {
            this.torchDown.children[i].rotation = 3.141562;
            this.torchDown.children[i].anchor.x = 1;
            this.torchDown.children[i].anchor.y = 0.86;
            this.torchDown.children[i].animations.add('flame', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 16, true);
            this.torchDown.children[i].play('flame');
        }

        this.grass = this.add.group();
        var grassNum = this.map.createFromTiles(67, -1, 'grass', this.item, this.grass);
        for (var i = 0; i < grassNum; i++) {
            this.grass.children[i].animations.add('wave', [0, 1, 2, 3, 4, 5], 16, true);
            this.grass.children[i].play('wave');
        }



        
        this.treasure = this.add.physicsGroup();
        this.map.createFromTiles(70, -1, 'treasure', this.item, this.treasure);
        this.map.createFromTiles(71, -1, 'treasure', this.item, this.treasure);

        this.chest1 = this.treasure.children[0];
        this.chest2 = this.treasure.children[1];
        this.chest1.anchor = {type: 25, x: 0, y: -0.2};
        this.chest2.anchor = {type: 25, x: 0, y: -0.2};
        this.chest1.animations.add('unlocked', [2, 3, 4, 5], 8, true);
        this.chest2.animations.add('unlocked', [2, 3, 4, 5], 8, true);
        this.chest1.name = '1';
        this.chest2.name = '2';


        
        this.pills = this.add.physicsGroup();
        this.numPills = this.map.createFromTiles([59, 80], [13, 31], "sword", this.item, this.pills);

        //  The keys will need to be offset by 12px to put them back in the middle of the grid
        // this.keys.setAll('x', 12, false, false, 1);
        // this.keys.setAll('y', 12, false, false, 1);

        //  Pacman should collide with everything except the safe tile
        this.map.setCollisionByExclusion(this.safetile, true, this.layer);
        this.map.setCollisionByExclusion([35], true, this.item);

		// Our hero
        this.pacman = new Pacman(this, "hero");
        for (var i =  0; i < this.pacman.life; i++) {
            this.livesImage.push(this.add.image(490 + (i * 32), 400, 'lifecounter'));
        }

        // Score and debug texts
        this.scoreText = this.game.add.text(20, 272, "Score: " + this.score, { fontSize: "24px", fill: "#fff" });
        this.winText = this.game.add.text(230, 140, "", { fontSize: "36px", fill: "#fff" });
        this.loseText = this.game.add.text(230, 140, "", { fontSize: "36px", fill: "#fff" });
        this.loseHint = this.game.add.text(190, 230, "", { fontSize: "24px", fill: "#fff" });
        
        this.cursors = this.game.input.keyboard.createCursorKeys();
        this.cursors["d"] = this.game.input.keyboard.addKey(Phaser.Keyboard.D);
        this.cursors["r"] = this.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
        //this.game.time.events.add(1250, this.sendExitOrder, this);
        //this.game.time.events.add(7000, this.sendAttackOrder, this);
        
        this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;
        
        // Ghosts
        // debugger;
        this.blinky = new Ghost(this, "monster1", "blinky", {x:9, y:8}, Phaser.RIGHT);
        this.pinky = new Ghost(this, "monster2", "pinky", {x:9, y:10}, Phaser.LEFT);
        this.inky = new Ghost(this, "monster3", "inky", {x:8, y:10}, Phaser.LEFT);
        this.clyde = new Ghost(this, "monster4", "clyde", {x:10, y:10}, Phaser.RIGHT);
        this.ghosts.push(this.clyde, this.pinky, this.inky, this.blinky);
        
        this.gimeMeExitOrder(this.pinky);
        this.sound.playBgm();
    },

    update: function () {
        this.scoreText.text = "Score: " + this.score;
        if (this.gameWin == true) {
            this.winText.text = "You Win!";
        } else {
            this.winText.text = "";
        }
        if (this.gameOver == true) {
            this.loseText.text = "You Lose!";
            this.loseHint.text = "Press Enter to restart.";
        } else {
            this.loseText.text = "";
            this.loseHint.text = "";
        }
        
        if (!this.pacman.isDead) {
            for (var i=0; i<this.ghosts.length; i++) {
                if (this.ghosts[i].mode !== this.ghosts[i].RETURNING_HOME) {
                    this.physics.arcade.overlap(this.pacman.sprite, this.ghosts[i].ghost, this.dogEatsDog, null, this);
                }
            }

            if (this.TOTAL_KEYS - this.numKeys === 1 && !this.isInkyOut) {
                this.isInkyOut = true;
                this.sendExitOrder(this.inky);
            }
            
            if (this.TOTAL_KEYS - this.numKeys === 2 && !this.isClydeOut) {
                this.isClydeOut = true;
                this.sendExitOrder(this.clyde);
            }

            if (this.TIME_MODES[this.currentMode].time !== -1 && !this.isPaused && this.changeModeTimer < this.time.time) {
                this.currentMode++;
                this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;
                if (this.TIME_MODES[this.currentMode].mode === "chase") {
                    this.sendAttackOrder();
                } else {
                    this.sendScatterOrder();
                }
                // console.log("new mode:", this.TIME_MODES[this.currentMode].mode, this.TIME_MODES[this.currentMode].time);
            }
            if (this.isPaused && this.changeModeTimer < this.time.time) {
                this.changeModeTimer = this.time.time + this.remainingTime;
                this.isPaused = false;
                this.pacman.sprite.play('munch');
                if (this.TIME_MODES[this.currentMode].mode === "chase") {
                    this.sendAttackOrder();
                } else {
                    this.sendScatterOrder();
                }
                this.sound.playBgm();
                this.killCombo = 0;
                // console.log("new mode:", this.TIME_MODES[this.currentMode].mode, this.TIME_MODES[this.currentMode].time);
            }
        }

        this.pacman.update();
        this.updateLife();
		this.updateGhosts();
        for (var i=0; i< this.ghosts.length; i++)
            // console.log(this.ghosts[i].name, this.ghosts[i].currentDir, this.ghosts[i].mode);

        this.checkKeys();
        this.checkMouse();
        

        if (this.score >= 6000) {
            this.pacman.life++;
            this.score -= 6000;
            if (this.pacman.life > 3) {
                this.pacman.life = 3;
            }
        }

        if ((this.gameOver == true || this.gameWin == true) && this.cursors.r.isDown)
            this.newGame();
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
    },
    
    /* isSpecialTile: function(tile) {
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
                    this.game.debug.geom(new Phaser.Rectangle(x, y, 16, 16), color);
                }
                this.game.debug.body(this.ghosts[i].ghost);
                this.game.debug.body(this.pacman.sprite);
            }
            if (this.debugPosition) {
                this.game.debug.geom(new Phaser.Rectangle(this.debugPosition.x, this.debugPosition.y, 16, 16), "#00ff00");
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
        if (ghost.mode === ghost.AT_HOME)
            ghost.mode = ghost.EXIT_HOME;
    },
    
    sendScatterOrder: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].scatter();
        }
    },

    updateLife: function() {
        for (var i = this.pacman.life; i < 3; i++) {
            var image = this.livesImage[i];
            if (image) {
                image.alpha = 0;
            }
        }
    },

    respawn: function() {
        this.currentMode = 0;
        this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;
        this.isPaused = false;
        this.remainingTime = 0;
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].respawn();
        }
        this.pacman.respawn();
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
        }
    },

    dogEatsDog: function(pacman, ghost) {
        if (Phaser.Math.distance(pacman.x, pacman.y, ghost.x, ghost.y) < 25) {
            if (this[ghost.name].mode === this[ghost.name].RANDOM) {
                this.sound.playKillEnemy();
                this[ghost.name].mode = this[ghost.name].RETURNING_HOME;
                this[ghost.name].ghostDestination = new Phaser.Point(14 * this.gridsize, 14 * this.gridsize);
                switch(this.killCombo++) {
                    case 0:
                        this.score += 200;
                        break;
                    case 1:
                        this.score += 400;
                        break;
                    case 2:
                        this.score += 800;
                        break;
                    case 3:
                        this.score += 1600;
                        break;
                }
            } else {
                this.killPacman();
                this.lastDieTime = this.time.time;
            }
        }
    },

    checkDieTime: function() {
        if (this.lastDieTime + 2000 > this.time.time)
            return false;
        else return true;
    },

    getCurrentMode: function() {
        if (this.TIME_MODES[this.currentMode].mode === "scatter") {
            return "scatter";
        } else {
            return "chase";
        }
    },

    gimeMeExitOrder: function(ghost) {
        this.game.time.events.add(Math.random() * 3000, this.sendExitOrder, this, ghost);
    },

    killPacman: function() {
        this.pacman.isDead = true;
        this.pacman.life --;
        this.sound.playPlayerDeath();
        this.stopGhosts();
        this.game.time.events.add(1000, function() {
            if(this.pacman.life <= 0) {
                this.gameOver = true;
            }
            else {
                this.respawn();
            }
        }, this, null);
    },

    stopGhosts: function() {
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].mode = this.ghosts[i].STOP;
        }
    },

    winGame: function() {
        if (!this.isGameOver) {
            this.score += 500;
            this.sound.playLevelComplete();
            this.isGameOver = true;
        }
        this.gameWin = true;
        this.stopGhosts();
        this.pacman.move(Phaser.NONE);
    },

    newGame: function() {
        this.gameOver = false;
        this.pacman.life=3;
        this.score=0;
        this.currentMode = 0;
        this.changeModeTimer = this.time.time + this.TIME_MODES[this.currentMode].time;
        this.isPaused = false;
        this.isClydeOut = false;
        this.isInkyOut = false;
        this.gameOver = false;
        this.gameWin = false;
        this.remainingTime = 0;
        this.keys.callAll('kill');
        this.keys.getChildAt(0).revive();
        this.pills.callAll('revive');
        this.numKeys = 4;
        this.numPills = 2;
        for (let i = 0; i < this.pacman.life; i++) {
            let image = this.livesImage[i];
            if(image) {
                image.alpha=1;
            }
        }
        for (var i=0; i<this.ghosts.length; i++) {
            this.ghosts[i].restart();
        }
        this.gimeMeExitOrder(this.pinky);
        this.pacman.respawn();
        this.sound.playBgm();
    },

    unlockChest: function(number) {
        switch(number) {
            case 0:
                this.chest1Unlocked = true;
                this.chest1.play('unlocked');
                break;
            case 1:
                this.chest2Unlocked = true;
                this.chest2.play('unlocked');
                break;
        }
    }
};

game.state.add('Game', PacmanGame, true);