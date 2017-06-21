var _ = require('lodash');
var loaderUtils = require('loader-utils');

module.exports = function (source) {
	this.cacheable && this.cacheable();

	return source;

};
