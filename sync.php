<?php

require 'medoo.php';
 
$database = new medoo(array(
	'database_type' => 'mysql',
	'database_name' => 'c3',
	'server' => 'localhost',
	'username' => 'root',
	'password' => '',
	'charset' => 'utf8',
	'port' => 3306
));

# clear old unused games
$old = time() - 24*60*60;
$database->update("games", array(
	"start" => 0,
	"turn" => 0,
	"rounds" => 0,
	"duration" => 10,
	"player_0" => 0,
	"player_1" => 0,
	"player_2" => 0
), array(
	"AND" => array(
		"start[>]" => 0,
		"start[<]" => $old
	)
));

$action   = $_GET['action'] ? $_GET['action'] : '';
$code     = $_GET['code']   ? $_GET['code']   : '';
$player   = isset($_GET['player'])   ? $_GET['player']   : '';
$sign     = isset($_GET['sign'])     ? $_GET['sign']     : '';
$duration = isset($_GET['duration']) ? $_GET['duration'] : 10;
$elapsed  = isset($_GET['elapsed'])  ? $_GET['elapsed']  : 0;

if ($action == 'reg') {
	$status = 'error';
	$exists = $database->select("games", "*", array(
		"code" => $code
	));
	if (count($exists)==0) {
		$database->insert("games", array(
			"code" => $code,
			"turn" => 0
		));
	}
	if ($player>=0 && $player<3 && (count($exists)==0 || $exists[0]['player_'.$player]==0)){
		$reg_time = time();
		$database->update("games", array(
			"player_".$player => $reg_time
		), array(
			"code" => $code
		));
		$status = 'ready';
	} else {
	}
	echo '{"status": "'.$status.'", "start":"'.$reg_time.'"}';
} else if ($action == 'start') {
	if ($player==0) {
		$start = time();
		$database->update("games", array(
			"start" => $start,
			"duration" => $duration,
			"rounds" => 0,
			"player_0" => $start
		), array(
			"code" => $code
		));
	}
	echo '{"status": "ready", "time":"'.($start>0 ? $start : 0).'"}';
} else if ($action == 'watch_start') {
	$started = $database->select("games", array("start", "duration"), array(
		"AND" => array(
			"code" => $code,
			"start[>]" => 0
		)
	));
	echo '{"status": "ready", "time":"'.time().'", "duration":"'.(count($started)>0 ? $started[0]['duration'] : 10).'", "start": '.(count($started)>0 ? $started[0]['start'] : 0 ).'}';
} else if ($action == 'switch') {
	$start = time();
	$database->update("games", array(
		"turn" => $player,
		"rounds[".$sign."]" => 1,
		"player_".$player => $start-$elapsed
	), array(
		"code" => $code
	));
	$game = $database->select("games", "*", array(
		"code" => $code
	));
	echo '{"status": "ready", "time":"'.$start.'", "s0":"'.$game[0]['player_0'].'", "s1":"'.$game[0]['player_1'].'", "s2":"'.$game[0]['player_2'].'"}';
} else if ($action == 'tick') {
	$turn = $database->select("games", "*", array(
		"code" => $code
	));
	$current_player = $turn[0]['turn'];
	$time = ($turn[0]['duration'] >= 0) ? '"started": '.$turn[0]['player_'.$current_player] : '"ended_in": '.(-$turn[0]['duration']);
	echo '{"status": "ready", "time":"'.time().'", "turn":'.$current_player.', '.$time.', "rounds": '.$turn[0]['rounds'].', "s0":"'.$turn[0]['player_0'].'", "s1":"'.$turn[0]['player_1'].'", "s2":"'.$turn[0]['player_2'].'"}';
} else if ($action == 'end') {
	$started = $database->select("games", "*", array(
		"code" => $code
	));
	if ($started[0]['start']==0) {
		$duration = -$started[0]['duration'];
	} else {
		$duration = time()-$started[0]['start'];
		$database->update("games", array(
			"start" => 0,
			"duration" => -$duration,
			"player_0" => 0,
			"player_1" => 0,
			"player_2" => 0
		), array(
			"code" => $code
		));
	}
	echo '{"status": "ready", "ended_in": '.$duration.', "rounds": '.$started[0]['rounds'].'}';
}
# синхронизация времени по белым
?>