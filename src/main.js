const tern = require("tern");
require("tern/plugin/doc_comment");
import fetchDefinition from "./support/support_meta";
/**
 * Augmented Ace with Intelligence (using Tern), Active code completion
 *
 * Improvements - Fork and pull request.
 * @license MIT
 * @author Nishanth S
 * @version 1.0
 */
// Global ternToAce Server
var GlobalTernServer = null;

(function (ace, AceHelper, TernToAce, ViewHelper) {
	"use strict";
	var isAutocompleteEnabled = true;
	var langTools = ace.require("ace/ext/language_tools");
	var autocompleteDefinition = ace.require("ace/autocomplete");
	var config = ace.require("ace/config");
	var Editor = ace.require("ace/editor").Editor;

	// Constants  - changeme move this.
	var aceHelper = new AceHelper();
	aceHelper.augmentAutocomplete(autocompleteDefinition.Autocomplete);

	//Add if styles are absent
	function loadStyles(domHelper) {
		let styleObject = domHelper.getStyles();
		// Erase default ace tooltip style class
		domHelper.removeClass("ace_tooltip");

		for(let key of Object.keys(styleObject)){
			domHelper.addStyleIfAbsent(styleObject[key]);
		}
	}

	/**
	 * Set up the editor, ternServer, listeners, completers.
	 * @param {obj} editor - Ace editor object
	 * @param {boolean} ternPerEditor - true if one tern server per editor
	 * @param {array} defs - Array of definition objects
	 * @param {string} dependentCode - Parent code for dependency tree.
	 * @param {array|object} menuItems - Array of menu items
	 * @param {boolean} logit - Troubleshoot logger.
	 */
	function prepareEditor(editor,ternPerEditor, defs, dependentCode, menuItems, logit) {
		let ternToAce = new TernToAce(ternPerEditor);
		let viewHelper = new ViewHelper(editor, aceHelper, logit);
		loadStyles(viewHelper);
		if(dependentCode){
			ternToAce.addSource(editor.id+'_parent', dependentCode);
		}
		ternToAce.addSource(editor.id, editor.getValue(), dependentCode?editor.id+'_parent':null,dependentCode || "");
		ternToAce.addDefs(defs);

		// Create a property inside the editor to hold tern specific objects.
		editor["terned"]= {
			sourceName : editor.id,
			changed : false,
			start : {line: 0, ch: 0},
			end : {line: 0, ch: 0},
			ternServer : ternToAce,
			view : viewHelper,
			cache : {},
			cursorpos : {
				cursorX : 0,
				cursorY : 0,
				rawX : 0,
				rawY : 0
			}
		};

		editor.getSession().on("change", function(e){
			// Register any changes to the editor so that tern source can be updated.
			if(e.action === 'insert' || e.action === 'remove'){
				//console.log('Start : '+JSON.stringify(e.start)+'\nEnd : '+JSON.stringify(e.end));
				editor.terned.changed = true;
				ternToAce.addSource(editor.id,editor.getValue(), dependentCode?editor.id+'_parent': null, null);
				// Start and end have to be inverted for backspaces
				let st = {line : e.start.row, ch : e.start.column};
				let ed = {line : e.end.row,ch : e.end.column};
				editor.terned.start = e.action === 'remove'?ed:st;
				editor.terned.end = e.action === 'remove'?st:ed;
			}
		});
		// Record co ordinates when mouse is moved.
		editor.on("mousemove",function(e){
			let character = editor.renderer.screenToTextCoordinates(e.x, e.y);
			editor.terned.cursorpos.cursorX = character.row;
			editor.terned.cursorpos.cursorY = character.column;
			editor.terned.cursorpos.rawX = e.x;
			editor.terned.cursorpos.rawY = e.y;
		});

		// Setup tooltip, menu
		viewHelper.setUpTooltip(editor,aceHelper);
		viewHelper.setUpMenu(editor, menuItems);
		// Setup definition trigger
		aceHelper.setUpDefinition(editor);
		// Setup event for tooltips
		aceHelper.setUpEvent("autoCompleteActivated");

	}

	/**
	 * Modifies the editor to support Tern autocompletion
	 */
	function modifyEditorForCompletion() {
		if(config){
			config.defineOptions(Editor.prototype,"editor",{
				revitalAceJS : {
					set: function(ternConfigParameter) {
						var enableThis = false;
						// Each editor gets its own tern server.
						var ternPerEditor = true;
						if (typeof ternConfigParameter === 'object') {
							for (var key in ternConfigParameter) {
								if (ternConfigParameter.hasOwnProperty(key)) {
									enableThis = true;
									switch (key) {
										case 'defs':
											var defs = [];
											let configuredDefinition = ternConfigParameter[key];
											if(Array.isArray(configuredDefinition)){
												configuredDefinition.forEach(function (defObject) {
													addDefinition(defs, defObject);
												})
											}else if(configuredDefinition === Object(configuredDefinition)){
												addDefinition(defs, configuredDefinition);
											}
											break;
										case 'ternPerEditor':
											ternPerEditor = !!(ternConfigParameter[key] &&
												ternConfigParameter[key] === true);
											break;
										case 'dependentCode':
											var dependentCode = ternConfigParameter[key];
											break;
										case 'menu':
											var menuItems = ternConfigParameter[key];
									}
								}
							}
						}else{
							enableThis = ternConfigParameter;
						}

						if (enableThis) {
							let ternCompleters = aceHelper.getTernCompleter(this);
							if (!this.completers) {
								this.completers = Array.isArray(ternConfigParameter) ? ternConfigParameter : [ternCompleters];
							}
							else {
								this.completers.push(ternCompleters);
							}

							aceHelper.addDefaultTriggerCompleter(this, {win: "Ctrl-Space", mac: "Ctrl-Space"}, autocompleteDefinition);
							this.commands.on('afterExec', doTernAutoComplete);
							// Prepare editor, add events.
							prepareEditor(this, ternPerEditor, defs, dependentCode, menuItems, false);
						}
						else {
							this.commands.removeListener('afterExec', doTernAutoComplete);
						}

					},
					value: false
				}
			});
		}else{
			console.log("ace/config is required for tern to ace.");
		}

		function addDefinition(defs, defObject){
			if(defObject.type === 'url' && defObject.url){
				fetchDefinition(defObject.url).then(function (value) {
					defs.push(value);
				});
			}else{
				defs.push(defObject);
			}
		}

		/**
		 * Autocomplete logic
		 * @param e
		 */
		function doTernAutoComplete(e) {
			let editor = e.editor;
			let prefix = aceHelper.getCompletionPrefix(editor, 'function');

			if(prefix){
				let t = editor.terned;
				let view = t.view;
				let position = editor.getCursorPosition();
				let ternPos = {line: position.row, ch: position.column};

				let count = 2;
				for (let i = prefix.length-1; i >=0 ; i--) {
					if(prefix.charAt(i) === '(') {
						break;
					}else{
						count += 1;
					}
				}
				ternPos.ch -= count;

				t.ternServer.getTooltipInfo({
					sourceName: t.sourceName,
					pos: ternPos,
					callback: function (err, result) {
						if (!result || !result.type || result.type === '?') {
							return;
						}
						let h = t.ternServer.parseFunctionArgs(result.type, result.doc);
						let k = prefix.split(',').length - 1;

						if (h.length) {
							let toolTipNode = view.buildDOMNode("functionParamHelp", h, null, {highlight: k});
							view.hideTooltip(null,true);
							view.showTooltip(null, editor.renderer.textToScreenCoordinates(ternPos.line - 2 < 0 ? ternPos.line : (ternPos.line - 2), ternPos.ch),
								null, toolTipNode, false);
						}
					}
				});
			}
			prefix = aceHelper.getCompletionPrefix(editor);
			if (aceHelper.validateEvent(e, prefix)) {
				let ternAutocompleter = editor.completer;
				if (!ternAutocompleter) {
					ternAutocompleter = new autocompleteDefinition.Autocomplete();
					editor.terncompleter = ternAutocompleter;
					langTools.addCompleter(ternAutocompleter);
				}
				ternAutocompleter.autoInsert = false;
				ternAutocompleter.showPopup(editor);
			}
		}
	}

	if(isAutocompleteEnabled){
		modifyEditorForCompletion();
	}

	if (!langTools) {
		console.error("Ace Tern requires ext-language-tools for autocompletion.")
	}
	//--------------- Ace is ready and good to go -----------------//
	/*
	 *  NOTE : changeme
	 *  In an environment or an app where there are multiple code editors running different source, there has to be a way to reuse a
	 *  single Tern Server instead of creating objects every time a new editor has to be loaded into the scope.
	 *  Lets figure that out after i get everything up and running for one instance of Tern.
	 */
})(ace,
	/**
	 * Function constructor for building object that helps modify Ace for a better and intuitive completion.
	 * @constructor
	 */
	function AceHelper(logit){
		"use strict"

		let helperObject = {
			addEventListener : function(editor, eventName, eventCallback){
				editor.commands.on(eventName,eventCallback);
			},
			/**
			 * Adds the trigger for code completion popup in the base ace editor.
			 * @param editor
			 * @param bindKeys
			 */
			addDefaultTriggerCompleter : function(editor, bindKeys, autocompleteDefinition){
				var start = {
					name: "startAutocomplete",
					exec: function(e){
						if (!e.completer) {
							if(logit) console.log("Triggered startAutocomplete");
							e.completer = new autocompleteDefinition.Autocomplete();
						}
						e.completer.autoInsert = false;
						e.completer.showPopup(e);
					},
					bindKey: bindKeys
				};
				editor.commands.addCommand(start);
			},
			/**
			 * Check if the editor position is at a token which is valid for any operation.
			 * @param editor
			 * @param position
			 * @return {boolean}
			 */
			isValidToken : function(editor, position){
				var token = editor.getSession().getTokenAt(position.row, position.column);
				var ignoreTokens = ["punctuation", "comment", "paren"];
				if (!token || token.value.trim().length === 0) {
					return false;
				} else {
					for (var i = 0, n = ignoreTokens.length; i < n; i++) {
						if (token.type.lastIndexOf(ignoreTokens[i]) !== -1) {
							return false;
						}
					}
				}

				return true;
			},
			isCursorWithinText : function(editor){
				let docBoundary = this.getDocBoundary(editor);
				let cursorPos = {row : editor.terned.cursorpos.cursorX, column : editor.terned.cursorpos.cursorY};

				return !(docBoundary.row === cursorPos.row && docBoundary.column === cursorPos.column);
			},
			getDocBoundary : function(editor){
				let doc = editor.getSession().getDocument();
				let r = doc.getLength() - 1;
				return {row : doc.getLength() - 1, column : doc.getLine(r).length};

			},
			highlightWord : function(editor, pos){
				return new Promise(function(resolve){
					if(pos && pos.start && pos.end){
						editor.scrollToRow(pos.start.line);
						editor.navigateTo(pos.start.line, pos.start.ch);
						editor.getSession().getSelection().selectToPosition({row : pos.end.line, column : pos.end.ch});
						resolve(pos);
					}
				});
			},
			setUpDefinition : function(editor){
				let ternServer = editor.terned.ternServer;
				let sourceName = editor.terned.sourceName;
				let f = this;

				this.addKeyTrigger(editor, "showDefinition", {mac: "F5", win: "F5"}, function (e) {
					let pos = e.getCursorPosition();
					ternServer.requestDefinition(sourceName, {line: pos.row, ch: pos.column}, function (err, data) {
						if (logit) console.log(JSON.stringify(data));
						f.highlightWord(editor, data);
					});
				});
			},
			setUpEvent: function (eventName) {
				if(logit)	console.log("Setting up event "+eventName);
				let popUpEvent = document.createEvent('Event');
				popUpEvent.initEvent(eventName, true, true);
				self.t2aEvents = self.t2aEvents || {};
				self.t2aEvents[eventName] = popUpEvent;
			},
			triggerEvent: function (editor, eventName) {
				let popUpEvent = self.t2aEvents[eventName];
				if (popUpEvent) {
					if (logit) console.log("Triggering event " + eventName);
					editor.renderer.container.dispatchEvent(popUpEvent);
				}
			},
			/**
			 * Add a keyboard shortcut
			 * @param editor
			 * @param shortCutName
			 * @param bindKeys
			 * @param shortCutFunction
			 */
			addKeyTrigger : function(editor,shortCutName, bindKeys, shortCutFunction){
				let cmd = {
					name: shortCutName,
					exec: shortCutFunction,
					bindKey: bindKeys
				};
				editor.commands.addCommand(cmd);
			},
			/**
			 * Check if the ace event is a valid code completion event.
			 * @param e
			 * @return {boolean}
			 */
			validateEvent : function(e, prefix){
				if(!e){
					return false;
				}else{
					if (e.command.name === "insertstring" || e.command.name === "backspace"
						|| e.command.name === "startAutocomplete") {
						// Do not activate if these characters are triggered.
						let doNotActivate = /[\n=\/\:\;\{\}\[\]\(\)\%\+\*\-\&\|\^\#\@\!\_\s\r]/;
						// Do not activate when the lines are comments.
						let doNotActivatLine = /(\/[\/\*]{1}\**[\w\s]*(\*\/)*)/g;

						if(prefix){
							// Check the current line
							let pos = e.editor.getCursorPosition();
							let line = e.editor.session.getLine(pos.row);
							if(doNotActivatLine.test(line))
								return false;
						}
						if(typeof  e.args === 'undefined'){
							return true;
						}

						// Check the character.
						return !doNotActivate.test(e.args);
					}else{
						return false;
					}
				}
			},
			getType : function(data, uiType){
				uiType = uiType || 'tooltipType';
				if(uiType === 'tooltipCompletionDoc')	return data.type;
				let type = data.type || "";
				let functionPattern = /^fn\(.*\).*$/g;
				let objectPattern = /^\{.+\}$/g;
				if(type.match(functionPattern))	return "function";
				if(type.match(objectPattern)) return "object";
				switch(type){
				}
				return type;
			},
			/**
			 * Converts tern response to what is expected by ace completer.
			 * @param ternResponse
			 */
			mapResponse : function(ternResponse){
				let aceResponse = [];
				let completions = ternResponse.completions;
				let self = this;
				for (let i = 0, n = completions.length; i < n; i++) {
					let completion = completions[i];
					aceResponse.push({
						name : completion.name,
						value : completion.name ,
						meta : self.getType(completion),
						// changeme not sure depth and score means the same.
						score : 1,
						doc : completion.doc,
						type : completion.type || "",
						url : completion.url
					});
				}

				return aceResponse;
			},
			getCompletions : function(editor){
				let self = this;
				let returnCompletion = [];
				let editorTern = editor.terned;

				return new Promise(function (resolve, reject) {
					// query the already existing source.
					editorTern.ternServer.requestCompletion(editorTern.sourceName, editorTern.end, null, function (err, data) {
						returnCompletion = self.mapResponse(data);
						if(returnCompletion.length !== 0){
							resolve(returnCompletion);
						}
						else{
							reject(returnCompletion);
						}
					});
				});

			},
			//changeme Not sure if this is useful. For removal in v2.
			getDocumentation : function(editor, item){
				let editorTern = editor.terned;
				let ternServer = editorTern.ternServer;
				let editorCursorPos = editor.getCursorPosition();
				let endPos = {
					line : editorCursorPos.row,
					ch : editorCursorPos.column + item.value.length
				};
				let startPos = {
					line : editorCursorPos.row,
					ch : editorCursorPos.column
				};

				ternServer.requestDocumentation(editorTern.sourceName,endPos,function(err,data){

				},startPos,null,item.value);

			},
			getTernCompleter : function(editor){
				let self = this;

				return {
					getCompletions: function(editor, session, pos, prefix, callback) {
						let completionPromise = self.getCompletions(editor,session,prefix);
						completionPromise.then(function(completions){
							if(logit)	console.log("Completions found "+JSON.stringify(completions));
							callback(null, completions);
						}, function (reason) {
							if(logit)	console.log("No completions for "+prefix);
						});
					},
					getDocTooltip: function(item) {
						let domNode = editor.terned.view.buildDOMNode("tooltipCompletionDoc",item);
						item.docHTML = domNode.innerHTML;
						return item;
					},
					identifierRegexps:[]
				};
			},
			gatherCompletions : processCompletions,
			getCompletionPrefix : getPrefix,
			//regex = regex ||  /[a-zA-Z_0-9\(\,\s\$\-\u00A2-\uFFFF]/;
			retrievePrecedingIdentifier : function(text, pos, regex) {
				// \u002E
				regex = regex ||  /[a-zA-Z_0-9\$\-\u00A2-\uFFFF]/;
				let buf = [];
				for (let i = pos-1; i >= 0; i--) {
					if (regex.test(text[i]))
						buf.push(text[i]);
					else
						break;
				}
				return buf.reverse().join("");
			},

			retrieveFollowingIdentifier : function(text, pos, regex) {
				regex = regex || /[a-zA-Z_0-9\$\-\u00A2-\uFFFF]/;
				let buf = [];
				for (let i = pos; i < text.length; i++) {
					if (regex.test(text[i]))
						buf.push(text[i]);
					else
						break;
				}
				return buf;
			},
			/**
			 * This is where the autocomplete function prototype is modified for our needs.
			 * @param autocomplete
			 */
			augmentAutocomplete : function(autocomplete){
				autocomplete.prototype.gatherCompletions = processCompletions;
			}
		};

		function processCompletions(editor, callback) {
			let session = editor.getSession();
			let pos = editor.getCursorPosition();

			let prefix = getPrefix(editor);
			let prefixNoSymbol = getPrefix(editor,true);

			this.base = session.doc.createAnchor(pos.row, pos.column - prefixNoSymbol.length);
			this.base.$insertRight = true;

			let matches = [];
			let total = editor.completers.length;
			editor.completers.forEach(function(completer, i) {
				completer.getCompletions(editor, session, pos, prefix, function(err, results) {
					if (!err && results)
						matches = matches.concat(results);
					callback(null, {
						prefix: getPrefix(editor),
						matches: matches,
						finished: (--total === 0)
					});
				});
			});

			helperObject.triggerEvent(editor, 'autoCompleteActivated');
			return true;
		}

		function getPrefix(editor, type) {
			let pos = editor.getCursorPosition();
			let line = editor.session.getLine(pos.row);
			let prefix;
			type = type || 'default';
			switch(type) {
				default:
				case 'default':
					editor.completers.forEach(function(completer) {
						if (completer.identifierRegexps) {
							completer.identifierRegexps.forEach(function(identifierRegex) {
								if (!prefix && identifierRegex)
									prefix = helperObject.retrievePrecedingIdentifier(line, pos.column, identifierRegex);
							}.bind(helperObject));
						}
					}.bind(helperObject));

					prefix =  prefix || helperObject.retrievePrecedingIdentifier(line, pos.column);
					break;

				case 'function':
					//changeme Improve function pattern
					prefix =  helperObject.retrievePrecedingIdentifier(line, pos.column, /[a-zA-Z_0-9\(\)\"\'\{\}\s\,\$\-\u00A2-\uFFFF]/);
					let functionPattern = /^\s*[a-zA-Z0-9]+\(([a-zA-Z0-9\_\"\']+\s*\,\s*)*$/g;

					if(!functionPattern.test(prefix) || prefix.contains){
						prefix = "";
					}
					break;
			}

			return prefix;
		}

		return helperObject;
	},
	/**
	 * A function object that holds the definition for Tern processing.
	 *
	 * Note :- Throughout the comments , the term request corresponds to request to the Tern API
	 * running in the JS engine started by this app and NOT good old HTTP requests.
	 * @param tern
	 * @return {*}
	 */
	function TernToAce(ternPerEditor, logIt, ternOptions){
		"use strict"
		let self = this;
		// -------- Default Completion values. --------
		// Default timeout for completion requests in ms.
		let defaultCompletionRequestTimeout = 10000;
		let defaultDefinitionRequestTimeout = 10000;
		let defaultRefRequestTimeout = 10000;
		// Default type property of file
		let defaultFileTypeProp = "full";
		// Default completionSettings for requests.
		let defaultCompletionSettings = {
			// Include types in the result ?
			types : true,
			// changeme Not Sure what this does. Experiment.
			depths : true,
			// Include docs in the result ?
			docs : true,
			// Include URLs in the result ?
			urls : true,
			// include  origin files in the result ?
			origins : false,
			// Filter the completions based on the current word. We choose to do it client side instead.
			filter : true,
			caseInsensitive : false,
			// Let Tern guess if no completions are found.
			guess : true,
			// Sort result.
			sort : false,
			// If the entire word on which the curser is on should be included in the completion.
			expandWordForward : true,
			// Hide the prototypal props .
			omitObjectPrototye : false,
			// Include JS Keywords in the result.
			includeKeywords : true,
			// Completions while inside a literal.
			inLiteral : false
		};
		// Default Tern Server options.
		let defaultTernOptions = {
			plugins : {
				doc_comment : {
					strong : true
				}
			}
		};
		// Default get definition settings. Tern defaults.
		let defaultDefinitionSettings = {
			preferFunction: false,
			depth: 0
		};
		/**
		 * Initialize Tern
		 */
		if (!tern) {
			if(logIt) console.error("Ace Tern requires tern library to work.");
			return;
		}

		ternOptions = ternOptions || defaultTernOptions;

		let ternServer = null;
		// Get definitions
		if(ternPerEditor){
			ternServer = new tern.Server(ternOptions);
		}else{
			GlobalTernServer = GlobalTernServer || new tern.Server(ternOptions);
			ternServer = GlobalTernServer;
		}

		fetchDefinition("browser").then(function (value) {
					// Start the tern server
					ternServer.addDefs(value, false);
		});
		fetchDefinition("ecma").then(function (value) {
			// Start the tern server
			ternServer.addDefs(value,false);
		});


		if (!ternServer) {
			if(logIt) console.error("Tern Server could not be started");
			return null;
		}else{
			if(logIt) console.log("Tern has started and is good to go");
		}

		let returnedObj = {
			addDefs : function(defs) {
				if(Array.isArray(defs)) {
					defs.forEach(function (e) {
						ternServer.addDefs(e.defJSON, e.atFront);
					})
				}else if(defs){
					ternServer.addDefs(defs.defJSON, defs.atFront);
				}
			},
			/**
			 * Get the configured Tern Server.
			 * Warning: Modifying can affect other parts of the code.
			 */
			getTernServer : function(){
				return ternServer;
			},
			/**
			 * Configure the tern server with options
			 * Overwrites the existing tern server.
			 */
			updateTernServer : function(options){
				ternServer = new tern.Server(options);
				return ternServer;
			},
			/**
			 * Add a source for analysis
			 * @param {string} name - Name of the file in tern
			 * @param {string} text - Code
			 * @param {string} parentId - Identifier for parent code
			 * @param {string} parentCode - Code to be added as parent in tern dependency chain
			 */
			addSource : function(name, text, parentId, parentCode){
				ternServer.delFile(name);
				let setParent = Boolean(parentCode);
				if(setParent) {
					ternServer.addFile(parentId, parentCode)
				}
				return ternServer.addFile(name, text, parentId?parentId:null);
			},
			/**
			 * Remove a source
			 */
			removeSource : function(name){
				return ternServer.delFile(name);
			},
			/**
			 * Sent a request for analysis. This is the raw form.
			 * @param requestObj as per Tern protocol documentation.
			 * @callback called when a request is successful.
			 */
			requestAnalysis : function(requestObj, callback){
				return ternServer.request(requestObj,callback);
			},
			/**
			 * Returns the default completion setting for this Tern instance.
			 * @param if we are looking for a specific setting.
			 */
			getDefaultCompletionSettings : function(settingName){
				return (settingName && defaultCompletionSettings[settingName]) || defaultCompletionSettings;
			},
			/**
			 * Returns the updated completion setting copying missing properties across from
			 * default completion settings.
			 * @param newSetting
			 * @return final settings object.
			 */
			overrideDefaultCompletionSettings : function(newSetting){
				if(!newSetting){
					return defaultCompletionSettings;
				}else{
					// Copying operation. O(Object.keys(defaultCompletionSettings).length)
					for(var key in defaultCompletionSettings){
						if(!defaultCompletionSettings.hasOwnProperty(key)) continue;
						if(!newSetting[key]){
							newSetting[key] = defaultCompletionSettings[key];
						}
					}
				}

				return newSetting;
			},
			requestRefs : function(sourceName, end, responseCallback, start,source,timeout){
				var queryType = "refs";
				var refRequest = {};
				timeout = timeout || defaultRefRequestTimeout;
				start = start || end;
				var query = {};

				query["file"] = sourceName;
				query["end"] = end;
				query["start"] = start;
				query["type"] = queryType;
				query["lineCharPositions"] = true;

				// Set source if any.
				if(source){
					if(!Array.isArray(source)){
						var files = [];
						files.push({
							type : defaultFileTypeProp,
							name : sourceName,
							text : source
						})
					}
				}
				// Building completion request.
				refRequest["query"] = query;
				if(files) {
					refRequest["files"] = files;
				}
				refRequest["timeout"] = timeout;

				if(!responseCallback){
					throw new Error("responseCallback argument for reqRefs() method is not optional.")
				}
				if(logIt) console.log("Tern request for definition "+JSON.stringify(refRequest));
				ternServer.request(refRequest,responseCallback);
			},
			requestDefinition: function(sourceName, end, responseCallback, start, source, timeout){
				var queryType = "definition";
				var defRequest = {};

				timeout = timeout || defaultDefinitionRequestTimeout;

				start = start || end;
				// Building the query property of the request.
				var query = {};
				query["file"] = sourceName;
				query["end"] = end;
				query["start"] = start;
				query["type"] = queryType;
				query["lineCharPositions"] = true;

				// Set source if any.
				if(source){
					if(!Array.isArray(source)){
						var files = [];
						files.push({
							type : defaultFileTypeProp,
							name : sourceName,
							text : source
						})
					}
				}

				// Building completion request.
				defRequest["query"] = query;
				if(files) {
					defRequest["files"] = files;
				}
				defRequest["timeout"] = timeout;

				if(!responseCallback){
					throw new Error("responseCallback argument for requestDefinition() method is not optional.")
				}
				if(logIt) console.log("Tern request for definition "+JSON.stringify(defRequest));
				ternServer.request(defRequest,responseCallback);
			},
			/**
			 * Gets everything need to be displayed in a tooltip
			 * @param {object} obj
			 * @param {string} [obj.sourceName] - Source Name
			 * @param {object} [obj.pos] - Position object {line : 10, ch: 1}
			 * @param {function} [obj.callback] - callback(errors, result)
			 */
			getTooltipInfo : function (input) {
				let result = {};
				let finalCallback = input.callback;
				let thisObj = this;
				let errors = {};

				thisObj.requestType(input.sourceName,input.pos,function(typeErr,typeData){
					if(typeErr){
						errors.typeErr = typeErr
					}else{
						result = typeData;
					}
					thisObj.requestDefinition(input.sourceName, input.pos, function(defErr,defData){
						if(defErr){
							errors.defErr = defErr;
						}
						else if(defData.end && defData.start){
							result.def = defData;
						}
						thisObj.requestRefs(input.sourceName, input.pos, function (refErr,refData) {
							if(refErr){
								errors.refErr = refErr;
							}
							else if(refData.refs){
								result.refs = refData.refs
							}
							finalCallback(errors, result);
						});
					});
				},null,null,0);
			},
			/**
			 * Converts a tern function arguments spec of the form fn(arg1: type, arg2: type) -> returnType
			 * to an object.
			 * @param argString - String as argument
			 * @param docString - String doc
			 * @return {{}}
			 * "fn(obj: {arrayProp: [?], arrayProp?: [?], boolProp: bool, boolProp?: bool, stringProp: string, stringProp?: string}) -> {arrayProp: [?], arrayProp?: [?], boolProp: bool, boolProp?: bool, stringProp: string, stringProp?: string}""fn(obj: {arrayProp: [?], arrayProp?: [?], boolProp: bool, boolProp?: bool, stringProp: string, stringProp?: string})
			 * -> {arrayProp: [?], arrayProp?: [?], boolProp: bool, boolProp?: bool, stringProp: string, stringProp?: string}"
			 *
			 * "fn(a: number, b: number, c?: number, useSum?: bool) -> number"
			 */
			parseFunctionArgs: function(argString, docString) {
				let args = argString.split("->");
				/*if(args.length<=1)	return [{}];*/
				let paramString = args[0], returnString = args[1];

				let params = [];

				let i = 0;
				while(paramString[i++] !== '('){}
				let param = '';

				for (let j = i; j < paramString.length; j++) {
					if(paramString[j] === ',' || paramString[j] === ')' && param.length) {
						let splitParam = param.split(':');
						if(splitParam[1] === Object(splitParam[1]))	splitParam[1] = 'object';
						params.push({name : splitParam[0], type : splitParam[1]});
						param = '';
					}else{
						param += paramString[j];
					}
				}

				return params;
			},
			/**
			 * Get type of a specific token in the code.
			 */
			requestType : function(sourceName, end, responseCallback, start, preferFunction, depth, source, timeout){
				var queryType = "type";
				var typeRequest = {};

				preferFunction = preferFunction || defaultDefinitionSettings.preferFunction;
				depth = depth || defaultDefinitionSettings.depth;
				timeout = timeout || defaultDefinitionRequestTimeout;

				start = start || end;
				// Building the query property of the request.
				var query = {};
				query["file"] = sourceName;
				query["end"] = end;
				query["start"] = start;
				query["type"] = queryType;
				query["preferFunction"] = preferFunction;
				query["depth"] = depth;

				// Set source if any.
				if(source){
					if(!Array.isArray(source)){
						var files = [];
						files.push({
							type : defaultFileTypeProp,
							name : sourceName,
							text : source
						})
					}
				}

				// Building completion request.
				typeRequest["query"] = query;
				if(files) {
					typeRequest["files"] = files;
				}
				typeRequest["timeout"] = timeout;

				if(!responseCallback){
					throw new Error("responseCallback argument for requestType() method is not optional.")
				}
				if(logIt) console.log("Tern request for type "+JSON.stringify(typeRequest));
				ternServer.request(typeRequest,responseCallback);
			},
			/**
			 * Return documentation for a specific expression.
			 * @param source
			 * @param endObj
			 * @param responseCallback
			 * @param startObj
			 */
			requestDocumentation : function(sourceName, end, responseCallback, start, timeout, source){
				var type = "documentation";
				var documentationRequest = {};

				if(!end){
					throw new Error("A documentation request requires a end object {line, ch}");
				}

				start = start || { line :0, ch: 0};
				// Set timeout for the request.
				timeout = timeout || defaultCompletionRequestTimeout;
				// Set source if any.
				if(source){
					if(!Array.isArray(source)){
						var files = [];
						files.push({
							type : "part",
							name : sourceName,
							text : source,
							offset : start
						})
					}
				}
				// Building the query property of the request.
				var query = {};
				query["file"] = sourceName;
				query["end"] = end;
				query["start"] = start;
				query["type"] = type;

				// Building completion request.
				documentationRequest["query"] = query;
				if(files) {
					documentationRequest["files"] = files;
				}
				documentationRequest["timeout"] = timeout;

				if(!responseCallback){
					throw new Error("responseCallback argument for requestCompletion() method is not optional.")
				}

				if(logIt) console.log("Tern request for documentation "+JSON.stringify(documentationRequest));

				ternServer.request(documentationRequest,responseCallback);
			},
			/**
			 * Return completions based on the code that Tern server already
			 * has.
			 * responseCallBack.
			 * start, settings, timeout and source is optional.
			 * @param sourceName
			 * @param end
			 * @param start
			 * @param responseCallback
			 * @param settings
			 * @param timeout
			 * @param source
			 */
			requestCompletion : function(sourceName, end, start, responseCallback, source, settings, timeout){
				var type = "completions";
				var completionRequest = {};

				if(!end){
					throw new Error("A completion request requires a end object {line, ch}");
				}

				start = {line: 0, ch: 0};//start || end;
				// Set timeout for the request.
				timeout = timeout || defaultCompletionRequestTimeout;
				// Load settings
				var requestSettings = this.overrideDefaultCompletionSettings(settings);
				// Set source if any.
				if(source){
					if(!Array.isArray(source)){
						var files = [];
						files.push({
							type : defaultFileTypeProp,
							name : sourceName,
							text : source
						})
					}
				}
				// Building the query property of the request.
				var query = requestSettings;
				query["file"] = sourceName;
				query["end"] = end;
				query["start"] = start;
				query["type"] = type;

				// Building completion request.
				completionRequest["query"] = query;
				if(files) {
					completionRequest["files"] = files;
				}
				completionRequest["timeout"] = timeout;

				if(!responseCallback){
					throw new Error("responseCallback argument for requestCompletion() method is not optional.")
				}

				if(logIt) console.log("Tern request for completion "+JSON.stringify(completionRequest));

				ternServer.request(completionRequest,responseCallback);
			}

		};

		return returnedObj;
	},
	/**
	 * Create UI popups and flying menus here.
	 * @param ace
	 * @constructor
	 */
	function ViewHelper(editor, aceHelper, logit){
		let self = this;
		// Dom stuff
		let dom = ace.require("./lib/dom");
		if(!dom){
			dom = document;
		}
		let domHelper = new DomHelper();
		let renderer = editor.renderer;
		let toolTip = new Tooltip(renderer.container, logit);
		toolTip.init();
		// Tool tip delay.
		let cursorDelay = 1000;
		let cursor = editor.selection.cursor;
		// Allow other tooltips to show when this is active.
		toolTip.coExist = false;
		let position = {};

		// Copy some prototypal stuff
		self.getStyles = domHelper.getStyles;
		self.hasCssClass = domHelper.hasCssClass;
		self.addStyleIfAbsent = domHelper.addStyleIfAbsent;
		self.removeClass = domHelper.removeClass;

		self.getTooltipPosition = function(){
			return position;
		};

		self.moveTooltip = function(pos){
			if(!pos.pageX || !pos.pageY){
				pos = editor.renderer.textToScreenCoordinates(pos.cursorX,pos.cursorY);
			}
			toolTip.setPosition({left : pos.pageX, top: pos.pageY});
		};

		self.showTooltip = function(text, pos, disappearInMs, element, canClose){
			if(!toolTip.isOpen)
			{
				position = pos;
				toolTip.setPosition({left: pos.rawX || pos.pageX , top : pos.rawY || pos.pageY});
				if(text){
					toolTip.setHtml(text);
				}else{
					toolTip.setElement(element);
				}
				if(typeof canClose !== 'undefined')
					toolTip.canClose = canClose;
				toolTip.show();
			}
			if(disappearInMs)
				self.hideTooltip(disappearInMs);
		};

		self.isOpen = function(){
			return toolTip.isOpen;
		};

		self.hideTooltip = function (delay, force) {
			toolTip.hide(delay, force);
		};

		self.createLineSeparator = function () {
			let hr = dom.createElement("hr");
			hr.className = "t2a-doc-hr";
			return hr;
		};
		/**
		 * HTML builder for popups and tooltips.
		 * @param type
		 * @param data
		 * @param class
		 * @return {undefined}
		 */
		self.buildDOMNode = function (type, data, styleClass, triggers) {
			let ele = dom.createElement("div");
			switch (type) {
				case "functionParamHelp":
					ele.className = "revjs-function-help";
					let h = triggers.highlight;
					let intro = "(", outro = ")";
					let s;
					for (let i = 0; i < data.length; i++) {
						let sClass = "";
						if (h > 0) {
							h--;
							sClass = "t2a-completed-functionparam";
						}
						s = '<div class="' + sClass + '"><span>' + data[i].name + "</span>:" +
							'<span style="font-weight: bold;">' + data[i].type + '</span></div>';
						intro += s;
						if (i + 1 < data.length) {
							intro += ',';
						}
					}
					ele.innerHTML = intro + outro;
					break;
				case "tooltipType":
				case "tooltipCompletionDoc":
					let name = data.name || data.exprName;
					//ele.className = styleClass;
					ele.innerHTML = name + "<br/>";
					let inner = dom.createElement("div");
					inner.style.alignContent = "right";
					inner.style.fontWeight = "normal";
					inner.style.fontStyle = "italic";
					inner.style.fontSize = "0.8em";
					inner.innerHTML = aceHelper.getType(data, type);
					ele.appendChild(inner);
					if (data.doc) {
						let line = self.createLineSeparator();
						ele.appendChild(line);
						let docElement = dom.createElement("div");
						docElement.className = "t2a-doc-style";
						docElement.innerHTML = data.doc;
						ele.appendChild(docElement);
					}
					if (data.url) {
						let line = self.createLineSeparator();
						ele.appendChild(line);
						let urlElement = dom.createElement("div");
						let urlAnchorElement = dom.createElement("a");
						urlAnchorElement.target = "_blank";
						urlAnchorElement.href = data.url;
						urlAnchorElement.innerHTML = "doc";
						urlAnchorElement.className = 't2a-tooltip-docurl';
						urlElement.appendChild(urlAnchorElement);
						ele.appendChild(urlElement);
					}
					if (data.def || data.refs) {
						let line = self.createLineSeparator();
						ele.appendChild(line);
						let info = dom.createElement("div");
						info.className = 't2a-tooltip-info';

						if (data.def) {
							let defTarget = dom.createElement("a");
							defTarget.onclick = triggers.def;
							defTarget.innerHTML = "Go to definition";
							defTarget.className = "t2a-tooltip-target";
							info.appendChild(defTarget);
						}
						if (data.refs && triggers.refs.length) {
							let ul = dom.createElement("div");
							ul.innerHTML = "References : ";
							for (let i = 0, n = triggers.refs.length; i < n; i++) {
								let sp = dom.createElement("span");
								let t = i + 1;
								sp.innerHTML = t + " ";
								sp.onclick = triggers.refs[i];
								sp.className = "t2a-tooltip-target";
								ul.appendChild(sp);
							}

							info.appendChild(ul);
						}
						ele.appendChild(info);
					}
					break;
				default:
					console.log("No HTML Node definition found for the " + type);
			}
			return ele;
		};

		function buildTooltip(ternToAce, editor, pos) {
			let lViewHelper = this;
			if(lViewHelper.isOpen()){
				return;
			}
			ternToAce.getTooltipInfo({
				sourceName: editor.terned.sourceName,
				pos: {line: pos.cursorX, ch: pos.cursorY},
				callback: function (err, data) {
					if (data && Object.keys(data).length) {
						let toolTipNode = lViewHelper.buildDOMNode("tooltipType", data, null,
							{
								def: data.def ? function () {
									aceHelper.highlightWord(editor, data.def);
									lViewHelper.hideTooltip(null, true);
								} : null,
								refs: (function(){
									var funcArray = [];
									if(data.refs && data.refs.length !== 0){
										data.refs.forEach(function(e){
											if(e.start.line === pos.cursorX &&
												e.end.line === pos.cursorX &&
												(e.start.ch < pos.cursorY < e.end.ch))
												return;
											funcArray.push(function(){
												aceHelper.highlightWord(editor,e);
												lViewHelper.hideTooltip(null, true);
											});
										});
									}
									return funcArray;
								})()
							}
						);
						if (!lViewHelper.isOpen()) {
							lViewHelper.showTooltip(null, pos, null, toolTipNode);
						}
					}
				}
			});
		}
		/**
		 * Add Menu bar to the editor based on the configuration
		 * @param editor
		 * @param menuItems - Array of Menu objects
		 */
		self.setUpMenu = function(editor, menuItems) {
			if(!menuItems.length)	return;
			let container = editor.renderer.container;
			let parent = container.parentElement;
			let isMac = domHelper.isMac();
			let codeContainer = domHelper.createElement("div",null,['revjs-code-container']);
			codeContainer.appendChild(container);

			// Leave some space for menu bar
			container.style.marginTop = 20+'px';

			container.onclick = function(event) {
				if (!event.target.matches('.revjs-menu-button')) {
					closeAll();
				}
			};

			function closeAll() {
				let dropDowns = document.getElementsByClassName("revjs-menu-content");
				for (let i = 0; i < dropDowns.length; i++) {
					let openDropdown = dropDowns[i];
					if (openDropdown.classList.contains('revjs-menu-content-show')) {
						openDropdown.classList.remove('revjs-menu-content-show');
					}
				}
			}
			function showMenu(id) {
				closeAll();
				self.hideTooltip();

				document.getElementById("revJSMenuContent"+id).classList.toggle("revjs-menu-content-show");
			}

			if(container.nextElementSibling)
			{
				parent.insertBefore(codeContainer, container.nextElementSibling);
			}else {
				parent.appendChild(codeContainer);
			}

			let menuBar = domHelper.createElement("div", null, ['revjs-menu'], codeContainer, true);
			menuBar.style.left = document.defaultView.getComputedStyle(container).getPropertyValue('left');
			menuBar.style.top = document.defaultView.getComputedStyle(container).getPropertyValue('top');
			menuBar.style.width = document.defaultView.getComputedStyle(container).getPropertyValue('width');
			let idCount = 1;
			menuItems.forEach(function (menuElement) {
				let addFirst = menuElement.addFirst || false;
				let dropDownContainer = domHelper.createElement("div",null,['revjs-menu-dropdown'], menuBar, addFirst);
				let dropDownButton = domHelper.createElement("button",null,["revjs-menu-button"], dropDownContainer, addFirst);
				dropDownButton.innerHTML = menuElement.label;
				dropDownButton.onclick = showMenu.bind(this,idCount);
				let dropDownItemContainer = domHelper.createElement("div", "revJSMenuContent"+idCount++, ["revjs-menu-content"],dropDownContainer);
				menuElement.subMenu.forEach(function (subMenu) {
					let dropDownItemButton = domHelper.createElement("a", null, ["revjs-menu-item"],dropDownItemContainer);
					dropDownItemButton.innerHTML = (subMenu.shortCut === Object(subMenu.shortCut))?
						"<div>"+subMenu.label+"<span style='float: right; font-weight: lighter;'>"+subMenu.shortCut.mac+"</span></div>":
						"<div>"+subMenu.label+"</div>";
					dropDownItemButton.onclick = subMenu.trigger.bind(this, editor);
				})
			});
		};

		/**
		 * Set up tooltip event listener that retrieves type via tern server.
		 * @param editor
		 * @param aceHelper
		 * @param logit
		 */
		self.setUpTooltip = function(editor,aceHelper){
			let ternToAce = editor.terned.ternServer;
			let self = this;
			let basePos = {
				baseCursorX : 0,
				baseCursorY : 0
			};

			// Close tooltip when cursor is changed.
			cursor.on("change", self.hideTooltip.bind(self,null,true));
			editor.on("click", self.hideTooltip.bind(self,null,true));
			editor.session.on("changeScrollTop", self.hideTooltip.bind(self,null,true));
			editor.session.on("changeScrollLeft", self.hideTooltip.bind(self,null,true));
			editor.renderer.container.addEventListener('autoCompleteActivated', function(){
				self.hideTooltip();
			}, false);

			// Tooltip shortcut
			aceHelper.addKeyTrigger(editor,"showType",{mac: "F1", win: "F1"},function(e){
				if(self.isOpen()){
					self.hideTooltip();
				}
				let position = e.getCursorPositionScreen();
				let rawPos = e.renderer.textToScreenCoordinates(position.row,position.column);
				let pos = {rawX: rawPos.pageX, rawY: rawPos.pageY,
					cursorX: position.row, cursorY: position.column };

				if (aceHelper.isValidToken(e, position) && !e.terncompleter.activated) {
					buildTooltip.call(self,ternToAce, editor, pos);
				}
			});

			/*
			 * Setup an interval to show tooltips based on mouse cursor position.
			 */
			setInterval(function () {
				let curCursorX = editor.terned.cursorpos.cursorX;
				let curCursorY = editor.terned.cursorpos.cursorY;
				if(logit)	console.log(" Base Coordinates ("+basePos.baseCursorX+", "+basePos.baseCursorY+")");

				if(basePos.baseCursorX !== curCursorX || basePos.baseCursorY !== curCursorY){
					if(logit)	console.log(" Coordinates have changed "+curCursorX+", "+curCursorY+", " +
						""+editor.terned.cursorpos.rawX+", "+editor.terned.cursorpos.rawY);
					// Set the new
					basePos.baseCursorX = curCursorX;
					basePos.baseCursorY = curCursorY;
					self.hideTooltip(1000);
				}else if((curCursorX !== 0 && curCursorY !==0) &&
					(basePos.baseCursorX === curCursorX && basePos.baseCursorY === curCursorY)){
					if(logit)	console.log(" Co ordinates have not changed "+curCursorX+", "+curCursorY+", " +
						""+editor.terned.cursorpos.rawX+", "+editor.terned.cursorpos.rawY);
					if (aceHelper.isValidToken(editor, {row: curCursorX, column: curCursorY}) && aceHelper.isCursorWithinText(editor)) {
						if(editor.terncompleter && editor.terncompleter.activated)	return;
						buildTooltip.call(self,ternToAce, editor, editor.terned.cursorpos);
					}
				}
			}, cursorDelay);
		};

		/**
		 * UI Elements. changeme Could be moved out.
		 */
		// tooltip
		function Tooltip(parent, logit){
			let self = this;
			let styleType = "tooltip";
			let ele = null;
			// Can it be closed?
			self.canClose = true;
			self.isOpen = false;
			function tooltipmouseover(e) {
				self.canClose = false;
			}
			function tooltipmouseleave(e) {
				self.canClose = true;
			}
			self.addEventListeners = function () {
				//self.addEvent("onclick", tooltipmouseclick);
				self.addEvent("onmouseover",tooltipmouseover);
				self.addEvent("onmouseleave",tooltipmouseleave);
			};
			self.init = function init() {
				ele = dom.createElement("div");
				//changeme THIS SHOULD BE ABSOLUTE. FIXED FOR DEMO
				/*ele.style["position"] = "fixed";*/
				if (parent) {
					parent.appendChild(ele);
				}
				ele.className = "revjs-tooltip-main";
				ele.style["display"] = "none";
				self.isOpen = false;
				self.addEventListeners();
			};
			self.show = function (text, pos, node){
				if (text) {
					ele.innerHTML = text;
				}else if(node){
					ele.appendChild(node);
				}
				ele.style.display = "block";
				ele.style.visibility = "hidden";
				self.checkAndReposition();
				self.isOpen = true;
				if(logit)	console.log("Showing tooltip "+ele.innerHTML+ " \n Is open : "+self.isOpen);
			};
			self.checkAndReposition = function(){
				let posParent = ele.parentElement.getBoundingClientRect();
				let posEle = ele.getBoundingClientRect();
				let pos = {};

				if(posEle.right > posParent.right){
					pos.right = posEle.left;
					pos.left = posEle.left - posEle.width;
				}
				if(posEle.bottom > posParent.bottom){
					pos.bottom = posEle.top;
					pos.top = posEle.top - posEle.height;
				}
				self.setPosition(pos);
				ele.style.visibility = "visible";
			};
			self.isOpen = function(){
				return self.isOpen;
			};
			self.addEvent = function(eventName, callBack){
				ele[eventName] = callBack;
			};
			self.hide = function(delay, force){
				if(self.isOpen && force){
					ele.style.display = "none";
					self.isOpen = false;
				}else if (self.isOpen && self.canClose) {
					if (delay) {
						setTimeout(function () {
							if(self.canClose){
								ele.style.display = "none";
								self.isOpen = false;
							}
						}, delay);
					} else {
						ele.style.display = "none";
						self.isOpen = false;
					}
					if (logit) console.log("Hiding tooltip " + ele.innerHTML + " \n isOpen: "+ self.isOpen);
				}
			};
			self.setPosition = function(pos){
				ele.style.left = pos.left+"px";
				ele.style.top = pos.top+"px";
			};
			self.setHtml = function(htmlText){
				ele.innerHTML = htmlText;
			};
			self.setElement = function(child){
				ele.innerHTML = "";
				ele.appendChild(child);
			}
		}

		// Helps with DOM stuff
		function DomHelper(dom){
			let self = this;
			let doc = dom || document;


			let styles = {
				completionTooltipInfoHR: {
					id: "t2a-doc-hr",
					text: ".t2a-doc-hr {\n" +
						"    border: 0.25px solid;\n" +
						"    border-radius: 20px;\n" +
						"    color: white !important;\n" +
						"}"
				},
				completionTooltipDocURL: {
					id: "t2a-tooltip-docurl",
					text: ".t2a-tooltip-docurl {\n" +
						"    font-style: italic;\n" +
						"    font-size: x-small;\n" +
						"    color: rgb(128, 159, 191) !important;;\n" +
						"}"
				},
				toolTip: {
					id: "revjs-tooltip-main",
					text: ".ace_tooltip, .revjs-tooltip-main {\n" +
						"    background-image: -webkit-linear-gradient(top, #1880b3 0%, #204b5d 100%);\n" +
						"    background-image: -o-linear-gradient(top, #1880b3 0%, #204b5d 100%);\n" +
						"    background-image: -webkit-gradient(linear, left top, left bottom, from(#1880b3), to(#204b5d));\n" +
						"    background-image: linear-gradient(to bottom, #1880b3 0%, #204b5d 100%);\n" +
						"    color: white;\n" +
						"    position: fixed;\n" +
						"    padding: 6px;\n" +
						"    z-index: 999999;\n" +
						"    word-wrap: break-word;\n" +
						"    line-height: normal;\n" +
						"    font-style: normal;\n" +
						"    font-weight: normal;\n" +
						"    font-family: monospace;\n" +
						"    border: none;\n" +
						"    max-width: 30% !important;\n" +
						"    min-width: 20% !important;\n" +
						"    white-space: pre-wrap;\n" +
						"    transition: opacity 1s;\n" +
						"\n" +
						"    -moz-transition: opacity 1s;\n" +
						"    -webkit-transition: opacity 1s;\n" +
						"    -o-transition: opacity 1s;\n" +
						"    -ms-transition: opacity 1s;\n" +
						"\n" +
						"    border-bottom-right-radius: 10px;\n" +
						"    -webkit-box-shadow: -6px 7px 6px -1px rgba(0,0,0,0.35);\n" +
						"    -moz-box-shadow: -6px 7px 6px -1px rgba(0,0,0,0.35);\n" +
						"    box-shadow: -6px 7px 6px -1px rgba(0,0,0,0.35);\n" +
						"}"
				},
				tooltipInfo: {
					id: "t2a-tooltip-info",
					text: ".t2a-tooltip-info {\n" +
						"    font-style: italic;\n" +
						"    font-size: x-small;\n" +
						"    font-color: #57060b !important;\n" +
						"    font-weight: normal;\n" +
						"    text-align: right;\n" +
						"}"
				},
				tooltipURLTarget: {
					id: "t2a-tooltip-target",
					text: ".t2a-tooltip-target {\n" +
						"    cursor: pointer;\n" +
						"    background-color: olivedrab;\n" +
						"}"
				},
				tooltipURLTargetHover: {
					id: "t2a-tooltip-target:hover",
					text: ".t2a-tooltip-target:hover {\n" +
						"    background-color: cornflowerblue;\n" +
						"}"
				},
				tooltipDocStyle: {
					id: "t2a-doc-style",
					text: ".t2a-doc-style {\n" +
						"    max-width: 100%;\n" +
						"    word-wrap: break-word;\n" +
						"    font-weight: normal;\n" +
						"    font-size: 0.7em;\n" +
						"    margin: unset !important;\n" +
						"}"
				},
				functionHelp: {
					id: "revjs-function-help",
					text: ".revjs-function-help {\n" +
						"    max-width: 50em;\n" +
						"    max-height: 30em;\n" +
						"    font-size: x-small;\n" +
						"    display: inline-flex;\n" +
						"    color: white;\n" +
						"}"
				},
				functionFulfullParam: {
					id: "t2a-completed-functionparam",
					text: ".t2a-completed-functionparam {\n" +
						"    background-color: lawngreen;\n" +
						"    color: black;\n" +
						"}"
				},
				wrappedCodeContainer: {
					id: "revjs-code-container",
					text: ".revjs-code-container {\n" +
						"    height: 100% !important;\n" +
						"    width: 100% !important;\n" +
						"}"
				},
				menu: {
					id: "revjs-menu",
					text: ".revjs-menu {\n" +
						"    position: absolute;\n" +
						"    margin: unset;\n" +
						"    background-image: -webkit-linear-gradient(top, #1880b3 0%, #204b5d 100%);\n" +
						"    background-image: -o-linear-gradient(top, #1880b3 0%, #204b5d 100%);\n" +
						"    background-image: -webkit-gradient(linear, left top, left bottom, from(#1880b3), to(#204b5d));\n" +
						"    background-image: linear-gradient(to bottom, #1880b3 0%, #204b5d 100%);\n" +
						"}"
				},
				menuButton: {
					id: "revjs-menu-button",
					text: ".revjs-menu-button {\n" +
						"    background-image: -webkit-linear-gradient(top, #1880b3 0%, #204b5d 100%);\n" +
						"    background-image: -o-linear-gradient(top, #1880b3 0%, #204b5d 100%);\n" +
						"    background-image: -webkit-gradient(linear, left top, left bottom, from(#1880b3), to(#204b5d));\n" +
						"    background-image: linear-gradient(to bottom, #1880b3 0%, #204b5d 100%);\n" +
						"    color: white;\n" +
						"    font-size: 0.8em;\n" +
						"    border: none;\n" +
						"    cursor: pointer;\n" +
						"    margin: 0px !important;\n" +
						"    width: 40px;\n" +
						"    font-family: system-ui !important;\n" +
						"}\n" +
						".revjs-menu-button:hover, .revjs-menu-button:focus {\n" +
						"    background-color: #000000;\n" +
						"    outline: 0 !important;\n" +
						"    color: black;\n" +
						"}"
				},
				menuDropdown: {
					id: "revjs-menu-dropdown",
					text: ".revjs-menu-dropdown {\n" +
						"    position: relative;\n" +
						"    display: inline-block;\n" +
						"}"
				},
				menuDropContent: {
					id: "revjs-menu-content",
					text: ".revjs-menu-content { \n" +
						"    display: none; \n" +
						"    position: absolute; \n" +
						"    background-color: #f1f1f1; \n" +
						"    min-width: 12vw; \n" +
						"    overflow: auto; \n" +
						"    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); \n" +
						"    z-index: 5; \n" +
						"    cursor: pointer; \n" +
						"} \n" +
						".revjs-menu-content a { \n" +
						"    color: black; \n" +
						"     padding: 2px; \n" +
						"    text-decoration: none; \n" +
						"    display: block; \n" +
						"    width: inherit; \n" +
						"    height: inherit; \n" +
						"    font-size: 12px; \n" +
						"    font-family: system-ui !important; \n" +
						"    padding-left: 5px; \n" +
						"} \n" +
						".revjs-menu-content a:hover { \n" +
						"    background-color: #2980B9;\n" +
						"    color: white; \n" +
						"} \n" +
						".revjs-menu-content-show {display: block;}"
				}

			};

			self.getStyles = function () {
				return styles;
			};

			self.isMac = function() {
				let platform = (window.navigator && window.navigator.platform) || "win";
				return platform.toLowerCase().includes("mac");
			};

			self.importCssString = function importCssString(styleObj, container) {
				let root = container ? container : doc;
				const internalStyleId = "t2aInternalStyle";

				let style = root.getElementById(internalStyleId) || root.createElement("style");
				style.appendChild(doc.createTextNode(styleObj.text));
				style.id = internalStyleId;

				if (root === doc) {
					if (!doc)
						doc = document;
					root = doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement;
				}
				root.insertBefore(style, root.firstChild);
			};

			// Creates an element with style classes and parent and returns
			self.createElement = function(elementTag, elementId, styles, parent, addFirst){
				let e = doc.createElement(elementTag);
				elementId = elementId || 'revjs-'+Date.now();styles = styles || [];
				e.id = elementId;
				styles.forEach(function (s) {
					e.classList.add(s);
				});
				if(parent){
					if(!addFirst){
						parent.appendChild(e);
					}
					else{
						parent.insertBefore(e, parent.firstChild);
					}
				}
				return e;
			};

			self.hasCssClass = function(className){
				let selector = "."+className;
				let haveRule = false;
				let rules;

				if (typeof document.styleSheets != "undefined"){
					let cssSheets = document.styleSheets;
					outerloop:
						for (let i = 0; i < cssSheets.length; i++) {
							rules =  (typeof cssSheets[i].cssRules != "undefined") ? cssSheets[i].cssRules : cssSheets[i].rules;
							for (let j = 0; j < rules.length; j++) {
								if (rules[j].selectorText && rules[j].selectorText.includes(selector)) {
									haveRule = true;
									break outerloop;
								}
							}
						}
				}
				return haveRule;
			};

			self.removeClass = function(className){
				let selector = "."+className;
				let rules;

				if (typeof document.styleSheets != "undefined"){
					let cssSheets = document.styleSheets;
					outerloop:
						for (let i = 0; i < cssSheets.length; i++) {
							rules =  (typeof cssSheets[i].cssRules != "undefined") ? cssSheets[i].cssRules : cssSheets[i].rules;
							for (let j = 0; j < rules.length; j++) {
								if (rules[j].selectorText && rules[j].selectorText.includes(selector)) {
									rules[j].selectorText = "ace-tooltip-donotuse";
								}
							}
						}
				}
			};

			self.addStyleIfAbsent = function (style) {
				if (!self.hasCssClass(style.id)) {
					self.importCssString(style);
				}
			};
		}
	} // ViewHelper ends here.

);// end of immediately executed function.