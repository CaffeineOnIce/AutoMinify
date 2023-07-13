# Auto-Minify extension for VSCode

Automatically minify your HTML, CSS and JS files to save space and bandwidth.

---


# Features

- Automatically generates a `.min.html`/`.min.css`/`.min.js` file each time you save a `.html`/`.css`/`.js` file.  
  e.g. `styles.css` --> `styles.min.css`

  
# Basic Usage

1.  Create a `.html`/`.css`/`.js` file. file.
2.  Hit `Ctrl/Cmd`+`S` to save your file.
3.  A `.min.html`/`.min.css`/`.min.js` file is automatically generated.
4.  You should see a temporary "HTML Compiled" or "CSS Compiled" or "JS Compiled" message in the status bar.


# Dependencies Utilised
* **HTML:** [html-minifier](https://github.com/kangax/html-minifier)
* **CSS:** [clean-css](https://github.com/clean-css/clean-css/)
* **JS:** [terser](https://github.com/terser/terser/)


# Heads-Up

- As it is based on the dependencies, any errors on minifying is entirely caused by the dependencies.
- Any new features that are desired, please request them in the Issues tab. They are greatly welcomed.

**Any other options not provided below are not explicitly declared in my code, and thus, are defaulted to their value.**

`html-minifier` options utilised: 
```
{
	caseSensitive: true,
	collapseWhitespace: true,
	collapseInlineTagWhitespace: true,
	continueOnParseError: true,
	removeComments: true,
	removeAttributeQuotes: true,
	removeRedundantAttributes: true,
	minifyCSS: true,
	minifyJS: true
}
```

`clean-css` options utilised: 
```
{
	level: {
		2: {
			all: true
		}
	}
}
```

`terser` options utilised:
```
{
	mangle: {
		properties: false
	}
}
```
