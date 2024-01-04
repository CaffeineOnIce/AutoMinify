const vscode = require('vscode');
const fs = require('fs');
const { promises: fsPromises } = require('fs');
const path = require('path');

const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');
const minifyCSS = require('clean-css');

let enableHTMLMinification = true;
let enableJSMinification = true;
let enableCSSMinification = true;

let enableSeparateFolderHTML = false;
let enableSeparateFolderJS = false;
let enableSeparateFolderCSS = false;

let enableShowInPreviewOnly = false;

let currentPanel;

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

				let minifiedHTML = await minifyHTML(inputFile, {
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
				});

				if (enableShowInPreviewOnly) {
					openWebviewPanel(minifiedHTML);
				} else {
					await writeFile(outputFile, minifiedHTML);
				}

				vscode.window.setStatusBarMessage('HTML Minified', 2000);
				break;

			case 'javascript':
				outputFile = getOutputFilePath(parentPath, fileName, '.js', enableSeparateFolderJS);

				let options = {
					mangle: false
				};

				let minifiedJS = await minifyJS(inputFile, options);


				if (enableShowInPreviewOnly) {
					openWebviewPanel(minifiedJS.code);
				} else {
					await writeFile(outputFile, minifiedJS.code);
				}

				vscode.window.setStatusBarMessage('JS Minified', 2000);
				break;


			case 'css':
				outputFile = getOutputFilePath(parentPath, fileName, '.css', enableSeparateFolderCSS);

				var minifiedCSS = new minifyCSS({
					level: {
						1: {
							all: true
						}
					}
				}).minify(inputFile);

				if (enableShowInPreviewOnly) {
					openWebviewPanel(minifiedCSS.styles);
				} else {
					await writeFile(outputFile, minifiedCSS.styles);
				}

				vscode.window.setStatusBarMessage('CSS Minified', 2000);
				break;
		}
	});

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
		if (
			event.affectsConfiguration('autominify.enableHTMLMinification') ||
			event.affectsConfiguration('autominify.enableJSMinification') ||
			event.affectsConfiguration('autominify.enableCSSMinification') ||

			event.affectsConfiguration('autominify.enableSeparateFolderHTML') ||
			event.affectsConfiguration('autominify.enableSeparateFolderJS') ||
			event.affectsConfiguration('autominify.enableSeparateFolderCSS') ||

			event.affectsConfiguration('autominify.enableShowInPreviewOnly')
		){
			updateSettings();
		}
	}));
}

function deactivate() { }

function updateSettings() {
	const config = vscode.workspace.getConfiguration('autominify');
	enableShowInPreviewOnly = config.get('enableShowInPreviewOnly', false);

	enableHTMLMinification = config.get('enableHTMLMinification', true);
	enableJSMinification = config.get('enableJSMinification', true);
	enableCSSMinification = config.get('enableCSSMinification', true);

	enableSeparateFolderHTML = config.get('enableSeparateFolderHTML', false);
	enableSeparateFolderJS = config.get('enableSeparateFolderJS', false);
	enableSeparateFolderCSS = config.get('enableSeparateFolderCSS', false);
}

// preview pane 
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

// preventing '<' or 'less than' from being interpreted as actual HTML when rendered in preview pane
function escapeHtml(unsafe) {
	return unsafe.replace(/</g, '&lt;');
}

// check if the language id matches or not
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

// skipping minification for min named files
function shouldSkipMinification(fileName) {
	return fileName.includes('.min.html') || fileName.includes('.min.js') || fileName.includes('.min.css');
}

// creating and writing into min file
async function writeFile(outputPath, content) {
	try {
		await fsPromises.writeFile(outputPath, content, { flag: 'w' });
		console.log(`File written to: ${outputPath}`);
	} catch (error) {
		console.error(`Error writing file: ${error.message}`);
		throw error;
	}
}

// for creating and editing in a seperate min folder
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

module.exports = {
	activate,
	deactivate
};
