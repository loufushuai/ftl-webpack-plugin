const fs = require('fs'),
	  path = require('path');

/*参数处理 设置默认值*/
function ftlPlugin(options) {
	this.options = Object.assign({}, options, {
		define: options.define || {},
		entries: options.entries || [],
		commons: options.commons || [],
		publicPath: options.publicPath || '',
		context: options.context
	});

	this.checkRequiredOptions(options);
	//webpack存储变量
	this.webpackOptions = {};
	//js
	this.scripts = {};
	this.commonScripts = '';
}

//检查必要属性
ftlPlugin.prototype.checkRequiredOptions = function(options) {
	let requireOptions = ['entries'],
		optionsKeys = Object.keys(options);

	requireOptions.map((requireOption) => {
		if (!~optionsKeys.indexOf(requireOption)) {
			console.warn('plugin need this attr ' + requireOption);
		}
	});
};

//webpack 运行时调用 注入compiler对象
ftlPlugin.prototype.apply = function(compiler) {

	let { options } = this,
		self = this;

	compiler.plugin("make", (compilation, callback) => {
		// 获取webpack配置
		self.webpackOptions = compilation.options;

		callback();
	});

	//编译器开始输出生成资源
	compiler.plugin('emit', function(compilation, callback) {
		// console.log(JSON.stringify(compilation.getStats().toJson(), null, 2));
		//获取公共js
		self.getCommonJS(compilation);
		//回调
		callback();
	});

	//编译器已经输出所有的资源后，开始修改入口ftl文件
	compiler.plugin('after-emit', function(compilation, callback) {
		let define = self.getDefine(),
			context = self.options.context || self.webpackOptions.output.path;

		Promise.all(self.options.entries.map((v) => {

			let filename = path.resolve(context, v.template),
				entryJS = self.getEntryJS(v.script);
			
			return self.writeSource(filename, self.commonScripts + entryJS + define);

		})).then((data) => {
			callback();
		}, (data) => {
			callback();
		}).catch((error) => {
			console.log(error);
		});

	});

}

//写入文件内容
ftlPlugin.prototype.writeSource = function(filename, define = '') {
	return new Promise(function(resolve, reject) {
		fs.readFile(filename, 'utf8', (error, data) => {
			if (error) {
				reject(error);
				return error;
			}
			fs.writeFile(filename, define + data, (error) => {
				if (error) {
					reject(error);
					return error;
				}
				resolve('write success');
			});
		});
	});
};

//注入变量
ftlPlugin.prototype.getDefine = function() {
	let defineHeader = '',
		{ options } = this;

	for(let key in options.define) {
		defineHeader += this.assignftl(key, options.define[key]);
	}

	return defineHeader;
}

ftlPlugin.prototype.assignftl = function(key = '', content = '') {
	return `<#assign ${key} = ${content}/>\n`;
}

//commonjs查找
ftlPlugin.prototype.getCommonJS = function (compilation)  {
	let commonJS = '',
		commons = this.options.commons,
		publicPath = this.webpackOptions.output.publicPath || this.options.publicPath;

	compilation.chunks.map((chunk) => {
		this.scripts[chunk.entryModule.rawRequest] = chunk.files;
	});

	for (let i = 0; i < commons.length; i++) {
		let chunkFile = this.scripts[commons[i]];
		if(chunkFile){
			commonJS += (i == commons.length - 1)?`"${publicPath}${chunkFile}"`:`"${publicPath}${chunkFile}",`;
		}
	}
		
	this.commonScripts = this.assignftl('commonScrpts', '[' + commonJS + ']');
}

//插入js
ftlPlugin.prototype.getEntryJS = function (script = '')  {
	let entryJS = '',
		publicPath = this.webpackOptions.output.publicPath || this.options.publicPath;

	if(Array.isArray(script)) {
		for (let i = 0; i < script.length; i++) {
			if(this.scripts[script[i]]){
				entryJS += (i == script.length - 1)?`"${publicPath}${this.scripts[script[i]]}"`:`"${publicPath}${this.scripts[script[i]]}",`;
			}
		}
	} else {
		if(script && this.scripts[script]){
			entryJS = `"${publicPath}${this.scripts[script]}"`;
		}
	}
	
	return this.assignftl('entryScrpts', '[' + entryJS + ']');

}

module.exports = ftlPlugin;