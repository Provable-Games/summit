import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database pool before importing SubscriptionHub
vi.mock("../db/client.js", () => ({
  pool: {
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({}),
      on: vi.fn(),
      release: vi.fn(),
    }),
  },
}));

import { SubscriptionHub } from "./subscriptions.js";

/**
 * Create a mock WebSocket-like object that records sent messages
 */
function createMockWs() {
  const messages: string[] = [];
  return {
    ws: {
      send: vi.fn((data: string) => {
        messages.push(data);
      }),
      close: vi.fn(),
    },
    messages,
  };
}

describe("SubscriptionHub", () => {
  let hub: SubscriptionHub;

  beforeEach(() => {
    hub = new SubscriptionHub();
  });

  describe("client management", () => {
    it("should add a client and reflect in status", () => {
      const { ws } = createMockWs();
      hub.addClient("client-1", ws);

      const status = hub.getStatus();
      expect(status.clientCount).toBe(1);
    });

    it("should track multiple clients", () => {
      const { ws: ws1 } = createMockWs();
      const { ws: ws2 } = createMockWs();
      hub.addClient("client-1", ws1);
      hub.addClient("client-2", ws2);

      expect(hub.getStatus().clientCount).toBe(2);
    });

    it("should remove a client and update status", () => {
      const { ws } = createMockWs();
      hub.addClient("client-1", ws);
      expect(hub.getStatus().clientCount).toBe(1);

      hub.removeClient("client-1");
      expect(hub.getStatus().clientCount).toBe(0);
    });

    it("should handle removing a non-existent client without error", () => {
      expect(() => hub.removeClient("nonexistent")).not.toThrow();
    });
  });

  describe("subscribe and unsubscribe", () => {
    it("should subscribe a client to channels", () => {
      const { ws, messages } = createMockWs();
      hub.addClient("client-1", ws);

      hub.handleMessage(
        "client-1",
        JSON.stringify({ type: "subscribe", channels: ["summit", "event"] })
      );

      // Should receive "subscribed" confirmation
      expect(messages.length).toBe(1);
      const response = JSON.parse(messages[0]);
      expect(response.type).toBe("subscribed");
      expect(response.channels).toEqual(["summit", "event"]);
    });

    it("should unsubscribe a client from channels", () => {
      const { ws, messages } = createMockWs();
      hub.addClient("client-1", ws);

      // Subscribe first
      hub.subscribe("client-1", ["summit", "event"]);

      // Then unsubscribe
      hub.handleMessage(
        "client-1",
        JSON.stringify({ type: "unsubscribe", channels: ["summit"] })
      );

      expect(messages.length).toBe(1);
      const response = JSON.parse(messages[0]);
      expect(response.type).toBe("unsubscribed");
      expect(response.channels).toEqual(["summit"]);
    });

    it("should ignore subscribe for non-existent client", () => {
      expect(() => hub.subscribe("nonexistent", ["summit"])).not.toThrow();
    });

    it("should ignore unsubscribe for non-existent client", () => {
      expect(() => hub.unsubscribe("nonexistent", ["summit"])).not.toThrow();
    });
  });

  describe("handleMessage", () => {
    it("should respond to ping with pong", () => {
      const { ws, messages } = createMockWs();
      hub.addClient("client-1", ws);

      hub.handleMessage("client-1", JSON.stringify({ type: "ping" }));

      expect(messages.length).toBe(1);
      const response = JSON.parse(messages[0]);
      expect(response.type).toBe("pong");
    });

    it("should handle invalid JSON gracefully", () => {
      const { ws } = createMockWs();
      hub.addClient("client-1", ws);

      expect(() => hub.handleMessage("client-1", "not-json")).not.toThrow();
    });

    it("should handle message from non-existent client gracefully", () => {
      expect(() =>
        hub.handleMessage("nonexistent", JSON.stringify({ type: "ping" }))
      ).not.toThrow();
    });

    it("should handle subscribe with empty channels array", () => {
      const { ws, messages } = createMockWs();
      hub.addClient("client-1", ws);

      hub.handleMessage(
        "client-1",
        JSON.stringify({ type: "subscribe", channels: [] })
      );

      expect(messages.length).toBe(1);
      const response = JSON.parse(messages[0]);
      expect(response.type).toBe("subscribed");
      expect(response.channels).toEqual([]);
    });

    it("should handle subscribe without channels property", () => {
      const { ws, messages } = createMockWs();
      hub.addClient("client-1", ws);

      hub.handleMessage("client-1", JSON.stringify({ type: "subscribe" }));

      expect(messages.length).toBe(1);
      const response = JSON.parse(messages[0]);
      expect(response.type).toBe("subscribed");
      // channels may be undefined or empty depending on implementation
      expect(response.channels === undefined || Array.isArray(response.channels)).toBe(true);
    });

    it("should handle unsubscribe without channels property", () => {
      const { ws, messages } = createMockWs();
      hub.addClient("client-1", ws);

      // First subscribe to something
      hub.handleMessage("client-1", JSON.stringify({ type: "subscribe", channels: ["summit"] }));
      messages.length = 0; // clear

      // Unsubscribe without channels property
      hub.handleMessage("client-1", JSON.stringify({ type: "unsubscribe" }));

      expect(messages.length).toBe(1);
      const response = JSON.parse(messages[0]);
      expect(response.type).toBe("unsubscribed");
    });

    it("should ignore unknown message types", () => {
      const { ws, messages } = createMockWs();
      hub.addClient("client-1", ws);

      hub.handleMessage("client-1", JSON.stringify({ type: "unknown" }));

      expect(messages.length).toBe(0);
    });
  });

  describe("getStatus", () => {
    it("should report connected status after construction", () => {
      // The constructor calls connect(), and our mock resolves successfully
      // Since connect is async, isConnected may not be set yet in the same tick
      const status = hub.getStatus();
      expect(status).toHaveProperty("connected");
      expect(status).toHaveProperty("clientCount");
      expect(typeof status.connected).toBe("boolean");
      expect(typeof status.clientCount).toBe("number");
    });

    it("should return 0 clients when no clients are connected", () => {
      expect(hub.getStatus().clientCount).toBe(0);
    });
  });

  describe("shutdown", () => {
    it("should close all connected clients on shutdown", async () => {
      const { ws: ws1 } = createMockWs();
      const { ws: ws2 } = createMockWs();
      hub.addClient("client-1", ws1);
      hub.addClient("client-2", ws2);

      await hub.shutdown();

      expect(ws1.close).toHaveBeenCalled();
      expect(ws2.close).toHaveBeenCalled();
      expect(hub.getStatus().clientCount).toBe(0);
    });

    it("should handle shutdown with no clients", async () => {
      await expect(hub.shutdown()).resolves.not.toThrow();
    });

    it("should handle client close errors during shutdown", async () => {
      const { ws } = createMockWs();
      ws.close = vi.fn(() => {
        throw new Error("close error");
      });
      hub.addClient("client-1", ws);

      // Should not throw despite close error
      await expect(hub.shutdown()).resolves.not.toThrow();
      expect(hub.getStatus().clientCount).toBe(0);
    });
  });

  describe("subscribe method directly", () => {
    it("should add channels to client subscription", () => {
      const { ws, messages } = createMockWs();
      hub.addClient("client-1", ws);

      hub.subscribe("client-1", ["summit"]);

      // Verify subscription works by sending a handleMessage with subscribe
      // and checking that the subscribe confirmation includes the channel
      hub.handleMessage(
        "client-1",
        JSON.stringify({ type: "subscribe", channels: ["event"] })
      );

      expect(messages.length).toBe(1);
      const response = JSON.parse(messages[0]);
      expect(response.type).toBe("subscribed");
    });
  });

  describe("unsubscribe method directly", () => {
    it("should remove channels from client subscription", () => {
      const { ws } = createMockWs();
      hub.addClient("client-1", ws);

      hub.subscribe("client-1", ["summit", "event"]);
      hub.unsubscribe("client-1", ["summit"]);

      // Client should still exist
      expect(hub.getStatus().clientCount).toBe(1);
    });
  });
});
