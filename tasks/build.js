
var Path = require('path');
var Fs = require('fs');
var Iconv = require('iconv-lite');
var _ = require('underscore');
var Ozma = require('ozma-tudou').Ozma;
var Less = require('less');
var ChildProcess = require('child_process');

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
		return Path.resolve(config.root + '/build/' + relativePath.replace(/\.less$/, '.css'));
	}

	// 获取dist路径
	function getDistPath(path) {
		var relativePath = getRelativePath(path);
		return Path.resolve(config.root + '/dist/' + relativePath.replace(/\.less$/, '.css'));
	}

	// 是否可构建的文件
	function canBuild(path) {
		if (!Util.indir(path, Path.resolve(config.root + '/src')) && !Util.indir(path, Path.resolve(config.root + '/project'))) {
			return false;
		}

		if (/\.js$/.test(path)) {
			var relativePath = getRelativePath(path, 'js');
			return config.main.js.indexOf(relativePath) >= 0;
		}

		if (/\.less$/.test(path)) {
			var relativePath = getRelativePath(path, 'css');
			return config.main.css.indexOf(relativePath) >= 0;
		}

		return /\.(jpg|png|gif|ico|swf|htm|html|txt)$/.test(path);
	}

	// 取得文件SVN版本号
	function getSvnVersion(pathList, callback) {
		var pathCount = pathList.length;

		var result = {};

		for (var i = 0, len = pathList.length; i < len; i++) {
			var path = pathList[i];

			if (result[path]) {
				continue;
			}

			if (!Fs.existsSync(path)) {
				Util.error('File not found: ' + path);
				continue;
			}

			var cmd = (process.platform === 'win32' ? 'set' : 'export') + ' LANG=en_US && svn info "' + path.replace(/\\/g, '\\\\') + '"';

			var cp = ChildProcess.exec(cmd);

			cp.stdout.on('data', function(stdout) {
				var data = Iconv.fromEncoding(stdout, 'gbk');
				var match;
				if ((match = /^Path:\s*(.+)$/im.exec(data))) {
					var key = match[1];
				}
				if ((match = /^Last Changed Rev:\s*(\d+)$/im.exec(data))) {
					var value = match[1];
				}
				if (key && value) {
					key = key.substr(0, 1).toLowerCase() + key.substr(1);
					result[key] = value;
				}
			});

			cp.stderr.on('data', function(stderr){
				Util.error('[SVN] ' + stderr);
			});

			cp.on('exit', function() {
				pathCount--;
				if (pathCount === 0) {
					callback(result);
				}
			});
		}
	}

	// 图片版本化
	function renameAssets(cssPath, content, callback) {
		var dirPath = Path.dirname(cssPath);

		function url2path(url) {
			var path = '';
			if (url.charAt(0) == '.') {
				path = Path.resolve(dirPath + '/' + url);
			} else if (url.charAt(0) == '/') {
				path = Path.resolve(config.root + '/../' + url);
			}
			return path;
		}

		function addVersion(path, version) {
			return path.replace(/^(.+)(\.\w+)$/, '$1_' + version + '$2');
		}

		var match;
		var regExp = /url\("((?:\\"|[^"])+)"\)/g;
		var newContent = content.replace(/\/\*[\S\s]*?\*\//g, '');
		var pathList = [];
		while((match = regExp.exec(newContent))) {
			var url = match[1];
			var path = url2path(url);
			if (path) {
				pathList.push(path);
			}
		}

		getSvnVersion(pathList, function(data) {
			content = content.replace(/\/\*[\S\s]*?\*\/|(url\(")((?:\\"|[^"])+)("\))/g, function(full, prefix, url, suffix) {
				if (prefix) {
					var path = url2path(url);
					path = path.substr(0, 1).toLowerCase() + path.substr(1);
					if (data[path]) {
						var version = data[path];
						var buildPath = addVersion(getBuildPath(path), version);
						var distPath = addVersion(getDistPath(path), version);

						Util.copyFile(path, buildPath);
						Util.copyFile(path, distPath);

						return prefix + addVersion(url, version) + suffix;
					}
				}
				return full;
			});
			callback(content);
		});
	}

	// 构建一个JS文件
	function buildJs(path) {
		var relativePath = getRelativePath(path, 'js');
		var buildPath = getBuildPath(path);
		var distPath = getDistPath(path);

		// 把多个文件合并成一个文件
		if (config.libjs[relativePath]) {
			var fromPaths = config.libjs[relativePath].map(function(val) {
				return Path.resolve(config.root + '/src/js/' + val);
			});
			Util.concatFile(fromPaths, path);
			Util.copyFile(path, buildPath);
			Util.minJs(buildPath, distPath);
			Util.setSvnKeywords(buildPath);
			Util.setSvnKeywords(distPath);
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
			Util.setSvnKeywords(buildPath);
			Util.setSvnKeywords(distPath);
		});
	}

	// 构建一个LESS文件
	function buildLess(path) {
		var buildPath = getBuildPath(path);
		var distPath = getDistPath(path);

		var content = Util.readFileSync(path, 'utf-8');

		var parser = new(Less.Parser)({
			paths : ['.', config.root + '/src/css'],
			filename : path,
		});

		parser.parse(content, function(err, tree) {
			if (err) {
				return Util.error(err);
			}
			content = tree.toCSS();
			renameAssets(path, content, function(content) {
				Util.writeFileSync(buildPath, Util.banner + content);
				Util.minCss(buildPath, distPath);
				Util.setSvnKeywords(buildPath);
				Util.setSvnKeywords(distPath);
			});
		});
	}

	// 构建一个图片文件
	function buildImg(path) {
		var buildPath = getBuildPath(path);
		var distPath = getDistPath(path);

		Util.copyFile(path, buildPath);
		Util.copyFile(path, distPath);
	}

	// 根据一个项目
	function buildProject(path) {
		var pathList = Util.readProjectFile(config, path, 'src');

		buildFiles(pathList);
	}

	// 构建多个文件
	function buildFiles(pathList) {
		pathList.forEach(function(path) {
			if (/\.js$/.test(path)) {
				buildJs(path);
			} else if (/\.less$/.test(path)) {
				buildLess(path);
			} else {
				var projectPath = Path.resolve(config.root + '/project');
				if (Util.indir(path, projectPath)) {
					buildProject(path);
				} else {
					buildImg(path);
				}
			}
		});
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
				pathList = Util.grepPaths(path, canBuild);
			} else {
				if (!canBuild(path)) {
					Util.error('Cannot build: ' + path);
					return;
				}
				pathList.push(path);
			}
		}

		buildFiles(pathList);
	}

	init();
};
