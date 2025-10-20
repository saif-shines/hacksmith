import { log } from "@clack/prompts";
import { preferences } from "./preferences-storage.js";
import { ProjectStorage } from "./project-storage.js";
import { ProjectDetector } from "./project-detector.js";
import { storage } from "./storage.js";

export class Migration {
  /**
   * Migrate existing global tech stack to current project
   */
  static async migrateGlobalTechStackToProject(): Promise<boolean> {
    // Check if we're in a project
    const projectInfo = ProjectDetector.detectProject();
    if (!projectInfo) {
      log.warn("Not in a project directory - cannot migrate tech stack");
      return false;
    }

    // Check if there's existing global tech stack
    const globalTechStack = preferences.getTechStack();
    if (!globalTechStack) {
      // No global tech stack to migrate
      return false;
    }

    // Check if project already has tech stack
    const projectStorage = new ProjectStorage();
    const projectTechStack = projectStorage.getTechStack();
    if (projectTechStack) {
      // Project already has tech stack, don't overwrite
      return false;
    }

    // Check if the global tech stack was scanned from the current project
    if (globalTechStack.projectPath === projectInfo.root) {
      log.info("Migrating tech stack data from global to project storage...");

      // Save to project storage
      projectStorage.saveTechStack(globalTechStack);

      // Clear from global preferences
      preferences.clearTechStack();

      log.success("Tech stack data migrated to project storage");
      return true;
    }

    return false;
  }

  /**
   * Migrate existing contextifact data to current project
   */
  static async migrateGlobalContextifactToProject(): Promise<boolean> {
    // Check if we're in a project
    const projectInfo = ProjectDetector.detectProject();
    if (!projectInfo) {
      return false;
    }

    // Check if project already has data
    const projectStorage = new ProjectStorage();
    const projectData = projectStorage.getBlueprintData();
    if (projectData) {
      // Project already has data, don't overwrite
      return false;
    }

    // Get all stored blueprints from global storage
    const blueprintIds = storage.listBlueprints();
    if (blueprintIds.length === 0) {
      return false;
    }

    // For now, migrate the most recently saved blueprint
    // In a more sophisticated migration, we might prompt the user to choose
    let mostRecentData: { schema_version: string; variables: Record<string, unknown> } | null =
      null;
    let mostRecentTime = 0;
    let mostRecentId = "";

    for (const blueprintId of blueprintIds) {
      const data = storage.getBlueprintData(blueprintId);
      if (data) {
        const savedTime = new Date(data.saved_at).getTime();
        if (savedTime > mostRecentTime) {
          mostRecentTime = savedTime;
          mostRecentData = data;
          mostRecentId = blueprintId;
        }
      }
    }

    if (mostRecentData) {
      log.info("Migrating blueprint data from global to project storage...");

      // Save to project storage
      projectStorage.saveBlueprint(
        mostRecentId,
        mostRecentData.schema_version,
        mostRecentData.variables
      );

      // Remove from global storage
      storage.deleteBlueprint(mostRecentId);

      log.success("Blueprint data migrated to project storage");
      return true;
    }

    return false;
  }

  /**
   * Check if migration is needed and offer to perform it
   */
  static async checkAndOfferMigration(): Promise<void> {
    // Check if we're in a project
    const projectInfo = ProjectDetector.detectProject();
    if (!projectInfo) {
      return; // Not in a project, no migration needed
    }

    let migrationPerformed = false;

    // Try to migrate tech stack
    if (await this.migrateGlobalTechStackToProject()) {
      migrationPerformed = true;
    }

    // Try to migrate contextifact
    if (await this.migrateGlobalContextifactToProject()) {
      migrationPerformed = true;
    }

    if (migrationPerformed) {
      log.info("Migration complete! Your data is now stored with your project.");
    }
  }

  /**
   * Clean up old global storage if all data has been migrated
   */
  static async cleanupOldStorage(): Promise<void> {
    // Check if global tech stack is empty
    const globalTechStack = preferences.getTechStack();

    // Check if global contextifact storage is empty
    const blueprintIds = storage.listBlueprints();

    if (!globalTechStack && blueprintIds.length === 0) {
      // All data has been migrated, we could clean up old files
      // For safety, we'll just log this for now
      log.info("All data has been migrated to project-specific storage");
    }
  }

  /**
   * Get migration status for current project
   */
  static getMigrationStatus(): {
    hasGlobalTechStack: boolean;
    hasGlobalBlueprints: boolean;
    hasProjectTechStack: boolean;
    hasProjectBlueprints: boolean;
    canMigrate: boolean;
  } {
    const projectInfo = ProjectDetector.detectProject();
    const projectStorage = new ProjectStorage();

    const hasGlobalTechStack = !!preferences.getTechStack();
    const hasGlobalBlueprints = storage.listBlueprints().length > 0;
    const hasProjectTechStack = !!projectStorage.getTechStack();
    const hasProjectBlueprints = !!projectStorage.getBlueprintData();

    const canMigrate = !!projectInfo && (hasGlobalTechStack || hasGlobalBlueprints);

    return {
      hasGlobalTechStack,
      hasGlobalBlueprints,
      hasProjectTechStack,
      hasProjectBlueprints,
      canMigrate,
    };
  }
}
