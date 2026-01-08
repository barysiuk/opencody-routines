import { logger } from "../utils/logger.js";

export interface CreateSessionOptions {
  title?: string;
}

export interface SendMessageOptions {
  sessionId: string;
  message: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  agent?: string;
}

export interface Session {
  id: string;
  title?: string;
}

export interface HealthResponse {
  healthy: boolean;
  version: string;
}

/**
 * Simple HTTP client for OpenCode server
 */
export class OpenCodeClient {
  private baseUrl: string;

  constructor(serverUrl: string) {
    // Remove trailing slash if present
    this.baseUrl = serverUrl.replace(/\/$/, "");
  }

  /**
   * Check server health
   */
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/global/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json() as Promise<HealthResponse>;
  }

  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions = {}): Promise<Session> {
    const response = await fetch(`${this.baseUrl}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: options.title,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create session: ${response.statusText} - ${text}`);
    }

    return response.json() as Promise<Session>;
  }

  /**
   * Send a message to a session
   */
  async sendMessage(options: SendMessageOptions): Promise<void> {
    const body: Record<string, unknown> = {
      parts: [{ type: "text", text: options.message }],
    };

    if (options.model) {
      body.model = options.model;
    }

    if (options.agent) {
      body.agent = options.agent;
    }

    const response = await fetch(
      `${this.baseUrl}/session/${options.sessionId}/message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to send message: ${response.statusText} - ${text}`);
    }
  }

  /**
   * Send a message asynchronously (fire-and-forget)
   */
  async sendMessageAsync(options: SendMessageOptions): Promise<void> {
    const body: Record<string, unknown> = {
      parts: [{ type: "text", text: options.message }],
    };

    if (options.model) {
      body.model = options.model;
    }

    if (options.agent) {
      body.agent = options.agent;
    }

    const response = await fetch(
      `${this.baseUrl}/session/${options.sessionId}/prompt_async`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to send async message: ${response.statusText} - ${text}`);
    }
  }

  /**
   * Create a new session and send initial message
   */
  async createSessionWithMessage(options: {
    title?: string;
    model?: string;
    agent?: string;
    message: string;
  }): Promise<{ sessionId: string }> {
    // Create session
    const session = await this.createSession({ title: options.title });
    logger.info(`Created session: ${session.id}${options.title ? ` (${options.title})` : ""}`);

    // Parse model string (format: "provider/model")
    let model: { providerID: string; modelID: string } | undefined;
    if (options.model) {
      const [providerID, ...modelParts] = options.model.split("/");
      const modelID = modelParts.join("/");
      if (providerID && modelID) {
        model = { providerID, modelID };
      } else {
        logger.warn(`Invalid model format: ${options.model}. Expected "provider/model"`);
      }
    }

    // Send message asynchronously (fire-and-forget)
    await this.sendMessageAsync({
      sessionId: session.id,
      message: options.message,
      model,
      agent: options.agent,
    });

    logger.info(`Sent message to session ${session.id}`);

    return { sessionId: session.id };
  }
}
