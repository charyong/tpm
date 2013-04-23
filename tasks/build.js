
var Path = require('path');
var Fs = require('fs');
var _ = require('underscore');
var Ozma = require('ozma-tudou').Ozma;

var Util = require(__dirname + '/../util');

exports.run = function(args, config) {

	// 转换成相对路径
	function getRelativePath(path, type) {
		var dirPath = Path.resolve(config.root + (type ? ('/src/' + type) : '/src'));
		return Path.relative(dirPath, path).split(Path.sep).join('/');
	}

	// 获取build路径
	function getBuildPath(path) {
		var relativePath = getRelativePath(path);
		return Path.resolve(config.root + '/build/' + relativePath);
	}

	// 获取dist路径
	function getDistPath(path) {
		var relativePath = getRelativePath(path);
		return Path.resolve(config.root + '/dist/' + relativePath);
	}

	// 是否可构建的文件
	function canBuild(path) {
		if (/\.js$/.test(path)) {
			var relativePath = getRelativePath(path, 'js');
			return config.main.js.indexOf(relativePath) >= 0;
		}

		if (/\.less$/.test(path)) {
			var relativePath = getRelativePath(path, 'css');
			return config.main.css.indexOf(relativePath) >= 0;
		}

		return /\.(jpg|png|gif|ico|swf|htm|html)$/.test(path);
	}

	// 构建一个JS文件
	function buildJs(path) {
		var relativePath = getRelativePath(path, 'js');

		// 把多个文件合并成一个文件
		if (config.libjs[relativePath]) {
			var fromPaths = config.libjs[relativePath].map(function(val) {
				return Path.resolve(config.root + '/src/js/' + val);
			});
			Util.concatFile(fromPaths, path);

			var buildPath = getBuildPath(path);
			var distPath = getDistPath(path);
			Util.copyFile(path, buildPath);
			Util.minJs(buildPath, distPath);
			return;
		}

		// AMD文件
		var options = {
			src : path,
			saveConfig : false,
			config : {
				baseUrl : config.root + '/src/js/',
				distUrl : config.root + '/build/js/',
				disableAutoSuffix : true,
			},
		};

		var relativePath = getRelativePath(path, 'js');

		if (config.globaljs.indexOf(relativePath) < 0) {
			options.config.ignore = config.ignore;
		}

		options._ = [path];

		Ozma()(options, function() {
			// done
		});
	}

	// 构建一个LESS文件
	function buildLess(path) {

	}

	// 构建一个图片文件
	function buildImg(path) {

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
				pathList.push(Path.resolve(config.root + '/src/js/' + path));
			});
			config.main.css.forEach(function(path) {
				pathList.push(Path.resolve(config.root + '/src/css/' + path));
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
			if (/\.js$/.test(path)) {
				buildJs(path);
			} else if (/\.less$/.test(path)) {
				buildLess(path);
			} else {
				buildImg(path);
			}
		});
	}

	init();
};
