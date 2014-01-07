/**
 * @modified $Author$
 * @version $Rev$
 */
require.config({enable_ozma:true});require(["g"],function(i){i.init();var n='<div>\n<% for (var i = 0; i < 100; i++) {%>\n<li>\n<%=row.nickname%>: <img src="#"/>\n</li>\n<%}%>\n</div>';require(["lazy/demo"],function(i){i.init()})});;