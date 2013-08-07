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

	// 获取src路径
	function getSrcPath(path) {
		var dirPath = Path.resolve(config.root + '/dist');
		var relativePath = Path.relative(dirPath, path).split(Path.sep).join('/');
		if (Path.extname(relativePath)) {
			return Path.resolve(config.root + '/src/' + relativePath.replace(/\.css$/, '.less'));
		} else {
			return '';
		}
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
		pathList = _.uniq(pathList);

		var pathCount = pathList.length;

		var result = {};

		pathList.forEach(function(path) {
			var cmd = 'svn info "' + path.replace(/\\/g, '\\\\') + '" --xml';

			console.log(cmd);

			var cp = ChildProcess.exec(cmd);

			cp.stdout.on('data', function(stdout) {
				var data = Iconv.fromEncoding(stdout, 'gbk');
				var match;
				if ((match = /<commit\s+revision="(\d+)">/i.exec(data))) {
					var value = match[1];
				}
				if (value) {
					result[path] = value;
				}
				pathCount--;
				if (pathCount === 0) {
					setTimeout(function(){
						callback(result);
					}, 0);
				}
			});

			cp.stderr.on('data', function(stderr){
				pathCount--;
				Util.error('[SVN] ' + stderr);
			});
		});
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
			path = getSrcPath(path);
			return path;
		}

		function addVersion(path, version) {
			return path.replace(/^(.+)(\.\w+)$/, '$1_' + version + '$2');
		}

		var match;
		var regExp = /url\("?((?:\\"|[^"\)])+)"?\)/g;
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
			content = content.replace(/\/\*[\S\s]*?\*\/|(url\("?)((?:\\"|[^"\)])+)("?\))/g, function(full, prefix, url, suffix) {
				if (prefix) {
					var path = url2path(url);
					if (path && data[path]) {
						var version = data[path];
						return prefix + addVersion(url, version) + suffix;
					}
				}
				return full;
			});

			_.each(data, function(version, path) {
				var buildPath = addVersion(getBuildPath(path), version);
				var distPath = addVersion(getDistPath(path), version);

				if (!Fs.existsSync(buildPath) || Util.mtime(path) >= Util.mtime(buildPath)) {
					Util.copyFile(path, buildPath);
				}

				if (!Fs.existsSync(distPath) || Util.mtime(path) >= Util.mtime(distPath)) {
					Util.copyFile(path, distPath);

					// 在Windows下优化PNG
					if (process.platform === 'win32' && /\.png$/i.test(distPath)) {
						var cmd = '"' + Path.resolve(__dirname + '/../bin/PngOptimizerCL').replace(/\\/g, '\\\\') + '" -file:"' + distPath.replace(/\\/g, '\\\\') + '"';

						console.log(cmd);

						var cp = ChildProcess.exec(cmd);
					}
				}
			});

			callback(content);
		});
	}

	// 构建一个JS文件
	function buildJs(path) {
		var relativePath = getRelativePath(path, 'js');
		var buildPath = getBuildPath(path);
		var distPath = getDistPath(path);

		// 延迟加载JS不能单独构建
		if (/^lazy\//.test(relativePath)) {
			return;
		}

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
			if (/^(module|page|lazy)\/mobile\//.test(relativePath)) {
				options.config.ignore = config.mobileIgnore;
			} else {
				options.config.ignore = config.ignore;
			}
		}

		options._ = [path];

		Ozma()(options, function(buildPath, distPath) {
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

		// grep ignore module
		var jsDirPath = config.root + '/src/js';
		config.ignore = Util.grepDepList(jsDirPath + '/g.js', jsDirPath, true);
		config.mobileIgnore = Util.grepDepList(jsDirPath + '/m.js', jsDirPath, true);

		buildFiles(pathList);
	}

	init();
};
