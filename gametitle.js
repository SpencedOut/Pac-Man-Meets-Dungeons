var gameTitle = function(game){
	this.game = game;
};

gameTitle.prototype = {
	preload: function() {
		this.game.load.audio('menu', 'assets/audio/main-menu.wav');
		this.game.load.image('main_menu_bg', 'assets/static_title-tues.png');
	},

  	create: function() {
		this.bgm_menu = this.game.add.audio('menu', 1, true);
		if (this.bgm_menu.isPlaying)
			this.bgm_menu.restart();
		this.bgm_menu.play();
		this.game.add.image(0, 0, 'main_menu_bg');
		this.game.add.text(140, 280, "Press Enter to start", { fontSize: "28px", fill: "#fff" });
	},

	update: function() {
		if(this.game.input.keyboard.isDown(Phaser.Keyboard.ENTER)) {
			this.bgm_menu.stop();
			this.game.state.start("TheGame");
		}
	}
};