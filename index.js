const fs = require('fs'),
	  vm = require('vm'),
	  path = require('path'),
	  childCompiler = require('./libs/compiler'),
	  utils = require('./libs/utils'),	  
	  jsInject = '<#--@miaowjs@-->',
	  cssInject = '<#--@miaowcss@-->';

/*参数处理*/
function ftlPlugin(options) {
	// let context = this._module && this._module.issuer && this._module.issuer.context;
	this.options = Object.assign({}, options, {
		define: options.define || {},
		entries: options.entries || [],
		commons: options.commons || [],
		favicon: options.favicon || {},
		context: options.context || path.resolve(__dirname, 'src')
	});
	//webpack存储变量
	this.webpackOptions = {};
	this.filesRegex = {};
	this.files = [];
	//公共js
	this.commonScripts = '';
	this.scripts = {};
}

//webpack 运行时调用 注入compiler对象
ftlPlugin.prototype.apply = function(compiler) {

	let options = this.options,
		that = this;

	compiler.plugin("make", (compilation, callback) => {
		callback();
	});

	compiler.plugin('emit', function(compilation, callback) {
		// console.log(JSON.stringify(compilation.getStats().toJson(), null, 2));
		that.webpackOptions = compilation.options;

		that.entriesSource(compilation, compiler);

		that.getCommonJS(compilation);

		if(that.options.favicon) {
			that.addFileToWebpackAsset(compilation, path.resolve(that.options.context, that.options.favicon), utils.getBaseName(that.options.favicon, null));
		}

		Promise.all(that.files.map((v, i) => {
			let template = v.path,
				fileName = v.fileName,
				baseName = utils.getBaseName(template, fileName),
				compilationPromise = null;

			// console.log(template, fileName, baseName);
			that.options.templateLoaderName = that.getFullTemplatePath(template);
			//编译
			compilationPromise = childCompiler.compileTemplate(that.options.templateLoaderName, compiler.context, fileName, compilation);

			return Promise.resolve()
				.then(() => {
					return compilationPromise;
				})
				.then((compiledTemplate) => {
					return that.evaluateCompilationResult(compilation, compiledTemplate.content);
				}).
				then((compiledResult) => {
					let content = '';

					if(that.filesRegex[fileName]) {
						compiledResult = that.replacePath(compiledResult, fileName);
					}
					
					that.addFileToWebpackAsset(compilation, template, baseName, compiledResult);

					//如果确定是入口文件就注入变量和js
					if(v.isEntry) {
						that.processAssets(compilation, template, v.script, baseName);
						that.assetsJs(v.script, compilation, baseName);
					}
			
			});
		})).then(values => { 
			callback(); 
		});

	});
}

//查找ftl文件
ftlPlugin.prototype.entriesSource = function(compilation, compiler) {
	this.options.entries.map((v) => {
		let relativePath = path.resolve(this.options.context, v.template),
			ftlPath = path.resolve(relativePath),
			currentPath = path.dirname(ftlPath),
			source = this.getSource(ftlPath);

		this.files.push({
			path: relativePath,
			source,
			fileName: v.template,
			script: v.script,
			isEntry: true
		});
		//插件来获取资源
		this.getRequireFtl(compilation, source, currentPath, compiler, v.template);
	});
};

//获取source
ftlPlugin.prototype.evaluateCompilationResult = function(compilation, source) {
	if (!source) {
		return Promise.reject('没有文件');
	  }

	  source = source.replace('var HTML_RES_WEBPACK_PLUGIN_RESULT =', '');
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
		console.log(e);
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
		console.log('找不到文件' + filename);
	}

	return source;
};

//注入变量
ftlPlugin.prototype.processAssets = function(compilation, template, script, baseName, compiler) {
	let htmlContent = compilation.assets[baseName].source(),
		defineHeader = '',
		options = this.options,
		ftlPath = path.dirname(path.resolve(template)),
		htmlFileName = baseName,
		htmlAsset = compilation.assets[baseName];

	for(let key in this.options.define) {
		defineHeader += `<#assign ${key} = ${this.options.define[key]}/>\n`;
	}

	htmlContent = defineHeader + htmlContent;

	compilation.assets[htmlFileName] = Object.assign(htmlAsset, {
		source: () => {
			return htmlContent;
		}
	});
};

//commonjs查找
ftlPlugin.prototype.getCommonJS = function (compilation)  {
	let commonJS = '',
		commons = this.options.commons;

	publicPath = this.webpackOptions.output.publicPath;

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
ftlPlugin.prototype.assetsJs = function (script = '', compilation, baseName)  {
	let entryJS = '',
		scripts = '',
		commons = this.options.commons,
		htmlFileName = baseName,
		htmlContent = compilation.assets[baseName].source(),
		htmlAsset = compilation.assets[baseName];

	publicPath = this.webpackOptions.output.publicPath;
	if(script && this.scripts[script]){
		entryJS = `<script src="${publicPath}${this.scripts[script]}"></script>`;
	}
	scripts = `${this.commonScripts}${entryJS}`;
	htmlContent = htmlContent.replace(jsInject, scripts);

	compilation.assets[htmlFileName] = Object.assign(htmlAsset, {
		source: () => {
			return htmlContent;
		}
	});

}


//ftl入口分析compilation, content, allPath
ftlPlugin.prototype.getRequireFtl = function (compilation, content, allPath, compiler, fileName)  {

	let matchs = content.match(/<#(include|import)\s+(.*?)\s*?\/?>/g),
		that = this;

	matchs && matchs.map((match) => {
		let includeRegex = /["'](.*?)["']/.test(match);
			ftlPath = '';

		includeRegex = RegExp.$1;
		if(includeRegex.indexOf('.ftl') !== includeRegex.length - 4) {
			ftlPath = includeRegex + '.ftl';
		} else {
			ftlPath = includeRegex;
		}

		let requirePath = path.resolve(allPath, ftlPath),
			assetsPath = path.relative(this.options.context, requirePath),
			currentPath = path.dirname(path.resolve(requirePath));

		if(compilation.fileDependencies.indexOf(requirePath) > -1) {
			return;
		}

		if(!/^\..*?/.test(includeRegex)) {
			ftlPath = this.getCommonPath(includeRegex, currentPath);
			if(!ftlPath) {
				return false;
			}
			if(!that.filesRegex[fileName]) {
				that.filesRegex[fileName] = {};
			} 
			that.filesRegex[fileName][includeRegex] = ftlPath;
			
			requirePath = path.resolve(allPath, ftlPath);
			assetsPath = path.relative(this.options.context, requirePath);
			currentPath = path.dirname(path.resolve(requirePath));
		}

		let source = that.getSource(requirePath);

		that.files.push({
			path: requirePath,
			source,
			fileName: assetsPath,
			isEntry: false
		});

		that.getRequireFtl(compilation, source, currentPath, compiler, assetsPath);

	});
}

//替换路径
ftlPlugin.prototype.replacePath = function (content, filename) {
	let that = this;
	content = content.replace(/<#(include|import)\s+[\'\"]([^\.].*?)[\'\"]/g, function(match) {
		let attr = RegExp.$1,
			ftlPath = RegExp.$2,
			includeContent = `<#${attr} "${that.filesRegex[filename][ftlPath] || ftlPath}"`;
		return includeContent;
	});
	return content;
}

//寻找父级common路径
ftlPlugin.prototype.getCommonPath = function (ftlPath, currentPath)  {
	let rootPath = '/common/',
		targetPath = currentPath,
		isFind = false,
		filePath = ftlPath;

	while (!isFind) {
		try {
			filePath = path.resolve(targetPath + rootPath + ftlPath);
			isFind = fs.existsSync(filePath);

			if(targetPath == __dirname) {
				// console.info('停止向上查找目录');
				isFind = true;
				return false;
			}
						
			if(!isFind) {
				targetPath = path.resolve(targetPath, '..');
			}
		} catch(e) {
			console.log(e);
		}
	}

	// console.log(path.relative(currentPath ,filePath));
	return path.relative(currentPath ,filePath);
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