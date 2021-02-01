'use strict';

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('@types/eslints').Linter.Config} */
module.exports = {
  root: true,

  parserOptions: {
    sourceType: 'script',
    ecmaVersion: 12,
  },
  extends: [
    'semistandard'
  ],
  rules: {
    strict: ['error', 'safe'],
    indent: ['error', 2, {
      SwitchCase: 1,
      MemberExpression: 'off'
    }],
    'arrow-parens': ['error', 'as-needed'],
    // TODO: Remove this after all error reports get resolved!
    'prefer-const': 'off',
    'comma-dangle': ['warn', 'never'],
    'no-debugger': isDev ? 'warn' : 'error',
    'no-unreachable': isDev ? 'warn' : 'error',
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never'
    }],
    'sort-imports': ['error', {
      ignoreCase: true
    }]
  }
};
