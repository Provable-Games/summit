import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";

import { useWebSocket } from "./useWebSocket";
import type { UseWebSocketOptions } from "./useWebSocket";

// Controllable mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  OPEN = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  sent: string[] = [];

  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = MockWebSocket.CLOSED;
  }
}

let mockWsInstance: MockWebSocket;

function setMockInstance(instance: MockWebSocket) {
  mockWsInstance = instance;
}

vi.stubGlobal(
  "WebSocket",
  class extends MockWebSocket {
    constructor() {
      super();
      setMockInstance(this);
    }
  }
);

function HookHarness(props: { options: UseWebSocketOptions }) {
  useWebSocket(props.options);
  return null;
}

describe("useWebSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call onConsumables when consumables message received", () => {
    const onConsumables = vi.fn();

    act(() => {
      create(
        createElement(HookHarness, {
          options: {
            url: "wss://test.invalid",
            channels: ["consumables"],
            onConsumables,
          },
        })
      );
    });

    // Trigger open + message
    act(() => {
      mockWsInstance.onopen?.();
    });

    const payload = {
      owner: "0x123",
      xlife_count: 5,
      attack_count: 3,
      revive_count: 1,
      poison_count: 2,
    };

    act(() => {
      mockWsInstance.onmessage?.({
        data: JSON.stringify({ type: "consumables", data: payload }),
      });
    });

    expect(onConsumables).toHaveBeenCalledWith(payload);
  });

  it("should not call onConsumables for summit messages", () => {
    const onConsumables = vi.fn();

    act(() => {
      create(
        createElement(HookHarness, {
          options: {
            url: "wss://test.invalid",
            channels: ["summit", "consumables"],
            onConsumables,
          },
        })
      );
    });

    act(() => {
      mockWsInstance.onopen?.();
    });

    act(() => {
      mockWsInstance.onmessage?.({
        data: JSON.stringify({ type: "summit", data: { token_id: 1 } }),
      });
    });

    expect(onConsumables).not.toHaveBeenCalled();
  });

  it("should include consumables in subscribe message", () => {
    act(() => {
      create(
        createElement(HookHarness, {
          options: {
            url: "wss://test.invalid",
            channels: ["summit", "consumables"],
          },
        })
      );
    });

    act(() => {
      mockWsInstance.onopen?.();
    });

    const subscribeMsg = mockWsInstance.sent.find((msg) => {
      const parsed = JSON.parse(msg);
      return parsed.type === "subscribe";
    });

    expect(subscribeMsg).toBeDefined();
    const parsed = JSON.parse(subscribeMsg!);
    expect(parsed.channels).toContain("consumables");
  });
});
