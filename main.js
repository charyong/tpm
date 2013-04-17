
var Fs = require('fs');
var Optimist = require('optimist');

var Util = require('./util');

Optimist.usage([
	'Usage: tpm [command] /path/to/source-file --config=[/path/to/config-file]\n\n',
	'Examples:\n',
	'tpm build src/js/g.js\n',
	'tpm build src/css/g.less\n',
].join(''));

var ARGV = Optimist.argv;

if (ARGV.help || ARGV.h) {
	Optimist.showHelp();
	process.exit();
}

if (ARGV._.length < 1) {
	Optimist.showHelp();
	process.exit();
}

if (ARGV.version || ARGV.v) {
	var packageInfo = JSON.parse(Fs.readFileSync(__dirname + '/package.json', 'utf-8'));
	console.log(packageInfo.version);
	process.exit();
}

var configPath = Util.undef(ARGV.config, __dirname + '/config.json');

var cmd = ARGV._[0];

var config = JSON.parse(Fs.readFileSync(configPath, 'utf-8'));

var Task = require(__dirname + '/tasks/' + cmd);

Task.run(ARGV._, config);
