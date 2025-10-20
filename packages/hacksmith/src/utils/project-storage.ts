import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { TechStack } from "./tech-stack-detector.js";
import { ProjectDetector, type ProjectInfo } from "./project-detector.js";

export interface ProjectStorageData {
  schema_version: string;
  saved_at: string;
  variables: Record<string, unknown>;
}

export interface SessionState {
  blueprint_id?: string;
  blueprint_name?: string;
  current_flow?: string;
  current_step?: number;
  started_at: string;
  last_updated: string;
  completed: boolean;
}

export interface ProjectRegistry {
  projects: Record<string, ProjectRegistryEntry>;
  lru_order: string[];
  max_projects: number;
}

export interface ProjectRegistryEntry {
  original_path: string;
  last_accessed: string;
  blueprint_count: number;
  display_name: string;
  git_remote?: string;
}

export class ProjectStorage {
  private static readonly SYSTEM_DIR = join(homedir(), ".hacksmith");
  private static readonly PROJECTS_BACKUP_DIR = join(ProjectStorage.SYSTEM_DIR, "projects");
  private static readonly REGISTRY_FILE = join(ProjectStorage.SYSTEM_DIR, "project-registry.json");
  private static readonly MAX_BACKUP_PROJECTS = 10;

  private projectInfo: ProjectInfo | null = null;

  constructor(projectPath?: string) {
    this.projectInfo = ProjectDetector.detectProject(projectPath);
    this.ensureSystemDirectories();
  }

  /**
   * Ensure system-level directories exist
   */
  private ensureSystemDirectories(): void {
    if (!existsSync(ProjectStorage.SYSTEM_DIR)) {
      mkdirSync(ProjectStorage.SYSTEM_DIR, { recursive: true });
    }
    if (!existsSync(ProjectStorage.PROJECTS_BACKUP_DIR)) {
      mkdirSync(ProjectStorage.PROJECTS_BACKUP_DIR, { recursive: true });
    }
  }

  /**
   * Ensure project-local .hacksmith directory exists
   */
  private ensureProjectDirectory(): string | null {
    if (!this.projectInfo) return null;

    const projectHacksmithDir = join(this.projectInfo.root, ".hacksmith");
    if (!existsSync(projectHacksmithDir)) {
      mkdirSync(projectHacksmithDir, { recursive: true });
    }
    return projectHacksmithDir;
  }

  /**
   * Get project-local file path
   */
  private getProjectFilePath(filename: string): string | null {
    const projectDir = this.ensureProjectDirectory();
    if (!projectDir) return null;
    return join(projectDir, filename);
  }

  /**
   * Get system backup file path
   */
  private getBackupFilePath(filename: string): string | null {
    if (!this.projectInfo) return null;
    const backupDir = join(ProjectStorage.PROJECTS_BACKUP_DIR, this.projectInfo.hash);
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    return join(backupDir, filename);
  }

  /**
   * Read JSON file with fallback to backup
   */
  private readJsonFile<T>(filename: string, defaultValue: T): T {
    // Try project-local first
    const projectPath = this.getProjectFilePath(filename);
    if (projectPath && existsSync(projectPath)) {
      try {
        return JSON.parse(readFileSync(projectPath, "utf-8"));
      } catch {
        // Fall through to backup
      }
    }

    // Try system backup
    const backupPath = this.getBackupFilePath(filename);
    if (backupPath && existsSync(backupPath)) {
      try {
        const data = JSON.parse(readFileSync(backupPath, "utf-8"));
        // Restore to project-local if it was missing
        if (projectPath) {
          this.writeJsonFile(filename, data, false); // Don't backup during restore
        }
        return data;
      } catch {
        // Return default if backup is corrupted
      }
    }

    return defaultValue;
  }

  /**
   * Write JSON file to project-local and optionally backup
   */
  private writeJsonFile<T>(filename: string, data: T, backup: boolean = true): void {
    // Write to project-local
    const projectPath = this.getProjectFilePath(filename);
    if (projectPath) {
      writeFileSync(projectPath, JSON.stringify(data, null, 2), "utf-8");
    }

    // Write to backup if requested
    if (backup) {
      const backupPath = this.getBackupFilePath(filename);
      if (backupPath) {
        writeFileSync(backupPath, JSON.stringify(data, null, 2), "utf-8");
        this.updateProjectRegistry();
      }
    }
  }

  /**
   * Save blueprint variables
   */
  saveBlueprint(
    blueprintId: string,
    schemaVersion: string,
    variables: Record<string, unknown>
  ): void {
    const data: ProjectStorageData = {
      schema_version: schemaVersion,
      saved_at: new Date().toISOString(),
      variables,
    };
    this.writeJsonFile("contextifact.json", data);
  }

  /**
   * Get blueprint variables
   */
  getBlueprintData(): ProjectStorageData | null {
    const data = this.readJsonFile<ProjectStorageData | null>("contextifact.json", null);
    return data;
  }

  /**
   * Save tech stack
   */
  saveTechStack(techStack: TechStack): void {
    this.writeJsonFile("tech-stack.json", techStack);
  }

  /**
   * Get tech stack
   */
  getTechStack(): TechStack | null {
    return this.readJsonFile<TechStack | null>("tech-stack.json", null);
  }

  /**
   * Save session state
   */
  saveSessionState(state: SessionState): void {
    this.writeJsonFile("session-state.json", state, false); // Don't backup session state
  }

  /**
   * Get session state
   */
  getSessionState(): SessionState | null {
    // Session state is only stored locally, no backup fallback
    const projectPath = this.getProjectFilePath("session-state.json");
    if (!projectPath || !existsSync(projectPath)) return null;

    try {
      return JSON.parse(readFileSync(projectPath, "utf-8"));
    } catch {
      return null;
    }
  }

  /**
   * Clear session state
   */
  clearSessionState(): void {
    const projectPath = this.getProjectFilePath("session-state.json");
    if (projectPath && existsSync(projectPath)) {
      rmSync(projectPath);
    }
  }

  /**
   * Trigger backup after blueprint completion
   */
  backupAfterCompletion(): void {
    if (!this.projectInfo) return;

    // Backup contextifact and tech stack
    const contextifact = this.getBlueprintData();
    if (contextifact) {
      const backupPath = this.getBackupFilePath("contextifact.json");
      if (backupPath) {
        writeFileSync(backupPath, JSON.stringify(contextifact, null, 2), "utf-8");
      }
    }

    const techStack = this.getTechStack();
    if (techStack) {
      const backupPath = this.getBackupFilePath("tech-stack.json");
      if (backupPath) {
        writeFileSync(backupPath, JSON.stringify(techStack, null, 2), "utf-8");
      }
    }

    this.updateProjectRegistry();
    this.cleanupOldBackups();
  }

  /**
   * Update project registry with LRU order
   */
  private updateProjectRegistry(): void {
    if (!this.projectInfo) return;

    const registry = this.getProjectRegistry();
    const projectHash = this.projectInfo.hash;

    // Update or create registry entry
    registry.projects[projectHash] = {
      original_path: this.projectInfo.root,
      last_accessed: new Date().toISOString(),
      blueprint_count: (registry.projects[projectHash]?.blueprint_count || 0) + 1,
      display_name: this.projectInfo.name,
      git_remote: this.projectInfo.gitRemote,
    };

    // Update LRU order
    const existingIndex = registry.lru_order.indexOf(projectHash);
    if (existingIndex > -1) {
      registry.lru_order.splice(existingIndex, 1);
    }
    registry.lru_order.unshift(projectHash); // Add to front

    this.saveProjectRegistry(registry);
  }

  /**
   * Get project registry
   */
  private getProjectRegistry(): ProjectRegistry {
    if (!existsSync(ProjectStorage.REGISTRY_FILE)) {
      return {
        projects: {},
        lru_order: [],
        max_projects: ProjectStorage.MAX_BACKUP_PROJECTS,
      };
    }

    try {
      return JSON.parse(readFileSync(ProjectStorage.REGISTRY_FILE, "utf-8"));
    } catch {
      return {
        projects: {},
        lru_order: [],
        max_projects: ProjectStorage.MAX_BACKUP_PROJECTS,
      };
    }
  }

  /**
   * Save project registry
   */
  private saveProjectRegistry(registry: ProjectRegistry): void {
    writeFileSync(ProjectStorage.REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
  }

  /**
   * Clean up old project backups based on LRU
   */
  private cleanupOldBackups(): void {
    const registry = this.getProjectRegistry();

    // Remove projects beyond the limit
    while (registry.lru_order.length > ProjectStorage.MAX_BACKUP_PROJECTS) {
      const oldestHash = registry.lru_order.pop();
      if (oldestHash) {
        // Remove from projects map
        delete registry.projects[oldestHash];

        // Remove backup directory
        const backupDir = join(ProjectStorage.PROJECTS_BACKUP_DIR, oldestHash);
        if (existsSync(backupDir)) {
          rmSync(backupDir, { recursive: true, force: true });
        }
      }
    }

    this.saveProjectRegistry(registry);
  }

  /**
   * Get current project info
   */
  getProjectInfo(): ProjectInfo | null {
    return this.projectInfo;
  }

  /**
   * List available project backups
   */
  static listBackups(): ProjectRegistryEntry[] {
    const registryPath = ProjectStorage.REGISTRY_FILE;
    if (!existsSync(registryPath)) return [];

    try {
      const registry: ProjectRegistry = JSON.parse(readFileSync(registryPath, "utf-8"));
      return registry.lru_order.map((hash) => registry.projects[hash]).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Check if project is in current working directory
   */
  static isInProject(): boolean {
    return ProjectDetector.isInProject();
  }
}
