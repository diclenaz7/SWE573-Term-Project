import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/common/header";
import "./Messages.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, removeToken } from "../utils/auth";
import wsManager from "../utils/websocket";

function Messages() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [handshakeStatus, setHandshakeStatus] = useState(null); // null, 'pending', 'approved', 'active'
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Handle URL parameter for conversation
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId) {
      // First check if conversation exists in the list
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      } else {
        // Conversation doesn't exist yet, fetch offer/need to create placeholder
        const parts = conversationId.split("_");
        if (parts.length >= 2 && user) {
          const type = parts[0];
          const id = parts[1];
          fetchOfferOrNeedForConversation(type, id, conversationId);
        }
      }
    }
  }, [searchParams, conversations, user]);

  useEffect(() => {
    if (selectedConversation && user) {
      // Fetch messages (will return empty if no messages yet, which is fine for new conversations)
      fetchMessages(selectedConversation.id);
      checkHandshakeStatus(selectedConversation.id);

      // Connect to WebSocket for this conversation (use conversation.id which is already in the correct format)
      setWsConnected(false); // Reset connection status
      connectWebSocket(selectedConversation.id);
    } else {
      // Disconnect WebSocket when no conversation is selected
      wsManager.disconnect();
      setWsConnected(false);
    }

    // Cleanup on unmount or conversation change
    return () => {
      wsManager.disconnect();
      setWsConnected(false);
    };
  }, [selectedConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchUser = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${BASE_URL}/api/auth/user/`, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else if (response.status === 401) {
        removeToken();
        setUser(null);
        navigate("/login");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${BASE_URL}/api/conversations/`, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else if (response.status === 401) {
        removeToken();
        setUser(null);
        navigate("/login");
      } else {
        console.error("Failed to fetch conversations");
        setConversations([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]);
    }
  };

  const fetchOfferOrNeedForConversation = async (type, id, conversationId) => {
    try {
      const headers = getAuthHeaders();
      const endpoint = type === "offer" ? `offers` : `needs`;
      const response = await fetch(`${BASE_URL}/api/${endpoint}/${id}/`, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });

      if (response.ok) {
        const item = await response.json();
        const creator = item.user;

        // Determine if current user is creator
        const isCreator = creator.username === user?.username;

        // If user is creator, they can't start a new conversation (need someone to be interested first)
        if (isCreator) {
          console.log(
            "Cannot create conversation: User is the creator. Wait for someone to show interest."
          );
          return;
        }

        // User is interested/helping, so otherUser is the creator
        // Get creator's profile if available
        let profileData = {
          profile_image: null,
          bio: "",
          rank: "newbee",
          rank_display: "New Bee",
        };

        // Try to get profile from API if available
        try {
          const profileResponse = await fetch(
            `${BASE_URL}/api/profile/${creator.id}/`,
            {
              method: "GET",
              headers: headers,
              credentials: "include",
            }
          );
          if (profileResponse.ok) {
            const profileInfo = await profileResponse.json();
            if (profileInfo.profile) {
              profileData = {
                profile_image: profileInfo.profile.profile_image || null,
                bio: profileInfo.profile.bio || "",
                rank: profileInfo.profile.rank || "newbee",
                rank_display: profileInfo.profile.rank_display || "New Bee",
              };
            }
          }
        } catch (e) {
          // Use default profile data
        }

        // Create placeholder conversation for new chat
        const placeholderConversation = {
          id: conversationId,
          type: type,
          [type === "offer" ? "offerId" : "needId"]: parseInt(id),
          [type === "offer" ? "offerTitle" : "needTitle"]: item.title,
          isCreator: false, // Current user is interested/helping, not creator
          otherUser: {
            id: creator.id,
            username: creator.username,
            email: creator.email || "",
            first_name: creator.first_name || "",
            last_name: creator.last_name || "",
            full_name:
              `${creator.first_name || ""} ${creator.last_name || ""}`.trim() ||
              creator.username,
            profile: profileData,
          },
          lastMessage: "",
          lastMessageTime: null,
          unreadCount: 0,
          interestStatus: "pending",
        };

        setSelectedConversation(placeholderConversation);
        // Add to conversations list if not already there
        setConversations((prev) => {
          const exists = prev.find((c) => c.id === conversationId);
          if (!exists) {
            return [...prev, placeholderConversation];
          }
          return prev;
        });

        // The useEffect will handle WebSocket connection when selectedConversation is set
      }
    } catch (error) {
      console.error("Error fetching offer/need for conversation:", error);
    }
  };

  const fetchMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `${BASE_URL}/api/conversations/${conversationId}/messages/`,
        {
          method: "GET",
          headers: headers,
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        // Update handshake status from response
        if (data.handshake) {
          setHandshakeStatus(data.handshake.status);
        } else {
          setHandshakeStatus(null);
        }
      } else if (response.status === 401) {
        removeToken();
        setUser(null);
        navigate("/login");
      } else if (response.status === 404) {
        // No conversation yet (new chat), that's okay - messages will be empty
        setMessages([]);
        setHandshakeStatus(null);
      } else {
        console.error("Failed to fetch messages");
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const connectWebSocket = (conversationId) => {
    console.log("Connecting to WebSocket for conversation:", conversationId);
    wsManager.connect(
      conversationId,
      // onMessage
      (data) => {
        console.log("WebSocket message received:", data);
        if (data.type === "message" && data.message) {
          // New message received
          setMessages((prev) => {
            // Check if message already exists by ID (avoid duplicates)
            const existsById = prev.some((msg) => msg.id === data.message.id);
            if (existsById) return prev;

            // Also check for optimistic messages (negative IDs) that match this message
            // Match by content, sender, and time (within 5 seconds)
            const messageTime = new Date(data.message.created_at).getTime();
            const optimisticMatch = prev.find((msg) => {
              // Check if it's an optimistic message (negative ID)
              const isOptimistic = msg.id < 0;
              if (!isOptimistic) return false;

              // Match by content and sender
              const contentMatch = msg.content === data.message.content;
              const senderMatch = msg.sender?.id === data.message.sender?.id;
              const timeMatch =
                Math.abs(new Date(msg.created_at).getTime() - messageTime) <
                5000; // Within 5 seconds

              return contentMatch && senderMatch && timeMatch;
            });

            if (optimisticMatch) {
              // Replace optimistic message with real one
              return prev.map((msg) =>
                msg.id === optimisticMatch.id ? data.message : msg
              );
            }

            // New message, add it
            return [...prev, data.message];
          });
          // Refresh conversations to update last message
          setTimeout(() => {
            fetchConversations();
          }, 300);
        } else if (data.type === "handshake" && data.handshake) {
          // Handshake update received
          const status = data.handshake.status;
          setHandshakeStatus(status);

          // Add system message
          const systemMessage = {
            id: Date.now(),
            sender: null,
            content: data.handshake.message || `Handshake ${status}`,
            created_at: new Date().toISOString(),
            is_read: true,
            is_system: true,
          };
          setMessages((prev) => [...prev, systemMessage]);
        } else if (data.type === "error") {
          console.error("WebSocket error:", data.message);
          alert(`Error: ${data.message}`);
        }
      },
      // onError
      (error) => {
        console.error("WebSocket connection error:", error);
      },
      // onOpen
      () => {
        console.log("WebSocket connected successfully");
        setWsConnected(true);
      },
      // onClose
      () => {
        console.log("WebSocket disconnected");
        setWsConnected(false);
      }
    );
  };

  const checkHandshakeStatus = async (conversationId) => {
    try {
      const headers = getAuthHeaders();
      // TODO: Replace with actual API endpoint when available
      // const response = await fetch(`${BASE_URL}/api/conversations/${conversationId}/handshake/`, {
      //   method: "GET",
      //   headers: headers,
      //   credentials: "include",
      // });

      // Mock: No active handshake initially
      setHandshakeStatus(null);
    } catch (error) {
      console.error("Error checking handshake status:", error);
      setHandshakeStatus(null);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    console.log("sendMessage called", {
      messageInput: messageInput,
      selectedConversation: selectedConversation?.id,
      sendingMessage: sendingMessage,
      wsConnected: wsManager.isConnected(),
    });

    if (!messageInput.trim() || !selectedConversation || sendingMessage) {
      console.log("Send blocked:", {
        hasInput: !!messageInput.trim(),
        hasConversation: !!selectedConversation,
        isSending: sendingMessage,
      });
      return;
    }

    const messageContent = messageInput.trim();
    setMessageInput("");
    setSendingMessage(true);

    // Check if WebSocket is connected
    if (!wsManager.isConnected()) {
      console.error("WebSocket is not connected. Attempting to reconnect...");
      // Try to reconnect
      if (selectedConversation && user) {
        connectWebSocket(selectedConversation.id);
        // Wait a bit for connection
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!wsManager.isConnected()) {
        console.error("WebSocket still not connected after reconnect attempt");
        setSendingMessage(false);
        setMessageInput(messageContent);
        alert("Connection lost. Please refresh the page.");
        return;
      }
    }

    // Optimistically add message to UI
    // Use a negative ID to mark it as temporary (will be replaced when server responds)
    const tempMessage = {
      id: -Date.now(), // Negative ID to mark as temporary
      sender: {
        id: user.id,
        username: user.username,
        full_name: user.full_name || user.username,
      },
      content: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Send via WebSocket (recipient is determined from conversation context)
      const success = wsManager.send({
        type: "message",
        content: messageContent,
      });

      if (!success) {
        throw new Error("Failed to send message via WebSocket");
      }

      console.log("Message sent successfully");

      // Refresh conversations list after sending message to update it
      // This ensures new conversations appear in the list
      setTimeout(() => {
        fetchConversations();
      }, 500);
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      setMessageInput(messageContent);
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const startHandshake = async () => {
    if (!selectedConversation) return;

    try {
      // Send handshake request via WebSocket (context is in conversation_id)
      const success = wsManager.send({
        type: "handshake_start",
      });

      if (!success) {
        throw new Error("WebSocket not connected");
      }

      // Optimistically set status (will be confirmed by WebSocket response)
      setHandshakeStatus("active");
    } catch (error) {
      console.error("Error starting handshake:", error);
    }
  };

  const approveHandshake = async () => {
    if (!selectedConversation) return;

    try {
      // Send handshake approval via WebSocket (context is in conversation_id)
      const success = wsManager.send({
        type: "handshake_approve",
      });

      if (!success) {
        throw new Error("WebSocket not connected");
      }

      // Optimistically set status (will be confirmed by WebSocket response)
      setHandshakeStatus("in_progress");
    } catch (error) {
      console.error("Error approving handshake:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const headers = getAuthHeaders();
      await fetch(`${BASE_URL}/api/auth/logout/`, {
        method: "POST",
        headers: headers,
        credentials: "include",
      });
      removeToken();
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      removeToken();
      setUser(null);
      navigate("/login");
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const isMyMessage = (message) => {
    if (!message || !message.sender || !user) {
      return false;
    }
    // Check by sender ID (primary check)
    if (message.sender.id && user.id) {
      return message.sender.id === user.id;
    }
    // Fallback to username comparison if IDs are not available
    if (message.sender.username && user.username) {
      return message.sender.username === user.username;
    }
    return false;
  };

  if (loading && !user) {
    return (
      <div className="page-container">
        <Header user={user} onLogout={handleLogout} />
        <div className="messages-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header user={user} onLogout={handleLogout} />
      <div className="messages-container">
        <div className="messages-layout">
          {/* Left Pane - Conversation List */}
          <div className="conversations-pane">
            <div className="conversations-header">
              <h2 className="conversations-title">Messages</h2>
            </div>
            <div className="conversations-list">
              {conversations.length === 0 ? (
                <div className="conversations-empty">
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`conversation-item ${
                      selectedConversation?.id === conversation.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="conversation-avatar">
                      {conversation.otherUser.profile?.profile_image ? (
                        <img
                          src={conversation.otherUser.profile.profile_image}
                          alt={conversation.otherUser.full_name}
                          className="conversation-avatar-img"
                        />
                      ) : (
                        <div className="conversation-avatar-placeholder">
                          <span>👤</span>
                        </div>
                      )}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header-row">
                        <h3 className="conversation-name">
                          {conversation.type === "offer"
                            ? conversation.offerTitle
                            : conversation.needTitle}
                        </h3>
                        {conversation.unreadCount > 0 && (
                          <span className="conversation-unread">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="conversation-preview">
                        {conversation.otherUser.full_name ||
                          conversation.otherUser.username}
                        {conversation.lastMessage &&
                          `: ${conversation.lastMessage}`}
                      </p>
                      <span className="conversation-time">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Pane - Chat Interface */}
          <div className="chat-pane">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="chat-header-user">
                    <div
                      className="chat-header-avatar"
                      onClick={() =>
                        navigate(
                          `/profile/${selectedConversation.otherUser.id}`
                        )
                      }
                      style={{ cursor: "pointer" }}
                      title="View profile"
                    >
                      {selectedConversation.otherUser.profile?.profile_image ? (
                        <img
                          src={
                            selectedConversation.otherUser.profile.profile_image
                          }
                          alt={selectedConversation.otherUser.full_name}
                          className="chat-header-avatar-img"
                        />
                      ) : (
                        <div className="chat-header-avatar-placeholder">
                          <span>🌐</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3
                        className="chat-header-name"
                        onClick={() =>
                          navigate(
                            `/profile/${selectedConversation.otherUser.id}`
                          )
                        }
                        style={{ cursor: "pointer" }}
                        title="View profile"
                      >
                        {selectedConversation.otherUser.full_name ||
                          selectedConversation.otherUser.username}
                      </h3>
                      {selectedConversation.offerId ||
                      selectedConversation.needId ? (
                        <div
                          className="chat-header-context"
                          onClick={() => {
                            const id =
                              selectedConversation.offerId ||
                              selectedConversation.needId;
                            const type = selectedConversation.offerId
                              ? "offer"
                              : "need";
                            navigate(`/${type}s/${id}`);
                          }}
                          style={{ cursor: "pointer" }}
                          title={`View ${selectedConversation.type}`}
                        >
                          <span className="chat-context-icon">
                            {selectedConversation.type === "offer"
                              ? "📦"
                              : "🙏"}
                          </span>
                          <span className="chat-context-text">
                            {selectedConversation.offerTitle ||
                              selectedConversation.needTitle}
                          </span>
                        </div>
                      ) : null}
                      {wsConnected ? (
                        <span className="connection-status connected">
                          ● Connected
                        </span>
                      ) : (
                        <span className="connection-status disconnected">
                          ○ Connecting...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    {/* Show handshake button only for interested/helping user (not creator) */}
                    {handshakeStatus === null &&
                      selectedConversation &&
                      !selectedConversation.isCreator && (
                        <button
                          className="handshake-button"
                          onClick={startHandshake}
                          title="Start Handshake"
                        >
                          🤝
                        </button>
                      )}
                    {handshakeStatus === "active" && (
                      <div className="handshake-status pending">
                        <span className="handshake-icon">🤝</span>
                        <span className="handshake-text">Pending Approval</span>
                        {/* Only creator can approve */}
                        {selectedConversation &&
                          selectedConversation.isCreator && (
                            <button
                              className="handshake-approve-button"
                              onClick={approveHandshake}
                            >
                              Approve
                            </button>
                          )}
                      </div>
                    )}
                    {handshakeStatus === "in_progress" && (
                      <div className="handshake-status approved">
                        <span className="handshake-icon">🤝</span>
                        <span className="handshake-text">Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages Area */}
                <div className="messages-area">
                  {loadingMessages ? (
                    <div className="messages-loading">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="messages-empty">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="messages-list">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`message-bubble ${
                            isMyMessage(message)
                              ? "message-sent"
                              : "message-received"
                          } ${message.is_system ? "message-system" : ""}`}
                        >
                          {!message.is_system && (
                            <div className="message-sender">
                              {isMyMessage(message)
                                ? "You"
                                : message.sender?.full_name ||
                                  message.sender?.username}
                            </div>
                          )}
                          <div className="message-content">
                            {message.content}
                          </div>
                          <div className="message-time">
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="message-input-container">
                  <form onSubmit={sendMessage} className="message-input-form">
                    <input
                      type="text"
                      className="message-input"
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      disabled={sendingMessage}
                    />
                    <button
                      type="submit"
                      className="message-send-button"
                      disabled={
                        !messageInput.trim() ||
                        sendingMessage ||
                        !selectedConversation ||
                        !wsConnected
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        sendMessage(e);
                      }}
                      title={!wsConnected ? "Connecting..." : "Send message"}
                    >
                      {sendingMessage
                        ? "..."
                        : wsConnected
                        ? "Send"
                        : "Connecting..."}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="chat-placeholder">
                <div className="chat-placeholder-content">
                  <span className="chat-placeholder-icon">💬</span>
                  <h3 className="chat-placeholder-title">
                    Select a conversation
                  </h3>
                  <p className="chat-placeholder-text">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Messages;
