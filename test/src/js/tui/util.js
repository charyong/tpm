
define('tui/util', [
	'tui/template'
], function(Template, require, exports) {

	/**
	 * 对目标数字进行0补齐处理
	 * @param {number} source 需要处理的数字
	 * @param {number} length 需要输出的长度
	 *
	 * @returns {string} 对目标数字进行0补齐处理后的结果
	 * @reference http://tangram.baidu.com/api.html#baidu.number.pad
	 */
	function pad(source, length) {
		var pre = '',
			negative = (source < 0),
			string = String(Math.abs(source));

		if (string.length < length) {
			pre = (new Array(length - string.length + 1)).join('0');
		}

		return (negative ?  '-' : '') + pre + string;
	}

	/**
	 * @public 跳到到指定地址，相对于open或location=，但是可以避免IE里location跳转时获取不到referrer的问题
	 * @reference http://webbugtrack.blogspot.com/2008/11/bug-421-ie-fails-to-pass-http-referer.html
	 * @TODO 会引起点击统计无法获得正确的位置编码
	 */
	function openURL(url, target){
		if (!$.browser.msie) {
			if(target)
				window.open(url, target)
			else
				location.href = url;
		} else {
			var a = $(Template.convertTpl('<a href="<%=url%>" target="<%=target%>" data-openurl="true">      </a>', {
					url: url,
					target: target || '_self'
				}))[0];
			document.body.appendChild(a);
			a.click();
		}
	}
	
	function formatNumber(data, format) {
		format = format.length;
		data = data || 0;
		return format == 1 ? data : (data = String(Math.pow(10, format) + data)).substr(data.length - format);
	}
	/**
	 * @public 格式化日期
	 * @param {pattern} 格式化正则
	 * @param {date} 需格式化的日期对象
	 */
	function formatDate(pattern, date) {
		if(date === undefined) {
			date = new Date;
		}
		else if($.isNumeric(date)) {
			date = new Date(parseInt(date));
		}
		return pattern.replace(/([YMDhsm])\1*/g, function(format) {
			switch(format.charAt()) {
				case 'Y':
					return formatNumber(date.getFullYear(), format);
				case 'M':
					return formatNumber(date.getMonth() + 1, format);
				case 'D':
					return formatNumber(date.getDate(), format);
				case 'w':
					return date.getDay() + 1;
				case 'h':
					return formatNumber(date.getHours(), format);
				case 'm':
					return formatNumber(date.getMinutes(), format);
				case 's':
					return formatNumber(date.getSeconds(), format);
			}
		});
	}
	/**
	 * @public 格式化日期
	 * @param {int/Date} 开始时间
	 * @param {end/Date} 结束时间
	 */
	function release(start, end) {
		if($.isNumeric(start)) {
			start = new Date(parseInt(start));
		}
		if($.isNumeric(end)) {
			end = new Date(parseInt(end));
		}
		if(start === undefined)
			start = new Date;
		if(end === undefined)
			end = new Date;
		var diff = end.getTime() - start.getTime();
		if(diff > 2592000000)
			return formatDate('YYYY年MM月DD日', start);
		else if(diff > 259200000)
			return Math.floor(diff / 86400000) + '天前';
		else if(diff > 172800000)
			return '前天';
		else if(diff > 86400000)
			return '昨天';
		else if(diff > 3600000)
			return Math.floor(diff / 3600000) + '小时前';
		else if(diff > 60000)
			return Math.floor(diff / 60000) + '分钟前';
		else
			return '刚刚';
	}

	/**
	 * @public 取字符串的字节长度
	 * @param {string} 字符串
	 */
	function byteLen(str) {
		return str.replace(/([^\x00-\xff])/g, '$1 ').length;
	}
	/**
	 * @public 按字节长度截取字符串
	 * @param {string} str是包含中英文的字符串
	 * @param {int} limit是长度限制（按英文字符的长度计算）
	 * @param {String} 添加在末尾的字符串
	 * @return {string} 返回截取后的字符串,默认末尾带有'..'
	 */
	function substr(str, limit, repl) {
		str = str || '';
		repl = repl || '..';
		if(this.byteLen(str) <= limit)
			return str;
		var sub = str.substr(0, limit).replace(/([^\x00-\xff])/g, '$1 ').substr(0, limit).replace(/([^\x00-\xff])\s/g, '$1');
		return sub + repl;
	}

	/**
	 * @public 时间格式(时:分:秒)转换为秒数
	 */
	function parseTime(t){
		var s = 0;
		t = t.split(':');
		for (var i = 0, j = t.length; i < j; i++) {
			s += t[i] * Math.pow(60, j - i - 1);
		}
		return s;
	}

	/**
	 * @public 数字时间转换为(时:分:秒)字符串
	 */
	function beautyTime(s){
		var ret = [];
		var h = parseInt(s / 3600);
		var m = parseInt(s % 3600 / 60);
		var s = (s % 60);
		if (m <= 9) m = '0' + m;
		if (s <= 9) s = '0' + s;
		ret = [m, s];
		if (h > 0) ret.unshift(h);
		return ret.join(':');
	}

	/**
	 * @public 格式化时间长度
	 * @param {pattern} 格式化正则
	 * @param {date} 需格式化的日期对象
	 */
	function formatTime(pattern, time, noPrefix) {
		if($.type(time) == 'date')
			time = time.getTIme();
		else
			time = parseInt(time);
		var date = new Date(time),
			h = date.getHours();
		if(date > 43200000)
			h += Math.floor(date / 43200000);
		if(noPrefix) {
			pattern = pattern.replace(/(\w)\1+/g, '$1');
		}
		return pattern.replace(/([hms])\1*/g, function(format) {
			switch(format.charAt()) {
				case 'h':
					return formatNumber(h - 8, format);
				case 'm':
					return formatNumber(date.getMinutes(), format);
				case 's':
					return formatNumber(date.getSeconds(), format);
			}
		});
	}
	function formatTimeE(time, noPrefix) {
		if(time < 3600000) {
			return this.formatTime('mm:ss', time, noPrefix);
		}
		else {
			return this.formatTime('hh:mm:ss', time, noPrefix);
		}
	}

	function params(url) {
		url = url || location.search || location.href;
		var params = {},
			result = url.match(/[^\s&?#=\/]+=[^\s&?#=]+/g);
		if(result)
			for(var i = 0, l = result.length; i < l; i++) {
				var n = result[i].split('=');
				params[n[0]] = decodeURIComponent(n[1]);
			}
		return params;
	}

	exports.pad = pad;
	exports.openURL = openURL;
	exports.release = release;
	exports.formatDate = formatDate;
	exports.byteLen = byteLen;
	exports.substr = substr;
	exports.formatTime = formatTime;
	exports.formatTimeE = formatTimeE;
	exports.beautyTime = beautyTime;
	exports.parseTime = parseTime;
	exports.params = params;
});
