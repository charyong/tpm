
var Path = require('path');
var Fs = require('fs');

var Util = require(__dirname + '/../util');

exports.run = function(args, config) {

	var path = Path.resolve(args[0]);
	var stat = Fs.statSync(path);

	if (stat.isDirectory(path)) {
		Util.error('Cannot compress directory: ' + path);
		return;
	}

	if (!/_combo\.(js|css)$/.test(path)) {
		Util.error('Cannot compress: ' + path);
		return;
	}

	var distPath = path.replace(/^(.+)_combo(\.\w+)$/, '$1$2');

	if (/\.js$/.test(path)) {
		Util.minJs(path, distPath);
	} else if (/\.css$/.test(path)) {
		Util.minCss(path, distPath);
	}

};
