
var Path = require('path');
var Fs = require('fs');
var _ = require('underscore');
var Ozma = require('ozma-tudou').Ozma;
var Less = require('less');

var Util = require(__dirname + '/../util');

exports.run = function(args, config) {

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

	// 是否可压缩的文件
	function canBuild(path) {
		if (!Util.indir(path, Path.resolve(config.root + '/build'))) {
			return false;
		}

		return /\.(js|css|jpg|png|gif|ico|swf|htm|html)$/.test(path);
	}

	// 返回一个目录里所有要构建的文件
	function grepPaths(rootDirPath) {
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
				} else if (canBuild(path)) {
					paths.push(path);
				}
			}
		}

		walk(rootDirPath);

		return paths;
	}

	// 初始化
	function init() {
		var pathList = [];

		if (args.length < 1) {
			config.main.js.forEach(function(path) {
				pathList.push(Path.resolve(config.root + '/build/js/' + path));
			});
			config.main.css.forEach(function(path) {
				pathList.push(Path.resolve(config.root + '/build/css/' + path));
			});
		} else {
			var path = Path.resolve(args[0]);
			var stat = Fs.statSync(path);
			if (stat.isDirectory(path)) {
				pathList = grepPaths(path);
			} else if (canBuild(path)) {
				pathList.push(path);
			}
		}

		pathList.forEach(function(path) {
			var distPath = getDistPath(path);
			if (/\.js$/.test(path)) {
				Util.minJs(path, distPath);
			} else if (/\.css$/.test(path)) {
				Util.minCss(path, distPath);
			} else {
				Util.copyFile(path, distPath);
			}
		});
	}

	init();
};
