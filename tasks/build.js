
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

	// 构建一个JS文件
	function buildJs(path) {
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

		if (config.global.indexOf(relativePath) < 0) {
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

	// 复制文件
	function copyFile(path) {

	}

	// 初始化
	function init() {
		var pathList = [];

		if (args.length < 1) {
			var list = _.union(config.main.js, config.main.css);
			list.forEach(function(path) {
				pathList.push(Path.resolve(config.root + '/src/' + path));
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
		console.log(pathList);

		pathList.forEach(function(path) {
			if (/\.js$/.test(path)) {
				buildJs(path);
			} else if (/\.less$/.test(path)) {
				buildLess(path);
			} else {
				copyFile(path);
			}
		});
	}

	init();
};
