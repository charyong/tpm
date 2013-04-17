
define('tui/net', [], function(require, exports) {

	/**
	 * 在页面里动态嵌入js最轻量的方法
	 * @param {string} url get请求的参数，防止缓存的随机数，jsoncallback都应该手动加在这里
	 * @param {Object|function} op 配置参数或回调函数，op.charset表示js文件的编码
	 */
	exports.getScript = function(url, op){
		var s = document.createElement("script");
		s.type = "text/javascript";
		s.async = true; //for firefox3.6
		if (!op)
			op = {};
		else if ($.isFunction(op))
			op = { callback: op };
		if (op.charset)
			s.charset = op.charset;
		s.src = url;
		var h = document.getElementsByTagName("head")[0];
		var done = false;
		s.onload = s.onreadystatechange = function(){
			if ( !done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") ) {
				done = true;
				//防止ie内存泄漏
				s.onload = s.onreadystatechange = null;
				h.removeChild(s);
				if (op.callback)
					op.callback();
			}
		};
		h.appendChild(s);
	};

	var uuid4jsonp = 0;

	/**
	 * 请求json数据，自动判断跨域。注意：不会自动加随机参数
	 * @param {string} url 请求地址，包含参数，不需要加jsoncallback
	 * @param {object} data
	 * @param {function} fn 回调函数，如果跨域，通过op.callback给它指定全局名称
	 * @param {object} op 配置参数
	 * 					 op.charset指定编码
	 * 					 op.random指定随机参数，必须是字符串
	 * 					 如果跨域而没有op.callback，自动生成随机函数名
	 */
	exports.getJSON = function(url, data, fn, op){
		var domain = url.match(/https?\:\/\/(.+?)\//);
		if (fn) {
			if ((!op || !op.isScript) && (!domain || domain[1] === window.location.host)) {
				$.ajax({
					url: url,
					data: data,
					success: fn,
					dataType: "json"
				});
				return true;
			}
		}
		op = $.extend({
			charset: "gbk",
			callback: "tuijsonp" + ++uuid4jsonp
		}, op || {});
		if (op.random)
			data[op.random] = +new Date();
		var cbName = op.callbackName || 'jsoncallback';
		data[cbName] = op.callback;
		url = [url, /\?/.test(url) ? "&" : "?", $.param(data)].join("");
		if (fn)
			window[op.callback] = fn;
		delete op.callback;
		exports.getScript(url, op);
	};

	exports.getRequest = function(url, params) {
		var img = new Image();
		//阻止IE下的自动垃圾回收引起的请求未发出状况
		img.onload = function(){};
		img.src = !params ? url : [url, url.match(/\?/) ? "&" : "?", typeof params == "string" ? params : $.param(params)].join('');
	};

});
