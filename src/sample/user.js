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
		completionsCallback: (editorSession, currentLine, completions) => {
			console.log('Completion Line' + currentLine);
			console.log(JSON.stringify(completions));
			completions.push(
				{    "name":"completionsCallback",
					"value":"completionsCallback",
					"meta":"completionsCallback",
					"score":1,
					"doc":"This custom completion was injected dynamically using the completionsCallback",
					"type":"function",
					"url":"https://developer.mozilla.org/en/docs/"
				});

			return completions;
		},
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
