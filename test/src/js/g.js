
define('g', [
	'tui/cookie',
	'tui/dialog'
], function(Cookie, Dialog, require, exports) {

	exports.init = function() {
		console.log('global init');
	};

});

require(['g'], function() {});
