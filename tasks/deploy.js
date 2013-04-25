
var Path = require('path');
var Fs = require('fs');
var Rimraf = require('rimraf');
var Iconv = require('iconv-lite');
var ChildProcess = require('child_process');
var Ftp = require('jsftp');

var Util = require(__dirname + '/../util');

var DEPLOY_USAGE = 'Usage: tpm deploy [PATH] [SERVER]\n\n' +
	'Examples:\n' +
	'tpm deploy dist/js/g.js beta\n' +
	'tpm deploy project/TUILIB-65.txt beta\n';

// Upload files by FTP
function uploadByFtp(config, ftpConfig, paths) {
	var pathCount = paths.length;

	Util.info('[FTP] connect ' + ftpConfig.host);

	var ftp = new Ftp(ftpConfig);

	var newPaths = [];
	for (var i = 0, len = paths.length; i < len; i++) {
		var localPath = paths[i];

		var relativePath = Path.relative(config.root, localPath).split(Path.sep).join('/');

		var buffer = Fs.readFileSync(localPath);

		var remotePath = ftpConfig.root + '/v3/' + relativePath;

		Util.info('[FTP] upload ' + localPath + ' -> ' + remotePath);

		ftp.put(remotePath, buffer, function(err, data) {
			pathCount--;
			if (err) {
				Util.error(err);
				return;
			}
			if (pathCount === 0) {
				ftp.raw.quit(function(err, data) {
					if (err) {
						Util.error(err);
						return;
					}
					Util.info('[FTP] upload successful.');
				});
			}
		});
	}
}

exports.run = function(args, config) {

	var distDirPath = Path.resolve(config.root + '/dist');

	if (args.length < 2) {
		console.log(DEPLOY_USAGE);
		return;
	}

	var path = args[0];
	var testServer = args[1];

	var pathList = [];

	if (Util.indir(path, config.root + '/project')) {
		pathList = Util.readProjectFile(config, path, 'dist');
	} else {
		if (!Util.indir(path, config.root + '/dist')) {
			Util.error('Cannot deploy: ' + path);
			return;
		}
		path = Path.resolve(path);
		pathList.push(path);
	}

	if (testServer == 'beta') {
		uploadByFtp(config, config.ftp.beta, pathList);
	}

};
