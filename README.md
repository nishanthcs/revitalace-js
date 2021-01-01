# revitalace-js
Active JavaScript code completion for Ace Editor which is the industry standard for online code editing. Using the power of Tern library.

## <a href="https://nishanthcs.github.io/revitalace-js/" target="_blank">Demo</a>

## Why?
A pluggable module for Ace editor that modifies it to include

1. Active code completion. Start typing to get suggestions on JS variables, functions, objects and more. Or Just use __Ctrl/Cmd - Space__
2. Hover over variables, functions and objects to get help through a tooltip that displays JSDoc, references and definitions.
3. Dynamic JSDoc parsing
4. Fully programmable and interactive menu bar. Use __editor__ context to add new functionality.

## How?

### Installation

* Clone the repository

`git clone git@github.com:nishanthcs/revitalace-js.git `

* Build the repository ( use yarn or npm)

~~~~
cd revitalace-js
yarn install
yarn build
~~~~

This step would create the distribution under `dist/` folder. Open `dist/index.html`
to view the demo page.

* Run the demo (OPTIONAL)

`yarn start`

* Copy or Import `dist/revitalace.min.js` to your project

* Add revitalace option to Ace editor initialization
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
    * Boostrap live completion with [tern definitions](https://ternjs.net/doc/manual.html#typedef)
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


## References`

__[Ace](https://ace.c9.io/)__ - Official Website

__[Tern](https://ternjs.net/doc/manual.html)__ - Official Website



