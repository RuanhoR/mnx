import {
	BaseResult,
	ListPackageResult,
	MNXPackageInfoResult,
	MNXPackageVersionInfoResult,
	PublishMetadata,
	MNXReadme,
	MNXPackageData,
	Version,
	User,
	MNXScope,
	UserScopeResult,
	SearchResult,
} from '../types';
import { PublishToken } from './token';
import { KVLockManager } from './kv-lock';
import supabase from '../supabase';
import { env } from 'cloudflare:workers';

/**
 * MNX Package Publishing Manager
 * Handles package publishing, unpublishing, package information queries, etc.
 */
export type PublishHook = (user: User, scope: string, name: string) => Promise<void> | void;
export class PublishManager extends PublishToken {
	private static hooks: PublishHook[] = [];

	public static registerHook(hook: PublishHook): void {
		this.hooks.push(hook);
	}

	private static async callHooks(user: User, scope: string, name: string): Promise<void> {
		await Promise.all(this.hooks.map((hook) => hook(user, scope, name)));
	}

	private static normalizeScope(scope: string): string {
		return scope.trim().replace(/^@+/, '').toLowerCase();
	}
	private static normalizeName(name: string): string {
		return name.trim().toLowerCase();
	}
	private static isMatchPackage(pkg: { scope?: string; name?: string }, scope: string, name: string): boolean {
		return (
			this.normalizeScope(pkg.scope || '') === this.normalizeScope(scope) && this.normalizeName(pkg.name || '') === this.normalizeName(name)
		);
	}
	private static async findPackage(scope: string, name: string): Promise<MNXPackageData | null> {
		const normalizedScope = this.normalizeScope(scope);
		const normalizedName = this.normalizeName(name);

		const exact = await supabase.pmnxPackage.select('*').eq('scope', normalizedScope).eq('name', normalizedName).limit(1);
		if (exact.data && exact.data.length > 0) {
			return exact.data[0] as MNXPackageData;
		}

		if (exact.error) {
			console.warn('findPackage exact query error:', exact.error);
		}

		const fuzzy = await supabase.pmnxPackage.select('*').ilike('name', name.trim()).limit(50);
		if (fuzzy.error) {
			console.warn('findPackage fuzzy query error:', fuzzy.error);
			return null;
		}
		const match = (fuzzy.data || []).find((item) => this.isMatchPackage(item as any, normalizedScope, normalizedName));
		return (match as MNXPackageData) || null;
	}
	/**
	 * Get package information
	 */
	static async packageInfo(scope: string, name: string): Promise<MNXPackageInfoResult> {
		try {
			const normalizedScope = this.normalizeScope(scope);
			const normalizedName = name.trim();
			const kvCacheData = await env.BLOG_DATA.get(`mnx-packages:cache:${normalizedScope}/${normalizedName}`);
			if (kvCacheData) {
				return JSON.parse(kvCacheData);
			}
			const packageData = await this.findPackage(scope, name);
			if (!packageData) {
				return {
					id: '',
					readmeTable: [],
					versions: [],
					download: -1,
				};
			}
			const readmeTable: [number, string][] = [];

			// Get README information for all versions
			for (const version of packageData.versions) {
				const readmeResult = await supabase.pmnxReadme.select('content').eq('id', version.readme).limit(1);

				if (readmeResult.data && readmeResult.data.length > 0) {
					readmeTable.push([version.readme, readmeResult.data[0].content]);
				}
			}

			// Get user information for each version and build result
			const versions = await Promise.all(
				packageData.versions.map(async (version) => {
					const userResult = await supabase.users.select('uid, name, mail').eq('uid', version.create_user).limit(1);

					const user =
						userResult.data && userResult.data.length > 0
							? (userResult.data[0] as User)
							: { uid: 0, name: 'Unknown', mail: '', ctime: '', friends: [], friends_request: [], password: '' };

					return {
						download_url: `/package/${normalizedScope}/${normalizedName}/v/${version.name}/download`,
						version_tag: version.version_tag,
						name: version.name,
						create_user: user,
						readme: version.readme,
						create_time: new Date(version.create_time).toISOString(),
					};
				}),
			);
			const returnData = {
				id: `@${normalizedScope}/${normalizedName}`,
				readmeTable,
				versions,
				download: packageData.download,
			};
			await env.BLOG_DATA.put(`mnx-packages:cache:${normalizedScope}/${normalizedName}`, JSON.stringify(returnData));
			return returnData;
		} catch (error) {
			console.error('Package info: error: ', { error });
			return {
				id: '',
				readmeTable: [],
				versions: [],
				download: 0,
			};
		}
	}
	static async searchPackage(keyword: string): Promise<SearchResult> {
		try {
			const normalizedKeyword = keyword.trim().toLowerCase();

			// Search in package names and scopes
			const packagesResult = await supabase.pmnxPackage
				.select('*')
				.or(`name.ilike.%${normalizedKeyword}%,scope.ilike.%${normalizedKeyword}%`)
				.limit(50);

			if (packagesResult.error) {
				console.warn('searchPackage query error:', packagesResult.error);
				return {
					mod: new Date(),
					data: [],
				};
			}

			if (!packagesResult.data || packagesResult.data.length === 0) {
				return {
					mod: new Date(),
					data: [],
				};
			}

			// Transform the result to match SearchResult format
			const searchData = packagesResult.data.map((pkg: any) => ({
				name: pkg.name,
				description: this.buildPackageDescription(pkg),
				version: this.getLatestVersion(pkg.versions),
				scope: pkg.scope,
				download: pkg.download,
			}));

			return {
				mod: new Date(),
				data: searchData,
			};
		} catch (error) {
			console.error('searchPackage error:', error);
			return {
				mod: new Date(),
				data: [],
			};
		}
	}

	private static buildPackageDescription(pkg: any): string {
		return `Package ${pkg.name} in scope ${pkg.scope} with ${pkg.versions?.length || 0} versions`;
	}

	private static getLatestVersion(versions: any[]): string {
		if (!versions || versions.length === 0) {
			return '0.0.0';
		}

		// Sort versions by create_time to get the latest
		const sortedVersions = [...versions].sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime());

		return sortedVersions[0]?.name || '0.0.0';
	}
	/**
	 * Publish package
	 */
	static async publishPackage(
		scope: string,
		name: string,
		version: { tag: string; name: string },
		file: File /*.tar.gz file*/,
	): Promise<BaseResult> {
		try {
			// Check if scope exists
			const scopeResult = await supabase.pmnxScope.select('*').eq('name', scope).limit(1);

			if (!scopeResult.data || scopeResult.data.length === 0) {
				return { code: -1, message: 'Scope does not exist', success: false };
			}

			// Upload file to Supabase Storage
			const filePath = `package/${scope}/${name}/${version.name}`;
			const uploadResult = await supabase.client.storage.from('mnx').upload(filePath, file);
			console.warn('publishPackage upload result', { filePath, uploadResult });
			if (uploadResult.error) {
				return { code: -1, message: `File upload failed: ${uploadResult.error.message}`, success: false };
			}
			if (await env.BLOG_DATA.get(`mnx-packages:cache:${scope}/${name}`)) await env.BLOG_DATA.delete(`mnx-packages:cache:${scope}/${name}`);
			await this.packageInfo(scope, name);
			return { code: 200, message: 'Package published successfully', success: true };
		} catch (error) {
			console.error('Failed to publish package:', error);
			return { code: -1, message: 'Publishing failed', success: false };
		}
	}

	/**
	 * Unpublish package
	 */
	static async unpublishPackage(
		scope: string,
		name: string,
		versionName: string,
		user?: User /**version name not tag */,
	): Promise<BaseResult> {
		try {
			// Find package
			const packageResult = await supabase.pmnxPackage.select('*').eq('scope', scope).eq('name', name).limit(1);

			if (!packageResult.data || packageResult.data.length === 0) {
				return { code: -1, message: 'Package does not exist', success: false };
			}

			const packageData = packageResult.data[0] as MNXPackageData;

			// Find version to delete
			const versionIndex = packageData.versions.findIndex((v) => v.name === versionName);
			if (versionIndex === -1) {
				return { code: -1, message: 'Version does not exist', success: false };
			}

			const versionToDelete = packageData.versions[versionIndex];

			// Decrease README reference count or delete
			await this.handleReadmeUnpublish(versionToDelete.readme);

			// Remove version from package
			const updatedVersions = [...packageData.versions];
			updatedVersions.splice(versionIndex, 1);

			// Update package data
			await supabase.pmnxPackage
				.update({
					versions: updatedVersions,
					update_at: new Date(),
				})
				.eq('id', packageData.id);

			// Delete stored file
			const filePath = `package/${scope}/${name}/${versionName}`;
			await supabase.client.storage.from('mnx').remove([filePath]);

			if (await env.BLOG_DATA.get(`mnx-packages:cache:${scope}/${name}`)) await env.BLOG_DATA.delete(`mnx-packages:cache:${scope}/${name}`);
			await this.packageInfo(scope, name);
			if (user) await this.callHooks(user, scope, name);
			return { code: 200, message: 'Package unpublished successfully', success: true };
		} catch (error) {
			console.error('Failed to unpublish package:', error);
			return { code: -1, message: 'Unpublishing failed', success: false };
		}
	}

	/**
	 * Get package information for a specific version
	 */
	static async packageInfoForAVersion(
		scope: string,
		name: string,
		versionName: string /**version name not tag */,
	): Promise<MNXPackageVersionInfoResult> {
		try {
			const normalizedScope = this.normalizeScope(scope);
			const normalizedName = name.trim();
			const packageData = await this.findPackage(scope, name);
			if (!packageData) {
				return { id: '', versions: {} as any };
			}
			const version = packageData.versions.find((v) => v.name === versionName);

			if (!version) {
				return { id: '', versions: {} as any };
			}

			// Get user information
			const userResult = await supabase.users.select('uid, name, mail').eq('uid', version.create_user).limit(1);

			const user =
				userResult.data && userResult.data.length > 0
					? (userResult.data[0] as User)
					: { uid: 0, name: 'Unknown', mail: '', ctime: '', friends: [], friends_request: [], password: '' };

			// Get README content
			const readmeResult = await supabase.pmnxReadme.select('content').eq('id', version.readme).limit(1);

			const readmeContent = readmeResult.data && readmeResult.data.length > 0 ? readmeResult.data[0].content : '';

			return {
				id: packageData.id.toString(),
				versions: {
					download_url: `/package/${normalizedScope}/${normalizedName}/v/${version.name}/download`,
					version_tag: version.version_tag,
					name: version.name,
					create_user: user,
					readme: readmeContent,
					create_time: version.create_time.toISOString(),
				},
			};
		} catch (error) {
			console.error('Failed to get version info:', error);
			return { id: '', versions: {} as any };
		}
	}

	/**
	 * General publish method (with User authentication)
	 */
	static async publish(user: User, metadata: PublishMetadata, file: File): Promise<BaseResult> {
		if (!user) {
			return { code: -1, message: 'Invalid user', success: false };
		}
		const validationResult = await this.validateZipFile(file);
		if (!validationResult.success) {
			return validationResult;
		}
		return await KVLockManager.executeWithLock(metadata.scope, metadata.name, async () => {
			try {
				const readmeId = await this.handleReadmePublish(metadata.readme);
				const scopeResult = await supabase.pmnxScope.select('*').eq('name', metadata.scope).limit(1);
				if (!scopeResult.data || scopeResult.data.length === 0) {
					return { code: -1, message: 'Scope does not exist', success: false };
				}

				const scopeData = scopeResult.data[0] as MNXScope;
				if (scopeData.user !== user.uid) {
					return { code: -1, message: 'No publish permission for this scope', success: false };
				}

				// Upload file
				const uploadResult = await this.publishPackage(
					metadata.scope,
					metadata.name,
					{
						tag: metadata.version_tag,
						name: metadata.version,
					},
					file,
				);

				if (!uploadResult.success) {
					return uploadResult;
				}
				const newVersion: Version = {
					name: metadata.version,
					create_user: user.uid,
					readme: readmeId,
					version_tag: metadata.version_tag,
					create_time: new Date(),
				};
				await this.updatePackageWithVersion(metadata.scope, metadata.name, newVersion);
				await this.callHooks(user, metadata.scope, metadata.name);
				return { code: 200, message: 'Package published successfully', success: true };
			} catch (error) {
				console.error('Publishing failed:', error);
				if (error instanceof Error && error.message.includes('is currently being published')) {
					return { code: -1, message: error.message, success: false };
				}
				return { code: -1, message: 'Publishing failed', success: false };
			}
		});
	}
	private static async validateZipFile(file: File): Promise<BaseResult> {
		if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
			return { code: -1, message: 'Only zip files are supported', success: false };
		}

		const MAX_SIZE = 40 * 1024 * 1024;
		if (file.size > MAX_SIZE) {
			return { code: -1, message: 'File size exceeds 40MB limit', success: false };
		}
		if (file.size === 0) {
			return { code: -1, message: 'File is empty', success: false };
		}
		try {
			const arrayBuffer = await file.slice(0, 4).arrayBuffer();
			const header = new Uint8Array(arrayBuffer);
			if (header.length >= 4 && header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04) {
				return { code: 200, message: 'File validation successful', success: true };
			} else {
				return { code: -1, message: 'Invalid zip file format', success: false };
			}
		} catch (error) {
			console.error('File validation failed:', error);
			return { code: -1, message: 'Failed to validate file', success: false };
		}
	}
	static async listPackages(user: User): Promise<ListPackageResult> {
		try {
			if (!user) {
				return { code: -1, message: 'Invalid user', success: false, data: [] };
			}
			const scopeResult = await supabase.pmnxScope.select('name').eq('user', user.uid);

			if (!scopeResult.data || scopeResult.data.length === 0) {
				return { code: 200, message: 'No packages found', success: true, data: [] };
			}

			const userScopes = scopeResult.data.map((scope) => scope.name);
			const packagesResult = await supabase.pmnxPackage.select('id, scope, name, download').in('scope', userScopes);
			if (!packagesResult.data || packagesResult.data.length === 0) {
				return { code: 200, message: 'No packages found', success: true, data: [] };
			}
			const packagesData = packagesResult.data.map((pkg) => ({
				downloaded: pkg.download,
				id: `@${pkg.scope}/${pkg.name}`,
			}));

			return { code: 200, message: 'Packages retrieved successfully', success: true, data: packagesData };
		} catch (error) {
			console.error('Failed to list packages:', error);
			return { code: -1, message: 'Failed to list packages', success: false, data: [] };
		}
	}
	static async getUserScope(user: User): Promise<UserScopeResult> {
		if (!user) {
			return { code: -1, message: 'Invalid token', success: false, data: { scope: '' } };
		}

		try {
			// Get all scopes owned by the user
			const scopeResult = await supabase.pmnxScope.select('name').eq('user', user.uid);

			if (!scopeResult.data) {
				return { code: 200, message: 'Success', success: true, data: { scope: '' } };
			}

			const scopes = scopeResult.data.map((s) => s.name).join(',');
			return { code: 200, message: 'Success', success: true, data: { scope: scopes } };
		} catch (error) {
			console.error('Failed to list packages:', error);
			return { code: -1, message: 'Failed to list packages', success: false, data: { scope: '' } };
		}
	}

	/**
	 * Handle README publishing (check for duplicate content, manage reference count)
	 */
	private static async handleReadmePublish(readmeContent: string): Promise<number> {
		// Check if README with same content already exists
		const existingReadme = await supabase.pmnxReadme.select('id, cout').eq('content', readmeContent).limit(1);

		if (existingReadme.data && existingReadme.data.length > 0) {
			// Same content exists, increase reference count
			const readme = existingReadme.data[0];
			await supabase.pmnxReadme.update({ cout: readme.cout + 1 }).eq('id', readme.id);
			return readme.id;
		} else {
			// Create new README record
			const newReadme = await supabase.pmnxReadme.insert({ content: readmeContent, cout: 1 }).select('id');

			if (newReadme.data && newReadme.data.length > 0) {
				return newReadme.data[0].id;
			}
			throw new Error('Failed to create README record');
		}
	}

	/**
	 * Handle README unpublishing (decrease reference count, delete if necessary)
	 */
	private static async handleReadmeUnpublish(readmeId: number): Promise<void> {
		const readmeResult = await supabase.pmnxReadme.select('cout').eq('id', readmeId).limit(1);

		if (readmeResult.data && readmeResult.data.length > 0) {
			const currentCount = readmeResult.data[0].cout;
			if (currentCount <= 1) {
				// Reference count is 1 or less, delete record
				await supabase.pmnxReadme.delete().eq('id', readmeId);
			} else {
				// Decrease reference count
				await supabase.pmnxReadme.update({ cout: currentCount - 1 }).eq('id', readmeId);
			}
		}
	}

	/**
	 * Update package with new version information
	 */
	private static async updatePackageWithVersion(scope: string, name: string, newVersion: Version): Promise<void> {
		const packageResult = await supabase.pmnxPackage.select('*').eq('scope', scope).eq('name', name).limit(1);

		if (packageResult.data && packageResult.data.length > 0) {
			// Package exists, update version list
			const packageData = packageResult.data[0] as MNXPackageData;
			const updatedVersions = [...packageData.versions, newVersion];

			await supabase.pmnxPackage
				.update({
					versions: updatedVersions,
					update_at: new Date(),
				})
				.eq('id', packageData.id);
		} else {
			// Create new package
			await supabase.pmnxPackage.insert({
				name,
				scope,
				versions: [newVersion],
				create_user: newVersion.create_user,
				download: 0,
				point: '', // Empty for now
				created_at: new Date(),
				update_at: new Date(),
			});
		}
	}
	/**
	 * Download package version and update download counter
	 */
	static async downloadVersion(scope: string, name: string, version: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
		try {
			const normalizedScope = this.normalizeScope(scope);
			const normalizedName = name.trim();
			const packageData = await this.findPackage(scope, name);
			if (!packageData) {
				return { success: false, error: 'Package not found' };
			}

			// Verify version exists
			const versionExists = packageData.versions.some((v) => v.name === version);
			if (!versionExists) {
				return { success: false, error: 'Version not found' };
			}

			// Get file from Supabase Storage
			const filePath = `package/${normalizedScope}/${normalizedName}/${version}`;
			const downloadResult = await supabase.client.storage.from('mnx').download(filePath);

			if (downloadResult.error || !downloadResult.data) {
				return { success: false, error: downloadResult.error?.message || 'File not found' };
			}

			// Update download counter
			await supabase.pmnxPackage
				.update({
					download: packageData.download + 1,
					update_at: new Date(),
				})
				.eq('id', packageData.id);

			// Clear cache to ensure fresh data on next request
			if (await env.BLOG_DATA.get(`mnx-packages:cache:${normalizedScope}/${normalizedName}`)) {
				await env.BLOG_DATA.delete(`mnx-packages:cache:${normalizedScope}/${normalizedName}`);
			}

			return { success: true, data: downloadResult.data };
		} catch (error) {
			console.error('Download failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown download error',
			};
		}
	}

	/**
	 * Get download statistics for a package
	 */
	static async getDownloadStats(scope: string, name: string): Promise<{ success: boolean; downloads?: number; error?: string }> {
		try {
			const packageResult = await supabase.pmnxPackage.select('download').eq('scope', scope).eq('name', name).limit(1);

			if (!packageResult.data || packageResult.data.length === 0) {
				return { success: false, error: 'Package not found' };
			}

			const packageData = packageResult.data[0] as MNXPackageData;
			return { success: true, downloads: packageData.download };
		} catch (error) {
			console.error('Failed to get download stats:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}
