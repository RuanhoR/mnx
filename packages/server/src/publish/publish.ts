import { BaseResult, ListPackageResult, MNXPackageInfoResult, MNXPackageVersionInfoResult, PublishMetadata, MNXReadme, MNXPackageData, Version, User, MNXScope } from "../types";
import { PublishToken } from "./token";
import { KVLockManager } from "./kv-lock";
import supabase from "../supabase";

/**
 * MNX Package Publishing Manager
 * Handles package publishing, unpublishing, package information queries, etc.
 */
export class PublishManager extends PublishToken {
  /**
   * Get package information
   */
  static async packageInfo(scope: string, name: string): Promise<MNXPackageInfoResult> {
    try {
      // Find package with specified scope and name
      const packageResult = await supabase.pmnxPackage
        .select("*")
        .eq("scope", scope)
        .eq("name", name)
        .limit(1);

      if (!packageResult.data || packageResult.data.length === 0) {
        return {
          id: "",
          readmeTable: [],
          versions: []
        };
      }

      const packageData = packageResult.data[0] as MNXPackageData;
      const readmeTable: [number, string][] = [];

      // Get README information for all versions
      for (const version of packageData.versions) {
        const readmeResult = await supabase.pmnxReadme
          .select("content")
          .eq("id", version.readme)
          .limit(1);

        if (readmeResult.data && readmeResult.data.length > 0) {
          readmeTable.push([version.readme, readmeResult.data[0].content]);
        }
      }

      // Get user information for each version and build result
      const versions = await Promise.all(packageData.versions.map(async (version) => {
        const userResult = await supabase.users
          .select("uid, name, mail")
          .eq("uid", version.create_user)
          .limit(1);

        const user = userResult.data && userResult.data.length > 0
          ? userResult.data[0] as User
          : { uid: 0, name: "Unknown", mail: "", ctime: "", friends: [], friends_request: [], password: "" };

        return {
          download_url: `/package/${scope}/${name}/v/${version.name}/download`,
          version_tag: version.version_tag,
          name: version.name,
          create_user: user,
          readme: version.readme,
          create_time: version.create_time.toISOString()
        };
      }));

      return {
        id: packageData.id.toString(),
        readmeTable,
        versions
      };
    } catch (error) {
      return {
        id: "",
        readmeTable: [],
        versions: []
      };
    }
  }

  /**
   * Publish package
   */
  static async publishPackage(scope: string, name: string, version: { tag: string, name: string }, file: File /*.tar.gz file*/): Promise<BaseResult> {
    try {
      // Check if scope exists
      const scopeResult = await supabase.pmnxScope
        .select("*")
        .eq("name", scope)
        .limit(1);

      if (!scopeResult.data || scopeResult.data.length === 0) {
        return { code: -1, message: "Scope does not exist", success: false };
      }

      // Upload file to Supabase Storage
      const filePath = `package/${scope}/${name}/${version.name}`;
      const uploadResult = await supabase.client.storage
        .from("mnx")
        .upload(filePath, file);

      if (uploadResult.error) {
        return { code: -1, message: `File upload failed: ${uploadResult.error.message}`, success: false };
      }

      return { code: 200, message: "Package published successfully", success: true };
    } catch (error) {
      console.error("Failed to publish package:", error);
      return { code: -1, message: "Publishing failed", success: false };
    }
  }

  /**
   * Unpublish package
   */
  static async unpublishPackage(scope: string, name: string, versionName: string /**version name not tag */): Promise<BaseResult> {
    try {
      // Find package
      const packageResult = await supabase.pmnxPackage
        .select("*")
        .eq("scope", scope)
        .eq("name", name)
        .limit(1);

      if (!packageResult.data || packageResult.data.length === 0) {
        return { code: -1, message: "Package does not exist", success: false };
      }

      const packageData = packageResult.data[0] as MNXPackageData;

      // Find version to delete
      const versionIndex = packageData.versions.findIndex(v => v.name === versionName);
      if (versionIndex === -1) {
        return { code: -1, message: "Version does not exist", success: false };
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
          update_at: new Date()
        })
        .eq("id", packageData.id);

      // Delete stored file
      const filePath = `package/${scope}/${name}/${versionName}`;
      await supabase.client.storage
        .from("mnx")
        .remove([filePath]);

      return { code: 200, message: "Package unpublished successfully", success: true };
    } catch (error) {
      console.error("Failed to unpublish package:", error);
      return { code: -1, message: "Unpublishing failed", success: false };
    }
  }

  /**
   * Get package information for a specific version
   */
  static async packageInfoForAVersion(scope: string, name: string, versionName: string /**version name not tag */): Promise<MNXPackageVersionInfoResult> {
    try {
      const packageResult = await supabase.pmnxPackage
        .select("*")
        .eq("scope", scope)
        .eq("name", name)
        .limit(1);

      if (!packageResult.data || packageResult.data.length === 0) {
        return { id: "", versions: {} as any };
      }

      const packageData = packageResult.data[0] as MNXPackageData;
      const version = packageData.versions.find(v => v.name === versionName);

      if (!version) {
        return { id: "", versions: {} as any };
      }

      // Get user information
      const userResult = await supabase.users
        .select("uid, name, mail")
        .eq("uid", version.create_user)
        .limit(1);

      const user = userResult.data && userResult.data.length > 0
        ? userResult.data[0] as User
        : { uid: 0, name: "Unknown", mail: "", ctime: "", friends: [], friends_request: [], password: "" };

      // Get README content
      const readmeResult = await supabase.pmnxReadme
        .select("content")
        .eq("id", version.readme)
        .limit(1);

      const readmeContent = readmeResult.data && readmeResult.data.length > 0 ? readmeResult.data[0].content : "";

      return {
        id: packageData.id.toString(),
        versions: {
          download_url: `/package/${scope}/${name}/v/${version.name}/download`,
          version_tag: version.version_tag,
          name: version.name,
          create_user: user,
          readme: readmeContent,
          create_time: version.create_time.toISOString()
        }
      };
    } catch (error) {
      console.error("Failed to get version info:", error);
      return { id: "", versions: {} as any };
    }
  }

  /**
   * General publish method (with User authentication)
   */
  static async publish(user: User, metadata: PublishMetadata, file: File): Promise<BaseResult> {
    if (!user) {
      return { code: -1, message: "Invalid user", success: false };
    }

    // 验证zip文件
    const validationResult = await this.validateZipFile(file);
    if (!validationResult.success) {
      return validationResult;
    }

    // 使用KV锁机制防止并发发布
    return await KVLockManager.executeWithLock(metadata.scope, metadata.name, async () => {
      try {
        const readmeId = await this.handleReadmePublish(metadata.readme);
        const scopeResult = await supabase.pmnxScope
          .select("*")
          .eq("name", metadata.scope)
          .limit(1);
        if (!scopeResult.data || scopeResult.data.length === 0) {
          return { code: -1, message: "Scope does not exist", success: false };
        }

        const scopeData = scopeResult.data[0] as MNXScope;
        if (scopeData.user !== user.uid) {
          return { code: -1, message: "No publish permission for this scope", success: false };
        }

        // Upload file
        const uploadResult = await this.publishPackage(metadata.scope, metadata.name, {
          tag: metadata.version_tag,
          name: metadata.version
        }, file);

        if (!uploadResult.success) {
          return uploadResult;
        }
        const newVersion: Version = {
          name: metadata.version,
          create_user: user.uid,
          readme: readmeId,
          version_tag: metadata.version_tag,
          create_time: new Date()
        };

        await this.updatePackageWithVersion(metadata.scope, metadata.name, newVersion);

        return { code: 200, message: "Package published successfully", success: true };
      } catch (error) {
        console.error("Publishing failed:", error);
        // 如果是锁相关的错误，返回特定错误消息
        if (error instanceof Error && error.message.includes("is currently being published")) {
          return { code: -1, message: error.message, success: false };
        }
        return { code: -1, message: "Publishing failed", success: false };
      }
    });
  }

  /**
   * 验证zip文件是否有效
   */
  private static async validateZipFile(file: File): Promise<BaseResult> {
    // 检查文件类型
    if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
      return { code: -1, message: "Only zip files are supported", success: false };
    }

    // 检查文件大小 (<40MB)
    const MAX_SIZE = 40 * 1024 * 1024; // 40MB
    if (file.size > MAX_SIZE) {
      return { code: -1, message: "File size exceeds 40MB limit", success: false };
    }

    if (file.size === 0) {
      return { code: -1, message: "File is empty", success: false };
    }

    // 简化的格式验证：检查文件头是否是zip格式
    try {
      const arrayBuffer = await file.slice(0, 4).arrayBuffer();
      const header = new Uint8Array(arrayBuffer);

      // ZIP文件头通常是 PK\x03\x04 (50 4B 03 04)
      if (header.length >= 4 && header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) {
        return { code: 200, message: "File validation successful", success: true };
      } else {
        return { code: -1, message: "Invalid zip file format", success: false };
      }
    } catch (error) {
      console.error("File validation failed:", error);
      return { code: -1, message: "Failed to validate file", success: false };
    }
  }

  /**
   * List user's packages
   */
  static async listPackage(user: User): Promise<ListPackageResult> {
    if (!user) {
      return { code: -1, message: "Invalid token", success: false, data: { scope: "" } };
    }

    try {
      // Get all scopes owned by the user
      const scopeResult = await supabase.pmnxScope
        .select("name")
        .eq("user", user.uid);

      if (!scopeResult.data) {
        return { code: 200, message: "Success", success: true, data: { scope: "" } };
      }

      const scopes = scopeResult.data.map(s => s.name).join(",");
      return { code: 200, message: "Success", success: true, data: { scope: scopes } };
    } catch (error) {
      console.error("Failed to list packages:", error);
      return { code: -1, message: "Failed to list packages", success: false, data: { scope: "" } };
    }
  }

  /**
   * Handle README publishing (check for duplicate content, manage reference count)
   */
  private static async handleReadmePublish(readmeContent: string): Promise<number> {
    // Check if README with same content already exists
    const existingReadme = await supabase.pmnxReadme
      .select("id, cout")
      .eq("content", readmeContent)
      .limit(1);

    if (existingReadme.data && existingReadme.data.length > 0) {
      // Same content exists, increase reference count
      const readme = existingReadme.data[0];
      await supabase.pmnxReadme
        .update({ cout: readme.cout + 1 })
        .eq("id", readme.id);
      return readme.id;
    } else {
      // Create new README record
      const newReadme = await supabase.pmnxReadme
        .insert({ content: readmeContent, cout: 1 })
        .select("id");

      if (newReadme.data && newReadme.data.length > 0) {
        return newReadme.data[0].id;
      }
      throw new Error("Failed to create README record");
    }
  }

  /**
   * Handle README unpublishing (decrease reference count, delete if necessary)
   */
  private static async handleReadmeUnpublish(readmeId: number): Promise<void> {
    const readmeResult = await supabase.pmnxReadme
      .select("cout")
      .eq("id", readmeId)
      .limit(1);

    if (readmeResult.data && readmeResult.data.length > 0) {
      const currentCount = readmeResult.data[0].cout;
      if (currentCount <= 1) {
        // Reference count is 1 or less, delete record
        await supabase.pmnxReadme.delete().eq("id", readmeId);
      } else {
        // Decrease reference count
        await supabase.pmnxReadme
          .update({ cout: currentCount - 1 })
          .eq("id", readmeId);
      }
    }
  }

  /**
   * Update package with new version information
   */
  private static async updatePackageWithVersion(scope: string, name: string, newVersion: Version): Promise<void> {
    const packageResult = await supabase.pmnxPackage
      .select("*")
      .eq("scope", scope)
      .eq("name", name)
      .limit(1);

    if (packageResult.data && packageResult.data.length > 0) {
      // Package exists, update version list
      const packageData = packageResult.data[0] as MNXPackageData;
      const updatedVersions = [...packageData.versions, newVersion];

      await supabase.pmnxPackage
        .update({
          versions: updatedVersions,
          update_at: new Date()
        })
        .eq("id", packageData.id);
    } else {
      // Create new package
      await supabase.pmnxPackage.insert({
        name,
        scope,
        versions: [newVersion],
        create_user: newVersion.create_user,
        download: 0,
        point: "", // Empty for now
        created_at: new Date(),
        update_at: new Date()
      });
    }
  }
}