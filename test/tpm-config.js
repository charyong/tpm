
exports.root = __dirname;

exports.ignore = [
	"g",
	"tui/browser",
	"tui/util",
	"tui/class",
	"tui/event",
	"tui/cookie",
	"tui/storage",
	"tui/net",
	"tui/template",
	"tui/drag",
	"tui/mask",
	"tui/widget",
	"tui/dialog"
];

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
