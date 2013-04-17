
define('tui/browser', [], function() {

	var userAgent = navigator.userAgent.toLowerCase();

	// userAgent = 'Mozilla/5.0 (iPod; CPU iPhone OS 6_0_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Mobile/10A523'.toLowerCase();
	// userAgent = 'Mozilla/5.0 (Linux; U; Android 4.0.3; zh-cn; N12 Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30'.toLowerCase();
	// userAgent = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0; NOKIA; Nokia 710)'.toLowerCase();

	var browserUA = {
		ie6 : $.browser.msie && $.browser.version == 6.0,
		// html5相关特性
		html5: function(){
			var input = document.createElement('input');
			var video = document.createElement('video');
			return {
				// 支持video标签，支持h264
				'h264': !!(video.canPlayType && video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"').replace(/no/, '')),
				'history': !!(window.history && window.history.pushState && window.history.popState),
				'placeholder': "placeholder" in input
			};
		},
		//语言特性
		lang: (navigator.language || navigator.systemLanguage).toLowerCase(),
		iOS: (userAgent.match(/(ipad|iphone|ipod)/) || [])[0],
		iOSVersion: (userAgent.match(/os\s+([\d_]+)\s+like\s+mac\s+os/) || [0,'0_0_0'])[1].split('_'),
		wphone: parseFloat((userAgent.match(/windows\sphone\sos\s([\d.]+)/) || ['','0'])[1]),
		android: parseFloat((userAgent.match(/android\s([\d.]+)/) || ['','0'])[1])
	};

	// 检测UA及设备陀螺仪旋转值判断是否为移动设备
	browserUA.isMobile = !!browserUA.iOS || !!browserUA.wphone || !!browserUA.android || (window.orientation !== undefined) || false;

	// 检测移动设备是否为平板
	browserUA.isPad = browserUA.isMobile && (browserUA.iOS == 'ipad' || userAgent.indexOf('mobile') == -1) || false;

	return browserUA;
});
