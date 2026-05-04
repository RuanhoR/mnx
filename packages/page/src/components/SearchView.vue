<template>
  <div class="search-container">
    <div class="search-header">
      <h2>{{ getI18n("Search") }}</h2>
      <div class="search-input-wrapper">
        <input 
          type="text" 
          v-model="searchKeyword" 
          :placeholder="getI18n('Search')"
          class="search-input"
        />
      </div>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>{{ getI18n('Searching') }}</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="searchResults.length > 0" class="results-container">
      <div class="results-count">
        {{ getI18n('Found') }} {{ searchResults.length }} {{ getI18n('results') }}
      </div>
      <div class="results-list">
        <div 
          v-for="result in searchResults" 
          :key="`${result.scope}/${result.name}`"
          class="result-item"
          @click="goToPackage(result)"
        >
          <div class="package-info">
            <h3 class="package-name">{{ result.scope }}/{{ result.name }}</h3>
            <p class="package-description" v-if="result.description">{{ result.description }}</p>
            <div class="package-meta">
              <span class="version">{{ getI18n('Version') }}: {{ result.version }}</span>
              <span class="downloads" v-if="result.download">{{ result.download }} {{ getI18n('Downloads') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="searchKeyword.trim().length > 0" class="no-results">
      <p>{{ getI18n('NoResultsFound') }}</p>
    </div>

    <div v-else class="welcome">
      <p>{{ getI18n('SearchWelcome') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getI18n } from '../i18n';
import { refDebounced } from "@vueuse/core";
import { fetchAPI } from '../utils/fetchAPI';
import config from '../config';

interface SearchResult {
  scope: string;
  name: string;
  version?: string;
  description?: string;
  download?: number;
  created_at?: string;
}

const router = useRouter();
const searchKeyword = ref("");
const debouncedKeyword = refDebounced(searchKeyword, 400);
const searchResults = ref<SearchResult[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const searchPackages = async (keyword: string) => {
  if (!keyword.trim()) {
    searchResults.value = [];
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const response = await fetchAPI(
      `/package/search/for/${encodeURIComponent(keyword.trim())}`,
      {},
      "GET",
      config.packageAPIHost
    );

    if (response.ok && response.status === 200) {
      // 后端返回的数据格式是 { code: 200, data: { mod: Date, data: SearchResult[] } }
      if (response.data && response.data.data) {
        searchResults.value = response.data.data || [];
      } else {
        searchResults.value = [];
      }
    } else {
      error.value = response.data || 'Search failed';
      searchResults.value = [];
    }
  } catch (err) {
    error.value = 'Search error occurred';
    searchResults.value = [];
    console.error('Search error:', err);
  } finally {
    isLoading.value = false;
  }
};

const goToPackage = (result: SearchResult) => {
  // 传递版本信息到PackageView
  if (result.version) {
    router.push({ 
      path: `/package/${result.scope}/${result.name}`, 
      query: { version: result.version }
    });
  } else {
    router.push(`/package/${result.scope}/${result.name}`);
  }
};

watch(debouncedKeyword, (newKeyword) => {
  searchPackages(newKeyword);
});
</script>

<style scoped>
.search-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.search-header {
  text-align: center;
  margin-bottom: 2rem;
}

.search-header h2 {
  color: var(--text-h);
  margin-bottom: 1rem;
}

.search-input-wrapper {
  max-width: 500px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg);
  color: var(--text);
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.loading, .error, .no-results, .welcome {
  text-align: center;
  margin: 2rem 0;
  color: var(--text);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top: 3px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

/* Ensure parent doesn't inherit animation so text doesn't rotate */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: none !important;
}
.loading-spinner {
  display: inline-block;
  will-change: transform;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error p {
  color: #e74c3c;
}

.results-count {
  margin-bottom: 1rem;
  color: var(--text);
  font-size: 0.9rem;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(170, 59, 255, 0.1);
}

.package-name {
  color: var(--text-h);
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}

.package-description {
  color: var(--text);
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.package-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--text);
}

.version {
  font-weight: 500;
}

.downloads {
  opacity: 0.8;
}

@media (max-width: 768px) {
  .search-container {
    padding: 1rem;
  }
  
  .package-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>