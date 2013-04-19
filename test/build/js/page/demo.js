/**
 * @modified $Author$
 * @version $Rev$
 */

require.config({ enable_ozma: true });


/* @source  */;


require(['g'], function(G) {
	G.init();

	require(['lazy/demo'], function(Demo) {
		Demo.init();
	});
});
