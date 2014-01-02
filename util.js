
var Path = require('path');
var Fs = require('fs');
var util = require('util');
var Iconv = require('iconv-lite');
var _ = require('underscore');
var UglifyJS = require('uglify-js');
var CleanCss = require('clean-css');
var ChildProcess = require('child_process');

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

	var result = UglifyJS.minify(content, {
		fromString : true,
		compress : {
			sequences : false,
			properties : false,
			dead_code : false,
			conditionals : false,
			comparisons : false,
			evaluate : false,
			booleans : false,
			loops : false,
			unused : false,
			hoist_funs : false,
			hoist_vars : false,
			if_return : false,
			join_vars : false,
			cascade : false,
		}
	});
	var minContent = result.code + ';';

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

function setSvnAdd(path) {
	var cmd = 'svn add "' + path.replace(/\\/g, '\\\\') + '"';

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

// 将JS代码改成AMD模块，包含路径转换，补充模块ID，模板转换等
function fixModule(path, str) {
	var root = path.replace(/^(.*?)[\\\/](src|build|dist)[\\\/].*$/, '$1');
	var relativePath = path.split(Path.sep).join('/').replace(/^.+\/src\/js\//, '');
	var mid = relativePath.replace(/\.js$/, '');

	function resolveUrl(url) {
		while(true) {
			url = url.replace(/\w+\/\.\.\//g, '');
			if (!/\.\.\//.test(url)) {
				break;
			}
		}
		url = url.replace(/\.\//g, '');
		return url;
	}

	function fixDep(s, format) {
		if (format) {
			s = s.replace(/\s/g, '');
		}
		return s.replace(/(['"])(.+?)\1(,?)/g, function($0, $1, $2, $3) {
			var f = $2;
			if(f.charAt(0) == '.') {
				f = relativePath.replace(/[\w-]+\.js$/, '') + f;
				f = resolveUrl(f);
			}
			else if(f.charAt(0) == '/') {
				f = f.slice(1);
			}
			if (format) {
				return '\n  "' + f + '"' + $3 + '\n';
			} else {
				return $1 + f + $1 + $3;
			}
		}).replace(/,\n\n/g, ',\n');
	}

	// 补充模块ID
	if(/(?:^|[^\w\.])define\s*\(/.test(str) && !/(?:^|[^\w\.])define\s*\(\s*['"]/.test(str)) {
		str = str.replace(/\b(define\s*\(\s*)/, '$1"' + mid + '", ');
	}

	// 补齐依赖
	str = str.replace(/((?:^|[^\w\.])define\s*\(\s*['"].*?['"]\s*,\s*)([['"][\s\S]+?)(,\s*function\s*\()/g, function($0, $1, $2, $3) {
		return $1 + fixDep($2, true) + $3;
	});
	str = str.replace(/((?:^|[^\w\.])require\s*\(\s*)([\['"][\s\S]+?)(,\s*function\s*\()/g, function($0, $1, $2, $3) {
		return $1 + fixDep($2, false) + $3;
	});
	str = str.replace(/((?:^|[^\w\.])define\s*\(\s*['"].*?['"]\s*)(,\s*function\s*\()/g, '$1,[]$2');

	// 非AMD模块
	if(!/(?:^|[^\w\.])(define|require)\s*\(/.test(str)) {
		return str += '\n/* autogeneration */\ndefine("' + mid + '", [], function(){});\n';
	}

	// JS模板转换
	str = str.replace(/(\b)require\.text\(\s*(['"])(.+?)\2\s*\)/g, function($0, $1, $2, $3) {
		var f = $3;
		if(/^[a-z_/]/i.test(f)) {
			f = root + '/src/js/' + f;
		}
		else {
			f = path.replace(/[\w-]+\.js$/, '') + f;
			f = resolveUrl(f);
		}
		var s = readFileSync(f, 'utf-8');
		s = s.replace(/^\uFEFF/, '');
		s = s.replace(/\\/g, '\\\\');
		s = s.replace(/(\r\n|\r|\n)\s*/g, '\\n');
		s = s.replace(/'/g, "\\'");
		return $1 + "'" + s + "'";
	});

	return str;
}

// Remove comments, simple version
function removeComments(str) {
	return str.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

// Grep dependencies for AMD module
function grepDepList(path, root, recursion) {

	var depMap = {};
	var depList = [];
	var fileCache = {};

	function walk(path, isMain, recursion) {
		var fileStr = fileCache[path];
		if (!fileStr) {
			fileStr = readFileSync(path, 'utf8');
			fileStr = fixModule(path, fileStr);
			fileCache[path] = fileStr;
		}

		if (isMain) {
			var regExp = /(?:^|[^\w\.])require\s*\(\s*(?:\[([^\]]*)\]|'([^']*)'|"([^"]*)")/g;
		} else {
			var regExp = /(?:^|[^\w\.])define\s*\(\s*['"].*?['"]\s*,\s*(?:\[([^\]]*)\]|'([^']*)'|"([^"]*)")/g;
		}

		var match;

		while((match = regExp.exec(fileStr))) {
			var depIds = [];

			if (match[1]) {
				depStr = removeComments(match[1]);
				depIds = depStr.split(',').map(function(val) {
					val = val.trim();
					return val.substr(1, val.length - 2);
				});
			} else {
				depIds = [match[3] || match[2]];
			}

			depIds.reverse().forEach(function(id) {
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
							// lazy module
							walk(filePath, true, false);
							// normal module
							walk(filePath, false, true);
						}
						depList.push(id);
					}
				}
			});
		}

		return fileStr;
	}

	walk(path, true, recursion);
	walk(path, false, recursion);

	return depList;
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

// Build JS (AMD)
function buildJs(path, ignore) {
	ignore = ignore || [];

	var root = path.replace(/^(.*?)[\\\/](src|build|dist)[\\\/].*$/, '$1');
	var jsDirPath = root + '/src/js';
	var relativePath = path.split(Path.sep).join('/').replace(/^.+\/src\/js\//, '');
	var mid = relativePath.replace(/\.js/, '');
	var isLazy = /^lazy\//.test(mid);

	var ignoreMap = {};
	ignore.forEach(function(id) {
		ignoreMap[id] = true;
	});

	var depList = grepDepList(path, jsDirPath, true);

	var content = banner;

	if (!isLazy) {
		content += '\nrequire.config({ enable_ozma: true });\n\n\n';
	}

	depList.forEach(function(dep) {
		if (ignoreMap[dep]) {
			return;
		}
		var filePath = jsDirPath + '/' + dep + '.js';
		if (mid == dep) {
			return;
		}
		info('import: ' + dep);
		content += '/* @source ' + dep + '.js */;\n';
		var str = readFileSync(filePath, 'utf-8');
		str = fixModule(filePath, str);
		content += '\n' + str  + '\n';
	});

	if (isLazy) {
		content += '/* @source ' + mid + '.js */;\n';
	} else {
		content += '/* @source  */;\n';
	}

	var str = readFileSync(path, 'utf-8');
	str = fixModule(path, str);
	content += '\n' + str;

	return content;
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
exports.setSvnAdd = setSvnAdd;
exports.readProjectFile = readProjectFile;
exports.newMail = newMail;
exports.grepPaths = grepPaths;
exports.fixModule = fixModule;
exports.grepDepList = grepDepList;
exports.grepModuleList = grepModuleList;
exports.buildJs = buildJs;
