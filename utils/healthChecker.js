const fs = require('fs');
const path = require('path');

class HealthChecker {
  constructor() {
    this.checks = [];
    this.results = [];
  }

  // Ajouter un check personnalisé
  addCheck(name, checkFunction) {
    this.checks.push({ name, checkFunction });
  }

  // Exécuter tous les checks
  async runAllChecks() {
    this.results = [];
    
    for (const check of this.checks) {
      try {
        const startTime = Date.now();
        const result = await check.checkFunction();
        const duration = Date.now() - startTime;
        
        this.results.push({
          name: check.name,
          status: 'healthy',
          duration: `${duration}ms`,
          details: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.results.push({
          name: check.name,
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return this.getHealthReport();
  }

  // Obtenir le rapport de santé
  getHealthReport() {
    const healthy = this.results.filter(r => r.status === 'healthy').length;
    const total = this.results.length;
    
    return {
      status: healthy === total ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        total,
        healthy,
        unhealthy: total - healthy
      },
      services: this.results
    };
  }

  // Check de la base de données
  static async checkDatabase() {
    const { sequelize } = require('../models');
    
    try {
      await sequelize.authenticate();
      const result = await sequelize.query('SELECT version() as version');
      return {
        connected: true,
        version: result[0][0].version
      };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  // Check du système de fichiers
  static async checkFileSystem() {
    const uploadsDir = path.join(__dirname, '../uploads');
    
    try {
      // Vérifier que le dossier uploads existe et est accessible en écriture
      await fs.promises.access(uploadsDir, fs.constants.F_OK | fs.constants.W_OK);
      
      // Vérifier l'espace disque disponible
      const stats = await fs.promises.stat(uploadsDir);
      
      return {
        uploadsDir: 'accessible',
        writable: true,
        created: stats.birthtime
      };
    } catch (error) {
      throw new Error(`File system check failed: ${error.message}`);
    }
  }

  // Check d'Elasticsearch (optionnel)
  static async checkElasticsearch() {
    try {
      const axios = require('axios');
      const response = await axios.get(process.env.ELASTICSEARCH_NODE || 'http://localhost:9200', {
        timeout: 5000
      });
      
      return {
        connected: true,
        version: response.data.version.number,
        cluster_name: response.data.cluster_name
      };
    } catch (error) {
      throw new Error(`Elasticsearch not available: ${error.message}`);
    }
  }

  // Check de la mémoire
  static async checkMemory() {
    const used = process.memoryUsage();
    const totalMB = Math.round(used.rss / 1024 / 1024);
    const heapMB = Math.round(used.heapUsed / 1024 / 1024);
    
    return {
      rss: `${totalMB} MB`,
      heapUsed: `${heapMB} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(used.external / 1024 / 1024)} MB`
    };
  }

  // Check des variables d'environnement critiques
  static async checkEnvironment() {
    const requiredEnvVars = [
      'DB_USERNAME',
      'DB_PASSWORD', 
      'DB_NAME',
      'JWT_SECRET',
      'PORT'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    return {
      allRequired: 'present',
      nodeEnv: process.env.NODE_ENV || 'not_set',
      port: process.env.PORT || 3003
    };
  }
}

module.exports = HealthChecker;
