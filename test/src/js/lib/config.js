
// static根目录URL，根据script路径自动获取。
// 线上环境：输出"http://js.tudouui.com/v3"
// 测试环境：输出"http://jstest.tudouui.com/v3"
require.rootUrl = (function(){
	var script = document.getElementById('libjsnode');
	var url = '.';
	if (script) {
		var match = /^(.*)\/(?:dist|build|src)\/js\//.exec(script.src);
		if (match) {
			url = match[1];
		}
	}
	return url;
})();

// 域名为ui.tudou.com的static根目录URL，自动切换测试和线上环境。
// 线上环境：输出"http://ui.tudou.com/v3"
// 测试环境：输出"http://uitest.tudou.com/v3"
require.uiRootUrl = (function(){
	var match = /^(http:\/\/)(?:js|css)(\w*.tudou)ui(.com)(\/.*)$/.exec(require.rootUrl);
	return match ? match[1] + 'ui' + match[2] + match[3] + match[4] : require.rootUrl;
})();

// OzJS配置
require.config({
	baseUrl : require.rootUrl + '/src/js/',
	distUrl : require.rootUrl + '/dist/js/',
	enableAutoSuffix : false
});
