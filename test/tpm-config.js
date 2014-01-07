
exports.root = __dirname;

exports.jira_host = 'http://jira.intra.tudou.com';

exports.deploy_mail = 'webtest_fabu@tudou.com';

exports.main = {
	"js" : [
		"lib.js",
		"g.js",
		"lazy/demo.js",
		"page/demo.js"
	],
	"css" : [
		"g.less"
	]
};

exports.libjs = {
	"lib.js" : ["lib/jquery.js", "lib/fix.js", "lib/oz.js", "lib/config.js"]
};

exports.globaljs = [
	"g.js"
];
