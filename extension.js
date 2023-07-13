const vscode = require('vscode');
const {
	minify
} = require('terser');
const minifyCSS = require('clean-css');
const minifyHTML = require('html-minifier').minify;
const fs = require('fs');
const path = require('path');

function activate() {
	vscode.workspace.onDidSaveTextDocument(async (document) => {
		const {
			languageId,
			fileName
		} = document;

		let parentPath = path.parse(fileName).dir;
		let inputFile = document.getText();
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
				let minifiedCSS = new minifyCSS({
					level: {
						2: {
							all: true
						}
					}
				}).minify(inputFile);
				await writeFile(outputFile, minifiedCSS.styles);
				vscode.window.setStatusBarMessage('CSS Minified', 2000);
				break;

			case 'javascript':
				outputFile = `${parentPath}/${path.parse(fileName).name}.min.js`;
				let options = {
					mangle: {
						properties: false
					}
				};
				let minifiedJS = await minify(inputFile, options);
				await writeFile(outputFile, minifiedJS.code);
				vscode.window.setStatusBarMessage('JS Minified', 2000);
				break;
		}
	});
}

function deactivate() {}

async function writeFile(outputPath, content) {
	return new Promise((resolve, reject) => {
		fs.writeFile(outputPath, content, (err) => {
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