#  ftl插件
## 功能
注入变量


``` javascript
module.exports = {
	entry: {
		'desktop/40x/index': './src/desktop/40x/index.js',
		'common/base': './src/common/base/index.js',
		'common/core': './src/common/core/index.js'
	},
	output: {
		filename: '[name].[chunkhash:10].js',
		path: path.resolve(__dirname, 'build'),
		publicPath: "//cdn.123.net/caipiao/"
	},
	watch: true,
	module: {
		rules: [{
			test: /\.ftl$/,
			use: ['ftl-loader?attrs[]=img:src&attrs[]=link:href']
		},
		{ 
			test: /\.(png)$/, 
			use: "file-loader?name=[path][name].[hash:6].[ext]&replacePath=src/"
		},
		{ 
			test: /\.(less)$/, 
			use: ["file-loader?name=[path][name].[hash:6].[ext]&replacePath=src/"]
		}
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
					script: ['./src/desktop/40x/index.js']
				}
			],
			commons: [
				'./src/common/base/index.js',
				'./src/common/core/index.js',
			]
		})
	]
};
			
```


## Options
- `entries`:
    - 必须    
    - [Object] 
    - { template 必选 String , script 可选 String/Array}
    - ftl文件和js入口  
- `context`:
    - 可选
    - 生成文件上下文
- `define`:
	- 可选
    - [Object]
    - 注入到ftl里的变量，便于操作
- `commons`:
    - 可选
    - [Array]
    - 公共js
- `publicPath`:
    - 可选
    - [String]
    - js路径，默认取webpack配置

## 输出

<#assign commonScrpts = ["//cdn.123.net/caipiao/common/base.c17615e16c.js","//cdn.123.net/caipiao/common/core.db82284ca8.js"]/>
<#assign entryScrpts = ["//cdn.123.net/caipiao/desktop/40x/index.685984b54b.js"]/>
<#assign __debug__ = true/>
<#assign test = "dd"/>
<#assign testArray = ["a", "b", "c"]/>
<#assign testObject = {"a": "b"}/>