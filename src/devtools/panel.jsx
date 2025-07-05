import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import ControlPanel from "../components/ControlPanel.jsx";
import WebSocketList from "../components/WebSocketList.jsx";
import MessageDetails from "../components/MessageDetails.jsx";
import FloatingSimulate from "../components/FloatingSimulate.jsx";
import "../styles/panel.css";

const WebSocketPanel = () => {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [websocketEvents, setWebsocketEvents] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  
  // 分离连接管理和消息管理
  const [connectionsMap, setConnectionsMap] = useState(new Map()); // 所有连接的基础信息（包括active和inactive）
  
  // 消息去重机制
  const processedMessageIds = useRef(new Set());
  
  useEffect(() => {
    // 监听来自 background script 的消息
    const messageListener = (message, sender, sendResponse) => {
      console.log("🎯 Panel received message:", message, "MessageID:", message.messageId, Date.now());

      if (message.type === "websocket-event") {
        const eventData = message.data;
        const messageId = message.messageId;
        
        // 基于messageId的去重机制
        if (messageId && processedMessageIds.current.has(messageId)) {
          console.log("🚫 Duplicate message detected by ID, skipping:", messageId);
          sendResponse({ received: true, duplicate: true, messageId });
          return;
        }
        
        // 添加到已处理集合
        if (messageId) {
          processedMessageIds.current.add(messageId);
          console.log("✅ Message ID added to processed set:", messageId);
        }
        
        console.log("📊 Processing WebSocket event:", eventData);

        // 更新连接信息
        setConnectionsMap((prevConnections) => {
          const newConnections = new Map(prevConnections);
          
          if (eventData.type === "connection" || eventData.type === "open") {
            // 创建或更新连接为active状态
            newConnections.set(eventData.id, {
              id: eventData.id,
              url: eventData.url,
              status: eventData.type === "connection" ? "connecting" : "open",
              timestamp: eventData.timestamp,
              lastActivity: eventData.timestamp,
            });
            console.log("📊 Created/Updated connection:", eventData.id, "Status:", eventData.type);
          } else if (eventData.type === "close" || eventData.type === "error") {
            // 更新连接为inactive状态，如果连接不存在则创建它
            const existing = newConnections.get(eventData.id);
            newConnections.set(eventData.id, {
              id: eventData.id,
              url: existing?.url || eventData.url || "Unknown URL",
              status: eventData.type, // "close" 或 "error"
              timestamp: existing?.timestamp || eventData.timestamp,
              lastActivity: eventData.timestamp,
            });
            console.log("📊 Updated connection to inactive:", eventData.id, "Status:", eventData.type);
          } else if (eventData.type === "message") {
            // 更新最后活动时间（对于消息事件）
            const existing = newConnections.get(eventData.id);
            if (existing) {
              newConnections.set(eventData.id, {
                ...existing,
                lastActivity: eventData.timestamp,
              });
            }
          }
          
          return newConnections;
        });

        setWebsocketEvents((prevEvents) => {
          const newEvents = [...prevEvents, eventData];
          console.log("📈 Total WebSocket events:", newEvents.length);
          return newEvents;
        });
      }

      sendResponse({ received: true, messageId: message.messageId });
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const handleStartMonitoring = () => {
    console.log("🚀 Starting WebSocket monitoring...");
    setIsMonitoring(true);

    // 发送开始监控消息到 background script
    chrome.runtime
      .sendMessage({
        type: "start-monitoring",
      })
      .then((response) => {
        console.log("✅ Start monitoring response:", response);
      })
      .catch((error) => {
        console.error("❌ Failed to start monitoring:", error);
      });
  };

  const handleStopMonitoring = () => {
    console.log("⏹️ Stopping WebSocket monitoring...");
    setIsMonitoring(false);

    // 发送停止监控消息到 background script
    chrome.runtime
      .sendMessage({
        type: "stop-monitoring",
      })
      .then((response) => {
        console.log("✅ Stop monitoring response:", response);
      })
      .catch((error) => {
        console.error("❌ Failed to stop monitoring:", error);
      });
  };

  const handleClearConnections = () => {
    console.log("🗑️ Clearing all WebSocket connections and events...");
    setWebsocketEvents([]);
    setConnectionsMap(new Map());
    setSelectedConnectionId(null);
  };

  const handleClearMessages = (connectionId) => {
    console.log("🗑️ Clearing all messages and events for connection:", connectionId);
    setWebsocketEvents((prevEvents) => {
      // 移除目标连接的所有事件（消息和系统事件都清除）
      return prevEvents.filter((event) => event.id !== connectionId);
    });
    // 连接基础信息保留在connections Map中，所以连接仍会显示在列表中
  };

  const handleSelectConnection = (connectionId) => {
    console.log("👆 Selected connection:", connectionId);
    setSelectedConnectionId(connectionId);
  };

  const handleSimulateMessage = async ({
    connectionId,
    message,
    direction,
  }) => {
    console.log("🎭 Simulating message:", { connectionId, message, direction });

    try {
      const response = await chrome.runtime.sendMessage({
        type: "simulate-message",
        data: {
          connectionId,
          message,
          direction,
        },
      });

      console.log("✅ Simulate message response:", response);
      return response;
    } catch (error) {
      console.error("❌ Failed to simulate message:", error);
      throw error;
    }
  };

  // 获取选中连接的所有消息和事件
  const getSelectedConnectionData = () => {
    if (!selectedConnectionId) return null;

    // 从connectionsMap获取连接基本信息
    const connectionInfo = connectionsMap.get(selectedConnectionId);
    if (!connectionInfo) return null;

    // 获取该连接的所有事件/消息
    const connectionMessages = websocketEvents.filter(
      (event) => event.id === selectedConnectionId
    );

    return {
      id: selectedConnectionId,
      url: connectionInfo.url,
      messages: connectionMessages,
    };
  };

  const selectedConnection = getSelectedConnectionData();

  return (
    <div className="websocket-panel">
      <div className="panel-header">
        <h1>🔌 WebSocket Monitor</h1>
        <div className="panel-status">
          {isMonitoring ? (
            <span className="status active">🟢 Monitoring Active</span>
          ) : (
            <span className="status inactive">🔴 Monitoring Stopped</span>
          )}
        </div>
      </div>

      <PanelGroup direction="horizontal" className="panel-content">
        {/* 左侧垂直布局：ControlPanel + WebSocketList */}
        <Panel
          defaultSize={30}
          minSize={20}
          maxSize={50}
          className="panel-left-section"
        >
          <PanelGroup direction="vertical">
            <Panel
              defaultSize={30}
              minSize={12}
              maxSize={40}
              className="control-panel-container"
            >
              <div className="panel-wrapper">
                <div className="panel-title">
                  <h3>🎛️ Control Panel</h3>
                </div>
                <div className="panel-body">
                  <ControlPanel
                    isMonitoring={isMonitoring}
                    onStartMonitoring={handleStartMonitoring}
                    onStopMonitoring={handleStopMonitoring}
                  />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="panel-resize-handle horizontal" />

            <Panel className="websocket-list-container">
              <div className="panel-wrapper">
                <div className="panel-title">
                  <h3>🔗 Websocket Connections</h3>
                  {connectionsMap.size > 0 && (
                    <button
                      className="panel-title-btn"
                      onClick={handleClearConnections}
                      title="Clear all WebSocket connections and events"
                    >
                      🗑️ Clear All
                    </button>
                  )}
                </div>
                <div className="panel-body">
                  <WebSocketList
                    websocketEvents={websocketEvents}
                    connectionsMap={connectionsMap}
                    selectedConnectionId={selectedConnectionId}
                    onSelectConnection={handleSelectConnection}
                    onClearConnections={handleClearConnections}
                  />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="panel-resize-handle vertical" />

        {/* 右侧：MessageDetails */}
        <Panel className="panel-right-section">
          <div className="panel-wrapper">
            <div className="panel-title">
              <h3>💬 Message Details</h3>
            </div>
            <div className="panel-body">
              <MessageDetails
                connection={selectedConnection}
                onSimulateMessage={handleSimulateMessage}
                onClearMessages={handleClearMessages}
              />
            </div>
          </div>
        </Panel>
      </PanelGroup>

      {/* 悬浮模拟消息窗口 */}
      <FloatingSimulate
        connection={selectedConnection}
        onSimulateMessage={handleSimulateMessage}
      />
    </div>
  );
};

// 渲染到 DOM
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<WebSocketPanel />);
