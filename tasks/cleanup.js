
var Path = require('path');
var Fs = require('fs');
var Rimraf = require('rimraf');

var Util = require(__dirname + '/../util');

exports.run = function(args, config) {

	var buildDirPath = Path.resolve(config.root + '/build');
	var distDirPath = Path.resolve(config.root + '/dist');

	// 转换成相对路径
	function getRelativePath(path, type) {
		var dirPath = Path.resolve(config.root + (type ? ('/build/' + type) : '/build'));
		return Path.relative(dirPath, path).split(Path.sep).join('/');
	}

	// 获取dist路径
	function getDistPath(path) {
		var relativePath = getRelativePath(path);
		return Path.resolve(config.root + '/dist/' + relativePath.replace(/\.less$/, '.css'));
	}

	// 删除build、dist里的多余的目录和文件
	function cleanup(dirPath) {
		var files = Fs.readdirSync(dirPath);

		for (var i = 0, len = files.length; i < len; i++) {
			var file = files[i];

			if (file.charAt(0) === '.') {
				continue;
			}

			var path = Path.resolve(dirPath + '/' + file);

			if (Util.indir(path, buildDirPath)) {
				var relativePath = Path.relative(buildDirPath, path).split(Path.sep).join('/');
			} else {
				var relativePath = Path.relative(distDirPath, path).split(Path.sep).join('/');
			}

			var srcPath = Path.resolve(config.root + '/src/' + relativePath.replace(/\.css$/, '.less'));

			if (!Fs.existsSync(srcPath)) {
				Rimraf.sync(path);
				Util.info('File "' + path + '" deleted.' + Util.linefeed);
				return;
			}

			var stat = Fs.statSync(path);

			if (stat.isDirectory()) {
				cleanup(path);
			}
		}
	}

	// 初始化
	function init() {
		var buildPath = Path.resolve(config.root + '/build');
		var distPath = Path.resolve(config.root + '/dist');

		cleanup(buildPath);
		cleanup(distPath);
	}

	init();
};
