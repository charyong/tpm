var Path = require('path');
var Fs = require('fs');
var Ssh = require('ssh2');
var client = require('scp2');

var Util = require(__dirname + '/../util');

var DEPLOY_USAGE = 'Usage: tpm vm [vmPath] [ENV]\n\n' +
	'Examples:\n' +
	'tpm vm viewX.vm tditem_wwwtest\n';


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

	var options = {
		host: mgr3.host,
		username: mgr3.user,
		password: mgr3.pass,
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

			var remotePath = config.root + fileName;
			var cmd = ['scp', fileName, config.user + '@' + config.host + ':' + remotePath].join(' ');

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


exports.run = function(args, config) {

	if (args.length < 2) {
		console.log(DEPLOY_USAGE);
		return;
	}

	var path = args[0];
	var env = args[1];

	path = Path.resolve(path);

	uploadTemplate(config.ssh.manage3, config.ssh[env], path);

};
