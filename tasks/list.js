
var Path = require('path');
var Fs = require('fs');
var Rimraf = require('rimraf');
var Iconv = require('iconv-lite');
var ChildProcess = require('child_process');

var Util = require(__dirname + '/../util');

var DIFF_USAGE = 'Usage: tpm list [REVISION]\n\n' +
	'Examples:\n' +
	'tpm list 28464\n';

// Open new mail window and insert file list
function openEmail(config, projectName, paths, callback) {
	var pathCount = paths.length;

	var contentList = [];

	if (projectName !== '') {
		contentList.push(config.jira_host + '/browse/' + projectName);
		contentList.push('');
	}

	contentList.push('文件列表：');

	var newPaths = [];
	for (var i = 0, len = paths.length; i < len; i++) {
		var path = paths[i];

		var cmd = (process.platform === 'win32' ? 'set' : 'export') + ' LANG=en_US && svn info "' + path.replace(/\\/g, '\\\\') + '"';

		var cp = ChildProcess.exec(cmd);

		cp.stdout.on('data', function(stdout) {
			var data = Iconv.fromEncoding(stdout, 'gbk');
			var match;
			var line = '';
			if ((match = /^URL:\s*(.+)$/im.exec(data))) {
				line += match[1];
			}
			if ((match = /^Last Changed Rev:\s*(\d+)$/im.exec(data))) {
				line += ' ' + match[1];
			}
			contentList.push(line);
		});

		cp.stderr.on('data', function(stderr){
			error('[SVN] ' + stderr);
		});

		cp.on('exit', function() {
			pathCount--;
			if (pathCount === 0) {
				var subject = '版本发布' + (projectName !== '' ? (' - ' + projectName) : '');
				var content = contentList.join('\r\n') + '\r\n';

				console.log(content);

				Util.newMail(config.deploy_mail, subject, content, callback);
			}
		});
	}
}

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
				//line = Util.trim(line);
				var match;
				if ((match = /^[MA]M?\s+(.*)$/.exec(line))) {
					pathList.push(match[1]);
				}
			});

			openEmail(config, '', pathList);
		});
		return;
	}

	// 根据项目文件输出列表
	var path = args[0];

	var pathList = Util.readProjectFile(config, path, 'dist');

	var basename = Path.basename(path, '.txt');

	openEmail(config, basename, pathList);
};
