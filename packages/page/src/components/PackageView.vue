<template>
  <div class="package-container" v-if="packageData">
    <div class="package-header">
      <h1 class="package-title">{{ packageData.scope }}/{{ packageData.name }}</h1>
      <span class="package-version">{{ getI18n('Version') }} {{ packageData.version }}</span>
    </div>

    <div class="package-content">
      <div class="package-sidebar">
        <div class="package-meta">
          <div class="meta-item">
            <span class="label">{{ getI18n('Package') }}</span>
            <span class="value">{{ packageData.scope }}/{{ packageData.name }}</span>
          </div>
          <div class="meta-item version-selector">
            <span class="label">{{ getI18n('Version') }}</span>
            <div class="version-dropdown">
              <select :value="selectedVersion"
                @change="($event) => { selectedVersion = ($event.target as HTMLSelectElement).value; handleVersionChange(); }">
                <option value="">--- {{ getI18n('SelectVersion') }} ---</option>
                <option v-for="version in allVersions" :key="version.version" :value="version.version"
                  :selected="version.version === packageData.version">
                  {{ version.version }}
                </option>
              </select>
            </div>
          </div>
          <div class="meta-item" v-if="packageData.downloads !== undefined">
            <span class="label">{{ getI18n('Downloads') }}</span>
            <span class="value">{{ packageData.downloads }}</span>
          </div>
          <div class="meta-item" v-if="packageData.created_at">
            <span class="label">{{ getI18n('LastUpdated') }}</span>
            <span class="value">{{ formatDate(packageData.created_at) }}</span>
          </div>
        </div>

        <div class="install-section">
          <h3>{{ getI18n('InstallCommand') }}</h3>
          <div class="install-command">
            <code>mbler install {{ (packageData.scope || '') + '/' + (packageData.name || '') }}</code>
            <button class="copy-btn" @click="copyInstallCommand" :title="getI18n('Copied')">
              📋
            </button>
          </div>
        </div>
      </div>

      <div class="package-main">
        <div class="description-section" v-if="packageData.description">
          <h2>{{ getI18n('Description') }}</h2>
          <p class="package-description">{{ packageData.description }}</p>
        </div>

        <div class="readme-section" v-if="readmeContent">
          <h2>{{ readmeTitle }}</h2>
          <div class="readme-content">
            <div ref="mdContent"></div>
          </div>
        </div>

        <div class="versions-section" v-if="allVersions && allVersions.length > 1">
          <h2>版本列表</h2>
          <div class="versions-list">
            <div v-for="version in allVersions" :key="version.version" class="version-item"
              :class="{ active: version.version === packageData.version }" @click="selectVersion(version)">
              <span class="version-number">{{ version.version }}</span>
              <span class="version-date" v-if="version.created_at">{{ formatDate(version.created_at) }}</span>
              <span class="current-tag" v-if="version.version === packageData.version">Current</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="isLoading" class="loading">
    <div class="loading-spinner"></div>
    <p>{{ getI18n('Loading') }}</p>
  </div>

  <div v-else-if="error" class="error">
    <p>{{ error }}</p>
    <button @click="$router.push('/search')" class="back-btn">
      ← {{ getI18n('BackToSearch') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getI18n } from '../i18n';
import { fetchAPI } from '../utils/fetchAPI';
import { KvManger, CacheKeys } from '../utils/kvManger';
import config from '../config';
import md from "markdown-it"
interface PackageVersion {
  version: string;
  description?: string;
  downloads?: number;
  created_at?: string;
}

interface PackageData {
  scope: string;
  name: string;
  version: string;
  description?: string;
  downloads?: number;
  created_at?: string;
  all_versions?: PackageVersion[];
}

const route = useRoute();
const router = useRouter();

const packageData = ref<PackageData | null>(null);
const allVersions = ref<PackageVersion[]>([]);
const selectedVersion = ref<string>('');
const readmeContent = ref<string>('');
const versionReadmeMap = ref<Record<string, string>>({});
const isLoading = ref(true);
const error = ref<string | null>(null);
const scope = computed(() => route.params.scope as string);
const name = computed(() => route.params.name as string);
const mdContent = ref<HTMLDivElement | null>(null);
const cacheEnabled = true;
// i18n key for README. cast to any because key union doesn't include this custom key.
const readmeTitle = getI18n('Readme');
const fetchPackageInfo = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const cacheKey = CacheKeys.packageInfo(scope.value, name.value);
    if (cacheEnabled) {
      const cachedData = KvManger.getCache<PackageData>(cacheKey);
      if (cachedData) {
        packageData.value = cachedData;
        if (cachedData.all_versions) {
          allVersions.value = cachedData.all_versions;
          await handleVersionSelection(cachedData.version || '');
        }
        isLoading.value = false;
        return;
      }
    }

    const response = await fetchAPI<PackageData | { data: PackageData }>(
      `/package/${scope.value}/${name.value}/info`,
      {},
      "GET",
      config.packageAPIHost
    );

    if (response.ok && response.status === 200) {
      // The API sometimes nests the payload under `data.data` (consistent with search API),
      // so prefer `response.data.data` when present, otherwise fall back to `response.data`.
      const raw = response.data as any;
      const pkgRaw = raw && (raw.data ?? raw) ? (raw.data ?? raw) : null;

      // Debug raw payload
      console.debug('PackageView: fetched packageInfo', pkgRaw, { scope: scope.value, name: name.value, queryVersion: route.query.version });

      if (pkgRaw) {
        // build readme map: entries like [index, content]
        const readmeMap: Record<number, string> = {};
        if (Array.isArray(pkgRaw.readmeTable)) {
          pkgRaw.readmeTable.forEach((entry: any) => {
            if (Array.isArray(entry) && entry.length >= 2) {
              const idx = Number(entry[0]);
              readmeMap[idx] = String(entry[1] ?? '');
            }
          });
        }

        // normalize versions
        const mappedVersions: PackageVersion[] = Array.isArray(pkgRaw.versions)
          ? pkgRaw.versions.map((v: any) => ({
            version: String(v.name ?? v.version ?? ''),
            description: v.description ?? undefined,
            downloads: v.downloads ?? undefined,
            created_at: v.create_time ?? v.created_at ?? undefined
          }))
          : [];

        const queryVersion = (route.query.version as string) || '';
        const fallbackVersion = pkgRaw.version ?? (mappedVersions.length ? mappedVersions[mappedVersions.length - 1].version : '');
        const initialVersion = queryVersion || String(fallbackVersion || '');

        // normalize packageData
        packageData.value = {
          scope: pkgRaw.scope || (typeof pkgRaw.id === 'string' && pkgRaw.id.includes('/') ? String(pkgRaw.id).split('/')[0].replace(/^@/, '') : (scope.value || '')),
          name: pkgRaw.name || (typeof pkgRaw.id === 'string' ? String(pkgRaw.id).split('/').pop()?.replace(/^@/, '') || name.value : name.value),
          version: initialVersion || '',
          description: pkgRaw.description || '',
          downloads: pkgRaw.download ?? pkgRaw.downloads ?? undefined,
          created_at: pkgRaw.created_at ?? undefined,
          all_versions: mappedVersions
        } as PackageData;

        allVersions.value = mappedVersions;

        // build version -> readme content map
        versionReadmeMap.value = {};
        if (Array.isArray(pkgRaw.versions)) {
          const m = new md()
          pkgRaw.versions.forEach((v: any) => {
            const verName = String(v.name ?? v.version ?? '');
            if (v.readme !== undefined) {
              const idx = Number(v.readme);
              versionReadmeMap.value[verName] = m.render(readmeMap[idx] || '');
            } else {
              versionReadmeMap.value[verName] = '';
            }
          });
        }
        readmeContent.value = versionReadmeMap.value[initialVersion] || '';
        if (cacheEnabled) KvManger.setCache(cacheKey, packageData.value, 5);
      } else {
        packageData.value = null;
        allVersions.value = [];
        readmeContent.value = '';
      }
    } else {
      const respData = (response as any)?.data;
      error.value = typeof respData === 'string' ? respData : 'Package not found';
    }
  } catch (err) {
    error.value = 'Failed to load package information';
    console.error('Package fetch error:', err);
  } finally {
    isLoading.value = false;
  }
};

const handleVersionSelection = async (defaultVersion: string) => {
  const paramsVersion = route.query.version as string;
  const selVer = paramsVersion || defaultVersion;

  if (!selVer) return;

  // update selectedVersion ref
  selectedVersion.value = selVer;

  // merge version-specific info if available
  if (allVersions.value.length > 0) {
    const versionInfo = allVersions.value.find(v => v.version === selVer);
    if (versionInfo && packageData.value) {
      packageData.value = {
        ...packageData.value,
        version: versionInfo.version,
        description: versionInfo.description || packageData.value.description,
        downloads: versionInfo.downloads || packageData.value.downloads,
        created_at: versionInfo.created_at || packageData.value.created_at
      };
    }
  } else if (packageData.value) {
    packageData.value.version = selVer;
  }

  // update readme for selected version
  readmeContent.value = versionReadmeMap.value[selVer] || '';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const copyInstallCommand = async () => {
  if (packageData.value) {
    const command = `mbler install ${packageData.value.scope || ''}/${packageData.value.name || ''}`;
    try {
      await navigator.clipboard.writeText(command);
      // Show toast notification (you might want to add a toast system)
      console.log('Command copied to clipboard');
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  }
};

const selectVersion = (version: PackageVersion) => {
  if (version.version !== packageData.value?.version) {
    router.push(`/package/${scope.value}/${name.value}?version=${version.version}`);
  }
};

const handleVersionChange = () => {
  if (selectedVersion.value && selectedVersion.value !== packageData.value?.version) {
    router.push(`/package/${scope.value}/${name.value}?version=${selectedVersion.value}`);
  }
};
watch([packageData, allVersions], () => {
  if (packageData.value && allVersions.value.length > 0) {
    selectedVersion.value = packageData.value.version;
  }
});


watch([scope, name], () => {
  fetchPackageInfo();
});
console.log(readmeContent, mdContent)
watch(readmeContent, async (n) => {
  if (!n) {
    if (mdContent.value) mdContent.value.innerHTML = '';
    return;
  }
  // ensure DOM updated
  await nextTick();
  if (!mdContent.value) return; // element not mounted yet
  // n is already HTML (rendered by markdown-it)
  mdContent.value.innerHTML = String(n);
});
// watch query version changes to update selected version and README
watch(() => route.query.version, (v) => {
  const ver = (v as string) || '';
  if (ver) handleVersionSelection(ver);
});
onMounted(() => {
  fetchPackageInfo();
});
</script>

<style scoped>
.package-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.package-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
}

.package-title {
  color: var(--text-h);
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

.package-version {
  color: var(--text);
  font-size: 1.1rem;
  opacity: 0.8;
}

.package-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
}

.package-sidebar {
  position: sticky;
  top: 2rem;
  height: fit-content;
}

.package-meta {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.meta-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.label {
  color: var(--text);
  font-weight: 500;
}

.value {
  color: var(--text-h);
  font-weight: 600;
}

.install-section h3 {
  margin-bottom: 1rem;
  color: var(--text-h);
}

.install-command {
  display: flex;
  align-items: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem;
}

.install-command code {
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  color: var(--text);
}

.copy-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  margin-left: 0.5rem;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--accent);
  color: white;
}

.package-main {
  min-height: 400px;
}

.description-section {
  margin-bottom: 2rem;
}

.description-section h2 {
  color: var(--text-h);
  margin-bottom: 1rem;
}

.package-description {
  line-height: 1.6;
  color: var(--text);
  font-size: 1.1rem;
}

.readme-section h2 {
  color: var(--text-h);
  margin-bottom: 1rem;
}

.readme-content pre {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem;
  overflow: auto;
  white-space: pre-wrap;
  color: var(--text);
}

.versions-section h2 {
  color: var(--text-h);
  margin-bottom: 1rem;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.version-item:hover {
  border-color: var(--accent);
  background: rgba(170, 59, 255, 0.05);
}

.version-item.active {
  border-color: var(--accent);
  background: rgba(170, 59, 255, 0.1);
}

/* Ensure only the spinner rotates and parent container not affected */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: none !important;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top: 3px solid var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
  display: inline-block;
  will-change: transform;
}

.install-command code {
  word-break: break-all;
}

.copy-btn {
  min-width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.version-number {
  font-weight: 600;
  color: var(--text-h);
}

.version-date {
  color: var(--text);
  font-size: 0.9rem;
}

.current-tag {
  background: var(--accent);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.loading,
.error {
  text-align: center;
  margin: 4rem 0;
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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.error p {
  color: #e74c3c;
  margin-bottom: 1rem;
}

.back-btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #9933cc;
}

@media (max-width: 768px) {
  .package-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .package-sidebar {
    position: static;
  }

  .package-container {
    padding: 1rem;
  }
}
</style>