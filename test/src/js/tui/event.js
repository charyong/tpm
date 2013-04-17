
define('tui/event', ['tui/class'], function(Class) {

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
