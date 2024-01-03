const vscode = require('vscode');
const { minify } = require('terser');
const minifyCSS = require('clean-css');
const minifyHTML = require('html-minifier').minify;
const fs = require('fs');
const path = require('path');

let onlyParent = "";
let changeRootName = false;
let enableHtmlMinification = true;
let enableCssMinification = true;
let enableJsMinification = true;
let enableMinFileHtml = true;
let enableMinFileCss = true;
let enableMinFileJs = true;
let enableSourceMaps = false;
let enableSeparateFolderHtml = false;
let enableSeparateFolderCss = false;
let enableSeparateFolderJs = false;

function activate(context) {
	updateSettings();

	vscode.workspace.onDidSaveTextDocument(async (document) => {
		const { languageId, fileName } = document;
		var parentPath = path.parse(fileName).dir;
		const inputFile = document.getText();

		if (onlyParent.length > 0 && onlyParent.split(",").filter(f => parentPath.includes(f)).length === 0) {
			return;
		} else if (onlyParent.length > 0 && changeRootName === true) {
			var root = onlyParent.split(",").filter(f => parentPath.includes(f))[0];
			if (root) {
				var rootPath = parentPath.replace(new RegExp(root + "(.*$)", "gi"), root),
					rootMin = path.join(rootPath + "\\min"),
					structure = parentPath.replace(rootPath, "").replace(/^\\/, "");
				parentPath = path.join(rootPath + "\\min\\" + structure);

				if (!fs.existsSync(rootMin)) {
					fs.mkdirSync(rootMin);
				}

				structure.split("\\").forEach(s => {
					rootMin = path.join(rootMin + "\\" + s);
					if (!fs.existsSync(rootMin)) {
						fs.mkdirSync(rootMin);
					}
				});
			}
		}

		if (!shouldMinify(languageId)) {
			return;
		}

		if (isMinFile(fileName) && !shouldMinifyMinFiles(languageId)) {
			return;
		}

		let outputFile;
		let sourceMapFile;

		switch (languageId) {
			case 'html':
				outputFile = getOutputFilePath(parentPath, fileName, '.html', enableSeparateFolderHtml);

				let minifiedHTML = minifyHTML(inputFile, {
					caseSensitive: true,
					collapseWhitespace: true,
					collapseInlineTagWhitespace: true,
					continueOnParseError: true,
					removeComments: true,
					removeAttributeQuotes: true,
					removeRedundantAttributes: true,
					minifyCSS: true,
					minifyJS: true
				});
				await writeFile(outputFile, minifiedHTML);
				console.clear();
				vscode.window.setStatusBarMessage('HTML Minified', 2000);
				break;

			case 'css':
				outputFile = getOutputFilePath(parentPath, fileName, '.css', enableSeparateFolderCss);
				let minifiedCSS = new minifyCSS({
					level: {
						1: {
							all: true
						}
					}
				}).minify(inputFile);
				await writeFile(outputFile, minifiedCSS.styles);
				console.clear();
				vscode.window.setStatusBarMessage('CSS Minified', 2000);
				break;

			case 'javascript':
				outputFile = getOutputFilePath(parentPath, fileName, '.js', enableSeparateFolderJs);
				sourceMapFile = `${outputFile}.map`;
				let options = {
					mangle: false,
					sourceMap: enableSourceMaps ? {
						url: path.basename(sourceMapFile)
					} : false
				};
				let minifiedJS = await minify(inputFile, options);
				await writeFile(outputFile, minifiedJS.code);
				if (enableSourceMaps) {
					await writeFile(sourceMapFile, minifiedJS.map);
				}
				console.clear();
				vscode.window.setStatusBarMessage('JS Minified', 2000);
				break;
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('autominify.minify', () => {
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
		if (
			event.affectsConfiguration('autominify.rootPathName') ||
			event.affectsConfiguration('autominify.changeRootName') ||
			event.affectsConfiguration('autominify.enableHtmlMinification') ||
			event.affectsConfiguration('autominify.enableCssMinification') ||
			event.affectsConfiguration('autominify.enableJsMinification') ||
			event.affectsConfiguration('autominify.enableMinFileHtml') ||
			event.affectsConfiguration('autominify.enableMinFileCss') ||
			event.affectsConfiguration('autominify.enableMinFileJs') ||
			event.affectsConfiguration('autominify.enableSourceMaps') ||
			event.affectsConfiguration('autominify.enableSeparateFolderHtml') ||
			event.affectsConfiguration('autominify.enableSeparateFolderCss') ||
			event.affectsConfiguration('autominify.enableSeparateFolderJs')
		) {
			updateSettings();
		}
	}));
}

function deactivate() { }

function updateSettings() {
	const config = vscode.workspace.getConfiguration('autominify');
	onlyParent = config.get('rootPathName', "");
	changeRootName = config.get('changeRootName', false);
	enableHtmlMinification = config.get('enableHtmlMinification', true);
	enableCssMinification = config.get('enableCssMinification', true);
	enableJsMinification = config.get('enableJsMinification', true);
	enableMinFileHtml = config.get('enableMinFileHtml', true);
	enableMinFileCss = config.get('enableMinFileCss', true);
	enableMinFileJs = config.get('enableMinFileJs', true);
	enableSourceMaps = config.get('enableSourceMaps', false);
	enableSeparateFolderHtml = config.get('enableSeparateFolderHtml', false);
	enableSeparateFolderCss = config.get('enableSeparateFolderCss', false);
	enableSeparateFolderJs = config.get('enableSeparateFolderJs', false);
}

function shouldMinify(languageId) {
	switch (languageId) {
		case 'html':
			return enableHtmlMinification;

		case 'css':
			return enableCssMinification;

		case 'javascript':
			return enableJsMinification;

		default:
			return false;
	}
}

function shouldMinifyMinFiles(languageId) {
	switch (languageId) {
		case 'html':
			return enableMinFileHtml;

		case 'css':
			return enableMinFileCss;

		case 'javascript':
			return enableMinFileJs;

		default:
			return false;
	}
}

function isMinFile(fileName) {
	const parsedPath = path.parse(fileName);
	const name = parsedPath.name.toLowerCase();
	return name.includes('min');
}

async function writeFile(outputPath, content) {
	return new Promise((resolve, reject) => {
		fs.writeFile(outputPath, content, { flag: 'w' }, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

function getOutputFilePath(parentPath, fileName, extension, enableSeparateFolder) {
	const outputPathWithoutExtension = path.join(parentPath, `${path.parse(fileName).name}` + (!changeRootName ? `.min` : ""));
	console.log(outputPathWithoutExtension);
	if (enableSeparateFolder) {
		const minFolder = path.join(parentPath, 'min');
		if (!fs.existsSync(minFolder)) {
			fs.mkdirSync(minFolder);
		}
		return path.join(minFolder, `${path.parse(fileName).name}` + (!changeRootName ? `.min` : "") + `${extension}`);
	} else {
		return `${outputPathWithoutExtension}${extension}`;
	}
}

module.exports = {
	activate,
	deactivate
};
