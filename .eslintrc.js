module.exports = {
    "env": {
        "node": true,
        "browser": true,
        "es2021": true,
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true,
        },
        "ecmaVersion": 12,
        "sourceType": "module",
    },
    "plugins": [
        "react",
        "@typescript-eslint",
    ],
    "rules": {
        "indent": [ "error", 4, { "SwitchCase": 1 } ],
        "linebreak-style": [ "error", "unix" ],
        "quotes": [ "error", "double" ],
        "semi": [ "error", "always" ],
        "eqeqeq": "warn",
        "no-tabs": "error",
        // { foo: 3 }, not {foo: 3}
        "object-curly-spacing": [ "error", "always" ],
        "comma-spacing": [ "error", { "before": false, "after": true } ],
        "spaced-comment": [ "warn", "always" ],
        "no-multi-spaces": "error",
        // if () {} not if (){}
        "space-before-blocks": "error",
        // javascript curly braces placement style
        "brace-style": "error",
        "keyword-spacing": "error",
        "key-spacing": "error",
        "max-lines": [ "warn", { "max": 1000 } ],
        // trailing comma helps in git diff and when adding or reordering lines
        "comma-dangle": [ "warn", "always-multiline" ],
        "no-trailing-spaces": "error",
        "eol-last": "error",
        "no-var": "error",
        // allow console.warn
        "no-console": [ "warn", { allow: [ "warn", "error" ] } ],
        // foo ("bar") -> foo("bar")
        "func-call-spacing": "error",
        // incorrect: foo( "bar" ), ( 1 + 3 ), if ( foo === 42 ), ...
        "space-in-parens": "error",
        // correct: function () {}, function foo(), async () => {}
        "space-before-function-paren": [ "error", {
            "anonymous": "always",
            "named": "never",
            "asyncArrow": "always",
        } ],
        // correct: () => {}
        "arrow-spacing": "error",
        // math, assignment, ternary
        "space-infix-ops": "error",
        // maximum: 2, end of file: 1, beginning of file: 0
        "no-multiple-empty-lines": [ "error", { "max": 2, "maxEOF": 1, "maxBOF": 0 } ],
        // line width
        "max-len": [ "error", { "code": 120 } ],
        // names of functions are required -> no anonymous functions (arrow functions are allowed)
        "func-names": "error",
        "prefer-arrow-callback": "error",
        // allow debugger statement, hopefully they won't get to the git repo
        "no-debugger": "off",
        "prefer-template": "error",
        "prefer-const": "warn",
        // use spaces inside array brackets
        "array-bracket-spacing": [ "error", "always" ],
        // react 17.x.x doesn't need to import React
        "react/react-in-jsx-scope": "off",
        // type {} allowed
        "@typescript-eslint/ban-types": [
            "error",
            {
                "extendDefaults": true,
                "types": {
                    "{}": false,
                },
            },
        ],
    },
};
