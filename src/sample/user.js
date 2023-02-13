/**
 * This is a sample file that demonstrates API usage. Open index.html in the bundle to see the below changes in
 * action.
 * @author Nishanth
 */

/*
 * initialize ace.
 */
var editor = ace.edit("testedit", {
	mode: "ace/mode/javascript"
});

/*
 * Sample tern definition
 * @type {{"!name": string, MyObject: {greet: {"!type": string, "!url": string, "!doc": string}}}}
 */
let def = {
	"!name" : "MyDefinition",
	"MyObject" : {
		"greet" : {
			"!type" : "fn(arg:string)->string",
			"!url": "https://foobar.foo/greet",
			"!doc": "Returns a greeting in English for the passed First Name."
		}
	}
};

let defObject = {
	defJSON : def,
	atFront : true
};

let urlDefObject = {
	url : "http://foo.bar/mydefinition.json",
	type: "url",
	atFront: true
};

// Set editor options example - all options
editor.setOptions({
	revitalAceJS: {
		dependentCode : "/**\n" +
		" * This object is part of the dependent code added via 'defs'\n" +
		" */\n" +
		"var dependentObject = {\n" +
		"m : 'JS has -infinity and infinity'\n" +
		"}",
		defs : defObject,
		/**
		 * This is a function will be called for every completion. Add or remove
		 * tern completions in this callback and return.
		 *
		 * The below params are injected by revitalace.
		 * @param editorSession - Ace edit session object
		 * @param currentLine - Current line where the completion is triggered
		 * @param completions - Array of completions resolved by tern
		 * @return completions - Array of completions updated in this callback
		 */
		// completionsCallback: (editorSession, currentLine, completions) => {
		// 	console.log('Completion Line' + currentLine);
		// 	console.log(JSON.stringify(completions));
		// 	completions.push(
		// 		{    "name":"completionsCallback",
		// 			"value":"completionsCallback",
		// 			"meta":"completionsCallback",
		// 			"score":1,
		// 			"doc":"This custom completion was injected dynamically using the completionsCallback",
		// 			"type":"function",
		// 			"url":"https://developer.mozilla.org/en/docs/"
		// 		});

		// 	return completions;
		// },
		/**
		 * This is a function will be called for every tool tip render. modify result and return.
		 *
		 * In this example, every doc element will be replaced with text 'Where is Waldo' :o)
		 *
		 * The below params are injected by revitalace.
		 * @param editorSession - Ace edit session object
		 * @param currentToken - Current token ace object where the completion is triggered
		 * @param toolTipInfo - Result object compiled by revitalace
		 * @return toolTipInfo - Final result that would be used to render the tooltip
		 */
		// tooltipCallBack: (editorSession, currentToken, toolTipInfo) => {
		// 	console.log('Tooltip Token' + currentToken.value);
		// 	console.log(JSON.stringify(toolTipInfo));
		// 	// Update the doc here.
		// 	const customizedToolTipInfo = {
		// 		type: "fn(input: ?)",
		// 		name: "getTooltipInfo",
		// 		doc: "Where is Waldo?",
		// 		def: toolTipInfo.def,
		// 		refs: toolTipInfo.refs
		// 	}
		// 	return customizedToolTipInfo;
		// },
		options: {
			useEcmaDefs: true,
			useBrowserDefs: true
		},
		menu : [{
			label : "File",
			subMenu : [{label: "Find", shortCut: {mac : 'Cmd-f', win: 'Ctrl-f'}, trigger: function(editor){
				alert("Find clicked in editor with id "+editor.id);
			}},
				{label: "Completion", shortCut: {mac : 'Ctrl-Space', win: 'Ctrl-Space'}, trigger: function(editor){alert("Completion clicked")}}]
		},
			{
				label : "Edit",
				subMenu : [{label: "Copy", shortCut: {mac : 'Cmd-f', win: 'Ctrl-f'}, trigger: function(editor){alert("Copy Clicked")}},
					{label: "Paste", shortCut: {mac : 'Ctrl-Space', win: 'Ctrl-Space'}, trigger: function(editor){alert("Paste clicked")}}]
			}]
	}
});

// Basic option
// editor.setOptions({
// 	revitalAceJS: true
// });


// Sample code in the demo
editor.setValue("let aString = \"scott\";\n" +
	"\n" +
	"let aNumber = 7; \n" +
	"let aDecimal= 1.2;\n" +
	"\n" +
	"\n" +
	"aNumber.\n" +
	"aString\n" +
	"\n" +
	"// What is the precision of Java decimals?\n" +
	"let aCommentedVariable = \"Java decimals can support double precision\"\n" +
	"\n" +
	"// Hover over any variable or function to view documentation\n" +
	"aCommentedVariable\n" +
	"\n" +
	"/*\n" +
	"* This method returns string.\n" +
	"* @returns {string} Hey world\n" +
	"*/\n" +
	"let aMethodReturnsString = function(){\n" +
	"\treturn \"Hey World!\"\n" +
	"}\n" +
	"/*\n" +
	"* Comment on an object\n" +
	"*/\n" +
	"let anObject = {\n" +
	"\t// Sum of a and b\n" +
	"\tsum : function(a,b){\n" +
	"\t\treturn a+b;\n" +
	"\t},\n" +
	"\t// Quotient\n" +
	"\tdivide : function(a,b){\n" +
	"\t\treturn a/b;\n" +
	"\t},\n" +
	"\tdefinition: \"Sum and Divide\"\n" +
	"}\n" +
	"\n" +
	"/*\n" +
	"* Sum a Fibonacci series upto n\n" +
	"* @param {number} n - Upto \n" +
	"* @returns {number} Sum as number\n" +
	"*/\n" +
	"function sumFibonacci(n){\n" +
	"\tif(n === 1) {\n" +
	"\t\treturn 1;\n" +
	"\t}\n" +
	"\tif(n === 2) {\n" +
	"\t\treturn 2;\n" +
	"\t}else{\n" +
	"\t\treturn sumFibonacci(n-2) + sumFibonacci(n-1);\n" +
	"\t}\n" +
	"}\n" +
	"\n" +
	"\n" +
	"// Ctrl+space or just start typing here to get suggestion\n" +
	"sum\n" +
	"\n" +
	"/*\n" +
	"* Last argument is an object\n" +
	"* @param {number} i - Argument which is a number \n" +
	"* @param {number} j - Another number \n" +
	"* @param {string} k - Comment\n" +
	"* @param {object} l - An Object\n" +
	"* @returns {number} Some arbitary object\n" +
	"*/\n" +
	"function aFunctionWithMultipleArgs(i, j, k, l) {\n" +
	"\tlet s = i + j;\n" +
	"\tlet greeting = 'Hello' + l.r;\n" +
	"\n" +
	"\tl.greeting = greeting;\n" +
	"\treturn l;\n" +
	"}\n" +
	"\n" +
	"// Type an open paren after function name here to see arg suggestion\n" +
	"//aFunctionWithMultipleArgs().\n" +
	"\n");


editor.$blockScrolling = Infinity;
editor.getSession().getSelection().clearSelection();
editor.focus();
