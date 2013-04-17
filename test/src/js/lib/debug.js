
require.text = function(uri) {
	var domain = location.href.replace(/^(http:\/\/[^\/]+).*$/, '$1');
	var url = /^https?:\/\//.test(uri) ? uri : domain + '/v3/src/js/' + uri;
	var ret = '';

	$.ajax({
		url: url,
		dataType: 'text',
		method: 'GET',
		async: false,
		success: function(tpl){
			ret = tpl;
		}
	});

	ret = ret.replace(/^\uFEFF/, '');
	ret.replace(/(\r\n|\r|\n)\s*/g, ' ');

	return ret;
};
