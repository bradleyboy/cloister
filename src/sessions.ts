// Session discovery and metadata extraction

import { readdir, stat, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import {
  parseSessionFile,
  extractFirstUserMessage,
  generateSessionSummary,
  determineSessionStatus,
  type Message,
} from "./parser.js";
import { generateTags, type Tag } from "./tagger.js";

export interface Session {
  id: string;
  project: string;
  projectName: string;
  title: string;
  timestamp: string;
  lastModified: string;
  messageCount: number;
  tags: Tag[];
  status: "awaiting" | "working" | "idle";
  filePath: string;
  // Chain information for related sessions
  chainId?: string;
  chainIndex?: number; // 0 = most recent (head), 1+ = older sessions
  chainLength?: number; // Total sessions in this chain
}

export interface SessionDetail extends Session {
  messages: Message[];
}

// Group sessions into chains based on project + title similarity
function groupSessionsIntoChains(sessions: Session[]): Session[] {
  // Create a map of project+title -> sessions
  const chainMap = new Map<string, Session[]>();

  for (const session of sessions) {
    // Create a chain key from project + normalized title
    const chainKey = `${session.project}::${session.title.toLowerCase().trim()}`;

    if (!chainMap.has(chainKey)) {
      chainMap.set(chainKey, []);
    }
    chainMap.get(chainKey)!.push(session);
  }

  // Process each chain
  const result: Session[] = [];

  for (const [chainKey, chainSessions] of chainMap) {
    // Sort by lastModified (newest first)
    chainSessions.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    if (chainSessions.length === 1) {
      // Not a chain, just a single session
      result.push(chainSessions[0]);
    } else {
      // This is a chain - assign chain metadata
      const chainId = chainSessions[0].id; // Use the newest session's ID as chain ID

      chainSessions.forEach((session, index) => {
        result.push({
          ...session,
          chainId,
          chainIndex: index,
          chainLength: chainSessions.length,
        });
      });
    }
  }

  // Sort all sessions by lastModified (newest first)
  result.sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );

  return result;
}

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

// Convert project directory name to path
// Format: -Users-bdaily-code-my-project -> /Users/bdaily/code/my-project
// We try to find a valid path by checking if directories exist
async function projectDirToPath(dirName: string): Promise<string> {
  // Remove leading hyphen and split by hyphens
  const stripped = dirName.startsWith("-") ? dirName.slice(1) : dirName;
  const parts = stripped.split("-");

  // Try to reconstruct the path by checking which combinations exist
  // Start from the beginning and greedily match existing directories
  let currentPath = "/";
  let i = 0;

  while (i < parts.length) {
    // Try progressively longer segments (with hyphens)
    let found = false;

    for (let len = parts.length - i; len >= 1; len--) {
      const segment = parts.slice(i, i + len).join("-");
      const testPath = join(currentPath, segment);

      try {
        const s = await stat(testPath);
        if (s.isDirectory()) {
          currentPath = testPath;
          i += len;
          found = true;
          break;
        }
      } catch {
        // Path doesn't exist, try shorter segment
      }
    }

    if (!found) {
      // No valid path found, use the remaining parts as-is
      currentPath = join(currentPath, parts.slice(i).join("-"));
      break;
    }
  }

  return currentPath;
}

// Synchronous version for when we don't need to verify
function projectDirToPathSimple(dirName: string): string {
  // Just replace hyphens with slashes as a fallback
  return dirName.replace(/-/g, "/");
}

// Get project name from path or encoded directory name
function getProjectName(projectPath: string, encodedDir?: string): string {
  // First try to get from the actual path
  const parts = projectPath.split("/").filter(Boolean);
  const lastName = parts[parts.length - 1];

  if (lastName && lastName.length > 0) {
    return lastName;
  }

  // Fallback: extract from encoded directory name
  // The last segment after common prefixes like -Users-xxx-code-
  if (encodedDir) {
    const match = encodedDir.match(/-code-(.+)$/);
    if (match) {
      return match[1];
    }
  }

  return projectPath;
}

export async function discoverSessions(): Promise<Session[]> {
  const sessions: Session[] = [];

  try {
    const projectDirs = await readdir(CLAUDE_PROJECTS_DIR);

    for (const projectDir of projectDirs) {
      const projectPath = join(CLAUDE_PROJECTS_DIR, projectDir);
      const projectStat = await stat(projectPath);

      if (!projectStat.isDirectory()) continue;

      // Find all JSONL files in this project (excluding agent subfiles)
      const files = await readdir(projectPath);
      const jsonlFiles = files.filter(
        (f) => f.endsWith(".jsonl") && !f.startsWith("agent-")
      );

      for (const jsonlFile of jsonlFiles) {
        const filePath = join(projectPath, jsonlFile);
        const fileStat = await stat(filePath);

        try {
          const content = await readFile(filePath, "utf-8");

          // Skip sidechain sessions (check first line)
          const firstLine = content.split("\n")[0];
          if (firstLine) {
            try {
              const firstObj = JSON.parse(firstLine);
              if (firstObj.isSidechain === true) continue;
            } catch {
              // Ignore parse errors on first line
            }
          }

          const messages = parseSessionFile(content);

          if (messages.length === 0) continue;

          const project = await projectDirToPath(projectDir);
          const sessionId = basename(jsonlFile, ".jsonl");
          const lastModifiedStr = fileStat.mtime.toISOString();
          const firstTimestamp = messages[0]?.timestamp || lastModifiedStr;
          // Use smart summary generation for better titles
          const title = generateSessionSummary(messages);
          const tags = generateTags(messages);
          const status = determineSessionStatus(messages, lastModifiedStr);

          sessions.push({
            id: sessionId,
            project,
            projectName: getProjectName(project, projectDir),
            title,
            timestamp: firstTimestamp,
            lastModified: fileStat.mtime.toISOString(),
            messageCount: messages.length,
            tags,
            status,
            filePath,
          });
        } catch {
          // Skip files that can't be parsed
        }
      }
    }
  } catch (error) {
    console.error("Error discovering sessions:", error);
  }

  // Group sessions into chains and sort
  return groupSessionsIntoChains(sessions);
}

export async function getSessionById(
  sessionId: string
): Promise<SessionDetail | null> {
  const sessions = await discoverSessions();
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) return null;

  try {
    const content = await readFile(session.filePath, "utf-8");
    const messages = parseSessionFile(content);

    return {
      ...session,
      messages,
    };
  } catch {
    return null;
  }
}

export async function getProjectList(): Promise<
  { name: string; path: string; count: number }[]
> {
  const sessions = await discoverSessions();
  const projectMap = new Map<string, { name: string; path: string; count: number }>();

  for (const session of sessions) {
    const existing = projectMap.get(session.project);
    if (existing) {
      existing.count++;
    } else {
      projectMap.set(session.project, {
        name: session.projectName,
        path: session.project,
        count: 1,
      });
    }
  }

  return Array.from(projectMap.values()).sort((a, b) => b.count - a.count);
}

export async function getTagCounts(): Promise<Map<Tag, number>> {
  const sessions = await discoverSessions();
  const tagCounts = new Map<Tag, number>();

  for (const session of sessions) {
    for (const tag of session.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return tagCounts;
}
