define('tui/storage', ['tui/class'], function(Class) {
	var Storage = Class({
		initialize : function(src) {
			var self = this;
			if(src) {
				self.iframe1 = $('<iframe src="' + src + '" style="position:absolute;left:-9999px;bottom:0;width:0;height:0;visibility:hidden;">');
				var match = /https?:\/\/[^\/]+/.exec(src);
				self.origin = match ? match[0] : '';
			} else {
				self.storage = init(window);
				self.loaded1 = true;
				return;
			}
			self.gcbs1 = [];
			self.scbs1 = [];
			self.rcbs1 = [];
			self.loaded1 = !!self.storage;
			self.iframe1.on('load', function() {
				self.storage = init(this.contentWindow, self.origin);
				self.loaded1 = true;
				self.gcbs1.forEach(function(o) {
					self.getItem(o.k, o.cb);
				});
				self.scbs1.forEach(function(o) {
					self.setItem(o.k, o.v, o.cb);
				});
				self.rcbs1.forEach(function(o) {
					self.removeItem(o.k, o.cb);
				});
			});
			$(document.body).append(this.iframe1);
		},
		getItem: function(k, cb) {
			if(this.loaded1)
				this.storage.getItem(k, cb);
			else
				this.gcbs1.push({
					k: k,
					cb: cb
				});
			return this;
		},
		setItem: function(k, v, cb) {
			if($.isPlainObject(v) || $.isArray(v)) {
				v = JSON.stringify(v);
			}
			if(this.loaded1)
				this.storage.setItem(k, v, cb);
			else
				this.scbs1.push({
					k: k,
					v: v,
					cb: cb
				});
			return this;
		},
		removeItem: function(k, cb) {
			if(this.loaded1)
				this.storage.removeItem(k, cb);
			else
				this.rcbs1.push({
					k: k,
					cb: cb
				});
			return this;
		}
	});
	function init(win, origin) {
		//ff13
		if(win !== window && $.browser.mozilla && parseInt($.browser.version) >= 13 && parseInt($.browser.version) <= 14)
			return initInFF13(win, origin);
		//html5存储支持，ff3.5+、chrome、safari4+、ie8+支持
		else if(win.localStorage)
			return initInHtml5(win);
		//ie5+支持的私有方案，存储空间只有1M
		else if(win.ActiveXObject)
			return initInLowIe(win);
		else
			throw new Error('Local storage not exist.');
	}
	function initInFF13(win, origin) {
		window.addEventListener('message', function(e) {
			var data = JSON.parse(e.data);
			hash[data.id](data.val);
			delete hash[data.id];
		}, false);
		var hash = {},
			id = 0,
			storage = {};
		storage.setItem = function(k, v, cb){
			hash[id] = cb || function(){};
			win.postMessage(JSON.stringify({ id: id++, key: k, val: v }), origin);
		};
		storage.getItem = function(k, cb){
			hash[id] = cb || function(){};
			win.postMessage(JSON.stringify({ id: id++, key: k }), origin);
		};
		storage.removeItem = function(k, cb){
			hash[id] = cb || function(){};
			win.postMessage(JSON.stringify({ id: id++, key: k, val: null }), origin);
		};
		return storage;
	}
	function initInHtml5(win) {
		var storage = {};
		storage.setItem = function(k, v, cb){
			win.localStorage.setItem(k, v);
			if(cb)
				cb();
		};
		storage.getItem = function(k, cb){
			if(cb)
				cb(win.localStorage.getItem(k));
		};
		storage.removeItem = function(k, cb){
			win.localStorage.removeItem(k);
			if(cb)
				cb();
		};
		return storage;
	}
	function initInLowIe(win) {
		var storage = {},
			doc = win.document.documentElement;
		doc.addBehavior('#default#userdata');
		storage.setItem = function(n, v, cb){
			doc.setAttribute('_ai', v);
			doc.save(n);
			if(cb)
				cb();
		};
		storage.getItem = function(n, cb){
			try {
				doc.load(n);
				if(cb)
					cb(doc.getAttribute('_ai'));
			} catch (ex) {};
		};
		storage.removeItem = function(n, cb){
			try {
				doc.load(n);
				doc.expires = (new Date(315532799000)).toUTCString();
				doc.save(n);
				if(cb)
					cb();
			} catch(e) {};
		};
		return storage;
	}

	return Storage;
});
