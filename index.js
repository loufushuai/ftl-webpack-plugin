const fs = require('fs'),
	  vm = require('vm'),
	  path = require('path'),
	  childCompiler = require('./libs/compiler'),
	  utils = require('./libs/utils'),	  
	  jsInject = '<#--@miaowjs@-->';

/*参数处理 设置默认值*/
function ftlPlugin(options) {
	this.options = Object.assign({}, options, {
		define: options.define || {},
		entries: options.entries || [],
		commons: options.commons || [],
		favicon: options.favicon || 'favicon.ico',
		publicPath: options.publicPath || '',
		context: options.context || path.resolve(__dirname, 'src'),
		jsInjectSign: options.jsInject || jsInject
	});

	this.checkRequiredOptions(options);
	//webpack存储变量
	this.webpackOptions = {};
	//公共js
	this.commonScripts = '';
	this.scripts = {};
}

//检查必要属性
ftlPlugin.prototype.checkRequiredOptions = function(options) {
	let requireOptions = ['entries', 'context'],
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
		//生成icon
		self.emitFavicon(compilation);

		Promise.all(options.entries.map((v, i) => {
			let template = path.resolve(options.context, v.template),
				fileName = v.template,
				baseName = utils.getBaseName(template, fileName),
				compilationPromise = null;

			// console.log(template, fileName, baseName);
			self.options.templateLoaderName = self.getFullTemplatePath(template);
			//子编译
			compilationPromise = childCompiler.compileTemplate(options.templateLoaderName, compiler.context, fileName, compilation);

			return Promise.resolve()
				.then(() => {
					return compilationPromise;
				})
				.then((compiledTemplate) => {
					return self.evaluateCompilationResult(compilation, compiledTemplate.content);
				}).
				then((compiledResult) => {
					//预生成文件
					self.addFileToWebpackAsset(compilation, template, baseName, compiledResult);
					//入口文件注入变量和js
					self.injectDefine(compilation, template, baseName);
					self.injectJs(v.script, compilation, baseName);		
			});

		})).then(values => { 
			callback(); 
		});

	});

	compiler.plugin('done', () => {
	});

}

//生成icon，为什么这样还要单独写下，因为ftl引用icon路径是 /xxx.ico 生成路径不好搞
ftlPlugin.prototype.emitFavicon = function(compilation) {
	let { options } = this;
	if(options.favicon) {
		this.addFileToWebpackAsset(compilation, path.resolve(options.context, options.favicon), utils.getBaseName(options.favicon));
	}
}

//获取source
ftlPlugin.prototype.evaluateCompilationResult = function(compilation, source) {
	if (!source) {
		return Promise.reject('没有文件');
	}

	source = source.replace('var FTL_WEBPACK_PLUGIN_RESULT =', '');
	let template = this.options.template;
	let vmContext = vm.createContext(Object.assign({}, {HTML_RES_WEBPACK_PLUGIN: true, require: require}, global));
	let vmScript = new vm.Script(source, {filename: template});
	// console.log(vmScript);
	// Evaluate code and cast to string
	let newSource;
	try {
	newSource = vmScript.runInContext(vmContext);
	} catch (e) {
	return Promise.reject(e);
	}
	return typeof newSource === 'string' || typeof newSource === 'function'
	? Promise.resolve(newSource)
	: Promise.reject('The loader "' + this.options.template + '" didn\'t return html.');
};

//预添加文件
ftlPlugin.prototype.addFileToWebpackAsset = function(compilation, template, basename, source) {
	let filename = path.resolve(template);
	if(!fs.existsSync(filename)) {
		console.log('Cannot find this file' + filename);
		return '';
	}
	if(source === null || source === undefined) {
		source = fs.readFileSync(filename);
	}

	try {
		//添加依赖
		compilation.fileDependencies.push(filename);
		compilation.assets[basename] = {
			source: () => {
				return source;
			},
			size: () => {
				return source.length;
			}
		};
	} catch(e) {
		console.warn(e);
	}
};

//获取文件内容
ftlPlugin.prototype.getSource = function(template) {
	let source = '',
		filename = path.resolve(template);;
	if(!fs.existsSync(filename)) {
		console.log('Cannot find this file' + filename);
		return '';
	}
	try {		
		source = fs.readFileSync(filename, 'utf-8');
	} catch(e) {
		console.log(e);
	}

	return source;
};

//注入变量
ftlPlugin.prototype.injectDefine = function(compilation, template, baseName) {
	let htmlContent = compilation.assets[baseName].source(),
		defineHeader = '',
		{ options } = this,
		htmlAsset = compilation.assets[baseName];

	for(let key in options.define) {
		defineHeader += `<#assign ${key} = ${options.define[key]}/>\n`;
	}

	htmlContent = defineHeader + htmlContent;

	compilation.assets[baseName] = Object.assign(htmlAsset, {
		source: () => {
			return htmlContent;
		}
	});
};

//commonjs查找
ftlPlugin.prototype.getCommonJS = function (compilation)  {
	let commonJS = '',
		commons = this.options.commons,
		publicPath = this.webpackOptions.output.publicPath || this.options.publicPath;

	compilation.chunks.map((chunk) => {
		for (let i = 0; i < commons.length; i++) {
			if(commons[i] === chunk.entryModule.rawRequest){
				commonJS += `<script src="${publicPath}${chunk.files}"></script>`;
			}
		}
		this.scripts[chunk.entryModule.rawRequest] = chunk.files;
	});

	this.commonScripts += `${commonJS}`;
}

//插入js
ftlPlugin.prototype.injectJs = function (script = '', compilation, baseName)  {
	let entryJS = '',
		scripts = '',
		commons = this.options.commons,
		htmlContent = compilation.assets[baseName].source(),
		htmlAsset = compilation.assets[baseName];

	publicPath = this.webpackOptions.output.publicPath;
	if(script && this.scripts[script]){
		entryJS = `<script src="${publicPath}${this.scripts[script]}"></script>`;
	}
	scripts = `${this.commonScripts}${entryJS}`;
	htmlContent = htmlContent.replace(jsInject, scripts);

	compilation.assets[baseName] = Object.assign(htmlAsset, {
		source: () => {
			return htmlContent;
		}
	});

}

ftlPlugin.prototype.getFullTemplatePath = function (template) {
	if (template.indexOf('!') === -1) {
		template = require.resolve('./libs/loader.js') + '!' + template;
	}

	return template.replace(
	/([!])([^\/\\][^!\?]+|[^\/\\!?])($|\?.+$)/,
	function (match, prefix, filepath, postfix) {
		return prefix + path.resolve(filepath) + postfix;
	});
};

module.exports = ftlPlugin;