import { getToken } from "./auth";
import { BASE_URL } from "../constants";

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = new Map();
    this.conversationId = null;
  }

  connect(conversationId, onMessage, onError, onOpen, onClose) {
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.conversationId === conversationId
    ) {
      // Already connected to this conversation
      return;
    }

    // Close existing connection if different conversation
    if (this.ws && this.conversationId !== conversationId) {
      this.disconnect();
    }

    this.conversationId = conversationId;
    const token = getToken();

    if (!token) {
      console.error("No authentication token found");
      if (onError) onError(new Error("No authentication token"));
      return;
    }

    // Determine WebSocket URL
    let wsUrl;
    if (BASE_URL.startsWith("https://")) {
      wsUrl = BASE_URL.replace("https://", "wss://");
    } else {
      wsUrl = BASE_URL.replace("http://", "ws://");
    }

    // Add token to query string (URL encode it)
    const encodedToken = encodeURIComponent(token);
    const url = `${wsUrl}/ws/chat/${conversationId}/?token=${encodedToken}`;
    console.log(
      "Connecting to WebSocket:",
      url.replace(encodedToken, "TOKEN_HIDDEN")
    );
    console.log("Conversation ID:", conversationId);
    console.log("Token length:", token.length);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("WebSocket opened successfully");
        this.reconnectAttempts = 0;
        if (onOpen) onOpen();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error, event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error event:", error);
        console.error("WebSocket readyState:", this.ws?.readyState);
        console.error(
          "WebSocket URL:",
          url.replace(encodedToken, "TOKEN_HIDDEN")
        );
        console.error("WebSocket error details:", {
          type: error.type,
          target: error.target?.url?.replace(encodedToken, "TOKEN_HIDDEN"),
          readyState: this.ws?.readyState,
          CONNECTING: WebSocket.CONNECTING,
          OPEN: WebSocket.OPEN,
          CLOSING: WebSocket.CLOSING,
          CLOSED: WebSocket.CLOSED,
        });
        if (onError) onError(error);
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket closed:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          conversationId: this.conversationId,
        });
        if (onClose) onClose();
        // Attempt to reconnect if not manually closed
        if (
          this.conversationId &&
          this.reconnectAttempts < this.maxReconnectAttempts &&
          event.code !== 1000 // Not a normal closure
        ) {
          this.reconnectAttempts++;
          console.log(
            `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
          );
          setTimeout(() => {
            this.connect(
              this.conversationId,
              onMessage,
              onError,
              onOpen,
              onClose
            );
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      if (onError) onError(error);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    } else {
      console.error("WebSocket is not open");
      return false;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.conversationId = null;
      this.reconnectAttempts = 0;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

export default wsManager;
