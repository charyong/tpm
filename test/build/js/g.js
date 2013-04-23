/**
 * @modified $Author$
 * @version $Rev$
 */

require.config({ enable_ozma: true });


/* @source tui/class.js */;


define('tui/class', [], function() {

	function init() {
		return function() {
			if (this.initialize) {
				this.initialize.apply(this, arguments);
			}
		};
	}

	function extend(protoProps, staticProps) {
		var parent = this;

		var child = init();

		$.extend(child, parent, staticProps);

		var proto = Object.create(parent.prototype);
		proto.constructor = child;
		child.prototype = proto;

		$.extend(child.prototype, protoProps);

		child.superClass = parent.prototype;

		return child;
	}

	var Class = function(protoProps) {
		var cls = init();

		$.extend(cls.prototype, protoProps);

		cls.extend = extend;

		return cls;
	};

	Class.extend = extend;

	return Class;

});

/* @source tui/event.js */;


define('tui/event', [
  "tui/class"
], function(Class) {

	var Event = Class({
		initialize : function() {
			this.__event = window.Zepto ? new window.Zepto.Events : $({});
		}
	});

	var proto = Event.prototype;

	['bind', 'one'].forEach(function(method) {
		proto[method] = function(type, handler) {
			var event = this.__event;
			var callback = function() {
				handler.apply(event, arguments.length > 0 ? (window.Zepto ? arguments : Array.prototype.slice.call(arguments, 1)) : []);
			};
			event[method].call(event, type, callback);
			return this;
		};
	});

	['unbind', 'trigger'].forEach(function(method) {
		proto[method] = function() {
			var event = this.__event;
			return event[method].apply(event, arguments);
		};
	});

	proto.fire = proto.trigger;

	Event.mix = function(receiver) {
		return $.extend(receiver, new Event());
	};

	return Event;

});

/* @source tui/drag.js */;


define('tui/drag', [
  "tui/event"
], function(Event) {

	var win = $(window);

	function clearSelection() {
		if(window.getSelection)
			window.getSelection().removeAllRanges();
		else if(document.selection)
			document.selection.empty();
		return this;
	}

	var Klass = Event.extend({
		initialize : function(node, options) {
			var self = this;
			options = options || {};
			var handler = options.handler || node;
			Klass.superClass.initialize.call(self);
            self.limit = options.limit;
            self.bubble = options.bubble;
			self.enable2 = true;
			self.state2 = false;
			self.hasMove2 = false;
			self.fx = self.fy = -1;
			self.x2 = self.y2 = self.mx2 = self.my2 = self.cx2 = self.cy2 = 0;
			self.node2 = $.type(node) == 'string' ? $(node) : node;
			self.container2 = options.container || self.node2.parent();
			self.fixed2 = self.node2.css('position').toLowerCase() == 'fixed';
			self.handler2 = $.type(handler) == 'string' ? $(handler) : handler;

			function selectListener(e) {
				e.preventDefault();
			}
			//init
            var h = self.handler2 || self.node2;
			
			function onDown(e) {
				e.preventDefault();
				
				if(!self.bubble || e.target == h[0]) {
					self.start(e);
					$(document).bind('selectstart', selectListener);
					if (h[0].setCapture) {
						h[0].setCapture();
					}
				}
			}
			h.bind('mousedown', onDown);
			function onUp(e) {
				e.preventDefault();
				if(self.state2) {
					self.state2 = false;
					var x = e.pageX - self.mx2 + self.x2 - self.cx2,
						y = e.pageY - self.my2 + self.y2 - self.cy2;
					if(self.fixed2) {
						x -= win.scrollLeft();
						y -= win.scrollTop();
					}
					if(self.limit) {
						x = Math.max(x, 0);
						y = Math.max(y, 0);
						x = Math.min(x, self.cWidth - self.dWidth);
						y = Math.min(y, self.cHeight - self.dHeight);
					}
					self.x2 = self.node2.offset().left;
					self.y2 = self.node2.offset().top;
					self.trigger('drag:end', [x, y, e.pageX, e.pageY, self.node2, self.container2]);
				}
				$(document).unbind('selectstart', selectListener);
				if (h[0].releaseCapture) {
					h[0].releaseCapture();
				}
			}
			$(document).bind('mouseup', onUp);
			function onMove(e) {
				e.preventDefault();
				if(self.state2 && self.enable2) {
					if(!self.hasMove() && e.pageX == self.fx && e.pageY == self.fy) {
						//chrome下有几率发生尚未移动就触发了mousemove
					}
					else {
						self.hasMove2 = true;
					}
					var x = e.pageX - self.mx2 + self.x2 - self.cx2,
						y = e.pageY - self.my2 + self.y2 - self.cy2;
					if(self.fixed2) {
						x -= win.scrollLeft();
						y -= win.scrollTop();
					}
					if(self.limit) {
						x = Math.max(x, 0);
						y = Math.max(y, 0);
						x = Math.min(x, self.cWidth - self.dWidth);
						y = Math.min(y, self.cHeight - self.dHeight);
					}
					self.node2.css({
						left: x,
						top: y
					});
					//清理文本选中
					clearSelection();
					self.trigger('drag:move', [x, y, e.pageX, e.pageY, self.node2, self.container2]);
				}
			}
			$(document).bind('mousemove', onMove);

			//清除侦听方法，防止内存泄?
			self.cancel = function() {
				h.unbind('mousedown', onDown);
				$(document).unbind('mouseup', onUp);
				$(document).unbind('mousemove', onMove);
			}
		},
		start: function(e) {
			var self = this;
            
            if (self.limit) {
                self.cWidth = self.container2.outerWidth();
                self.cHeight = self.container2.outerHeight();
                self.dWidth = self.node2.outerWidth();
                self.dHeight = self.node2.outerHeight();
            }
			
			self.fx = e.pageX;
			self.fy = e.pageY;
			while(self.container2[0]) {
				if(self.container2[0].nodeName == 'BODY' || ['absolute', 'relative'].indexOf(self.container2.css('position')) > -1)
					break;
				self.container2 = self.container2.parent();
			}
			self.cx2 = self.container2.offset().left;
			self.cy2 = self.container2.offset().top;
			self.x2 = self.node2.offset().left;
			self.y2 = self.node2.offset().top;
			self.mx2 = e.pageX;
			self.my2 = e.pageY;
			self.state2 = true;
			self.trigger('drag:start', [self.x2, self.y2, e.pageX, e.pageY, self.node2, self.container2]);
			return this;
		},
		enable: function() {
			this.enable2 = true;
			return this;
		},
		disable: function() {
			this.enable2 = false;
			return this;
		},
		state: function() {
			return this.state2;
		},
		hasMove: function() {
			return this.hasMove2;
		}
	});

	return Klass;
});

/* @source tui/template.js */;

/**
 * A lightweight and enhanced micro-template implementation, and minimum utilities
 *
 * using AMD (Asynchronous Module Definition) API with OzJS
 * see http://ozjs.org for details
 *
 * Copyright (C) 2010-2012, Dexter.Yy, MIT License
 * vim: et:ts=4:sw=4:sts=4
 */
define('tui/template', [], function(require, exports){

	exports.ns = function(namespace, v, parent){
		var i, p = parent || window, n = namespace.split(".").reverse();
		while ((i = n.pop()) && n.length > 0) {
			if (typeof p[i] === 'undefined') {
				p[i] = {};
			} else if (typeof p[i] !== "object") {
				return false;
			}
			p = p[i];
		}
		if (typeof v !== 'undefined')
			p[i] = v;
		return p[i];
	};

	exports.format = function(tpl, op){
		return tpl.replace(/<%\=(\w+)%>/g, function(e1,e2){
			return op[e2] != null ? op[e2] : "";
		});
	};

	exports.escapeHTML = function(str){
		str = str || '';
		var xmlchar = {
			//"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"'": "&#39;",
			'"': "&quot;",
			"{": "&#123;",
			"}": "&#125;",
			"@": "&#64;"
		};
		return str.replace(/[<>'"\{\}@]/g, function($1){
			return xmlchar[$1];
		});
	};

	exports.substr = function(str, limit, cb){
		if(!str || typeof str !== "string")
			return '';
		var sub = str.substr(0, limit).replace(/([^\x00-\xff])/g, '$1 ').substr(0, limit).replace(/([^\x00-\xff])\s/g, '$1');
		return cb ? cb.call(sub, sub) : (str.length > sub.length ? sub + '...' : sub);
	};

	exports.strsize = function(str){
		return str.replace(/([^\x00-\xff]|[A-Z])/g, '$1 ').length;
	};

	var document = this.document;

	exports.tplSettings = {
		_cache: {},
		evaluate: /<%([\s\S]+?)%>/g,
		interpolate: /<%=([\s\S]+?)%>/g
	};

	exports.tplHelpers = {
		mix: $.extend,
		escapeHTML: exports.escapeHTML,
		substr: exports.substr,
		include: convertTpl,
		_has: function(obj){
			return function(name){
				return exports.ns(name, undefined, obj);
			};
		}
	};

	function convertTpl(str, data, namespace){
		var func, c  = exports.tplSettings, suffix = namespace ? '#' + namespace : '';
		if (!/[\t\r\n% ]/.test(str)) {
			func = c._cache[str + suffix];
			if (!func) {
				var tplbox = document.getElementById(str);
				if (tplbox) {
					func = c._cache[str + suffix] = convertTpl(tplbox.innerHTML, false, namespace);
				}
			}
		} else {
			func = new Function(namespace || 'obj', 'api', 'var __p=[];'
				+ (namespace ? '' : 'with(obj){')
					+ 'var mix=api.mix,escapeHTML=api.escapeHTML,substr=api.substr,include=api.include,has=api._has(' + (namespace || 'obj') + ');'
					+ '__p.push(\'' +
					str.replace(/\\/g, '\\\\')
						.replace(/'/g, "\\'")
						.replace(c.interpolate, function(match, code) {
							return "'," + code.replace(/\\'/g, "'") + ",'";
						})
						.replace(c.evaluate || null, function(match, code) {
							return "');" + code.replace(/\\'/g, "'")
												.replace(/[\r\n\t]/g, ' ') + "__p.push('";
						})
						.replace(/\r/g, '\\r')
						.replace(/\n/g, '\\n')
						.replace(/\t/g, '\\t')
					+ "');"
				+ (namespace ? "" : "}")
				+ "return __p.join('');");
		}
		return !func ? '' : (data ? func(data, exports.tplHelpers) : func);
	}

	exports.convertTpl = convertTpl;
	exports.reloadTpl = function(str){
		delete exports.tplSettings._cache[str];
	};

});

/* @source tui/widget.js */;


define('tui/widget', [
  "tui/event",
  "tui/template"
], function(Event, Template) {

	// 分割 event key
	function splitEventKey(eventKey, defaultEventType) {
		var type;
		var selector;
		var arr = eventKey.split(' ');
		if (arr.length == 1) {
			type = defaultEventType;
			selector = eventKey;
		} else {
			type = arr.shift();
			selector = arr.join(' ');
		}
		return [type, selector];
	}

	var Widget = Event.extend({
		// 与 widget 关联的 DOM 元素 (jQuery对象)
		element : null,
		// 默认模板
		template : '<div></div>',
		// 默认事件类型
		eventType : 'click',
		// 默认数据
		model : {},
		// 事件代理，格式为：
		// {
		//     'mousedown .title': 'edit',
		//     'click .open': function(ev) { ... }
		// }
		events : {},
		// 组件的定位节点 (jQuery对象)
		targetNode : $(document.body),
		// 渲染方法，"append","prepend","before","after","replaceWith"
		renderMethod : 'append',
		// 构造方法
		initialize : function(config) {
			var self = this;

			Widget.superClass.initialize.call(self);

			$.each(['element', 'targetNode'], function() {
				config[this] && (self[this] = $(config[this]));
			});

			$.each(['template', 'eventType', 'renderMethod'], function() {
				config[this] && (self[this] = config[this]);
			});

			$.each(['model', 'events'], function() {
				config[this] && $.extend(self[this], config[this]);
			});
		},

		// 在 this.element 内寻找匹配节点
		find : function(selector) {
			return this.element.find(selector);
		},

		// 注册事件代理
		delegate : function(events, handler) {
			var self = this;
			// 允许使用：widget.delegate('click p', function(ev) { ... })
			if ($.type(events) == 'string' && $.isFunction(handler)) {
				var obj = {};
				obj[events] = handler;
				events = obj;
			}
			// key 为 'event selector'
			$.each(events, function(key, val) {
				var callback = function(e) {
					if ($.isFunction(val)) {
						return val.call(self, e);
					} else {
						return self[val](e);
					}
				};
				var arr = splitEventKey(key, self.eventType);
				self.element.on(arr[0], arr[1], callback);
			});
			return self;
		},

		// 卸载事件代理
		undelegate : function(eventKey) {
			var self = this;
			// key 为 'event selector'
			var arr = splitEventKey(eventKey, self.eventType);
			self.element.off(arr[0], arr[1]);
			return self;
		},

		// 将 widget 渲染到页面上
		render : function(model) {
			var self = this;

			if (!self.element || !self.element[0]) {
				self.element = $(Template.convertTpl(self.template, model || self.model));
			}

			self.delegate(self.events);

			self.targetNode[self.renderMethod](self.element);

			return self;
		}
	});

	return Widget;

});

/* @source tui/mask.js */;


define('tui/mask', [], function() {
	var $node = $('<div class="tui_mask">');
	var init;
	var $win = $(window);
	var $doc = $(document);
	var $body = $(document.body);

	function cb() {
		$node.css({
			width: Math.max($win.width(), $doc.width()),
			height: Math.max($win.height(), $doc.height())
		});
	}

	return {
		node: function() {
			return $node;
		},
		resize: function() {
			cb();
		},
		show: function(zIndex) {
			$win.bind('resize', cb);
			$node.css('z-index', zIndex || 90000);
			this.resize();
			if(!init) {
				$body.append($node);
				init = true;
			}
			else
				$node.show();
			return this;
		},
		hide: function(remove) {
			$win.unbind('resize', cb);
			if(remove) {
				$node.remove();
				init = false;
			}
			else
				$node.hide();
			return this;
		},
		update: function() {
			cb();
		},
		state: function() {
			return $node.is(':visible');
		}
	};
});

/* @source tui/browser.js */;


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

/* @source tui/dialog.js */;


define('tui/dialog', [
  "tui/browser",
  "tui/template",
  "tui/mask",
  "tui/widget",
  "tui/drag"
], function(Browser, Template, Mask, Widget, Drag) {

	var win = $(window);

	var ie6 = Browser.ie6 || !$.support.boxModel;

	var zIndex = 10001;

	var buttonsTemplate = '<div class="tui_dialog_button"><% for (var i = 0; i < data.buttons.length; i++) { %>'
		+ '<a data-role="button_<%=i%>" href="#"><%=data.buttons[i].name%></a>'
		+ '<% } %></div>';

	var template = '<div class="tui_dialog <%=data.className%>"><div<% if (data.msie) { %> class="tui_dialog_wrap"<% } %>><div class="tui_dialog_holder" data-role="holder">'
		+ '<div class="tui_dialog_resize"></div>'
		+ '<div class="tui_dialog_w_tp"></div><div class="tui_dialog_w_bm"></div>'
		+ '<div class="tui_dialog_w_lf"></div><div class="tui_dialog_w_rt"></div>'
		+ '<div class="tui_dialog_w_tl"></div><div class="tui_dialog_w_tr"></div>'
		+ '<div class="tui_dialog_w_bl"></div><div class="tui_dialog_w_br"></div>'
		+ '<div class="tui_dialog_header" data-role="header"><span class="tui_dialog_close" data-role="close" title="关闭">关闭</span>'
		+ '<div class="tui_dialog_title" data-role="title"><%=data.title%></div><div class="tui_dialog_bar"><%=data.bar%></div></div>'
		+ '<div class="tui_dialog_content" data-role="content"></div>'
		+ '<% if (data.buttons.length > 0) { %><div class="tui_dialog_footer" data-role="footer">' + buttonsTemplate + '</div><% } %>'
		+ '<% if (data.info) { %><div class="tui_dialog_info"><%=data.info%></div><% } %>'
		+ '</div></div></div>';

	var Dialog = Widget.extend({
		// 事件代理
		events : {
			'click [data-role=close]' : function(e) {
				e.preventDefault();
				this.close();
			}
		},
		// 构造方法
		initialize : function(config) {
			var self = this;

			var defaults = {
				template : template,
				buttons : [],
				zIndex : zIndex,
				hasDrag : true,
				hasMask : true,
				isFixed : true
			};

			config = $.extend(defaults, config || {});

			zIndex = config.zIndex;

			var data = {
				msie : $.browser.msie && parseFloat($.browser.version) < 9,
				className : config.className || 'tudou_dialog',
				title : config.title || '',
				bar : config.bar || '',
				info : config.info || '',
				buttons : config.buttons
			};
			config.element = $(Template.convertTpl(config.template, data, 'data'));

			Dialog.superClass.initialize.call(this, config);

			self.dom = {
				holder : self.element.find('[data-role=holder]'),
				header : self.element.find('[data-role=header]'),
				title : self.element.find('[data-role=title]'),
				content : self.element.find('[data-role=content]'),
				footer : self.element.find('[data-role=footer]'),
				close : self.element.find('[data-role=close]')
			};

			self.config = config;

			self.open();
		},
		title : function(html) {
			this.dom.title.html(html);
			return this;
		},
		content : function(html) {
			this.dom.content.html(html);
			return this;
		},
		open : function() {
			var self = this;
			var config = self.config;
			var element = self.element;
			var dom = self.dom;

			// 设置面板层叠索引值
			element.css('z-index', zIndex);
			zIndex += 2;

			if (config.hasMask) {
				Mask.show(element.css('z-index') - 1);
			}

			element.css('position', (ie6 || !config.isFixed) ? 'absolute' : 'fixed');

			if (ie6) {
				self.iframeMask = $('<iframe>', {
					src: "about:blank",
					frameborder: 0,
					css: {
						border : 'none',
						'z-index' : -1,
						position : 'absolute',
						top : 0,
						left : 0,
						width : '100%',
						'background-color': '#fff'
					}
				}).prependTo(dom.holder);
			}

			// dom生成后再写入内容，防止内容中的flash被重置
			self.content(config.content || '');

			$.each(config.buttons, function(i) {
				self.events['[data-role=button_' + i + ']'] = this.callback;
			});

			if (!self.element.parent()[0]) {
				self.render();
			}

			self.element.show();

			self.locate();

			self.resizeLocate = function(e) {
				self.locate();
			};
			win.bind('resize', self.resizeLocate);

			if (ie6 && config.isFixed) {
				self.iefixScroll = function(e) {
					self.locate();
				};
				win.bind('scroll', self.iefixScroll);

				self.iframeMask.css({
					height: dom.holder.height()
				});
			}

			if (self.config.hasDrag) {
				new Drag(element, {
					handler : dom.header,
					limit : true
				});
			}

			return self;
		},
		close : function(isHide) {
			var self = this;

			if (self.config.hasMask) {
				Mask.hide(true);
			}

			self.trigger('close', [self]);

			self.element[isHide ? 'hide' : 'remove']();

			win.unbind('resize', self.resizeLocate);

			if (self.iefixScroll) {
				win.unbind('scroll', self.iefixScroll);
				self.iefixScroll = null;
			}

			return self;
		},
		locate: function() {
			var self = this;
			var left = Math.max(0, (win.width() - self.element.width()) >> 1);
            if (!self.config.isFixed) {
                var top = win.scrollTop() + (win.height() - self.element.height()) / 2;
            } else {
                var top = (Math.max(0, (win.height() - self.element.height()) >> 1)) + (ie6 ? win.scrollTop() : 0);
            }
			self.element.css({
				left : left,
				top : top
			});
			return self;
		}
	});

	Dialog.confirm = function(msg, callback) {
		return new Dialog({
			className : 'tudou_dialog alert',
			title : '土豆提示',
			content : '<div class="tui_dialog_logo"></div><div class="tui_dialog_text">' + msg + '</div>',
			hasMask : true,
			buttons : [
				{
					name: '确定',
					callback: function (e) {
						e.preventDefault();
						callback && callback.call(this);
						this.close();
					}
				},
				{
					name: '取消',
					callback: function (e) {
						e.preventDefault();
						this.close();
					}
				}
			]
		});
	};

	Dialog.alert = function(msg, callback) {
		return new Dialog({
			className : 'tudou_dialog alert',
			title : '土豆提示',
			content : '<div class="tui_dialog_logo"></div><div class="tui_dialog_text">' + msg + '</div>',
			hasMask : true,
			buttons : [
				{
					name: '确定',
					callback: function (e) {
						e.preventDefault();
						callback && callback.call(this);
						this.close();
					}
				}
			]
		});
	};

	return Dialog;
});

/* @source tui/cookie.js */;


define('tui/cookie', [], function() {

	return function(win, n, v, op) {
		if(typeof win == "string") {
			op = v;
			v = n;
			n = win;
			win = window;
		}
		if(v !== undefined) {
			op = op || {};
			var date, expires = "";
			if(op.expires) {
				if(op.expires.constructor == Date) {
					date = op.expires;
				} else {
					date = new Date();
					date.setTime(date.getTime() + (op.expires * 24 * 60 * 60 * 1000));
				}
				expires = '; expires=' + date.toGMTString();
			}
			var path = op.path ? '; path=' + op.path : '';
			var domain = op.domain ? '; domain=' + op.domain : '';
			var secure = op.secure ? '; secure' : '';
			win.document.cookie = [n, '=', encodeURIComponent(v), expires, path, domain, secure].join('');
		} else {
			v = win.document.cookie.match( new RegExp( "(?:\\s|^)" + n + "\\=([^;]*)") );
			return v ? decodeURIComponent(v[1]) : null;
		}
	};

});

/* @source  */;


define('g', [
	'tui/cookie',
	'tui/dialog'
], function(Cookie, Dialog, require, exports) {

	exports.init = function() {
		console.log('global init');
	};

});

require(['g'], function() {});
