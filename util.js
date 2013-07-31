
var Path = require('path');
var Fs = require('fs');
var util = require('util');
var Iconv = require('iconv-lite');
var _ = require('underscore');
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
	path = Path.resolve(path);
	dirPath = Path.resolve(dirPath);

	return path.indexOf(dirPath) == 0;
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

function mtime(filePath) {
	var stat = Fs.statSync(filePath);
	return stat.mtime.getTime();
}

function copyFile(fromPath, toPath) {
	console.log('Copy file: ' + fromPath);

	var buffer = readFileSync(fromPath);

	writeFileSync(toPath, buffer);

	info('File "' + toPath + '" created.' + linefeed);
}

function minJs(fromPath, toPath, charset) {
	charset = charset || 'utf-8';

	console.log('Compress file: ' + fromPath);

	var content = readFileSync(fromPath, charset);

	var ast = uglifyParser.parse(content); // parse code and get the initial AST
	ast = uglifyPro.ast_mangle(ast);
	ast = uglifyPro.ast_squeeze(ast);
	var minContent = uglifyPro.gen_code(ast) + ';'; // compressed code

	writeFileSync(toPath, banner + minContent);

	info('File "' + toPath + '" created.' + linefeed);
}

function minCss(fromPath, toPath, charset) {
	charset = charset || 'utf-8';

	console.log('Compress file: ' + fromPath);

	var content = readFileSync(fromPath, charset);

	var minContent = CleanCss.process(content);

	writeFileSync(toPath, banner + minContent);

	info('File "' + toPath + '" created.' + linefeed);
}

function concatFile(fromPaths, toPath, charset) {
	charset = charset || 'utf-8';

	if (fromPaths.length == 1 && fromPaths[0] == toPath) {
		return;
	}

	console.log('Concat files:');

	var contentList = [];

	fromPaths.forEach(function(path) {
		console.log(path);

		contentList.push(readFileSync(path, charset));
	});

	writeFileSync(toPath, contentList.join(linefeed));

	info('File "' + toPath + '" created.' + linefeed);
}

function setSvnKeywords(path) {
	var cmd = 'svn propset svn:keywords "Rev LastChangedDate Author URL" "' + path.replace(/\\/g, '\\\\') + '"';

	console.log(cmd);

	ChildProcess.exec(cmd);
}

// @param type: "src", "build", "dist"
function readProjectFile(config, path, type) {
	var content = Fs.readFileSync(path, 'utf-8');

	var paths = content.trim().split(/\r\n|\n/);

	var pathList = [];

	for (var i = 0, len = paths.length; i < len; i++) {
		var path = paths[i].trim();

		if (path == '' || path.charAt(0) == '#') {
			continue;
		}

		path = path.replace(/^(src|build|dist)\//, '');

		if (type == 'src') {
			path = path.replace(/\.css$/, '.less');
		} else {
			path = path.replace(/\.less$/, '.css');
		}

		path = Path.resolve(config.root + '/' + type + '/' + path);

		if (!Fs.existsSync(path)) {
			error('File not found: ' + path);
			continue;
		}

		pathList.push(path);
	}

	return pathList;
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

	mailProcess.on('close', function() {
		callback && callback();
	});
}

// Grep target paths
function grepPaths(rootDirPath, checkFn) {
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
			} else if (checkFn(path)) {
				paths.push(path);
			}
		}
	}

	walk(rootDirPath);

	return paths;
}

// Grep dependencies for AMD module
function grepDepList(path, root, recursion) {

	var depMap = {};

	function walk(path, isMain) {
		var fileStr = readFileSync(path, 'utf8');

		if (isMain) {
			var regExp = /(?:^|[^\w\.])require\(\s*(?:\[([^\]]*)\]|'([^']*)'|"([^"]*)")/g;
		} else {
			var regExp = /(?:^|[^\w\.])define\(\s*(?:(?:'[^']*'|"[^"]*")\s*,)?\s*(?:\[([^\]]*)\]|'([^']*)'|"([^"]*)")/g;
		}

		var match;

		while((match = regExp.exec(fileStr))) {
			var depIds = [];

			if (match[1]) {
				depIds = match[1].split(',').map(function(val) {
					val = val.trim();
					return val.substr(1, val.length - 2);
				});
			} else {
				depIds = [match[3] || match[2]];
			}

			depIds.forEach(function(id) {
				if (id) {
					if (id.charAt(0) === '.') {
						var filePath = Path.resolve(Path.dirname(path), id + '.js');
					} else {
						var filePath = Path.resolve(root + '/' + id + '.js');
					}

					id = Path.relative(root, filePath).split(Path.sep).join('/').replace(/\.js$/, '');

					if (typeof depMap[id] == 'undefined') {
						depMap[id] = true;
						if (recursion) {
							walk(filePath, false);
						}
					}
				}
			});
		}
	}

	walk(path, true);

	return Object.keys(depMap);
}

// Grep module ID list
function grepModuleList(path) {
	var fileStr = readFileSync(path, 'utf8');

	var regExp = /(?:^|[^\w\.])define\(\s*(?:'([^']*)'|"([^"]*)")\s*,/g;

	var idMap = {};

	var match;

	while((match = regExp.exec(fileStr))) {
		idMap[match[2] || match[1]] = true;
	}

	return Object.keys(idMap);
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
exports.mtime = mtime;
exports.copyFile = copyFile;
exports.minJs = minJs;
exports.minCss = minCss;
exports.concatFile = concatFile;
exports.setSvnKeywords = setSvnKeywords;
exports.readProjectFile = readProjectFile;
exports.newMail = newMail;
exports.grepPaths = grepPaths;
exports.grepDepList = grepDepList;
exports.grepModuleList = grepModuleList;
