
var Path = require('path');
var Fs = require('fs');
var Rimraf = require('rimraf');

var Util = require(__dirname + '/../util');

exports.run = function(args, config) {

	var jsDirPath = Path.resolve(config.root + '/dist/js');

	var global = Util.grepModuleList(jsDirPath + '/g.js');
	var mobileGlobal = Util.grepModuleList(jsDirPath + '/m.js');

	// 检查依赖的完整性，防止全局模块被删除后页面报错。
	config.main.js.forEach(function(relativePath) {
		if (config.libjs[relativePath]) {
			return;
		}

		if (config.globaljs.indexOf(relativePath) >= 0) {
			return;
		}

		if (/^lazy\//.test(relativePath)) {
			return;
		}

		var filePath = Path.resolve(jsDirPath + '/' + relativePath);

		if (!Fs.existsSync(filePath)) {
			return;
		}

		var globalIdList = /^(module|page|lazy)\/mobile\//.test(relativePath) ? mobileGlobal : global;

		var depList = Util.grepDepList(filePath, jsDirPath, false);

		var idList = Util.grepModuleList(filePath);

		// 检查缺少依赖的模块
		depList.forEach(function(dep) {
			if (globalIdList.indexOf(dep) < 0 && idList.indexOf(dep) < 0) {
				if (!Fs.existsSync(jsDirPath + '/' + dep + '.js')) {
					Util.error('dependencies not in the global: ' + dep + ', ' + filePath);
				}
			}
		});

		// 检查重复的模块
		idList.forEach(function(id) {
			if (globalIdList.indexOf(id) >= 0) {
				Util.warn('duplicated module: ' + id + ', ' + filePath);
			}
		});
	});

};
