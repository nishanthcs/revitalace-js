/******/ (() => { // webpackBootstrap
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


editor.$blockScrolling = Infinity;
editor.getSession().getSelection().clearSelection();
editor.focus();

/******/ })()
;
//# sourceMappingURL=sample.js.map