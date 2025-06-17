module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script' // Changé pour supporter "use strict"
  },
  rules: {
    // Style et formatage - règles assouplies pour Fastify
    'indent': ['warn', 2],
    'quotes': ['off'], // Désactivé temporairement  
    'semi': ['warn', 'always'],
    'comma-dangle': ['off'], // Désactivé temporairement
    'no-trailing-spaces': 'warn',
    'eol-last': 'warn',
    
    // Bonnes pratiques
    'no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_|notificationRoutes'
    }],
    'no-console': 'off', // Autorisé pour les logs serveur
    'prefer-const': 'warn',
    'no-var': 'error',
    
    // Gestion d'erreurs
    'no-throw-literal': 'error',
    
    // Sécurité
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Node.js spécifique - assouplies
    'no-process-exit': 'warn', // Warn au lieu d'error pour les scripts
    'handle-callback-err': 'off' // Désactivé car pas utilisé dans Fastify moderne
  },
  ignorePatterns: [
    'node_modules/',
    'uploads/',
    'coverage/',
    '*.log',
    'migrations/',
    'scripts/'
  ]
};
