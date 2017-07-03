const path = require('path');
const plugin = require('./index');

module.exports = {
	entry: {
		'desktop/40x/index': './examples/src/desktop/40x/index.js',
		'common/base': './examples/src/common/base/index.js',
		'common/core': './examples/src/common/core/index.js'
	},
	output: {
		filename: '[name].[chunkhash:10].js',
		path: path.resolve(__dirname, 'examples/build'),
		publicPath: "//cdn.123.net/caipiao/"
	},
	watch: true,
	module: {
		rules: [
		{
			test: /\.ftl$/,
			use: ['ftl-loader?attrs[]=img:src&attrs[]=link:href']
		}
		// ,{ 
		// 	test: /\.(png)$/, 
		// 	use: "file-loader?name=[path][name].[hash:6].[ext]&replacePath=src/"
		// },
		// { 
		// 	test: /\.(less)$/, 
		// 	use: ["file-loader?name=[path][name].[hash:6].[ext]&replacePath=src/"]
		// }
		// ,
		// { 
		// 	test: /\.(ico)$/, 
		// 	use: "file-loader?name=[path][name].[ext]&replacePath=src/"
		// }
		]
	},
	plugins: [
		new plugin({
			define: {
				'__debug__': 'true',
				'test': '"dd"',
				'testArray': '["a", "b", "c"]',
				'testObject': '{"a": "b"}'
			},
			entries: [
				{
					template: 'desktop/common/c.ftl'
				},
				{
					template: 'desktop/40x/404.ftl',
					script: ['./examples/src/desktop/40x/index.js']
				}
			],
			commons: [
				'./examples/src/common/base/index.js',
				'./examples/src/common/core/index.js',
			]
		})
	]
};