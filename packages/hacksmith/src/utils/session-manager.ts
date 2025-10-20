import { confirm, log } from "@clack/prompts";
import type { BlueprintConfig, Flow } from "@/types/blueprint.js";
import { ProjectStorage, type SessionState } from "./project-storage.js";
import { isCancelled, isNotCancelled } from "./type-guards.js";

export interface SessionResumeResult {
  shouldResume: boolean;
  sessionState?: SessionState;
  cancelled?: boolean;
}

export class SessionManager {
  private storage: ProjectStorage;

  constructor(projectPath?: string) {
    this.storage = new ProjectStorage(projectPath);
  }

  /**
   * Check for existing session and prompt user for resume/restart
   */
  async checkForExistingSession(
    blueprint: BlueprintConfig,
    targetFlow?: string
  ): Promise<SessionResumeResult> {
    const existingSession = this.storage.getSessionState();

    if (!existingSession || existingSession.completed) {
      // No existing session or it was completed
      return { shouldResume: false };
    }

    // Check if session is for the same blueprint
    const blueprintId = this.getBlueprintId(blueprint);
    if (existingSession.blueprint_id !== blueprintId) {
      // Different blueprint - clear old session and start fresh
      this.storage.clearSessionState();
      return { shouldResume: false };
    }

    // Check if session is too old (older than 24 hours)
    const sessionAge = Date.now() - new Date(existingSession.last_updated).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
      log.info("Found an old session (>24h), starting fresh");
      this.storage.clearSessionState();
      return { shouldResume: false };
    }

    // Show session info and prompt user
    return await this.promptForResume(existingSession, targetFlow);
  }

  /**
   * Prompt user whether to resume or start fresh
   */
  private async promptForResume(
    session: SessionState,
    targetFlow?: string
  ): Promise<SessionResumeResult> {
    const timeAgo = this.getTimeAgo(new Date(session.last_updated));
    const flowInfo = session.current_flow ? ` in flow "${session.current_flow}"` : "";

    log.step("Found an existing session");
    log.message(`Blueprint: ${session.blueprint_name || "Unknown"}`);
    log.message(`Last updated: ${timeAgo}`);
    if (session.current_flow && session.current_step !== undefined) {
      log.message(`Progress: Step ${session.current_step + 1}${flowInfo}`);
    }

    // If user specified a different flow, suggest starting fresh
    if (targetFlow && session.current_flow !== targetFlow) {
      log.warn(
        `You're requesting flow "${targetFlow}" but the session was in "${session.current_flow}"`
      );

      const switchFlow = await confirm({
        message: `Would you like to switch to the "${targetFlow}" flow? (This will start fresh)`,
        initialValue: true,
      });

      if (isCancelled(switchFlow)) {
        return { shouldResume: false, cancelled: true };
      }

      if (switchFlow) {
        this.storage.clearSessionState();
        return { shouldResume: false };
      }
    }

    const shouldResume = await confirm({
      message: "Would you like to resume your previous session?",
      initialValue: true,
    });

    if (isCancelled(shouldResume)) {
      return { shouldResume: false, cancelled: true };
    }

    if (isNotCancelled(shouldResume) && shouldResume) {
      log.success("Resuming your previous session...");
      return { shouldResume: true, sessionState: session };
    } else {
      log.info("Starting a fresh session...");
      this.storage.clearSessionState();
      return { shouldResume: false };
    }
  }

  /**
   * Start a new session
   */
  startSession(blueprint: BlueprintConfig, flow: Flow): void {
    const blueprintId = this.getBlueprintId(blueprint);
    const now = new Date().toISOString();

    const sessionState: SessionState = {
      blueprint_id: blueprintId,
      blueprint_name: blueprint.overview?.title || blueprint.overview?.description || "Unknown",
      current_flow: flow.id || flow.title,
      current_step: 0,
      started_at: now,
      last_updated: now,
      completed: false,
    };

    this.storage.saveSessionState(sessionState);
  }

  /**
   * Update session progress
   */
  updateProgress(stepIndex: number, flowId?: string): void {
    const session = this.storage.getSessionState();
    if (!session) return;

    session.current_step = stepIndex;
    if (flowId) session.current_flow = flowId;
    session.last_updated = new Date().toISOString();

    this.storage.saveSessionState(session);
  }

  /**
   * Mark session as completed
   */
  completeSession(): void {
    const session = this.storage.getSessionState();
    if (!session) return;

    session.completed = true;
    session.last_updated = new Date().toISOString();

    this.storage.saveSessionState(session);

    // Trigger backup after completion
    this.storage.backupAfterCompletion();

    // Clean up session state after successful backup
    globalThis.setTimeout(() => {
      this.storage.clearSessionState();
    }, 1000);
  }

  /**
   * Get current session state
   */
  getCurrentSession(): SessionState | null {
    return this.storage.getSessionState();
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.storage.clearSessionState();
  }

  /**
   * Check if we should skip to a specific step based on session state
   */
  shouldSkipToStep(sessionState: SessionState): number {
    return sessionState.current_step || 0;
  }

  /**
   * Generate blueprint ID for session tracking
   */
  private getBlueprintId(blueprint: BlueprintConfig): string {
    // Use smith identifier if available, otherwise fall back to description hash
    if (blueprint.smith) {
      return blueprint.smith;
    }

    // Simple hash of description for fallback
    const description = blueprint.overview?.description || "default";
    return description.replace(/\s+/g, "-").toLowerCase();
  }

  /**
   * Get human-readable time ago string
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return date.toLocaleDateString();
  }

  /**
   * Show current session status
   */
  showSessionStatus(): void {
    const projectInfo = this.storage.getProjectInfo();
    const session = this.storage.getSessionState();

    if (!projectInfo) {
      log.warn("No project detected in current directory");
      return;
    }

    log.step(`Project: ${projectInfo.name}`);
    log.message(`Location: ${projectInfo.root}`);
    log.message(`Type: ${projectInfo.type}`);
    if (projectInfo.gitRemote) {
      log.message(`Git: ${projectInfo.gitRemote}`);
    }

    if (!session) {
      log.info("No active session");
      return;
    }

    if (session.completed) {
      log.success("Last session completed successfully");
      return;
    }

    log.step("Active Session");
    log.message(`Blueprint: ${session.blueprint_name}`);
    log.message(`Flow: ${session.current_flow}`);
    log.message(`Step: ${(session.current_step || 0) + 1}`);
    log.message(`Started: ${this.getTimeAgo(new Date(session.started_at))}`);
    log.message(`Updated: ${this.getTimeAgo(new Date(session.last_updated))}`);
  }

  /**
   * Check if currently in a project
   */
  static isInProject(): boolean {
    return ProjectStorage.isInProject();
  }
}
