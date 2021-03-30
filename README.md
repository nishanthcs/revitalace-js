# revitalace-js
Active JavaScript code completion and interactive, programmable menu bar for the Ace Editor using the power of Tern library.

## <a href="https://nishanthcs.github.io/revitalace-js/" target="_blank">Demo</a>

## Why?
Ace editor is an online code editor library that is widely used by the industry majors ( AWS, Wikipedia, Google and more) to surface code editing capability in their pages. Though great, the code editing experience is not comparable to the same that we get from established IDEs like WebStorm or VSCode. Using revitalace-JS, JS coding experience in Ace can be improved with active code completion and interactive tool tips. Hoping to add more.

Ideas, fixes and contributions welcome!. Need testers too.

## What?
A pluggable module for Ace editor that modifies it to include

1. Active code completion. Start typing to get suggestions on JS variables, functions, objects and more. Or Just use __Ctrl/Cmd - Space__
2. Hover over variables, functions and objects to get help through a tooltip that displays JSDoc, references and definitions.
3. Dynamic JSDoc parsing
4. Fully programmable and interactive menu bar. Use __editor__ context to add new functionality.

## How?

### Installation

1. Clone the repository

    `git clone git@github.com:nishanthcs/revitalace-js.git `

2.  Build the repository ( use yarn or npm)

    ~~~~
    cd revitalace-js
    yarn install
    yarn build
    ~~~~

This step would create the distribution under `dist/` folder. Open `dist/index.html`
to view the demo page.

3. Run the demo (OPTIONAL)

   `yarn start`

4. Copy or Import `dist/revitalace.min.js` to your project

### Usage

* Add `revitalAceJS` option to Ace editor initialization.
    * Quick enabling
        ```js
        editor.setOptions({
            revitalAceJS: true
        });
        ```
    * Boostrap live completion with dependent code
        ```js
        editor.setOptions({
            revitalAceJS: {
                dependentCode : "/**\n" +
                " * This object is part of the dependent code added via 'defs'\n" +
                " */\n" +
                "var dependentObject = {\n" +
                "m : 'JS has -infinity and infinity'\n" +
                "}" 
            }
        });
        ```
    * Boostrap live completion with [tern definitions](https://ternjs.net/doc/manual.html#typedef) . This would allow static code completion.
        ```js
        let ternDef = {
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
            defJSON : ternDef,
            atFront : true
        };
        editor.setOptions({
            revitalAceJS: {
                defs : defObject
            }
        });
        ```
    * Override completions using the completion callback option `completionsCallback`
        ```js
        editor.setOptions({
            revitalAceJS: {
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
                completionsCallback: (editorSession, currentLine, completions) => {
                    console.log('Completion Line' + currentLine);
                    console.log(JSON.stringify(completions));
                    // Here we add a new entry to every completion list. 
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
                }
            }
        });
        ```
  * Customize tooltip content dynamically by using the tooltip callback option `tooltipCallBack`
      ```js
      editor.setOptions({
          revitalAceJS: {
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
            tooltipCallBack: (editorSession, currentToken, toolTipInfo) => {
                console.log('Tooltip Token' + currentToken.value);
                console.log(JSON.stringify(toolTipInfo));
                // Update the doc here.
                const customizedToolTipInfo = {
                    type: "fn(input: ?)",
                    name: "getTooltipInfo",
                    doc: "Where is Waldo?",
                    def: toolTipInfo.def,
                    refs: toolTipInfo.refs
                }
                return customizedToolTipInfo;
            }
          }
      });
      ```
  * Switch off ECMA and BROWSER suggestions while completing using `options`
       ```js
       editor.setOptions({
           revitalAceJS: {
               options: {
                   // ECMA based suggestions can be switched off from suggestions by  flipping this flag
                   useEcmaDefs: true, //default true
                   // BROWSER based suggestions can be switched off from suggestions by  flipping this flag
                   useBrowserDefs: true // default true
               }
           }
       });
       ```
  * Add interactive menu bar and menu items with actions
    ```js
        editor.setOptions({
            revitalAceJS: {
                menu : [
                    {
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
                    }
                ]
             }
        });
        ```


### Styles
Refer to sample stylesheet under `src/style/tooltip.css`. Override default styles by adding classes with the same name.

### Whats next?
There is lot to do including code quality improvements so any help is welcome. 
* Caching completion results
* Turning features on/off via options
* Testing and bug fixes

Feel free to create issues here if found any. 

## References

__[Ace](https://ace.c9.io/)__ - Official Website

__[Tern](https://ternjs.net/doc/manual.html)__ - Official Website

## Thanks

[__![JetBrains](src/images/jetbrains-variant-4.svg)__](https://www.jetbrains.com/)

[JetBrains Open Source](https://www.jetbrains.com/opensource/)

