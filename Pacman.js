var Pacman = function(game, key) {   
    this.game = game;
    this.key = key;
    
    this.speed = 150;
    this.life = 3;
    this.isDead = false;
    this.isAnimatingDeath = false;
    this.keyPressTimer = 0;
    
    this.gridsize = this.game.gridsize;
    this.safetiles = this.game.safetile;

    this.marker = new Phaser.Point();
    this.turnPoint = new Phaser.Point();
    this.threshold = 6;

    this.directions = [ null, null, null, null, null ];
    this.opposites = [ Phaser.NONE, Phaser.RIGHT, Phaser.LEFT, Phaser.DOWN, Phaser.UP ];

    this.current = Phaser.NONE;
    this.turning = Phaser.NONE;
    this.want2go = Phaser.NONE;
    this.lastMove = Phaser.NONE;
    
    this.keyPressTimer = 0;
    this.KEY_COOLING_DOWN_TIME = 250;
    
    //  Position Pacman at grid location 14x17 (the +8 accounts for his anchor)
    this.sprite = this.game.add.sprite((9 * this.gridsize) + this.gridsize/2, (14 * this.gridsize) + this.gridsize/2, key, 0);
    this.sprite.anchor.setTo(0.5);
    this.sprite.animations.add('munch', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
    this.sprite.animations.add('armed', [8, 9, 10, 11, 12, 13, 14, 15], 20, true);
    // this.sprite.animations.add("death", [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 10, false);
    
    this.game.physics.arcade.enable(this.sprite);
    this.sprite.body.setSize(32, 32, 0, 0);
    
    this.sprite.play('munch');
    this.move(Phaser.LEFT);
};

Pacman.prototype.move = function(direction) {
    if (direction === Phaser.NONE) {
        this.sprite.body.velocity.x = this.sprite.body.velocity.y = 0;
        return;
    }
    
    var speed = this.speed;

    if (direction === Phaser.LEFT || direction === Phaser.UP)
    {
        speed = -speed;
    }

    if (direction === Phaser.LEFT || direction === Phaser.RIGHT)
    {
        this.sprite.body.velocity.x = speed;
    }
    else
    {
        this.sprite.body.velocity.y = speed;
    }

    //  Reset the scale and angle (Pacman is facing to the right in the sprite sheet)
    this.sprite.scale.x = 1;
    this.sprite.angle = 0;

    if (direction === Phaser.LEFT)
    {
        this.sprite.scale.x = -1;
    }
    else if ((direction === Phaser.UP || direction === Phaser.DOWN) && this.lastMove == Phaser. LEFT)
    {
        this.sprite.scale.x = -1;
    }

    this.current = direction;
};

Pacman.prototype.update = function() {
    // console.log("is dead " + this.isDead);
    if (!this.isDead) {
        this.game.physics.arcade.collide(this.sprite, this.game.layer);
        this.game.physics.arcade.overlap(this.sprite, this.game.keys, this.eatDot, null, this);
        this.game.physics.arcade.overlap(this.sprite, this.game.pills, this.eatPill, null, this);

        this.marker.x = this.game.math.snapToFloor(Math.floor(this.sprite.x), this.gridsize) / this.gridsize;
        this.marker.y = this.game.math.snapToFloor(Math.floor(this.sprite.y), this.gridsize) / this.gridsize;

        if (this.marker.x < 0) {
            this.sprite.x = this.game.map.widthInPixels - 1;
        }
        if (this.marker.x >= this.game.map.width) {
            this.sprite.x = 1;
        }

        //  Update our grid sensors
        this.directions[1] = this.game.map.getTileLeft(this.game.layer.index, this.marker.x, this.marker.y);
        this.directions[2] = this.game.map.getTileRight(this.game.layer.index, this.marker.x, this.marker.y);
        this.directions[3] = this.game.map.getTileAbove(this.game.layer.index, this.marker.x, this.marker.y);
        this.directions[4] = this.game.map.getTileBelow(this.game.layer.index, this.marker.x, this.marker.y);

        if (this.turning !== Phaser.NONE)
        {
            this.turn();
        }

        if (this.game.keys.total === 0 && this.marker.x == 17 && this.marker.y == 14)
        {
            this.game.winGame();
        }
    } else {
        this.move(Phaser.NONE);
        if (!this.isAnimatingDeath) {
            // this.sprite.play("death");
            this.isAnimatingDeath = true;
        }
    }
};

Pacman.prototype.checkKeys = function(cursors) {
    if (cursors.left.isDown ||
        cursors.right.isDown ||
        cursors.up.isDown ||
        cursors.down.isDown) {
        // console.log("key pressed");
        this.keyPressTimer = this.game.time.time + this.KEY_COOLING_DOWN_TIME;
    }

    if (cursors.left.isDown && this.current !== Phaser.LEFT)
    {
        this.want2go = Phaser.LEFT;
    }
    else if (cursors.right.isDown && this.current !== Phaser.RIGHT)
    {
        this.want2go = Phaser.RIGHT;
    }
    else if (cursors.up.isDown && this.current !== Phaser.UP)
    {
        this.want2go = Phaser.UP;
    }
    else if (cursors.down.isDown && this.current !== Phaser.DOWN)
    {
        this.want2go = Phaser.DOWN;
    }

    if (this.game.time.time > this.keyPressTimer)
    {
        //  This forces them to hold the key down to turn the corner
        this.turning = Phaser.NONE;
        this.want2go = Phaser.NONE;
    } else {
        this.checkDirection(this.want2go);
    }
};

Pacman.prototype.eatDot = function(pacman, key) {
    key.kill();
    
    this.game.score += 100;
    this.game.numKeys --;
    this.game.sound.playPickupKey();
    if (this.game.numKeys > 0)
        this.game.keys.getChildAt(4 - this.game.numKeys).revive();
};

Pacman.prototype.eatPill = function(pacman, pill) {
    pill.kill();
    
    // this.game.score += 100;
    this.game.numPills --;

    this.sprite.play('armed');
    this.game.sound.playBgmAttack();
    this.game.enterFrightenedMode();
    this.killCombo = 0;
};

Pacman.prototype.turn = function () {
    var cx = Math.floor(this.sprite.x);
    var cy = Math.floor(this.sprite.y);

    //  This needs a threshold, because at high speeds you can't turn because the coordinates skip past
    if (!this.game.math.fuzzyEqual(cx, this.turnPoint.x, this.threshold) || !this.game.math.fuzzyEqual(cy, this.turnPoint.y, this.threshold))
    {
        return false;
    }

    //  Grid align before turning
    this.sprite.x = this.turnPoint.x;
    this.sprite.y = this.turnPoint.y;

    this.sprite.body.reset(this.turnPoint.x, this.turnPoint.y);
    this.move(this.turning);
    this.turning = Phaser.NONE;

    return true;
};

Pacman.prototype.checkDirection = function (turnTo) {
    if (this.game.gameWin === true || this.game.gameOver === true || this.turning === turnTo || this.directions[turnTo] === null || !this.checkSafetile(this.directions[turnTo].index))
    {
        //  Invalid direction if they're already set to turn that way
        //  Or there is no tile there, or the tile isn't index 1 (a floor tile)
        return;
    }

    //  Check if they want to turn around and can
    if (this.current === this.opposites[turnTo])
    {
        this.lastMove = this.current;
        this.move(turnTo);
        this.keyPressTimer = this.game.time.time;
    }
    else
    {
        this.lastMove = this.current;
        this.turning = turnTo;

        this.turnPoint.x = (this.marker.x * this.gridsize) + (this.gridsize / 2);
        this.turnPoint.y = (this.marker.y * this.gridsize) + (this.gridsize / 2);
        this.want2go = Phaser.NONE;
    }
};

Pacman.prototype.getPosition = function () {
    return new Phaser.Point((this.marker.x * this.gridsize) + (this.gridsize / 2), (this.marker.y * this.gridsize) + (this.gridsize / 2));
};

Pacman.prototype.getCurrentDirection = function() {
    return this.current;
};

Pacman.prototype.checkSafetile = function(tileIndex) {
    for (var q=0; q<this.safetiles.length; q++) {
        if (this.safetiles[q] === tileIndex) {
            return true;
        }
    }
    return false;
};

Pacman.prototype.respawn = function () {
    // console.log("pac respawn");
    this.isDead = false;
    this.isAnimatingDeath = false;
    this.sprite.x = 9 * this.gridsize + this.gridsize/2;
    this.sprite.y = 14 * this.gridsize + this.gridsize/2;
    this.sprite.body.reset(this.sprite.x, this.sprite.y);
    this.sprite.play('munch');
    this.move(Phaser.LEFT);
};
