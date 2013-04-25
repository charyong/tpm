
var Path = require('path');
var Fs = require('fs');
var Rimraf = require('rimraf');
var Iconv = require('iconv-lite');
var ChildProcess = require('child_process');

var Util = require(__dirname + '/../util');

var DIFF_USAGE = 'Usage: tpm list [REVISION]\n\n' +
	'Examples:\n' +
	'tpm list 28464\n';

exports.run = function(args, config) {

	var distDirPath = Path.resolve(config.root + '/dist');

	if (args.length < 1) {
		console.log(DIFF_USAGE);
		return;
	}

	// 根据SVN版本号输出列表
	if (/^\d+$/.test(args[0])) {
		var revision = args[0];

		var cmd = 'svn diff -r' + revision + ':HEAD --summarize --no-diff-deleted "' + distDirPath.replace(/\\/g, '\\\\') + '"';

		console.log(cmd);

		var content = '';

		var cp = ChildProcess.exec(cmd);

		cp.stdout.on('data', function(stdout) {
			var data = Iconv.fromEncoding(stdout, 'gbk');
			content += data;
		});

		cp.stderr.on('data', function(stderr){
			Util.error('[SVN] ' + stderr);
			process.exit();
		});

		cp.on('exit', function() {
			var pathList = [];

			var lines = content.split(/\r\n|\n/);

			lines.forEach(function(line) {
				line = Util.trim(line);
				var match;
				if ((match = /^[MA]\s+(.*)$/.exec(line))) {
					pathList.push(match[1]);
				}
			});

			Util.deployByEmail(config, '', pathList);
		});
		return;
	}

	// 根据项目文件输出列表
	var path = args[0];

	var pathList = Util.readProjectFile(config, path);

	var basename = Path.basename(path, '.txt');

	Util.deployByEmail(config, basename, pathList);
};
