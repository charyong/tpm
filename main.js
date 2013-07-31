var Path = require('path');
var Fs = require('fs');
var Optimist = require('optimist');

var Util = require(__dirname + '/util');

var TASK_MAP = {
	build : true,
	min : true,
	deploy : true,
	list : true,
	cleanup : true,
	check : true,
	tui2build : true,
	tui2min : true,
	vm : true,
};

Optimist.usage([
	'Usage: ytpm [COMMAND] --config=[CONFIG_FILE]\n\n',
	'Examples:\n',
	'tpm src/js/g.js\n',
	'tpm src/css/g.less\n',
	'tpm min build/js/g.js\n',
	'tpm list 100\n',
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

var cmd;
var args;

if (ARGV._.length > 0 && TASK_MAP[ARGV._[0]]) {
	cmd = ARGV._[0];
	args = ARGV._.slice(1);
} else {
	cmd = 'build';
	args = ARGV._;
}

var config = null;

var dirPath = args.length > 0 ? args[0] : '.';

if (!Fs.existsSync(dirPath)) {
	dirPath = '.';
}

var dirStat = Fs.statSync(dirPath);

if (!dirStat.isDirectory()) {
	dirPath = Path.dirname(dirPath);
}

dirPath = Path.resolve(dirPath);

var path = Util.undef(ARGV.config, './tpm-config.js');
path = Path.resolve(path);

if (Fs.existsSync(path)) {
	config = require(path);
}else{
	while (true) {
		path = Path.resolve(dirPath + '/tpm-config.js');

		if (Fs.existsSync(path)) {
			config = require(path);
			break;
		}

		var parentPath = Path.dirname(dirPath);

		if (parentPath == dirPath) {
			break;
		}

		dirPath = parentPath;
	}
}


if (config === null) {
	Util.error('File not found: tpm-config.js');
	process.exit();
}

var Task = require(__dirname + '/tasks/' + cmd);

Task.run(args, config);
