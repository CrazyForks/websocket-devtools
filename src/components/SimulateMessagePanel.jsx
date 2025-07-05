import React, { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import JsonViewer from "./JsonViewer";

const SimulateMessagePanel = ({ connection, onSimulateMessage }) => {
  const [simulateDirection, setSimulateDirection] = useState("incoming");
  const [simulateMessage, setSimulateMessage] = useState('{\n  "message": "Hello World",\n  "timestamp": "2025-01-01T00:00:00Z"\n}');
  const [isSending, setIsSending] = useState(false);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 400, height: 500 });
  const windowRef = useRef(null);

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('simulateMessagePanel');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setSimulateDirection(parsed.direction || "incoming");
        setSimulateMessage(parsed.message || '{\n  "message": "Hello World",\n  "timestamp": "2025-01-01T00:00:00Z"\n}');
        setIsPinned(parsed.isPinned || false);
        setWindowPosition(parsed.position || { x: window.innerWidth - 420, y: 100 });
        setWindowSize(parsed.size || { width: 400, height: 500 });
      } catch (error) {
        console.error("Failed to load saved state:", error);
      }
    } else {
      // Default position
      setWindowPosition({ x: window.innerWidth - 420, y: 100 });
    }
  }, []);

  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    const stateToSave = {
      direction: simulateDirection,
      message: simulateMessage,
      isPinned,
      position: windowPosition,
      size: windowSize,
    };
    localStorage.setItem('simulateMessagePanel', JSON.stringify(stateToSave));
  }, [simulateDirection, simulateMessage, isPinned, windowPosition, windowSize]);

  // Handle click outside to close (only when not pinned)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isWindowOpen && !isPinned && windowRef.current && !windowRef.current.contains(event.target) && !event.target.closest('.floating-simulate-button')) {
        setIsWindowOpen(false);
      }
    };

    if (isWindowOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isWindowOpen, isPinned]);

  const handleSimulateMessage = async () => {
    if (!connection || !simulateMessage.trim() || isSending) {
      return;
    }

    setIsSending(true);

    try {
      await onSimulateMessage({
        connectionId: connection.id,
        message: simulateMessage,
        direction: simulateDirection,
      });
    } catch (error) {
      console.error("Failed to simulate message:", error);
    } finally {
      setTimeout(() => setIsSending(false), 1000);
    }
  };

  const handleMessageChange = (value) => {
    setSimulateMessage(value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSimulateMessage();
    }
  };

  const clearMessage = () => {
    setSimulateMessage("");
  };

  const toggleWindow = () => {
    setIsWindowOpen(!isWindowOpen);
  };

  const minimizeWindow = () => {
    setIsWindowOpen(false);
  };

  const togglePin = () => {
    setIsPinned(!isPinned);
  };

  const handleDragStop = (e, data) => {
    setWindowPosition({ x: data.x, y: data.y });
  };

  const handleResizeStop = (e, direction, ref, delta, position) => {
    setWindowSize({
      width: ref.style.width,
      height: ref.style.height,
    });
    setWindowPosition(position);
  };

  return (
    <>
      {/* Floating toggle button */}
      <div className={`floating-simulate-button ${isWindowOpen ? 'open' : ''}`} onClick={toggleWindow}>
        <div className="simulate-icon">
          {isWindowOpen ? '─' : '🎭'}
        </div>
        <div className="simulate-tooltip">
          {isWindowOpen ? 'Minimize Simulate' : 'Open Simulate'}
        </div>
      </div>

      {/* Draggable and resizable window */}
      {isWindowOpen && (
        <Rnd
          size={windowSize}
          position={windowPosition}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
          minWidth={300}
          minHeight={350}
          maxWidth={1500}
          maxHeight={1200}
          bounds="parent"
          dragHandleClassName="simulate-window-header"
          className="simulate-floating-window"
          style={{
            zIndex: 1000,
          }}
        >
          <div className="simulate-window-container" ref={windowRef}>
            {/* Window header - draggable area */}
            <div className={`simulate-window-header ${isPinned ? 'pinned' : ''}`}>
              <div className="simulate-window-title">
                <span className="simulate-icon-small">🎭</span>
                <span>Simulate Message</span>
                {connection && (
                  <span className="connection-indicator">
                    - {connection.url}
                  </span>
                )}
              </div>
              <div className="simulate-window-controls">
                <button 
                  className={`window-control-btn pin ${isPinned ? 'active' : ''}`}
                  onClick={togglePin}
                  title={isPinned ? "Unpin - Click outside to close" : "Pin - Prevent close on outside click"}
                >
                  {isPinned ? '📌' : '📌'}
                </button>
                <button 
                  className="window-control-btn minimize"
                  onClick={minimizeWindow}
                  title="Minimize"
                >
                  ─
                </button>
              </div>
            </div>

            {/* Window content */}
            <div className="simulate-window-content">
              {!connection ? (
                <div className="simulate-panel-empty floating">
                  <p>🔌 请先选择一个WebSocket连接</p>
                </div>
              ) : (
                <div className="simulate-content">
                  <div className="simulate-controls">
                    <div className="direction-control">
                      <label>Direction:</label>
                      <select
                        value={simulateDirection}
                        onChange={(e) => setSimulateDirection(e.target.value)}
                        disabled={isSending}
                      >
                        <option value="incoming">📥 Simulate Incoming</option>
                        <option value="outgoing">📤 Simulate Outgoing</option>
                      </select>
                    </div>
                  </div>

                  <div className="simulate-input-container">
                    <div className="simulate-input-editor" onKeyDown={handleKeyPress}>
                      <JsonViewer
                        data={simulateMessage}
                        readOnly={false}
                        onChange={handleMessageChange}
                        showControls={true}
                        className="simulate-editor"
                      />
                    </div>
                  </div>

                  <div className="simulate-actions">
                    <div className="simulate-buttons">
                      <button
                        className={`simulate-btn ${simulateDirection}`}
                        onClick={handleSimulateMessage}
                        disabled={!simulateMessage.trim() || isSending}
                      >
                        {isSending
                          ? "⏳ Sending..."
                          : simulateDirection === "incoming"
                          ? "📥 Simulate Receive"
                          : "📤 Simulate Send"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Rnd>
      )}
    </>
  );
};

export default SimulateMessagePanel;
