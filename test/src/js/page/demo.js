
require(['g'], function(G) {
	G.init();

	var testStr = require.text('./test1.tpl');

	require(['lazy/demo'], function(Demo) {
		Demo.init();
	});
});
