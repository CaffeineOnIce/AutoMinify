// extension.js

const vscode = require('vscode');
const fs = require('fs');
const { promises: fsPromises } = require('fs');
const path = require('path');

const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');
const minifyCSS = require('clean-css');
const { cssFormatter } = require('the-minifier');

let onlyMinUnderSubFolder = "";

let enableHTMLMinification = true;
let enableJSMinification = true;
let enableCSSMinification = true;
let cssLegacyMinifier = false;

let enableSeparateFolderHTML = false;
let enableSeparateFolderJS = false;
let enableSeparateFolderCSS = false;

let enableShowInPreviewOnly = false;

let currentPanel;

let htmlMinifierOptions = {
	removeAttributeQuotes: true,
	removeComments: true,
	removeEmptyElements: true,
	removeOptionalTags: true,
	removeRedundantAttributes: true,

	collapseWhitespace: true,
	conservativeCollapse: true,

	caseSensitive: true,
	continueOnParseError: true,
	collapseBooleanAttributes: true,
	processConditionalComments: true,

	minifyCSS: true,
	minifyJS: true,
	html5: true
};

let cssMinifierOptions = {
	level: {
		1: {
			all: true
		}
	}
};

let jsMinifierOptions = {
	mangle: false
};

function activate(context) {
	updateSettings();

	vscode.workspace.onDidSaveTextDocument(async (document) => {
		const { languageId, fileName } = document;
		const parentPath = path.parse(fileName).dir;
		const inputFile = document.getText();
		let outputFile;

		if (shouldSkipMinification(fileName)) {
			return;
		}

		if (!shouldMinify(languageId)) {
			return;
		}

		switch (languageId) {
			case 'html':
				outputFile = getOutputFilePath(parentPath, fileName, '.html', enableSeparateFolderHTML);

				let minifiedHTML = await minifyHTMLContent(inputFile);

				if (enableShowInPreviewOnly) {
					openWebviewPanel(minifiedHTML);
				} else {
					await writeFile(outputFile, minifiedHTML);
				}

				vscode.window.setStatusBarMessage('HTML Minified', 2000);
				break;

			case 'javascript':
				outputFile = getOutputFilePath(parentPath, fileName, '.js', enableSeparateFolderJS);

				let minifiedJS = await minifyJSContent(inputFile);

				if (enableShowInPreviewOnly) {
					openWebviewPanel(minifiedJS.code);
				} else {
					await writeFile(outputFile, minifiedJS.code);
				}

				vscode.window.setStatusBarMessage('JS Minified', 2000);
				break;

			case 'css':
				outputFile = getOutputFilePath(parentPath, fileName, '.css', enableSeparateFolderCSS);

				let minifiedCSS = await minifyCSSContent(inputFile);

				if (enableShowInPreviewOnly) {
					openWebviewPanel(minifiedCSS);
				} else {
					await writeFile(outputFile, minifiedCSS);
				}

				vscode.window.setStatusBarMessage('CSS Minified', 2000);
				break;
		}
	});

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
		if (
			event.affectsConfiguration('autominify.onlyMinUnderSubFolder') ||

			event.affectsConfiguration('autominify.enableHTMLMinification') ||
			event.affectsConfiguration('autominify.enableJSMinification') ||
			event.affectsConfiguration('autominify.enableCSSMinification') ||
			event.affectsConfiguration('autominify.cssLegacyMinifier') ||

			event.affectsConfiguration('autominify.enableSeparateFolderHTML') ||
			event.affectsConfiguration('autominify.enableSeparateFolderJS') ||
			event.affectsConfiguration('autominify.enableSeparateFolderCSS') ||

			event.affectsConfiguration('autominify.enableShowInPreviewOnly') ||
			event.affectsConfiguration('autominify.htmlMinifierOptions') ||
			event.affectsConfiguration('autominify.cssMinifierOptions') ||
			event.affectsConfiguration('autominify.jsMinifierOptions')
		) {
			updateSettings();
		}
	}));

	async function minifyHTMLContent(inputFile) {
		return minifyHTML(inputFile, htmlMinifierOptions);
	}

	async function minifyJSContent(inputFile) {
		return minifyJS(inputFile, jsMinifierOptions);
	}

	async function minifyCSSContent(inputFile) {
		if (cssLegacyMinifier) return cssFormatter(inputFile);
		else return (new minifyCSS(cssMinifierOptions).minify(inputFile)).styles;
	}

	async function writeFile(outputPath, content) {
		try {
			await fsPromises.writeFile(outputPath, content, { flag: 'w' });
			console.log(`File written to: ${outputPath}`);
		} catch (error) {
			console.error(`Error writing file: ${error.message}`);
			throw error;
		}
	}

	function openWebviewPanel(outputContent) {
		const htmlContent = `
			<style>
				pre {
					white-space: pre-wrap;
					word-wrap: break-word;
				}
			</style>
			<pre>${escapeHtml(outputContent)}</pre>
		`;

		if (currentPanel) {
			currentPanel.webview.html = htmlContent;
		} else {
			currentPanel = vscode.window.createWebviewPanel(
				'codePreview',
				'Minified Code Preview',
				vscode.ViewColumn.Two,
				{
					enableScripts: true
				}
			);

			currentPanel.webview.html = htmlContent;

			currentPanel.onDidDispose(() => {
				currentPanel = undefined;
			});
		}
	}

	function escapeHtml(unsafe) {
		return unsafe.replace(/</g, '&lt;');
	}

	function shouldMinify(languageId) {
		switch (languageId) {
			case 'html':
				return enableHTMLMinification;
			case 'javascript':
				return enableJSMinification;
			case 'css':
				return enableCSSMinification;
			default:
				return false;
		}
	}
	
	function shouldSkipMinification(fileName) {
		const hasMinName = fileName.includes('.min.html') || fileName.includes('.min.js') || fileName.includes('.min.css'),
			split = fileName.split("\\");
		
		// if "onlyMinUnderSubFolder" empty, just respond with hasMinName (original check), otherwise 
		return onlyMinUnderSubFolder.length>0 && !hasMinName ? onlyMinUnderSubFolder.split(",").filter(folderName=>split.includes(folderName)).length===0 : hasMinName;
	}

	function getOutputFilePath(parentPath, fileName, extension, enableSeparateFolder) {
		const baseName = path.parse(fileName).name;

		if (enableSeparateFolder) {
			const minFolder = path.join(parentPath, 'min');
			if (!fs.existsSync(minFolder)) {
				fs.mkdirSync(minFolder);
			}
			return path.join(minFolder, `${baseName}.min${extension}`);
		} else {
			return path.join(parentPath, `${baseName}.min${extension}`);
		}
	}
}

function updateSettings() {
	const config = vscode.workspace.getConfiguration('autominify');
	enableShowInPreviewOnly = config.get('enableShowInPreviewOnly', false);

	onlyMinUnderSubFolder = config.get('onlyMinUnderSubFolder', "");

	enableHTMLMinification = config.get('enableHTMLMinification', true);
	enableJSMinification = config.get('enableJSMinification', true);
	enableCSSMinification = config.get('enableCSSMinification', true);
	cssLegacyMinifier = config.get('cssLegacyMinifier', true);

	enableSeparateFolderHTML = config.get('enableSeparateFolderHTML', false);
	enableSeparateFolderJS = config.get('enableSeparateFolderJS', false);
	enableSeparateFolderCSS = config.get('enableSeparateFolderCSS', false);

	htmlMinifierOptions = config.get('htmlMinifierOptions', htmlMinifierOptions);
	cssMinifierOptions = config.get('cssMinifierOptions', cssMinifierOptions);
	jsMinifierOptions = config.get('jsMinifierOptions', jsMinifierOptions);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};