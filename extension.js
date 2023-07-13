const vscode = require('vscode');
/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	const { minify } = require('terser');

	const minifyCSS = require('clean-css');
	const minifyHTML = require('html-minifier').minify;
	const minifyJS = minify;

	const fs = require('fs');
	const path = require('path');

	let minifyTheCode = vscode.commands.registerCommand('autominify.minify', async function (){
		let editor = vscode.window.activeTextEditor;
		
		if (!editor)
		{
			vscode.window.showErrorMessage("Run in an Editor.");
		}
		else 
		{
			if (vscode.window.activeTextEditor.document.languageId == 'html')
			{
				let parentPath = path.parse(vscode.window.activeTextEditor.document.fileName).dir;
				let htmlInput = vscode.window.activeTextEditor.document.getText();
				let resultHTML = minifyHTML(htmlInput, {
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
				fs.writeFile(parentPath+'/'+path.parse(vscode.window.activeTextEditor.document.fileName).name+'.min.html', resultHTML, err => {
					if (err) throw err;
				});
			}

			if (vscode.window.activeTextEditor.document.languageId == 'css')
			{
				let parentPath = path.parse(vscode.window.activeTextEditor.document.fileName).dir;
				let cssInput = vscode.window.activeTextEditor.document.getText();
				let resultCSS = new minifyCSS({
					level: {
						2: {
							all: true  // sets all values to `false`
						}
					}
				}).minify(cssInput);
				fs.writeFile(parentPath+'/'+path.parse(vscode.window.activeTextEditor.document.fileName).name+'.min.css', resultCSS.styles, err => {
					if (err) throw err;
				});
			}

			if (vscode.window.activeTextEditor.document.languageId == 'javascript')
			{
				let parentPath = path.parse(vscode.window.activeTextEditor.document.fileName).dir;
				let jsInput = vscode.window.activeTextEditor.document.getText();
				let options = { mangle: { properties: false } }
				var resultJS = await minifyJS(jsInput, options);
				fs.writeFile(parentPath+'/'+path.parse(vscode.window.activeTextEditor.document.fileName).name+'.min.js', resultJS.code, err => {
					if (err) throw err;
				});
			}
		}
	});
	context.subscriptions.push(minifyTheCode);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
