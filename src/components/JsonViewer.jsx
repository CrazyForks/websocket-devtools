import React, { useState, useMemo, useCallback, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {
  WrapText,
  Minimize2,
  Hash,
  Copy,
  Edit,
  CheckCircle,
  SquareStack,
  Star,
  CloudUpload,
  Layers2,
} from "lucide-react";
import { t } from "../utils/i18n.js";
import "../styles/JsonViewer.css";


const JsonViewer = ({
  data,
  className = "",
  showControls = true,
  onCopy = null,
  copyButtonText = t("jsonViewer.controls.copy"),
  copiedText = t("jsonViewer.controls.copied"),
  isCopied: isCopiedProp = false,
  readOnly = true,
  onChange = null,
  enableWrap = true,
  enableNestedParse = true,
  onAddToFavorites = null,
  showFavoritesButton = false,
  onSimulate = null,
}) => {
  const [textWrap, setTextWrap] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [nestedParse, setNestedParse] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  // 添加调试信息
  console.log("🔍 JsonViewer render:", {
    showControls,
    onCopy: !!onCopy,
    showFavoritesButton,
    className,
    readOnly,
  });

  // Recursively parse nested JSON strings
  const parseNestedJson = useCallback((obj) => {
    if (typeof obj === "string") {
      try {
        const parsed = JSON.parse(obj);
        // Recursively parse nested JSON
        return parseNestedJson(parsed);
      } catch {
        return obj;
      }
    } else if (Array.isArray(obj)) {
      return obj.map((item) => parseNestedJson(item));
    } else if (obj && typeof obj === "object") {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = parseNestedJson(value);
      }
      return result;
    }
    return obj;
  }, []);

  // Detect and parse JSON
  const {
    isValidJson,
    parsedData,
    displayData,
    nestedParsedData,
    hasNestedData,
  } = useMemo(() => {
    console.log(
      "🔍 JsonViewer: Recalculating data for:",
      data?.substring(0, 100) + "..."
    );

    if (!data || typeof data !== "string") {
      return {
        isValidJson: false,
        parsedData: null,
        displayData: String(data || ""),
        nestedParsedData: null,
        hasNestedData: false,
      };
    }

    try {
      const parsed = JSON.parse(data);
      const nestedParsed = parseNestedJson(parsed);

      // Check if nested parsing actually found nested JSON
      const hasNestedData =
        JSON.stringify(parsed) !== JSON.stringify(nestedParsed);

      console.log("🔍 JsonViewer: Parsed data", {
        hasNestedData,
        parsedDataLength: JSON.stringify(parsed).length,
        nestedParsedDataLength: JSON.stringify(nestedParsed).length,
      });

      return {
        isValidJson: true,
        parsedData: parsed,
        displayData: data,
        nestedParsedData: nestedParsed,
        hasNestedData,
      };
    } catch {
      return {
        isValidJson: false,
        parsedData: null,
        displayData: data,
        nestedParsedData: null,
        hasNestedData: false,
      };
    }
  }, [data, parseNestedJson, forceUpdate]);

  // Get display content
  const getDisplayContent = () => {
    if (!isValidJson) {
      return displayData;
    }

    // Apply formatting and transformations
    const jsonData = nestedParse ? nestedParsedData : parsedData;
    return JSON.stringify(jsonData, null, collapsed ? 0 : 2);
  };

  const handleCopyClick = () => {
    const copyData = getDisplayContent();
    if (onCopy) {
      onCopy(copyData);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      // 默认的copy实现
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(copyData)
          .then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          })
          .catch((err) => {
            fallbackCopyTextToClipboard(copyData);
          });
      } else {
        fallbackCopyTextToClipboard(copyData);
      }
    }
  };

  // 传统的copy方法（降级方案）
  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        console.log("📋 Text copied to clipboard via execCommand");
      } else {
        console.error("Failed to copy text via execCommand");
      }
    } catch (err) {
      console.error("Failed to copy text:", err);
    }

    document.body.removeChild(textArea);
  };

  const handleAddToFavorites = () => {
    if (onAddToFavorites) {
      const favoriteData = getDisplayContent();
      onAddToFavorites(favoriteData);
    }
  };

  const handleChange = useCallback(
    (value) => {
      if (onChange && !readOnly) {
        if (nestedParse) {
          try {
            // Try to parse and apply nested parsing
            const parsed = JSON.parse(value);
            const nestedParsed = parseNestedJson(parsed);
            const formattedContent = JSON.stringify(
              nestedParsed,
              null,
              collapsed ? 0 : 2
            );
            onChange(formattedContent);
            return;
          } catch (error) {
            // If parsing fails, use original value
          }
        }
        onChange(value);
      }
    },
    [onChange, readOnly, nestedParse, parseNestedJson, collapsed]
  );

  // Handle formatting changes in edit mode
  const handleFormatChange = useCallback(
    (newCollapsed, newNestedParse) => {
      console.log("🔄 JsonViewer: handleFormatChange called", {
        newCollapsed,
        newNestedParse,
        readOnly,
        hasOnChange: !!onChange,
        isValidJson,
      });

      if (!readOnly && onChange && isValidJson) {
        try {
          const jsonData = newNestedParse ? nestedParsedData : parsedData;
          const formattedContent = JSON.stringify(
            jsonData,
            null,
            newCollapsed ? 0 : 2
          );
          console.log("🔄 JsonViewer: Calling onChange with formatted content");
          onChange(formattedContent);
        } catch (error) {
          console.error("Error formatting JSON:", error);
        }
      }
    },
    [readOnly, onChange, isValidJson, nestedParsedData, parsedData]
  );

  const handleCollapsedChange = useCallback(
    (e) => {
      const newCollapsed = e.target.checked;
      setCollapsed(newCollapsed);
      handleFormatChange(newCollapsed, nestedParse);
    },
    [handleFormatChange, nestedParse]
  );

  const handleNestedParseChange = useCallback(
    (newNestedParse) => {
      console.log("🔄 JsonViewer: handleNestedParseChange called", {
        newNestedParse,
        currentNestedParse: nestedParse,
        hasNestedData,
      });

      setNestedParse(newNestedParse);
      handleFormatChange(collapsed, newNestedParse);

      // Force a re-render to ensure UI updates
      setForceUpdate((prev) => prev + 1);
    },
    [handleFormatChange, collapsed, nestedParse, hasNestedData]
  );

  // Reset nestedParse when data changes and has no nested data
  useEffect(() => {
    if (isValidJson && !hasNestedData && nestedParse) {
      console.log(
        "🔄 JsonViewer: Auto-disabling nested parse (no nested data found)"
      );
      setNestedParse(false);
    }
  }, [isValidJson, hasNestedData, nestedParse]);

  const content = getDisplayContent();

  // CodeMirror extensions configuration
  const extensions = [
    isValidJson ? json() : [],
    EditorView.theme({
      "&": {
        fontSize: "12px",
        height: "100%",
        backgroundColor: "#262626", // 编辑器背景色
      },
      ".cm-editor": {
        height: "100%",
      },
      ".cm-scroller": {
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        lineHeight: "1.3",
        overflow: "auto",
      },
      ".cm-focused": {
        outline: "none",
      },
      ".cm-editor.cm-focused": {
        outline: "none",
      },
      ".cm-content": {
        padding: "8px",
        minHeight: "100%",
      },
      ".cm-gutters": {
        backgroundColor: "#333333", // 行号区域背景色
        borderRight: "1px solid #404040",
      },
      "&.cm-editor.cm-focused .cm-selectionBackground": {
        backgroundColor: "rgba(0, 122, 204, 0.3)",
      },
      ".cm-line": {
        lineHeight: "1.3",
      },
    }),
    textWrap ? EditorView.lineWrapping : [],
    EditorView.editable.of(!readOnly),
    EditorState.readOnly.of(readOnly),
  ].filter(Boolean);

  return (
    <div className={`json-viewer ${className}`}>
      {showControls && (
        <div className="json-viewer-controls">
          <div className="json-viewer-controls-left">
            {enableWrap && (
              <button
                onClick={() => setTextWrap(!textWrap)}
                className={`json-viewer-btn ${textWrap ? "json-viewer-btn-active-green" : "json-viewer-btn-inactive"}`}
                title={t("jsonViewer.tooltips.wrapText")}
              >
                <WrapText size={14} />
                <span>{t("jsonViewer.controls.wrap")}</span>
              </button>
            )}

            {enableNestedParse && (
              <button
                onClick={() => {
                  const newNestedParse = !nestedParse;
                  handleNestedParseChange(newNestedParse);
                }}
                className={`json-viewer-btn ${
                  nestedParse ? "json-viewer-btn-active-purple" : "json-viewer-btn-inactive"
                } ${!hasNestedData ? "json-viewer-btn-disabled" : ""}`}
                title={hasNestedData ? t("jsonViewer.tooltips.nestedParseJson") : t("jsonViewer.tooltips.noNestedData")}
                disabled={!hasNestedData}
              >
                <Layers2 size={14} />
                <span>{t("jsonViewer.controls.nestedParse")}</span>
              </button>
            )}
          </div>

          <div className="json-viewer-controls-right">
            {/* Action buttons */}
            <div className="json-viewer-action-buttons">

              {/* Simulate 按钮 */}
              {onSimulate && (
                <button
                  onClick={() => onSimulate(getDisplayContent())}
                  className="json-viewer-btn json-viewer-btn-inactive"
                  title={t("jsonViewer.tooltips.simulate") || "Simulate this message"}
                >
                  <CloudUpload size={14} />
                  <span>{t("jsonViewer.controls.simulate") || "Simulate"}</span>
                </button>
              )}

              <button
                onClick={handleCopyClick}
                className={`json-viewer-btn ${
                  isCopied
                    ? "json-viewer-btn-active-green"
                    : "json-viewer-btn-inactive"
                }`}
                title={isCopied ? (t("jsonViewer.tooltips.copied") || t("jsonViewer.controls.copied")) : (t("jsonViewer.tooltips.copy") || t("jsonViewer.controls.copy"))}
              >
                {isCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>

              {showFavoritesButton && onAddToFavorites && (
                <button
                  onClick={handleAddToFavorites}
                  className="json-viewer-btn json-viewer-btn-inactive"
                  title={t("jsonViewer.tooltips.addToFavorites")}
                >
                  <Star size={14} />
                </button>
              )}
            </div>

            {/* Divider if we have action buttons and status badges */}
            {(!readOnly || (readOnly && isValidJson) || hasNestedData) && <div className="json-viewer-divider" />}
            {/* Status badges */}
            {!readOnly && (
              <div className="json-viewer-badge json-viewer-badge-yellow">
                <Edit size={12} />
                <span>{t("jsonViewer.status.edit")}</span>
              </div>
            )}
            {readOnly && isValidJson && (
              <div className="json-viewer-badge json-viewer-badge-green">
                <CheckCircle size={12} />
                <span>{t("jsonViewer.status.json")}</span>
              </div>
            )}
            {/* Debug info */}
            {hasNestedData && (
              <div className="json-viewer-badge json-viewer-badge-blue">
                <Hash size={12} />
                <span>{t("jsonViewer.status.nested")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="json-viewer-container">
        <CodeMirror
          value={content}
          onChange={handleChange}
          extensions={extensions}
          theme={oneDark}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: !readOnly,
            bracketMatching: true,
            closeBrackets: !readOnly,
            autocompletion: !readOnly,
            highlightSelectionMatches: false,
            searchKeymap: true,
          }}
          className="json-viewer-codemirror"
        />
      </div>
    </div>
  );
};

export default JsonViewer;
