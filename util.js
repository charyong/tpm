
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

	var content = readFileSync(fromPath, 'utf-8');

	writeFileSync(toPath, content);

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

	writeFileSync(toPath, banner + contentList.join(linefeed));

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

exports.linefeed = linefeed;
exports.banner = banner;
exports.each = each;
exports.undef = undef;
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.mkdir = mkdir;
exports.readFileSync = readFileSync;
exports.writeFileSync = writeFileSync;
exports.copyFile = copyFile;
exports.minJs = minJs;
exports.minCss = minCss;
exports.concatFile = concatFile;
exports.setSvnKeywords = setSvnKeywords;
