var Path = require('path');
var Fs = require('fs');
var Ssh = require('ssh2');
var client = require('scp2');
var Optimist = require('optimist');

var Util = require(__dirname + '/../util');

Optimist.usage('Usage: ytpm vm [vmPath] [ENV]\n\n' +
	'Examples:\n' +
	'ytpm vm viewX.vm wwwtest')
	.demand([1, 2])
	.argv;


function connectManage3(sshConfig){
	var ssh = new Ssh();

	ssh.on('connect', function() {
		Util.info('[Manage3] connect ' + sshConfig.host);
	});

	ssh.on('error', function(err) {
		Util.info('[Manage3] ' + err);
	});

	ssh.on('close', function(had_error) {
		Util.info('[Manage3] disconnect');
	});

	ssh.connect({
		host: sshConfig.host,
		port: sshConfig.port,
		username: sshConfig.user,
		password: sshConfig.pass,
	});

	return ssh;
}


function uploadTemplate(mgr3, config, path){

	var fileName = Path.basename(path);
	var relativePath = Path.relative(config.localRoot, path).split(Path.sep).join('/');

	var options = {
		host: mgr3.host,
		username: mgr3.user,
		password: mgr3.pass,
		port: mgr3.port || 22,
		path: mgr3.root
	};

	client.scp(path, options, function(err){
		if (err) {
			Util.error('[Upload Manage3] failed:' + err);
			return;
		}

		Util.info('[Upload Manage3] '+ path +' ok');

		var manage3 = connectManage3(mgr3);

		manage3.on('ready', function(){

			var remotePath = config.root + relativePath;
			var cmd = ['scp', '-P ' + (config.port || 22), fileName, config.user + '@' + config.host + ':' + remotePath].join(' ');

			Util.info('[SCP] ' + path + ' -> ' + remotePath);

			manage3.exec(cmd, function(err, stream){
				if (err) {
					Util.error('[Upload VM] failed:' + err);
					return;
				}
				stream.on('data', function(data, extended) {
					if (extended === 'stderr') {
						Util.error(data.toString());
					} else {
						Util.info(data.toString());
					}
				});
				stream.on('exit', function(code, signal) {
					if (code == 0) {
						Util.info('[Upload VM] '+ path +' success');
					}
					manage3.end();
				});
			});

		});
	});
}

// 通过地址获取对应环境参数
function getServerEnv(path, env, config){
	var PROJECTS = config.project
		, project
	path = __lettersToLowercase(Path.normalize(path));
	for(var i in PROJECTS){
		var item = Path.normalize(PROJECTS[i]);
		//console.log('getServerEnv', path,  __lettersToLowercase(item),  path.indexOf( __lettersToLowercase(item) ) === 0);
		if(path.indexOf( __lettersToLowercase(item) ) === 0){
			project = i;
			break;
		}
	}
	if(!project){ // 文件不在现有项目列表中
		Util.error('[VM getEnv] failed: File is not in the list of existing projects.');
		return;
	}

	if(!config.server || !config.server[env]){
		Util.error('[VM getEnv] failed: config.server['+ env +'] not set.');
		return;
	}

	if(!config.server[env][project]){
		Util.error('[VM getEnv] failed: '+ project +'Evn-configs not set in '+ env +' env.');
		return;
	}
	config.server[env][project].localRoot = PROJECTS[project];

	return config.server[env][project];
}
//盘符改为小写
function __lettersToLowercase(path){
	return path.replace(/^\w:/, function($1){
		return $1.toLowerCase();
	});
}


exports.run = function(args, config) {
	var env = args.pop(); // 最后一个参数为环境 为一次上传多模板做准备

	var path = Path.resolve(args[0]); // 模板路径
	var serverEnv = getServerEnv(path, env, config);

	if(serverEnv){
		uploadTemplate(config.ssh.manage3, serverEnv, path);
	}
};

