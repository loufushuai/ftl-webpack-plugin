#  ftl插件
## 功能
支持 ftl 文件
支持多个模版文件
支持 watch 功能，一旦模版资源变化，需要重新编译，可根据配置来控制是否支持watch
变量替换类似 __debug__
注入js

## loader使用

``` javascript
module.exports = {
	entry: {
		'desktop/40x/index': './src/desktop/40x/index.js',
		'common/a': './src/common/base/index.js',
		'common/core': './src/common/core/index.js'
	},
	output: {
		filename: '[name].[chunkhash:10].js',
		path: path.resolve(__dirname, 'build'),
		publicPath: "//pimg1.126.net/caipiao/"
	},
	watch: true,
	module: {
		rules: [{
			test: /\.ftl$/,
			use: ['ftl-loader?attrs[]=img:src&attrs[]=link:href']
		},
		{ 
			test: /\.(png|css)$/, 
			use: "file-loader?name=[path][name].[hash:6].[ext]&replacePath=src/"
		},
		{ 
			test: /\.(ico)$/, 
			use: "file-loader?name=[path][name].[ext]&replacePath=src/"
		}
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
			favicon: 'favicon.ico',
			entries: [
				// {
				// 	template: 'desktop/share/orders/index.ftl',
				// 	script: './src/desktop/share/orders/index.js'
				// },
				{
					template: 'desktop/40x/404.ftl',
					script: './src/desktop/40x/index.js'
				}
			],
			context: path.resolve('./src'),
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
    - ftl文件和js入口  
- `context`:
    - 必须
    - 上下文
- `define`:
	- 可选
    - [Object]
    - 注入到ftl里的变量，便于操作
- `favicon`:
    - 可选
    - favicon.ico 地址 
- `commons`:
    - 可选
    - [Array]
    - 公共js
- `publicPath`:
    - 可选
    - [String]
    - css,js路径，默认取webpack配置
- `jsInject`:
    - 可选
    - [String]
    - 默认 <#--@miaowjs@-->
    - js注入标识符
