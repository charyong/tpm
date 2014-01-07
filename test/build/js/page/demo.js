/**
 * @modified $Author$
 * @version $Rev$
 */

require.config({ enable_ozma: true });


/* @source  */;


require(['g'], function(G) {
	G.init();

	var testStr = '<div>\n<% for (var i = 0; i < 100; i++) {%>\n<li>\n<%=row.nickname%>: <img src="#"/>\n</li>\n<%}%>\n</div>';

	require(['lazy/demo'], function(Demo) {
		Demo.init();
	});
});
