
var Path = require('path');
var Fs = require('fs');
var Rimraf = require('rimraf');
var Iconv = require('iconv-lite');
var ChildProcess = require('child_process');
var Ftp = require('jsftp');
var Ssh = require('ssh2');

var Util = require(__dirname + '/../util');

var DEPLOY_USAGE = 'Usage: tpm deploy [PATH] [ENV]\n\n' +
	'Examples:\n' +
	'tpm deploy dist/js/g.js beta\n' +
	'tpm deploy project/TUILIB-65.txt beta\n';

// Update static version
// @param env: "beta", "wwwtest"
function updateVersion(sshConfig, env) {
	var ssh = new Ssh();

	ssh.on('connect', function() {
		Util.info('[SSH] connect ' + sshConfig.host);
	});

	ssh.on('ready', function() {
		var cmd = '/usr/bin/python ' + sshConfig.root + '/updatever.py ' + env;

		Util.info('[SSH] ' + cmd);

		ssh.exec(cmd, function(err, stream) {
			if (err) {
				Util.error(err);
				return;
			}
			stream.on('data', function(data, extended) {
				if (extended === 'stderr') {
					Util.error(data.toString());
				} else {
					Util.info(data.toString());
				}
			});
			stream.on('exit', function(code, signal) {
				ssh.end();
			});
		});
	});

	ssh.on('error', function(err) {
		Util.info('[SSH] ' + err);
	});

	ssh.on('close', function(had_error) {
		Util.info('[SSH] update version successful.');
	});

	ssh.connect({
		host: sshConfig.host,
		port: sshConfig.port,
		username: sshConfig.user,
		password: sshConfig.pass,
	});
}

// Upload files by FTP
function uploadByFtp(localRoot, ftpConfig, sshConfig, paths, env) {
	var pathCount = paths.length;

	Util.info('[FTP] connect ' + ftpConfig.host);

	var ftp = new Ftp(ftpConfig);

	var newPaths = [];
	for (var i = 0, len = paths.length; i < len; i++) {
		var localPath = paths[i];

		var relativePath = Path.relative(localRoot, localPath).split(Path.sep).join('/');

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

					updateVersion(sshConfig, env);
				});
			}
		});
	}
}

exports.run = function(args, config) {

	var distDirPath = Path.resolve(config.root + '/dist');

	// 是否可发布的文件
	function canDeploy(path) {
		if (!Util.indir(path, Path.resolve(config.root + '/dist'))) {
			return false;
		}

		return /\.(js|css|jpg|png|gif|ico|swf|htm|html)$/.test(path);
	}

	// 返回一个目录里所有要构建的文件
	function grepPaths(rootDirPath) {
		var paths = [];

		function walk(dirPath) {
			var files = Fs.readdirSync(dirPath);

			for (var i = 0, len = files.length; i < len; i++) {
				var file = files[i];

				if (file.charAt(0) === '.') {
					continue;
				}

				var path = Path.resolve(dirPath + '/' + file);

				var stat = Fs.statSync(path);

				if (stat.isDirectory()) {
					walk(path);
				} else if (canDeploy(path)) {
					paths.push(path);
				}
			}
		}

		walk(rootDirPath);

		return paths;
	}

	if (args.length < 2) {
		console.log(DEPLOY_USAGE);
		return;
	}

	var path = args[0];
	var env = args[1];

	path = Path.resolve(path);

	var pathList = [];

	if (Util.indir(path, config.root + '/project')) {
		pathList = Util.readProjectFile(config, path, 'dist');
	} else {
		var stat = Fs.statSync(path);
		if (stat.isDirectory(path)) {
			pathList = grepPaths(path);
		} else {
			if (!canDeploy(path)) {
				Util.error('Cannot deploy: ' + path);
				return;
			}
			pathList.push(path);
		}
	}

	if (env == 'beta') {
		uploadByFtp(config.root, config.ftp.beta, config.ssh.beta, pathList, env);
	}

};
