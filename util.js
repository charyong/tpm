
var Path = require('path');
var Fs = require('fs');
var Iconv = require('iconv-lite');
var UglifyJs = require('uglify-js');
var CleanCss = require('clean-css');
var ChildProcess = require('child_process');

var uglifyParser = UglifyJs.parser;
var uglifyPro = UglifyJs.uglify;

var linefeed = process.platform === 'win32' ? '\r\n' : '\n';

var banner = '/**\n' +
	' * @modified $Author$\n' +
	' * @version $Rev$\n' +
	' */\n';

function each(obj, fn) {
	for (var key in obj) {

		if (obj.hasOwnProperty(key)) {
			if (fn.call(obj[key], key, obj[key]) === false) {
				break;
			}
		}

	}
}

function undef(val, defaultVal) {
	return typeof val === 'undefined' ? defaultVal : val;
}

function info(str) {
	console.info('\033[36m', str, '\033[0m');
}

function warn(str) {
	console.warn('\033[33m', str, '\033[0m');
}

function error(str) {
	console.error('\033[31m', str, '\033[0m');
}

function indir(path, dirPath) {
	while (true) {
		if (!Fs.existsSync(path)) {
			return false;
		}

		if (path == dirPath) {
			return true;
		}

		var parentPath = Path.dirname(path);

		if (parentPath == path) {
			return false;
		}

		path = parentPath;
	}
}

function mkdir(dirPath, mode) {
	var list = [];
	while (true) {
		if (Fs.existsSync(dirPath)) {
			break;
		}

		list.push(dirPath);

		var parentPath = Path.dirname(dirPath);

		if (parentPath == dirPath) {
			break;
		}

		dirPath = parentPath;
	}

	list.reverse().forEach(function(path) {
		Fs.mkdirSync(path, mode);

		info('Directory "' + path + '" created.' + linefeed);
	});
}

function readFileSync(filePath, encoding) {
	var buffer = new Buffer('');

	try {
		buffer = Fs.readFileSync(filePath);
	} catch (e) {
		error(e.toString());
	}

	if (!encoding) {
		return buffer;
	}

	var fileStr = Iconv.fromEncoding(buffer, encoding);

	return fileStr;
}

function writeFileSync(filePath, content) {
	mkdir(Path.dirname(filePath), '0777');
	Fs.writeFileSync(filePath, content);
}

function copyFile(fromPath, toPath) {
	console.log('Copy file: ' + fromPath);

	var buffer = readFileSync(fromPath);

	writeFileSync(toPath, buffer);

	info('File "' + toPath + '" created.' + linefeed);
}

function minJs(fromPath, toPath) {
	console.log('Compress file: ' + fromPath);

	var content = readFileSync(fromPath, 'utf-8');

	var ast = uglifyParser.parse(content); // parse code and get the initial AST
	ast = uglifyPro.ast_mangle(ast);
	ast = uglifyPro.ast_squeeze(ast);
	var minContent = uglifyPro.gen_code(ast) + ';'; // compressed code

	writeFileSync(toPath, banner + minContent);

	info('File "' + toPath + '" created.' + linefeed);
}

function minCss(fromPath, toPath) {
	console.log('Compress file: ' + fromPath);

	var content = readFileSync(fromPath, 'utf-8');

	var minContent = CleanCss.process(content);

	writeFileSync(toPath, banner + minContent);

	info('File "' + toPath + '" created.' + linefeed);
}

function concatFile(fromPaths, toPath) {
	console.log('Concat files:');

	var contentList = [];

	fromPaths.forEach(function(path) {
		console.log(path);

		contentList.push(readFileSync(path, 'utf-8'));
	});

	writeFileSync(toPath, contentList.join(linefeed));

	info('File "' + toPath + '" created.' + linefeed);
}

function setSvnKeywords(path) {
	var cmd = 'svn propset svn:keywords "Rev LastChangedDate Author URL" "' + path.replace(/\\/g, '\\\\') + '"';

	console.log(cmd);

	ChildProcess.exec(cmd, function(err, stdout, stderr){
		if (err !== null) {
			return error('[SVN] ' + err);
		}
	});
}

// Escape mailto string
// Reference: http://support.microsoft.com/kb/287573
function escapeMailto(str) {
	str = str.replace(/ /g, '%20');
	str = str.replace(/,/g, '%2C');
	str = str.replace(/\?/g, '%3F');
	str = str.replace(/\./g, '%2E');
	str = str.replace(/!/g, '%21');
	str = str.replace(/:/g, '%3A');
	str = str.replace(/;/g, '%3B');
	str = str.replace(/&/g, '%26');
	str = str.replace(/\r\n|\n/g, '%0D%0A');
	return str;
}

// Open new mail window
// Reference: http://support.microsoft.com/kb/287573
function newMail(to, subject, body, callback) {
	// mailto:<to email>?cc=<cc email>&bcc=<bcc mail>&subject=<subject text>&body=<body text>
	var mailto = to + '?subject=' + escapeMailto(subject) + '&body=' + escapeMailto(body);

	cmd = 'start mailto:"' + mailto + '"';

	//grunt.log.write(cmd + '\n');

	var mailProcess = ChildProcess.exec(cmd);

	mailProcess.stdout.on('data', function(stdout) {
		console.log('[MAILTO] ' + stdout);
	});

	mailProcess.stderr.on('data', function(stderr) {
		error('[MAILTO] ' + stderr);
	});

	mailProcess.on('exit', function() {
		callback && callback();
	});
}

// Open new mail window and insert deploy info
function deployByEmail(config, projectName, paths, callback) {
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

		var cmd = 'svn info "' + path.replace(/\\/g, '\\\\') + '"';

		var cp = ChildProcess.exec(cmd);

		cp.stdout.on('data', function(stdout) {
			var data = Iconv.fromEncoding(stdout, 'gbk');
			var match;
			var line = '';
			if ((match = /^URL:\s*(.+)$/im.exec(data))) {
				line += match[1];
			}
			if ((match = /(?:Revision|版本):\s*(\d+)/i.exec(data))) {
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

				newMail(config.deploy_mail, subject, content, callback);
			}
		});
	}
}

exports.linefeed = linefeed;
exports.banner = banner;
exports.each = each;
exports.undef = undef;
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.indir = indir;
exports.mkdir = mkdir;
exports.readFileSync = readFileSync;
exports.writeFileSync = writeFileSync;
exports.copyFile = copyFile;
exports.minJs = minJs;
exports.minCss = minCss;
exports.concatFile = concatFile;
exports.setSvnKeywords = setSvnKeywords;
exports.newMail = newMail;
exports.deployByEmail = deployByEmail;
