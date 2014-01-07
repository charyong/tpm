/**
 * @modified $Author$
 * @version $Rev$
 */
/* @source lazy/demo.js */;


define('lazy/demo', [
  "tui/cookie",
  "tui/event"
], function(Cookie, Event, require, exports) {
	exports.init = function() {
		console.log('lazy/demo init');
	};
});
