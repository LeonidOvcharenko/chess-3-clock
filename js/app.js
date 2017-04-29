var ajax = {};
ajax.x = function () {
	if (typeof XMLHttpRequest !== 'undefined') {
		return new XMLHttpRequest();
	}
	var versions = [
		"MSXML2.XmlHttp.6.0",
		"MSXML2.XmlHttp.5.0",
		"MSXML2.XmlHttp.4.0",
		"MSXML2.XmlHttp.3.0",
		"MSXML2.XmlHttp.2.0",
		"Microsoft.XmlHttp"
	];
	var xhr;
	for (var i = 0; i < versions.length; i++) {
		try {
			xhr = new ActiveXObject(versions[i]);
			break;
		} catch (e) {
		}
	}
	return xhr;
};
ajax.send = function (url, callback, method, data, async) {
	if (async === undefined) {
		async = true;
	}
	var x = ajax.x();
	x.open(method, url, async);
	x.onreadystatechange = function () {
		if (x.readyState == 4) {
			var data = x.responseText || '';
			try { data = JSON.parse(data); } catch(e) {}
			callback(data);
		}
	};
	if (method == 'POST') {
		x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	}
	x.send(data)
};
ajax.get = function (url, data, callback, async) {
	var query = [];
	for (var key in data) {
		query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
	}
	ajax.send(url + (query.length ? '?' + query.join('&') : ''), callback, 'GET', null, async)
};
ajax.post = function (url, data, callback, async) {
	var query = [];
	for (var key in data) {
		query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
	}
	ajax.send(url, callback, 'POST', query.join('&'), async)
};

ajax.api = function(func, data, callback) {

};

Ractive.DEBUG = false;
var A = {
	button: new Audio('audio/button.wav'),
	tick: new Audio('audio/tick.wav'),
	warn: new Audio('audio/warning.wav'),
	tack: new Audio('audio/end.wav')
};
var Game = new Ractive({
	el: 'content',
	template: '#content-tpl',
	data: {
		remote_session: false,
		session: '',
		session_player: 0,
		session_status: '',
		state: 'init',
		time: 10,
		start: 0,
		round: 0,
		paused: false,
		now: 0,
		remote_now: 0,  // msec
		remote_player_started: {s0:0,s1:0,s2:0,s3:0},  // sec
		turn: '?',
		player: null,
		players: [{
			colorclass: 'white',
			buttonclass: 'secondary',
			title: 'Белые',
			title_: 'белых',
			elapsed: 0,
			remained: 0,
			started: 0,
		},{
			colorclass: 'danger',
			buttonclass: 'danger',
			title: 'Красные',
			title_: 'красных',
			elapsed: 0,
			remained: 0,
			started: 0
		},{
			colorclass: 'black',
			buttonclass: 'black',
			title: 'Чёрные',
			title_: 'чёрных',
			elapsed: 0,
			remained: 0,
			started: 0
		},{
			colorclass: '-',
			buttonclass: '-',
			title: 'Пауза',
			title_: '-',
			elapsed: 0,
			remained: 0,
			started: 0
		}],
		ss: function(ms){
			var ss = Math.floor(Math.abs(ms) / 1000) % 60;
			var sign = (ms < 0 && ss > 0) ? '—' : '';
			return sign + (ss < 10 ? '0' : '') + ss;
		},
		mm: function(ms){
			var mm = Math.floor(Math.abs(ms) / 60000) % 60;
			var sign = (ms < 0 && mm > 0) ? '—' : '';
			return sign + (mm < 10 ? '0' : '') + mm;
		},
		N: function(n, strings){
			plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);
			return strings[plural];
		},
		ended: '?',
		ended_in: 0 /* msec */
	}
});
Game.reset_autostart = function(){
	if (Game.autostart) {
		clearInterval(Game.autostart);
		Game.autostart = null;
	}
};
Game.set_autostart = function(code, player){
	Game.autostart = setInterval(function(){
		ajax.get('/c3/sync.php', { action: 'watch_start', code: code, player: player }, function(res){
			if (res.start) {
				Game.set({
					time: res.duration,
					remote_now: res.time
				});
				Game.fire('start-game');
				Game.reset_autostart();
			}
		});
	}, 500);
};
Game.set_timer = function(){
	Game.timer = setInterval(function(){
		Game.set('now', Date.now());
	}, 250);
};
Game.reset_timer = function(){
	if (Game.timer) {
		clearInterval(Game.timer);
		Game.timer = null;
		
		if (Game.get('remote_session')) {
			var code = Game.get('session');
			ajax.get('/c3/sync.php', { action: 'end', code: code }, function(res){
				Game.set('ended_in', res.ended_in*1000-Game.get('players.3.elapsed'));
			});
		}
	}
};
Game.on({
	'sync-app': function(){
		Game.reset_autostart();
		if (!Game.get('remote_session')) return;
		var code = Game.get('session');
		var player = Game.get('session_player');
		if (code && player!='?') {
			ajax.get('/c3/sync.php', { action: 'reg', code: code, player: player }, function(res){
				Game.set('session_status', res.status == 'ready' ? 'ready' : 'error');
				if (player != 0) Game.set_autostart(code, player);
			});
		} else {
			Game.set('session_status', 'error');
		}
	},
	'start-game': function(){
		this.set({
			'state': 'run',
			'players.*.started': 0,
			'players.*.elapsed': 0,
			'players.*.remained': this.get('time')*60000,
			'turn': 0,
			'round': 0,
			'start': Date.now(),
			'now': Date.now(),
			'retired': '?',
			'ended': '?'
		});
		this.set_timer();
		var player = Game.get('session_player');
		if (Game.get('remote_session') && player == 0) {
			var code = Game.get('session');
			var time = Game.get('time');
			ajax.get('/c3/sync.php', { action: 'start', code: code, player: player, duration: time }, function(res){
				Game.set({
					remote_player_started: {s0:res.time, s1:0, s2:0, s3:0}
				});
			});
		}
		A.tack.play();
	},
	'end-game': function(){
		this.set({
			'state': 'end',
			'turn': '?',
			'paused': false,
			'ended_in': this.get('now') - this.get('start') - this.get('players.3.elapsed')
		});
		this.reset_timer();
		A.tack.play();
	},
	'init-game': function(){
		this.set('state', 'init');
	},
	'pause-game': function(){
		var current = this.get();
		var next = {paused: !current.paused};
		if (current.paused) {
			next.turn = current.last_turn;
			next.last_turn = null;
		} else {
			next.turn = 3;
			next.last_turn = current.turn;
		}
		this.set(next);
		if (Game.get('remote_session')) {
			var code = this.get('session');
			var elapsed = Math.floor( Game.get('players.'+next.turn+'.elapsed') / 1000 );
			ajax.get('/c3/sync.php', { action: 'switch', code: code, player: next.turn, elapsed: elapsed, sign: '!' }, function(res){
				Game.set('remote_player_started', res);
			});
		}
	},
	'turn-forward': function(){
		A.button.play();
		var next = (this.get('turn')+1) % 3;
		if (next==this.get('retired')) next = (next+1) % 3;
		this.set('turn', next);
		/* if (next == 0) */ this.add('round', 1);
		
		if (Game.get('remote_session')) {
			var code = Game.get('session');
			var elapsed = Math.floor( Game.get('players.'+next+'.elapsed') / 1000 );
			ajax.get('/c3/sync.php', { action: 'switch', code: code, player: next, elapsed: elapsed, sign: '+' }, function(res){
				Game.set('remote_player_started', res);
			});
		}
	},
	'turn-backward': function(){
		A.button.play();
		var prev = (this.get('turn')+2) % 3;
		if (prev==this.get('retired')) prev = (prev+2) % 3;
		this.set('turn', prev);
		/* if (prev == 2) */ this.subtract('round', 1);
		
		if (Game.get('remote_session')) {
			var code = Game.get('session');
			var elapsed = Math.floor( Game.get('players.'+prev+'.elapsed') / 1000 );
			ajax.get('/c3/sync.php', { action: 'switch', code: code, player: prev, elapsed: elapsed, sign: '-' }, function(res){
				Game.set('remote_player_started', res);
			});
		}
	}
});
Game.observe({
	'remote_session': function(v){
		if (v) {
			Game.set({}).then(function() {
				Game.find('#group-name').select();
			});
		}
	},
	'remote_session session session_player': function(){
		Game.set('session_status', '');
	},
	'turn': function(next, current){
		if (this.get('state')!='run') return;
		if (current != '?') {
			this.set('players.'+current+'.started', 0);
		}
		if (next != '?') {
			var player_id = 'players.'+next;
			this.set('player', this.get(player_id));
			var next_elapsed = this.get(player_id+'.elapsed');
			if (!this.get('remote_session')) {
				var now = this.get('now');
				this.set(player_id+'.started', now - next_elapsed);
			}
		}
	},
	'remote_player_started': function(data){
		if (this.get('remote_session')) {
			for (var i=0;i<=3;i++){
				var player_id = 'players.'+i;
				// var next_elapsed = this.get(player_id+'.elapsed');
				var started = data['s'+i] || 0;
				if (started>0) {
					this.set(player_id+'.started', started*1000);
				}
			}
		}
	},
	'now': function(now){
		if (this.get('state')!='run' || this.get('turn')=='?') return;
		var update_times = function(t, i, s){
			var player_id = 'players.'+i;
			var started = Game.get(player_id+'.started') || t-1;
			var time = Game.get('time')*60000;
			Game.set(player_id+'.elapsed', t - started);
			Game.set(player_id+'.remained', time - t + started);
			Game.update('player.remained');
			
			var rem = Game.get('player.remained');
			var new_s = Math.round(t/1000)%10;
			if ((s != new_s) && !Game.get('paused')) {
				((rem <= 1000) ? A.tack : (rem <= 11000) ? A.warn : A.tick ).play();
			}
			return new_s;
		};
		
		if (Game.get('remote_session')) {
			var code = Game.get('session');
			ajax.get('/c3/sync.php', { action: 'tick', code: code }, function(res){
				Game.set('round', res.rounds);
				if (res.ended_in > 0) {
					Game.set('ended', Game.get('turn'));
					Game.fire('end-game');
					return;
				}
				Game.tick = update_times(res.time*1000, Game.get('turn'), Game.tick);
				Game.set({
					remote_now: res.time,
					turn: Game.get('last_turn')==null ? res.turn : 3,
					paused: res.turn==3,
					remote_player_started: res
				});
			});
		} else {
			Game.tick = update_times(now, Game.get('turn'), Game.tick);
		}
	},
	'player.remained': function(remained){
		var turn = this.get('turn');
		if (this.get('state')!='run' || turn=='?') return;
		if (remained<=0) {
			if (this.get('retired')=='?') {
				this.set('retired', turn);
				this.fire('turn-forward');
			} else if (this.get('retired')!=turn) {
				this.set('ended', turn);
				this.fire('end-game');
			}
		}
	}
});