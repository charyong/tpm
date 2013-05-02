
var Path = require('path');
var Fs = require('fs');
var Iconv = require('iconv-lite');

var Util = require(__dirname + '/../util');

function mergeTui2(path, config) {
	var comboPath = path.replace(/^(.+)_src(\.\w+)$/, '$1_combo$2');

	var root = config.root;
	var subDir = /\.css$/.test(path) ? 'skin' : 'js';

	var pathMap = {};

	function grepPath(src) {
		var regExp = /(?:\*|\\\\) +@import +([\/\w\-\.]+)/ig;
		var match;

		while((match = regExp.exec(src))) {
			var filePath = match[1];

			if (!/^(js|skin)\//.test(filePath)) {
				filePath = subDir + '/' + filePath;
			}

			var path = root + '/' + filePath;

			if (typeof pathMap[filePath] == 'undefined') {
				var encoding = /\.tpl$/.test(filePath) ? 'utf8' : 'gbk';

				var fileStr = Util.readFileSync(path, encoding);

				if (/\.(js|css)$/.test(filePath)) {
					grepPath(fileStr);
				}

				pathMap[filePath] = fileStr;
			}
		}
	}

	var src = Util.readFileSync(path, 'gbk');

	grepPath(src);

	var dist = '';

	Util.each(pathMap, function(filePath, fileStr) {

		if (/\.tpl$/.test(filePath)) {
			var varName = filePath.replace(/^js\/|\.tpl$/g, '');
			varName = 'tpl_' + varName.replace(/\//g, '_');

			fileStr = fileStr.replace(/(\r\n|\r|\n)\s*/g, ' ').replace(/'/g, "\\'");

			dist += 'var ' + varName + " = '" + fileStr + "';" + Util.linefeed;
		} else {
			dist += fileStr + Util.linefeed;
		}

	});

	dist += Util.linefeed + src;

	dist = Iconv.toEncoding(dist, 'gbk');

	Fs.writeFileSync(comboPath, dist);

	Util.info('File "' + comboPath + '" created.' + Util.linefeed);
}

exports.run = function(args, config) {

	var path = Path.resolve(args[0]);
	var stat = Fs.statSync(path);

	if (stat.isDirectory(path)) {
		Util.error('Cannot build directory: ' + path);
		return;
	}

	if (!/_src\.(js|css)$/.test(path)) {
		Util.error('Cannot build: ' + path);
		return;
	}

	console.log('Build file: ' + path);

	mergeTui2(path, config);

	var distPath = path.replace(/^(.+)_src(\.\w+)$/, '$1$2');

	if (/\.js$/.test(path)) {
		Util.minJs(path, distPath);
	} else if (/\.css$/.test(path)) {
		Util.minCss(path, distPath);
	}

};
