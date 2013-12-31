
var Path = require('path');
var Fs = require('fs');
var Rimraf = require('rimraf');
var Iconv = require('iconv-lite');
var ChildProcess = require('child_process');
var Request = require('request');

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

	paths.forEach(function(path) {
		var cmd = 'svn info "' + path.replace(/\\/g, '\\\\') + '" --xml';

		var cp = ChildProcess.exec(cmd);

		cp.stdout.on('data', function(stdout) {
			var data = Iconv.fromEncoding(stdout, 'gbk');
			var match;
			var line = '';
			if ((match = /<url>(.+?)<\/url>/i.exec(data))) {
				line += match[1];
			}
			if ((match = /<commit\s+revision="(\d+)">/i.exec(data))) {
				line += ' ' + match[1];
			}
			if (line) {
				contentList.push(line);
			}
			pathCount--;
			if (pathCount === 0) {
				var subject = '版本发布' + (projectName !== '' ? (' - ' + projectName) : '');
				var content = contentList.join('\r\n') + '\r\n';

				console.log(content);

				if(config.useClientMail !== false){
					Util.newMail(config.deploy_mail, subject, content, callback);
				}

			}
		});

		cp.stderr.on('data', function(stderr){
			pathCount--;
			Util.error('[SVN] get info failed, please commit "' + path + '"');
		});
	});
}

exports.run = function(args, config) {

	// 转换成相对路径
	function getRelativePath(path) {
		var dirPath = Path.resolve(config.root);
		return Path.relative(dirPath, path).split(Path.sep).join('/');
	}

	// 列出未上线的文件
	function listNoDeployedFiles(fileList, env) {
		var pathCount = fileList.length;
		var pathList = [];
		fileList.forEach(function(path) {
			var url = 'http://css' + env + '.tudouui.com/v3/' + getRelativePath(path);
			Request(url, function (error, response, body) {
				pathCount--;
				if (response.statusCode == 404) {
					pathList.push(path);
					Util.warn('[GET] ' + url + ' [' + response.statusCode + '] ' + pathCount);
				} else {
					Util.info('[GET] ' + url + ' [' + response.statusCode + '] ' + pathCount);
				}
				if (pathCount === 0) {
					setTimeout(function() {
						openEmail(config, '', pathList);
					}, 0);
				}
			});
		});
	}

	var distDirPath = Path.resolve(config.root + '/dist');

	if (args.length < 1) {
		console.log(DIFF_USAGE);
		return;
	}

	// 根据SVN版本号输出列表
	if (/^\d+$/.test(args[0])) {
		var revision = args[0];

		var cmd = 'svn diff -r' + (revision - 1) + ':HEAD --summarize --no-diff-deleted "' + distDirPath.replace(/\\/g, '\\\\') + '"';

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

		cp.on('close', function() {
			var pathList = [];

			var lines = content.split(/\r\n|\n/);

			lines.forEach(function(line) {
				if (/\.\w+$/.test(line)) {
					var match;
					if ((match = /^[MA]M?\s+(.*)$/.exec(line))) {
						pathList.push(match[1]);
					}
				}
			});

			openEmail(config, '', pathList);
		});
		return;
	}

	// 根据项目文件输出列表
	if (Util.indir(args[0], config.root + '/project')) {
		var projectPath = args[0];

		var pathList = Util.readProjectFile(config, projectPath, 'dist');

		var basename = Path.basename(projectPath, '.txt');

		openEmail(config, basename, pathList);
		return;
	}

	// 根据CSS文件，列出未上线的所有图片文件
	if (Util.indir(args[0], config.root + '/dist/css')) {
		var cssPath = args[0];
		var env = args[1] || '';
		var dirPath = Path.dirname(cssPath);

		function url2path(url) {
			url = url.replace(/[?#].*$/, '');
			var path = '';
			if (url.charAt(0) == '.') {
				path = Path.resolve(dirPath + '/' + url);
			} else if (url.charAt(0) == '/') {
				path = Path.resolve(config.root + '/../' + url);
			}
			return path;
		}

		var content = Util.readFileSync(cssPath, 'utf-8');
		content = content.replace(/\/\*[\S\s]*?\*\//g, '');

		var match;
		var regExp = /url\(["']?([^'"\)]+)["']?\)/g;
		var pathList = [];
		while((match = regExp.exec(content))) {
			var url = match[1];
			var path = url2path(url);
			if (path) {
				pathList.push(path);
			}
		}

		listNoDeployedFiles(pathList, env);
		return;
	}

	// 直接指定路径，列出所有未上线的文件
	if (Util.indir(args[0], config.root + '/dist')) {
		var dirPath = args[0];
		var env = args[1] || '';

		var pathList = Util.grepPaths(dirPath, function(path) {
			return /\.(jpg|png|gif|ico|swf|swz|eot|svg|ttf|woff)$/i.test(path);
		});

		listNoDeployedFiles(pathList, env);
	}

};
