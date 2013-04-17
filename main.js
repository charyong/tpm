
var Path = require('path');
var Fs = require('fs');
var Optimist = require('optimist');

var Util = require(__dirname + '/util');

var TASK_MAP = {
	build : true,
	min : true,
	deploy : true,
	diff : true,
	cleanup : true,
};

Optimist.usage([
	'Usage: tpm [command] --config=[/path/to/config-file]\n\n',
	'Examples:\n',
	'tpm src/js/g.js\n',
	'tpm src/css/g.less\n',
	'tpm min build/js/g.js\n',
	'tpm diff 100\n',
	'tpm deploy src/js/page/play wwwtest\n',
	'tpm cleanup\n',
].join(''));

var ARGV = Optimist.argv;

if (ARGV.help || ARGV.h) {
	Optimist.showHelp();
	process.exit();
}

if (ARGV.version || ARGV.v) {
	var packageInfo = JSON.parse(Util.readFileSync(__dirname + '/package.json', 'utf-8'));
	console.log(packageInfo.version);
	process.exit();
}

if (ARGV._.length < 1) {
	Optimist.showHelp();
	process.exit();
}

var cmd;
var args;

if (TASK_MAP[ARGV._[0]]) {
	cmd = ARGV._[0];
	args = ARGV._.slice(1);
} else {
	cmd = 'build';
	args = ARGV._;
}

var config = {};

var dirPath = args.length > 0 ? Path.dirname(args[0]) : '.';

while (true) {
	var path = Util.undef(ARGV.config, dirPath + '/config.json');

	if (Fs.existsSync(path)) {
		config = JSON.parse(Util.readFileSync(path, 'utf-8'));
		break;
	}

	if (Path.resolve(dirPath + '/../') == dirPath) {
		break;
	}

	dirPath = Path.resolve(dirPath + '/../');
}

var Task = require(__dirname + '/tasks/' + cmd);

Task.run(args, config);
