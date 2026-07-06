/**
 * Co-working Room WebSocket Server
 * Handles real-time presence, status dots, and headcount per room.
 * Architecture: ws presence channels (no AI), one AI call at session close only.
 */
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { sdk } from "./_core/sdk";

export type ParticipantStatus = "working" | "stuck" | "done";

interface Participant {
  userId: number;
  name: string;
  status: ParticipantStatus;
  workingOn: string;
  joinedAt: number; // unix ms
  ws: WebSocket;
}

// roomSlug → Map<userId, Participant>
const rooms = new Map<string, Map<number, Participant>>();

function getRoomParticipants(slug: string) {
  return rooms.get(slug) ?? new Map<number, Participant>();
}

function broadcastToRoom(slug: string, payload: object, excludeUserId?: number) {
  const participants = getRoomParticipants(slug);
  const msg = JSON.stringify(payload);
  for (const [uid, p] of Array.from(participants.entries())) {
    if (excludeUserId !== undefined && uid === excludeUserId) continue;
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  }
}

function getRoomSnapshot(slug: string) {
  const participants = getRoomParticipants(slug);
  return Array.from(participants.values()).map((p: Participant) => ({
    userId: p.userId,
    name: p.name,
    status: p.status,
    workingOn: p.workingOn,
    joinedAt: p.joinedAt,
  }));
}

export function initCoworkingWS(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/coworking" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    let currentRoomSlug: string | null = null;
    let currentUserId: number | null = null;

    // SECURITY: authenticate the socket from the session cookie on the upgrade
    // request. Identity is derived server-side; the client cannot supply it.
    let authUserId: number;
    let authName: string;
    try {
      const u = await sdk.authenticateRequest(req as unknown as Parameters<typeof sdk.authenticateRequest>[0]);
      authUserId = u.id;
      authName = u.name ?? "";
    } catch {
      ws.close(4401, "Unauthorized");
      return;
    }

    ws.on("message", (raw: Buffer | string) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const type = msg.type as string;

      if (type === "join") {
        const { roomSlug, workingOn, status } = msg as {
          roomSlug: string;
          workingOn: string;
          status: ParticipantStatus;
        };
        // SECURITY: never trust client-supplied identity — use the authenticated session.
        const userId = authUserId;
        const name = authName;

        // Leave previous room if any
        if (currentRoomSlug && currentUserId !== null) {
          leaveRoom(currentRoomSlug, currentUserId);
        }

        currentRoomSlug = roomSlug;
        currentUserId = userId;

        if (!rooms.has(roomSlug)) rooms.set(roomSlug, new Map());
        rooms.get(roomSlug)!.set(userId, {
          userId,
          name,
          status: status ?? "working",
          workingOn: workingOn ?? "",
          joinedAt: Date.now(),
          ws,
        });

        // Send current room snapshot to the joining user
        ws.send(JSON.stringify({ type: "snapshot", participants: getRoomSnapshot(roomSlug) }));

        // Broadcast join event to others
        broadcastToRoom(roomSlug, {
          type: "joined",
          participant: { userId, name, status: status ?? "working", workingOn: workingOn ?? "", joinedAt: Date.now() },
        }, userId);
      }

      if (type === "status_update") {
        const { status } = msg as { status: ParticipantStatus };
        if (currentRoomSlug && currentUserId !== null) {
          const p = rooms.get(currentRoomSlug)?.get(currentUserId);
          if (p) {
            p.status = status;
            broadcastToRoom(currentRoomSlug, {
              type: "status_changed",
              userId: currentUserId,
              status,
            });
          }
        }
      }

      if (type === "leave") {
        if (currentRoomSlug && currentUserId !== null) {
          leaveRoom(currentRoomSlug, currentUserId);
          currentRoomSlug = null;
          currentUserId = null;
        }
      }

      if (type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    });

    ws.on("close", () => {
      if (currentRoomSlug && currentUserId !== null) {
        leaveRoom(currentRoomSlug, currentUserId);
      }
    });

    ws.on("error", () => {
      if (currentRoomSlug && currentUserId !== null) {
        leaveRoom(currentRoomSlug, currentUserId);
      }
    });
  });

  console.log("[CoworkingWS] WebSocket server initialized at /ws/coworking");
  return wss;
}

function leaveRoom(roomSlug: string, userId: number) {
  const participants = rooms.get(roomSlug);
  if (!participants) return;
  const p = participants.get(userId);
  if (!p) return;
  participants.delete(userId);
  if (participants.size === 0) rooms.delete(roomSlug);
  broadcastToRoom(roomSlug, { type: "left", userId });
}

export function getRoomHeadcount(roomSlug: string): number {
  return getRoomParticipants(roomSlug).size;
}
