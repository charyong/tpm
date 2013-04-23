
var Fs = require('fs');
var Iconv = require('iconv-lite');
var uglifyjs = require('uglify-js');

var uglifyParser = uglifyjs.parser;
var uglifyPro = uglifyjs.uglify;

var linefeed = process.platform === 'win32' ? '\r\n' : '\n';

var BANNER = '/**\n' +
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

function copyFile(fromPath, toPath) {
	console.log('Copy file: ' + fromPath);

	var content = readFileSync(fromPath, 'utf-8');

	Fs.writeFileSync(toPath, content);

	console.log('File "' + toPath + '" created.' + linefeed);
}

function minJs(fromPath, toPath) {
	console.log('Compress file: ' + fromPath);

	var content = readFileSync(fromPath, 'utf-8');

	var ast = uglifyParser.parse(content); // parse code and get the initial AST
	ast = uglifyPro.ast_mangle(ast);
	ast = uglifyPro.ast_squeeze(ast);
	var minContent = uglifyPro.gen_code(ast) + ';'; // compressed code

	Fs.writeFileSync(toPath, BANNER + minContent);

	console.log('File "' + toPath + '" created.' + linefeed);
}

function concatFile(fromPaths, toPath) {
	console.log('Concat files:');

	var contentList = [];

	fromPaths.forEach(function(path) {
		console.log(path);

		contentList.push(readFileSync(path, 'utf-8'));
	});

	Fs.writeFileSync(toPath, BANNER + contentList.join(linefeed));

	console.log('File "' + toPath + '" created.' + linefeed);
}

exports.linefeed = linefeed;
exports.each = each;
exports.undef = undef;
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.readFileSync = readFileSync;
exports.copyFile = copyFile;
exports.minJs = minJs;
exports.concatFile = concatFile;
