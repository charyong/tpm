
var Path = require('path');
var Fs = require('fs');
var Rimraf = require('rimraf');
var Iconv = require('iconv-lite');
var ChildProcess = require('child_process');

var Util = require(__dirname + '/../util');

var DEPLOY_USAGE = 'Usage: tpm deploy [PATH] [SERVER]\n\n' +
	'Examples:\n' +
	'tpm deploy dist/js/g.js wwwtest\n' +
	'tpm deploy dist/js/page/play beta\n';

exports.run = function(args, config) {

	var distDirPath = Path.resolve(config.root + '/dist');

	if (args.length < 2) {
		console.log(DEPLOY_USAGE);
		return;
	}

	var path = args[0];
	var testServer = args[0];

	var paths = readProjectFile(projectName);

	if (testServer == 'wwwtest') {
		Util.deployByEmail(projectName, paths);
	} else if (testServer == 'beta') {
		//deployByFtp(BETA_FTP_CONFIG, paths);
	}

};
