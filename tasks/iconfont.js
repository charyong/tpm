var Path = require('path');
var gulp = require('gulp');
var iconfont = require('gulp-iconfont');
var svgmin = require('gulp-svgmin');
var Optimist = require('optimist');

var Util = require(__dirname + '/../util');

Optimist.usage('Usage: ytpm iconfont [svgsPath] [fontName] [fontPath]\n' +
	'The svg file size must set is 1024*1024\n\n' +
	'Examples:\n' +
	'ytpm iconfont embed/fonts/tuiicon tuiicon embed/fonts')
	.demand([1, 2])
	.argv;

exports.run = function(args, config) {
	var svgsPath = Path.resolve(args[0] || 'embed/fonts/tuiicon'); // svg所以目录
	var fontName = args[1] || 'tuiicon';
	var fontPath = Path.resolve(args[2] || svgsPath + '/dist');

	Util.info('[iconfont] Create info:\nsvgs path: %s\noutput font path: %s/%s.*\n', svgsPath, fontPath, fontName);

	var txt = gulp.src(svgsPath + '/*.svg')
		.pipe(svgmin([{
			removeDoctype: false,
			removeWidth: true,
			removeHeight: true,
		}, {
			removeComments: true
		}]))
		.pipe(iconfont({
			fontName: fontName
			,appendCodepoints: true // recommended option
		}))
		.on('codepoints', function(codepoints, options) {
			console.log('include %d svg file success!', codepoints.length);
		})
		.pipe(gulp.dest(fontPath));

};

