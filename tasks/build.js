var Path = require('path');
var Fs = require('fs');
var Iconv = require('iconv-lite');
var _ = require('underscore');
var Less = require('less');
var Imagemin = require('imagemin');
var ChildProcess = require('child_process');

var Util = require(__dirname + '/../util');

exports.run = function(args, config) {

	// 转换成相对路径
	function getRelativePath(path, type) {
		var dirPath = Path.resolve(config.root + type);
		return Path.relative(dirPath, path).split(Path.sep).join('/');
	}

	// 获取build路径
	function getBuildPath(path) {
		var relativePath = getRelativePath(path, '/src');
		return Path.resolve(config.root + '/build/' + relativePath.replace(/\.less$/, '.css'));
	}

	// 获取dist路径
	function getDistPath(path) {
		var relativePath = getRelativePath(path, '/src');
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
		if (!Util.indir(path, Path.resolve(config.root + '/src'))) {
			return false;
		}

		if (/\.js$/.test(path)) {
			var relativePath = getRelativePath(path, config.jsSrcPath);
			// console.log('canBuild', path, relativePath)
			return config.main.js.indexOf(relativePath) >= 0;
		}

		if (/\.less$/.test(path)) {
			var relativePath = getRelativePath(path, config.cssSrcPath);
			return config.main.css.indexOf(relativePath) >= 0;
		}

		if (/\.(tpl|vm|sh|bat|cmd)$/.test(path)) {
			return false;
		}

		return /\.[a-z]+$/.test(path);
	}

	// 取得文件MD5
	function getFileVersion(pathList, callback) {
		pathList = _.uniq(pathList);

		var pathCount = pathList.length;

		var result = {};

		// 取得文件MD5
		pathList.forEach(function(path) {
			var content = Util.readFileSync(path);
			var md5 = Util.md5(content);
			result[path] = md5;
		});

		callback(result);
	}

	// 优化图片
	function optimizeImg(distPath, callback) {
		if (!/\.(png|jpg|jpeg|gif)$/i.test(distPath)) {
			callback();
			return;
		}

		var srcContent = Util.readFileSync(distPath);

		var imagemin = new Imagemin()
			.src(srcContent)
			.dest(distPath)
			.use(Imagemin.gifsicle())
			.use(Imagemin.jpegtran(true))
			.use(Imagemin.optipng({ optimizationLevel: 3 }))
			.use(Imagemin.svgo({plugins: [{removeViewBox: false}]}));

		imagemin.optimize(function (err, data) {
			if (err) {
				Util.error('[imagemin] optimize failed, ' + err);
				callback();
				return;
			}

			var saved = srcContent.length - data.contents.length;
			var savedMsg = saved > 0 ? 'saved ' + (Math.round(saved / 1024 * 100) / 100) + 'KB' : 'already optimized';

			Util.info('[imagemin] ' + distPath + ' : ' + savedMsg);
			callback();
		});
	}

	function resolveUrl(url) {
		while(true) {
			url = url.replace(/\w+\/\.\.\//g, '');
			if (!/\.\.\//.test(url)) {
				break;
			}
		}
		url = url.replace(/\.\//g, '');
		return url;
	}


	// 将JS代码改成AMD模块，包含路径转换，补充模块ID，模板转换等
	function fixModule(path, str) {
		var root = path.replace(/^(.*?)[\\\/](src|build|dist)[\\\/].*$/, '$1');
		var jsReg = new RegExp( '^.+' + config.jsSrcPath.replace(/([\/.?%+])/g, function($0, $1){ return '\\' + $1 }) + '\/' );
		var relativePath = path.split(Path.sep).join('/').replace(jsReg, '');
		var mid = relativePath.replace(/\.js$/, '');


		function fixDep(s, format) {
			if (format) {
				s = s.replace(/\s/g, '');
			}
			return s.replace(/(['"])(.+?)\1(,?)/g, function($0, $1, $2, $3) {
				var f = $2;
				if(f.charAt(0) == '.') {
					f = relativePath.replace(/[\w-]+\.js$/, '') + f;
					f = resolveUrl(f);
				}
				else if(f.charAt(0) == '/') {
					f = f.slice(1);
				}
				if (format) {
					return '\n  "' + f + '"' + $3 + '\n';
				} else {
					return $1 + f + $1 + $3;
				}
			}).replace(/,\n\n/g, ',\n');
		}

		// 补充模块ID
		if(/(?:^|[^\w\.])define\s*\(/.test(str) && !/(?:^|[^\w\.])define\s*\(\s*['"]/.test(str)) {
			str = str.replace(/\b(define\s*\(\s*)/, '$1"' + mid + '", ');
		}

		// 补齐依赖
		str = str.replace(/((?:^|[^\w\.])define\s*\(\s*['"].*?['"]\s*,\s*)([['"][\s\S]+?)(,\s*function\s*\()/g, function($0, $1, $2, $3) {
			return $1 + fixDep($2, true) + $3;
		});
		str = str.replace(/((?:^|[^\w\.])require\s*\(\s*)([\['"][\s\S]+?)(,\s*function\s*\()/g, function($0, $1, $2, $3) {
			return $1 + fixDep($2, false) + $3;
		});
		str = str.replace(/((?:^|[^\w\.])define\s*\(\s*['"].*?['"]\s*)(,\s*function\s*\()/g, '$1,[]$2');

		// 非AMD模块
		if(!/(?:^|[^\w\.])(define|require)\s*\(/.test(str)) {
			return str += '\n/* autogeneration */\ndefine("' + mid + '", [], function(){});\n';
		}

		return str;
}

	// Replace require.text to string
	function replaceTemplate(path, str) {
		// var root = path.replace(/^(.*?)[\\\/](src|build|dist)[\\\/].*$/, '$1');
		// sub template
		function replaceSubTemplate(parentPath, str) {
			Util.info('import: ' + Path.relative(config.root + config.jsSrcPath, parentPath).split(Path.sep).join('/'));
			return str.replace(/<%\s*require\.text\(\s*(['"])(.+?)\1\s*\);?\s*%>/g, function($0, $1, $2) {
				var f = $2;
				if(/^[a-z_/]/i.test(f)) {
					f = config.root + config.jsSrcPath + '/' + f;
				}
				else {
					f = parentPath.replace(/[\w-]+\.\w+$/, '') + f;
					f = resolveUrl(f);
				}
				var s = Util.readFileSync(f, 'utf-8');
				s = replaceSubTemplate(f, s);
				s = s.replace(/^\uFEFF/, '');
				return s;
			});
		}

		// replace template string
		str = str.replace(/(\b)require\.text\(\s*(['"])(.+?)\2\s*\)/g, function($0, $1, $2, $3) {
			var f = $3;
			if(/^[a-z_/]/i.test(f)) {
				f = config.root + config.jsSrcPath + '/' + f;
			}
			else {
				f = path.replace(/[\w-]+\.\w+$/, '') + f;
				f = resolveUrl(f);
			}
			var s = Util.readFileSync(f, 'utf-8');
			s = replaceSubTemplate(f, s);
			s = s.replace(/^\uFEFF/, '');
			s = s.replace(/\\/g, '\\\\');
			s = s.replace(/(\r\n|\r|\n)\s*/g, '\\n');
			s = s.replace(/'/g, "\\'");
			return $1 + "'" + s + "'";
		});

		return str;
	}


	// Remove comments, simple version
	function removeComments(str) {
		return str.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
	}

	// Grep dependencies for AMD module
	function grepDepList(path, root, recursion) {

		var depMap = {};
		var depList = [];
		var fileCache = {};

		function walk(path, isMain, recursion) {
			var fileStr = fileCache[path];
			if (!fileStr) {
				fileStr = Util.readFileSync(path, 'utf8');
				fileStr = fixModule(path, fileStr);
				fileCache[path] = fileStr;
			}

			if (isMain) {
				var regExp = /(?:^|[^\w\.])require\s*\(\s*(?:\[([^\]]*)\]|'([^']*)'|"([^"]*)")/g;
			} else {
				var regExp = /(?:^|[^\w\.])define\s*\(\s*['"].*?['"]\s*,\s*(?:\[([^\]]*)\]|'([^']*)'|"([^"]*)")/g;
			}

			var match;

			while((match = regExp.exec(fileStr))) {
				var depIds = [];

				if (match[1]) {
					depStr = removeComments(match[1]);
					depIds = depStr.split(',').map(function(val) {
						val = val.trim();
						return val.substr(1, val.length - 2);
					});
				} else {
					depIds = [match[3] || match[2]];
				}

				depIds.reverse().forEach(function(id) {
					if (id) {
						if (id.charAt(0) === '.') {
							var filePath = Path.resolve(Path.dirname(path), id + '.js');
						} else {
							var filePath = Path.resolve(root + '/' + id + '.js');
						}

						id = Path.relative(root, filePath).split(Path.sep).join('/').replace(/\.js$/, '');

						if (typeof depMap[id] == 'undefined') {
							depMap[id] = true;
							if (recursion) {
								// lazy module
								walk(filePath, true, false);
								// normal module
								walk(filePath, false, true);
							}
							depList.push(id);
						}
					}
				});
			}

			return fileStr;
		}

		walk(path, true, recursion);
		walk(path, false, recursion);

		return depList;
	}

	// Build JS (AMD)
	function buildJsUtil(path, ignore) {
		ignore = ignore || [];

		var root = path.replace(/^(.*?)[\\\/](src|build|dist)[\\\/].*$/, '$1');
		var jsDirPath = root + config.jsSrcPath
		var jsReg = new RegExp( '^.+' + config.jsSrcPath.replace(/([\/.?%+])/g, function($0, $1){ return '\\' + $1 }) + '\/' );
		var relativePath = path.split(Path.sep).join('/').replace(jsReg, '');
		var mid = relativePath.replace(/\.js/, '');
		var isLazy = /^lazy\//.test(mid);
		// console.log('buildJsUtil', relativePath, jsDirPath)

		var ignoreMap = {};
		ignore.forEach(function(id) {
			ignoreMap[id] = true;
		});

		var depList = grepDepList(path, jsDirPath, true);

		var content = Util.banner;

		content += '\n(function($) {\n\n';

		if (!isLazy) {
			content += '\nrequire.config({ enable_ozma: true });\n\n\n';
		}

		depList.forEach(function(dep) {
			if (ignoreMap[dep]) {
				return;
			}
			var filePath = jsDirPath + '/' + dep + '.js';
			if (mid == dep) {
				return;
			}
			Util.info('import: ' + dep);
			content += '/* @source ' + dep + '.js */;\n';
			var str = Util.readFileSync(filePath, 'utf-8');
			str = fixModule(filePath, str);
			str = replaceTemplate(filePath, str);
			content += '\n' + str  + '\n';
		});

		if (isLazy) {
			content += '/* @source ' + mid + '.js */;\n';
		} else {
			content += '/* @source  */;\n';
		}

		var str = Util.readFileSync(path, 'utf-8');
		str = fixModule(path, str);
		str = replaceTemplate(path, str);
		content += '\n' + str;

		content += '\n\n})(window.jQuery);\n';

		return content;
	}

	// 图片版本化
	function renameAssets(cssPath, content, callback) {
		var dirPath = Path.dirname(cssPath);

		function url2path(url) {
			url = url.replace(/[?#].*$/, '');
			var path = '';
			if (url.charAt(0) == '.') {
				path = Path.resolve(dirPath + '/' + url);
			} else if (url.charAt(0) == '/') {
				url = url.replace(/^\/[^\/]+/, '');
				path = Path.resolve(config.root + url);
			}
			path = getSrcPath(path);
			return path;
		}

		function addVersion(path, version) {
			return path.replace(/^(.+)(\.\w+[?#]?.*)$/, '$1_' + version + '$2');
		}

		var match;
		var regExp = /url\(["']?([^'"\)]+)["']?\)/g;
		var newContent = content.replace(/\/\*[\S\s]*?\*\//g, '');
		var pathList = [];
		while((match = regExp.exec(newContent))) {
			var url = match[1];
			var path = url2path(url);
			if (path && Util.indir(path, config.root + '/src') && Fs.existsSync(path)) {
				pathList.push(path);
			}
		}
		if (pathList.length < 1) {
			callback(content);
			return;
		}
		getFileVersion(pathList, function(data) {
			content = content.replace(/\/\*[\S\s]*?\*\/|(url\(["']?)([^'"\)]+)(["']?\))/g, function(full, prefix, url, suffix) {
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
				var buildPath = getBuildPath(path);
				var distPath = getDistPath(path);

				if (version) {
					buildPath = addVersion(buildPath, version);
					distPath = addVersion(distPath, version);
				}

				if (!Fs.existsSync(buildPath) || Util.mtime(path) >= Util.mtime(buildPath)) {
					Util.copyFile(path, buildPath);
					optimizeImg(buildPath, function() {
						Util.copyFile(buildPath, distPath);
					});
				}
			});

			callback(content);
		});
	}

	// 构建一个JS文件
	function buildJs(path) {
		var relativePath = getRelativePath(path, config.jsSrcPath);
		var buildPath = getBuildPath(path);
		var distPath = getDistPath(path);

		// 把多个文件合并成一个文件
		if (config.libjs[relativePath]) {
			var fromPaths = config.libjs[relativePath].map(function(val) {
				return Path.resolve(config.root + config.jsSrcPath + '/' + val);
			});
			Util.concatFile(fromPaths, path);
			Util.copyFile(path, buildPath);
			Util.minJs(buildPath, distPath);
			return;
		}

		// AMD文件
		var relativePath = getRelativePath(path, config.jsSrcPath);

		if (config.globaljs.indexOf(relativePath) < 0) {
			if (/^(module|page|lazy)\/mobile\//.test(relativePath)) {
				var ignore = config.mobileIgnore || [];
			} else {
				var ignore = config.ignore || [];
			}
		} else {
			var ignore = [];
		}

		config.main.js.forEach(function(path) {
			if (/^lazy\//.test(path)) {
				ignore.push(path.replace(/\.js$/, ''));
			}
		});

		var content = buildJsUtil(path, ignore);
		Util.writeFileSync(buildPath, content);
		Util.minJs(buildPath, distPath);
	}

	// 构建一个LESS文件
	function buildLess(path) {
		var buildPath = getBuildPath(path);
		var distPath = getDistPath(path);

		var content = Util.readFileSync(path, 'utf-8');

		var parser = new(Less.Parser)({
			paths : ['.', config.root + config.cssSrcPath],
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
			});
		});
	}

	// 构建一个图片文件
	function buildImg(path) {
		var buildPath = getBuildPath(path);
		var distPath = getDistPath(path);
		Util.copyFile(path, buildPath);
		optimizeImg(buildPath, function() {
			Util.copyFile(buildPath, distPath);
		});
	}

	// 构建多个文件
	function buildFiles(pathList) {
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

	// 初始化
	function init() {
		var pathList = [];

		if (args.length < 1) {
			config.main.js.forEach(function(path) {
				pathList.push(Path.resolve(config.root + config.jsSrcPath + '/' + path));
			});
			config.main.css.forEach(function(path) {
				pathList.push(Path.resolve(config.root + '/src/' + path));
			});
		} else {
			var path = Path.resolve(args[0]);
			if(!Fs.existsSync(path)){
				Util.error('Can\'t find file: ' + path);
				return;
			}
			var stat = Fs.statSync(path);
			if (stat.isDirectory(path)) {
				pathList = Util.grepPaths(path, canBuild);
			} else {
				if (!canBuild(path)) {
					Util.error('Can\'t build: ' + path);
					return;
				}
				pathList.push(path);
			}
		}

		// grep ignore module
		var jsDirPath = config.root + config.jsSrcPath;
		if (Fs.existsSync(jsDirPath + '/g.js')) {
			config.ignore = grepDepList(jsDirPath + '/g.js', jsDirPath, true);
		}
		if (Fs.existsSync(jsDirPath + '/m.js')) {
			config.mobileIgnore = grepDepList(jsDirPath + '/m.js', jsDirPath, true);
		}

		buildFiles(pathList);
	}

	init();
};
