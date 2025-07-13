"use client"

import React, { useState, useCallback } from "react";
import { 
  Settings, 
  Monitor, 
  Server, 
  Play, 
  AlertTriangle, 
  X, 
  Clock, 
  Wifi, 
  WifiOff 
} from "lucide-react";
import "../styles/SystemEventsTab.css";
import { t } from "../utils/i18n";

const SystemEventsTab = ({ connection, onSimulateSystemEvent }) => {
  const [activeTab, setActiveTab] = useState("client");
  const [closeCode, setCloseCode] = useState("1000");
  const [closeReason, setCloseReason] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [customCodeMode, setCustomCodeMode] = useState(false);
  const [serverCloseCode, setServerCloseCode] = useState("1000");
  const [serverCloseReason, setServerCloseReason] = useState("");
  const [serverCustomCodeMode, setServerCustomCodeMode] = useState(false);

  // 关闭代码选项
  const closeCodeOptions = [
    { value: "1000", label: t("system.closeCode.1000") },
    { value: "1001", label: t("system.closeCode.1001") },
    { value: "1002", label: t("system.closeCode.1002") },
    { value: "1008", label: t("system.closeCode.1008") },
    { value: "1009", label: t("system.closeCode.1009") },
    { value: "1011", label: t("system.closeCode.1011") },
    { value: "custom", label: t("system.closeCode.custom") },
  ];

  // 获取关闭码的说明信息
  const getCloseCodeInfo = (code) => {
    const numCode = parseInt(code);
    if (numCode === 1000) {
      return { type: "success", message: t("system.closeCodeInfo.normal") };
    } else if (numCode >= 1001 && numCode <= 2999) {
      return { type: "warning", message: t("system.closeCodeInfo.protocol") };
    } else if (numCode >= 3000 && numCode <= 4999) {
      return { type: "success", message: t("system.closeCodeInfo.application") };
    } else {
      return { type: "error", message: t("system.closeCodeInfo.invalid") };
    }
  };

  // 处理系统事件模拟
  const handleSimulateEvent = useCallback(async (eventType, options = {}) => {
    if (!connection || isExecuting) return;

    setIsExecuting(true);
    
    try {
      await onSimulateSystemEvent({
        connectionId: connection.id,
        eventType,
        ...options
      });
    } catch (error) {
      console.error("Failed to simulate system event:", error);
    } finally {
      setTimeout(() => setIsExecuting(false), 500);
    }
  }, [connection, isExecuting, onSimulateSystemEvent]);

  // Client事件处理器
  const handleClientClose = () => {
    handleSimulateEvent("client-close", {
      code: parseInt(closeCode),
      reason: closeReason || t("system.events.close.clientInitiated")
    });
  };

  const handleClientError = (errorType) => {
    const errorDetails = {
      "connection-failed": { code: "ECONNREFUSED", message: t("system.events.error.connectionFailed") },
      "network-disconnect": { code: "ENETUNREACH", message: t("system.events.error.networkDisconnect") },
      "protocol-error": { code: "EPROTO", message: t("system.events.error.protocolError") },
      "timeout-error": { code: "ETIMEDOUT", message: t("system.events.error.timeoutError") }
    };

    handleSimulateEvent("client-error", {
      errorType,
      ...errorDetails[errorType]
    });
  };

  // Server事件处理器
  const handleServerClose = (closeType) => {
    if (closeType === "custom") {
      handleSimulateEvent("server-close", {
        code: parseInt(serverCloseCode),
        reason: serverCloseReason || t("system.events.close.serverInitiated")
      });
    } else {
      const closeDetails = {
        "normal-server-close": { code: 1000, reason: t("system.events.close.serverNormal") },
        "policy-violation": { code: 1008, reason: t("system.events.close.policyViolation") },
        "heartbeat-timeout": { code: 1011, reason: t("system.events.close.heartbeatTimeout") },
        "auth-failure": { code: 4001, reason: t("system.events.close.authFailure") }
      };

      handleSimulateEvent("server-close", closeDetails[closeType]);
    }
  };

  const handleServerError = (errorType) => {
    const errorDetails = {
      "message-format-error": { code: 1003, message: t("system.events.error.messageFormatError") },
      "client-disconnect": { code: 1006, message: t("system.events.error.clientDisconnect") },
      "internal-server-error": { code: 1011, message: t("system.events.error.internalServerError") },
      "resource-exhausted": { code: 1013, message: t("system.events.error.resourceExhausted") }
    };

    handleSimulateEvent("server-error", {
      errorType,
      ...errorDetails[errorType]
    });
  };

  if (!connection) {
    return (
      <div className="sys-evt-empty">
        <div className="sys-evt-empty-state">
          <Wifi size={48} className="sys-evt-empty-icon" />
          <h4>{t("system.noConnectionTitle")}</h4>
          <p>{t("system.noConnection")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="system-events-tab">
      <div className="sys-evt-header">
        <div className="sys-evt-header-content">
          <Settings className="sys-evt-header-icon" />
          <div className="sys-evt-header-text">
            <h2>{t("system.title")}</h2>
            <p>{t("system.description")}</p>
            <div className="sys-evt-label sys-evt-label-warning" style={{marginTop: 6, fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', padding: '6px 10px', borderRadius: 4, fontWeight: 500}}>
              {t('system.closeEvent.notice')}
            </div>
          </div>
        </div>
      </div>

      <div className="sys-evt-content">
        <div className="sys-evt-tabs-container">
          <div className="sys-evt-tabs-list">
            <button
              className={`sys-evt-tab-trigger ${activeTab === "client" ? "active" : ""}`}
              onClick={() => setActiveTab("client")}
            >
              <Monitor size={16} />
              {t("system.tabs.client")}
            </button>
            <button
              className={`sys-evt-tab-trigger ${activeTab === "server" ? "active" : ""}`}
              onClick={() => setActiveTab("server")}
            >
              <Server size={16} />
              {t("system.tabs.server")}
            </button>
          </div>

          <div className="sys-evt-tab-content">
            {activeTab === "client" && (
              <div className="sys-evt-client-events">
                <div className="sys-evt-events-grid">
                  {/* Close Events Card */}
                  <div className="sys-evt-event-card sys-evt-close-events">
                    <div className="sys-evt-card-header">
                      <div className="sys-evt-card-title">
                        <X className="sys-evt-card-icon sys-evt-close-icon" />
                        {t("system.events.close.title")}
                      </div>
                      <div className="sys-evt-card-description">
                        {t("system.events.close.description")}
                      </div>
                    </div>
                    <div className="sys-evt-card-content">
                      <div className="sys-evt-form-group">
                        <label className="sys-evt-form-label">{t("system.events.close.code")}</label>
                        {!customCodeMode ? (
                          <select 
                            className="sys-evt-form-select"
                            value={closeCode}
                            onChange={(e) => {
                              if (e.target.value === "custom") {
                                setCustomCodeMode(true);
                                setCloseCode("3000");
                              } else {
                                setCloseCode(e.target.value);
                              }
                            }}
                          >
                            {closeCodeOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="sys-evt-custom-code-container">
                            <input
                              type="number"
                              className="sys-evt-form-input"
                              placeholder={t("system.events.close.codePlaceholder")}
                              value={closeCode}
                              onChange={(e) => setCloseCode(e.target.value)}
                              min="1000"
                              max="4999"
                            />
                            <button
                              className="sys-evt-reset-button"
                              onClick={() => {
                                setCustomCodeMode(false);
                                setCloseCode("1000");
                              }}
                              title={t("system.tooltips.resetToPreset")}
                            >
                              ↺
                            </button>
                          </div>
                        )}
                        {closeCode && (
                          <div className={`sys-evt-code-info sys-evt-code-info-${getCloseCodeInfo(closeCode).type}`}>
                            {getCloseCodeInfo(closeCode).message}
                          </div>
                        )}
                      </div>
                      <div className="sys-evt-form-group">
                        <label className="sys-evt-form-label">{t("system.events.close.reason")}</label>
                        <input
                          type="text"
                          className="sys-evt-form-input"
                          placeholder={t("system.events.close.reasonPlaceholder")}
                          value={closeReason}
                          onChange={(e) => setCloseReason(e.target.value)}
                        />
                      </div>
                      <button
                        className="sys-evt-event-button sys-evt-close-button"
                        onClick={handleClientClose}
                        disabled={isExecuting}
                      >
                        <Play size={16} />
                        {t("system.events.close.simulate")}
                      </button>
                    </div>
                  </div>

                  {/* Error Events Card */}
                  <div className="sys-evt-event-card sys-evt-error-events">
                    <div className="sys-evt-card-header">
                      <div className="sys-evt-card-title">
                        <AlertTriangle className="sys-evt-card-icon sys-evt-error-icon" />
                        {t("system.events.error.title")}
                      </div>
                      <div className="sys-evt-card-description">
                        {t("system.events.error.description")}
                      </div>
                    </div>
                    <div className="sys-evt-card-content">
                      <div className="sys-evt-error-buttons">
                        <button
                          className="sys-evt-event-button sys-evt-error-button"
                          onClick={() => handleClientError("connection-failed")}
                          disabled={isExecuting}
                        >
                          <Wifi size={16} />
                          {t("system.events.error.connectionFailed")}
                        </button>
                        <button
                          className="sys-evt-event-button sys-evt-error-button"
                          onClick={() => handleClientError("network-disconnect")}
                          disabled={isExecuting}
                        >
                          <WifiOff size={16} />
                          {t("system.events.error.networkDisconnect")}
                        </button>
                        <button
                          className="sys-evt-event-button sys-evt-error-button"
                          onClick={() => handleClientError("protocol-error")}
                          disabled={isExecuting}
                        >
                          <AlertTriangle size={16} />
                          {t("system.events.error.protocolError")}
                        </button>
                        <button
                          className="sys-evt-event-button sys-evt-error-button"
                          onClick={() => handleClientError("timeout-error")}
                          disabled={isExecuting}
                        >
                          <Clock size={16} />
                          {t("system.events.error.timeoutError")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "server" && (
              <div className="sys-evt-server-events">
                <div className="sys-evt-events-grid">
                  {/* Server Close Card */}
                  <div className="sys-evt-event-card sys-evt-close-events">
                    <div className="sys-evt-card-header">
                      <div className="sys-evt-card-title">
                        <X className="sys-evt-card-icon sys-evt-close-icon" />
                        {t("system.events.close.serverTitle")}
                      </div>
                      <div className="sys-evt-card-description">
                        {t("system.events.close.serverDescription")}
                      </div>
                    </div>
                    <div className="sys-evt-card-content">
                      <div className="sys-evt-form-group">
                        <label className="sys-evt-form-label">{t("system.events.close.serverCode")}</label>
                        {!serverCustomCodeMode ? (
                          <select 
                            className="sys-evt-form-select"
                            value={serverCloseCode}
                            onChange={(e) => {
                              if (e.target.value === "custom") {
                                setServerCustomCodeMode(true);
                                setServerCloseCode("1001");
                              } else {
                                setServerCloseCode(e.target.value);
                              }
                            }}
                          >
                            {closeCodeOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            <option value="4001">{t("system.closeCode.4001")}</option>
                          </select>
                        ) : (
                          <div className="sys-evt-custom-code-container">
                            <input
                              type="number"
                              className="sys-evt-form-input"
                              placeholder={t("system.events.close.serverCodePlaceholder")}
                              value={serverCloseCode}
                              onChange={(e) => setServerCloseCode(e.target.value)}
                              min="1000"
                              max="4999"
                            />
                            <button
                              className="sys-evt-reset-button"
                              onClick={() => {
                                setServerCustomCodeMode(false);
                                setServerCloseCode("1000");
                              }}
                              title={t("system.tooltips.resetToPreset")}
                            >
                              ↺
                            </button>
                          </div>
                        )}
                        <div className="sys-evt-code-info sys-evt-code-info-success">
                          {t("system.closeCodeInfo.serverSupport")}
                        </div>
                      </div>
                      <div className="sys-evt-form-group">
                        <label className="sys-evt-form-label">{t("system.events.close.serverReason")}</label>
                        <input
                          type="text"
                          className="sys-evt-form-input"
                          placeholder={t("system.events.close.serverReasonPlaceholder")}
                          value={serverCloseReason}
                          onChange={(e) => setServerCloseReason(e.target.value)}
                        />
                      </div>
                      <button
                        className="sys-evt-event-button sys-evt-close-button"
                        onClick={() => handleServerClose("custom")}
                        disabled={isExecuting}
                      >
                        <Play size={16} />
                        {t("system.events.close.serverSimulate")}
                      </button>
                    </div>
                  </div>

                  {/* Server Errors Card */}
                  <div className="sys-evt-event-card sys-evt-error-events">
                    <div className="sys-evt-card-header">
                      <div className="sys-evt-card-title">
                        <AlertTriangle className="sys-evt-card-icon sys-evt-error-icon" />
                        {t("system.events.error.serverTitle")}
                      </div>
                      <div className="sys-evt-card-description">
                        {t("system.events.error.serverDescription")}
                      </div>
                    </div>
                    <div className="sys-evt-card-content">
                      <div className="sys-evt-error-buttons">
                        <button
                          className="sys-evt-event-button sys-evt-error-button"
                          onClick={() => handleServerError("message-format-error")}
                          disabled={isExecuting}
                        >
                          <AlertTriangle size={16} />
                          {t("system.events.error.messageFormatError")}
                        </button>
                        <button
                          className="sys-evt-event-button sys-evt-error-button"
                          onClick={() => handleServerError("client-disconnect")}
                          disabled={isExecuting}
                        >
                          <WifiOff size={16} />
                          {t("system.events.error.clientDisconnect")}
                        </button>
                        <button
                          className="sys-evt-event-button sys-evt-error-button"
                          onClick={() => handleServerError("internal-server-error")}
                          disabled={isExecuting}
                        >
                          <Settings size={16} />
                          {t("system.events.error.internalServerError")}
                        </button>
                        <button
                          className="sys-evt-event-button sys-evt-error-button"
                          onClick={() => handleServerError("resource-exhausted")}
                          disabled={isExecuting}
                        >
                          <Server size={16} />
                          {t("system.events.error.resourceExhausted")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemEventsTab; 