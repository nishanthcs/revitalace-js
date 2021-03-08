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
let queryDef = {
	"!name" : "payloadQueryType",
	"payload" : {
		"getQuery" : {
			"!type" : "fn(arg:string)->string",
			"!url": "https://foobar.foo/greet",
			"!doc": "Returns the query"
		}
	}
};

let responseDef = {
	"!name" : "responseType",
	"payload" : {
		"getResponse" : {
			"!type" : "fn(arg:string)->string",
			"!url": "https://foobar.foo/greet",
			"!doc": "Returns a response object."
		}
	}
};

let defObject = {
	defJSON : queryDef,
	atFront : true
};

let urlDefObject = {
	url : "http://foo.bar/mydefinition.json",
	type: "url",
	atFront: true
};

// Set editor options example - all options
/*editor.setOptions({
	revitalAceJS: {
		dependentCode : "/!**\n" +
		" * This object is part of the dependent code added via 'defs'\n" +
		" *!/\n" +
		"var dependentObject = {\n" +
		"m : 'JS has -infinity and infinity'\n" +
		"}",
		defs : defObject,
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
});*/

// Basic option
/*editor.setOptions({
	revitalAceJS: true
})*/

editor.setOptions({
	revitalAceJS: {
		defs: defObject
	}
});


// Sample code in the demo


editor.$blockScrolling = Infinity;
editor.getSession().getSelection().clearSelection();
editor.focus();




// Dynamically switch options
changeMod = () => {
    alert("Edit option changed!");
	editor.setOptions({
		revitalAceJS: {
			defs: {
				defJSON : responseDef,
				atFront : true
			}
		}
	});
};
