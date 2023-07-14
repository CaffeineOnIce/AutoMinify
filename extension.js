const vscode = require('vscode');
const { minify } = require('terser');
const minifyCSS = require('clean-css');
const minifyHTML = require('html-minifier').minify;
const fs = require('fs');
const path = require('path');

let enableHtmlMinification = true;
let enableCssMinification = true;
let enableJsMinification = true;
let enableMinFileHtml = true;
let enableMinFileCss = true;
let enableMinFileJs = true;

function activate(context) {
	updateSettings();

	vscode.workspace.onDidSaveTextDocument(async (document) => {
		const { languageId, fileName } = document;
		const parentPath = path.parse(fileName).dir;
		const inputFile = document.getText();

		if (!shouldMinify(languageId)) {
			return;
		}

		if (isMinFile(fileName) && !shouldMinifyMinFiles(languageId)) {
			return;
		}

		let outputFile;

		switch (languageId) {
			case 'html':
				outputFile = `${parentPath}/${path.parse(fileName).name}.min.html`;
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
				vscode.window.setStatusBarMessage('HTML Minified', 2000);
				break;

			case 'css':
				outputFile = `${parentPath}/${path.parse(fileName).name}.min.css`;
				let minifiedCSS = new minifyCSS({ level: { 2: { all: true } } }).minify(inputFile);
				await writeFile(outputFile, minifiedCSS.styles);
				vscode.window.setStatusBarMessage('CSS Minified', 2000);
				break;

			case 'javascript':
				outputFile = `${parentPath}/${path.parse(fileName).name}.min.js`;
				let options = { mangle: { properties: false } };
				let minifiedJS = await minify(inputFile, options);
				await writeFile(outputFile, minifiedJS.code);
				vscode.window.setStatusBarMessage('JS Minified', 2000);
				break;
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('autominify.minify', () => {
		// Code to run when the command is triggered
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
		if (
			event.affectsConfiguration('autominify.enableHtmlMinification') ||
			event.affectsConfiguration('autominify.enableCssMinification') ||
			event.affectsConfiguration('autominify.enableJsMinification') ||
			event.affectsConfiguration('autominify.enableMinFileHtml') ||
			event.affectsConfiguration('autominify.enableMinFileCss') ||
			event.affectsConfiguration('autominify.enableMinFileJs')
		) {
			updateSettings();
		}
	}));
}

function deactivate() {}

function updateSettings() {
	const config = vscode.workspace.getConfiguration('autominify');
	enableHtmlMinification = config.get('enableHtmlMinification', true);
	enableCssMinification = config.get('enableCssMinification', true);
	enableJsMinification = config.get('enableJsMinification', true);
	enableMinFileHtml = config.get('enableMinFileHtml', true);
	enableMinFileCss = config.get('enableMinFileCss', true);
	enableMinFileJs = config.get('enableMinFileJs', true);
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

module.exports = {
	activate,
	deactivate
};
