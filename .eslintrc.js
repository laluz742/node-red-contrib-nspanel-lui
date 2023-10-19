module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint/eslint-plugin'],
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
        node: true,
        worker: true,
    },
    extends: [
        'airbnb-base',
        'airbnb-typescript/base',
        'plugin:prettier/recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
        tsconfigRootDir: __dirname,
    },
    rules: {
        'no-underscore-dangle': 'off',
        'no-param-reassign': 'off',
        'no-restricted-syntax': 'off',
        'default-case': 'off',
        'consistent-return': 'off',
        'guard-for-in': 'off',
        'no-bitwise': 'off',
        'class-methods-use-this': 'off',
        'prefer-destructuring': 'off',
        'import/prefer-default-export': 'off',
        // Typescript rules
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/dot-notation': 'off',
        //'@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/ban-types': [
            'error',
            {
                extendDefaults: true,
                types: {
                    '{}': false,
                },
            },
        ],
    },
}
