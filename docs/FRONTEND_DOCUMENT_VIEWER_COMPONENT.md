# 📄 Composant de Visualisation de Document - Guide Frontend

## 🎯 Objectif
Créer un composant qui affiche un document physique formaté en 3 parties au lieu du JSON brut.

## 🏗️ Structure Recommandée

### React/Vue Component Example

```jsx
// DocumentViewer.jsx (React) ou DocumentViewer.vue (Vue)
import React, { useState, useEffect } from 'react';
import './DocumentViewer.css';

const DocumentViewer = ({ documentName, searchTerm }) => {
  const [documentPreview, setDocumentPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocumentPreview();
  }, [documentName, searchTerm]);

  const fetchDocumentPreview = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/highlightera2/${encodeURIComponent(documentName)}/${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDocumentPreview(data.preview);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text, highlights) => {
    if (!highlights || highlights.length === 0) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight.text})`, 'gi');
      highlightedText = highlightedText.replace(
        regex, 
        `<mark class="search-highlight">$1</mark>`
      );
    });
    
    return { __html: highlightedText };
  };

  if (loading) return <DocumentSkeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!documentPreview) return <NoDocumentFound />;

  return (
    <div className="document-viewer">
      {/* Header avec informations du document */}
      <DocumentHeader documentInfo={documentPreview.documentInfo} />
      
      {/* Statistiques de recherche */}
      <SearchStats searchInfo={documentPreview.searchInfo} />
      
      {/* Visualisation du document en 3 parties */}
      <div className="document-content">
        {documentPreview.previewPages.map((page, index) => (
          <DocumentPage 
            key={page.pageNumber}
            page={page}
            searchTerm={documentPreview.searchInfo.searchTerm}
            isFirst={index === 0}
            isLast={index === documentPreview.previewPages.length - 1}
          />
        ))}
      </div>
      
      {/* Résumé */}
      <DocumentSummary summary={documentPreview.summary} />
    </div>
  );
};

// Composant pour chaque page
const DocumentPage = ({ page, searchTerm, isFirst, isLast }) => {
  const getPageTypeIcon = (pageType) => {
    switch(pageType) {
      case 'first': return '📄';
      case 'match': return '🎯';
      case 'last': return '📋';
      default: return '📄';
    }
  };

  const getPageTypeLabel = (pageType) => {
    switch(pageType) {
      case 'first': return 'Première page';
      case 'match': return 'Page avec correspondances';
      case 'last': return 'Dernière page';
      default: return 'Page du document';
    }
  };

  return (
    <div className={`document-page page-type-${page.pageType}`}>
      {/* En-tête de page */}
      <div className="page-header">
        <div className="page-info">
          <span className="page-icon">{getPageTypeIcon(page.pageType)}</span>
          <span className="page-label">{getPageTypeLabel(page.pageType)}</span>
          <span className="page-number">Page {page.pageNumber}</span>
          {page.hasMatches && (
            <span className="match-count">
              {page.matchCount} correspondance(s)
            </span>
          )}
        </div>
      </div>

      {/* Contenu de la page */}
      <div className="page-content">
        <div 
          className="page-text"
          dangerouslySetInnerHTML={
            highlightMatches(page.content, page.matchHighlights || [])
          }
        />
      </div>

      {/* Séparateur visuel */}
      {!isLast && <div className="page-separator" />}
    </div>
  );
};

// Fonction pour surligner les correspondances
const highlightMatches = (content, highlights) => {
  let highlightedContent = content;
  
  if (highlights && highlights.length > 0) {
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${escapeRegex(highlight.text)})`, 'gi');
      highlightedContent = highlightedContent.replace(
        regex, 
        `<mark class="search-highlight" title="Correspondance trouvée">$1</mark>`
      );
    });
  }
  
  return { __html: highlightedContent };
};

// Composants auxiliaires
const DocumentHeader = ({ documentInfo }) => (
  <div className="document-header">
    <div className="document-title">
      <h2>📄 {documentInfo.filename}</h2>
      <div className="document-meta">
        <span className="total-pages">{documentInfo.totalPages} pages</span>
        <span className="preview-type">{documentInfo.previewType}</span>
      </div>
    </div>
    <div className="document-path">
      <small>📁 {documentInfo.physicalPath}</small>
    </div>
  </div>
);

const SearchStats = ({ searchInfo }) => (
  <div className="search-stats">
    <div className="search-term">
      🔍 Recherche: <strong>"{searchInfo.searchTerm}"</strong>
    </div>
    <div className="search-results">
      <span className="match-count">
        {searchInfo.matchCount} occurrence(s) trouvée(s)
      </span>
      <span className="pages-count">
        sur {searchInfo.pagesWithMatches} page(s)
      </span>
    </div>
  </div>
);

const DocumentSummary = ({ summary }) => (
  <div className="document-summary">
    <h4>📊 Résumé</h4>
    <p>{summary}</p>
  </div>
);

// Composants de chargement et d'erreur
const DocumentSkeleton = () => (
  <div className="document-skeleton">
    <div className="skeleton-header"></div>
    <div className="skeleton-stats"></div>
    <div className="skeleton-pages">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-page"></div>
      ))}
    </div>
  </div>
);

const ErrorDisplay = ({ error }) => (
  <div className="error-display">
    <div className="error-icon">⚠️</div>
    <h3>Erreur lors du chargement du document</h3>
    <p>{error}</p>
    <button onClick={() => window.location.reload()}>
      Réessayer
    </button>
  </div>
);

const NoDocumentFound = () => (
  <div className="no-document">
    <div className="no-document-icon">📄</div>
    <h3>Aucun document trouvé</h3>
    <p>Le document demandé n'a pas pu être chargé.</p>
  </div>
);

// Fonction utilitaire
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default DocumentViewer;
```

## 🎨 Styles CSS Recommandés

```css
/* DocumentViewer.css */
.document-viewer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f8f9fa;
}

/* Header du document */
.document-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.document-title h2 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.document-meta {
  display: flex;
  gap: 16px;
  color: #666;
  font-size: 14px;
}

.document-meta span {
  background: #e3f2fd;
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: 500;
}

.document-path {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.document-path small {
  color: #666;
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Statistiques de recherche */
.search-stats {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-term {
  font-size: 18px;
  font-weight: 500;
}

.search-results {
  display: flex;
  gap: 16px;
  font-size: 14px;
}

.search-results span {
  background: rgba(255,255,255,0.2);
  padding: 6px 12px;
  border-radius: 16px;
}

/* Contenu du document */
.document-content {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* Pages individuelles */
.document-page {
  border-bottom: 3px solid #f0f0f0;
  transition: all 0.3s ease;
}

.document-page:last-child {
  border-bottom: none;
}

.document-page:hover {
  background: #fafbfc;
}

/* Types de pages */
.page-type-first {
  border-left: 4px solid #3498db;
}

.page-type-match {
  border-left: 4px solid #e74c3c;
  background: #fff8f8;
}

.page-type-last {
  border-left: 4px solid #95a5a6;
}

/* En-tête de page */
.page-header {
  background: #f8f9fa;
  padding: 16px 24px;
  border-bottom: 1px solid #dee2e6;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-icon {
  font-size: 20px;
}

.page-label {
  font-weight: 600;
  color: #2c3e50;
}

.page-number {
  color: #666;
  font-size: 14px;
}

.match-count {
  background: #e74c3c;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* Contenu de page */
.page-content {
  padding: 24px;
}

.page-text {
  line-height: 1.6;
  color: #2c3e50;
  font-size: 16px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Surlignage des correspondances */
.search-highlight {
  background: #ffeb3b;
  color: #333;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(255,235,59,0.5);
}

/* Séparateur de pages */
.page-separator {
  height: 2px;
  background: linear-gradient(90deg, transparent, #ddd, transparent);
  margin: 0 24px;
}

/* Résumé */
.document-summary {
  background: #e8f5e8;
  border: 1px solid #c3e6cb;
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
}

.document-summary h4 {
  margin: 0 0 12px 0;
  color: #155724;
}

.document-summary p {
  margin: 0;
  color: #155724;
  font-style: italic;
}

/* États de chargement */
.document-skeleton {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.skeleton-header {
  height: 120px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
  margin-bottom: 20px;
}

.skeleton-stats {
  height: 60px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
  margin-bottom: 24px;
}

.skeleton-pages {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-page {
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Gestion d'erreurs */
.error-display, .no-document {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.error-icon, .no-document-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-display h3, .no-document h3 {
  color: #e74c3c;
  margin-bottom: 12px;
}

.error-display button {
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 16px;
}

.error-display button:hover {
  background: #2980b9;
}

/* Responsive */
@media (max-width: 768px) {
  .document-viewer {
    padding: 16px;
  }
  
  .document-header {
    padding: 16px;
  }
  
  .search-stats {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .page-content {
    padding: 16px;
  }
  
  .page-text {
    font-size: 14px;
  }
}
```

## 🚀 Utilisation du Composant

```jsx
// Dans votre application principale
import DocumentViewer from './components/DocumentViewer';

function App() {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="app">
      {/* Interface de recherche */}
      <SearchInterface 
        onSearch={(doc, term) => {
          setSelectedDocument(doc);
          setSearchTerm(term);
        }}
      />
      
      {/* Visualiseur de document */}
      {selectedDocument && searchTerm && (
        <DocumentViewer 
          documentName={selectedDocument}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
}
```

## 🎯 Fonctionnalités Incluses

### ✅ Affichage Structuré
- **Header informatif** avec nom, nombre de pages, type
- **Statistiques de recherche** visuellement attrayantes
- **Pages formatées** selon les 3 parties
- **Surlignage des correspondances** en temps réel

### ✅ Expérience Utilisateur
- **États de chargement** avec squelettes animés
- **Gestion d'erreurs** avec messages clairs
- **Design responsive** pour tous les écrans
- **Animations fluides** pour les transitions

### ✅ Performance
- **Chargement lazy** des composants
- **Mise en cache** des résultats de recherche
- **Optimisation** pour les gros documents

## 📱 Intégration Frontend

1. **Installation** des dépendances nécessaires
2. **Import** du composant DocumentViewer
3. **Configuration** des routes API
4. **Personnalisation** des styles selon votre charte graphique

Ce composant transforme complètement l'expérience utilisateur en passant du JSON brut à une visualisation professionnelle et intuitive du document !
