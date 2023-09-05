import React, { useCallback, useEffect, useRef, useState } from "react";

import { Stack, IStackStyles } from '@fluentui/react';
import Editor, { BeforeMount, OnMount, OnValidate } from "@monaco-editor/react";
import dirtyJson from "dirty-json";
import * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

import { ErrorMessageBar } from "./components/error-message-bar";
import { TitleBar } from "./components/title-bar";
import { ToolBar } from "./components/tool-bar";
import { BorderLine } from "./styles";
import {
  downloadJsonFile,
  minifyJsonString,
  prettifyJsonString,
  parseJsonSchemaString,
} from "./utils";
import { useToggle } from "../../hooks";
import { initializeIcons } from '@fluentui/react/lib/Icons';

interface JSONEditorProps {
  // eslint-disable-next-line react/require-default-props
  defaultValue?: string;
  // eslint-disable-next-line react/require-default-props
  schemaValue?: string;
  // eslint-disable-next-line react/require-default-props
  title?: string;
  // eslint-disable-next-line react/require-default-props
  path?: string;
  isSchemaSampleDataOn: boolean;
  // eslint-disable-next-line react/require-default-props
  onChange?: (value: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
type Monaco = typeof Monaco

const stackStyles: IStackStyles = {
  root: {
    height: "inherit",
    minHeight: "350px",
    borderTop: BorderLine,
    borderRight: BorderLine,
    borderBottom: BorderLine,
  },
};

interface RefObject extends Monaco.editor.ICodeEditor {
  _domElement?: HTMLElement;
}

export const JSONEditor: React.FC<JSONEditorProps> = ({
  defaultValue,
  schemaValue,
  title,
  path = "",
  isSchemaSampleDataOn,
  onChange,
}): JSX.Element => {
  // const monaco = useMonaco()
  const [monaco, setMonaco] = useState<Monaco>();
  const [errors, setErrors] = useState<string[]>([]);
  const [isAutoPrettifyOn, toggleAutoPrettifyOn] = useToggle(false);

  const [isValidJson, setIsValidJson] = useState<boolean>(false);
  const editorRef = useRef<RefObject | null>(null);

  const updateEditorLayout = useCallback(() => {
    // Type BUG: editor.IDimension.width & editor.IDimension.height should be "number"
    // but it needs to have "auto" otherwise layout can't be updated;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const editor: RefObject | null = editorRef.current;
    if (!editor) return;
    // Initialize layout's width and height
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    editor.layout({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      width: "auto",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      height: "auto"
    });
    // eslint-disable-next-line
    const editorEl = editor._domElement;
    if (!editorEl) return;
    const { width, height } = editorEl.getBoundingClientRect();
    // update responsive width and height
    editor.layout({
      width,
      height,
    });
  }, []);

  const handleJsonSchemasUpdate = useCallback(() => {
    monaco?.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: schemaValue
        ? [
            {
              uri: window.location.href, // id of the first schema
              fileMatch: ["*"], // associate with our model
              schema: {
                ...parseJsonSchemaString(schemaValue),
              },
            },
          ]
        : undefined,
    });
  }, [schemaValue, monaco]);

  const handleEditorPrettify = useCallback(() => {
    // @ts-ignore
    editorRef.current?.getAction("editor.action.formatDocument").run();
  }, []);

  const handleEditorUpdateValue = useCallback((value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setValue(value || "");
    // @ts-ignore
    value && editor.getAction("editor.action.formatDocument").run();
  }, []);

  const handleClearClick = () => editorRef.current?.setValue("");

  const handleEditorWillMount: BeforeMount = (monaco) => {
    setMonaco(monaco);
    handleJsonSchemasUpdate();
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setMonaco(monaco);
    editor.getModel()?.updateOptions({ tabSize: 2, insertSpaces: false });
    updateEditorLayout();

    window.addEventListener("resize", () => {
      // automaticLayout isn't working
      // https://github.com/suren-atoyan/monaco-react/issues/89#issuecomment-666581193
      // clear current layout
      updateEditorLayout();
    });

    // need to use formatted prettify json string
    defaultValue && handleEditorUpdateValue(prettifyJsonString(defaultValue));
  };

  useEffect(() => {
    handleEditorUpdateValue(defaultValue);
  }, [defaultValue, handleEditorUpdateValue]);

  useEffect(() => {
    handleJsonSchemasUpdate();
  }, [schemaValue, handleJsonSchemasUpdate]);

  useEffect(() => {
    updateEditorLayout();
  }, [isSchemaSampleDataOn, updateEditorLayout]);

  useEffect(() => {
    isAutoPrettifyOn && handleEditorPrettify();
  }, [isAutoPrettifyOn, handleEditorPrettify]);

  useEffect(() => {
    initializeIcons();
  });
  const handleEditorValidation: OnValidate = useCallback((markers) => {
    const errorMessage = markers.map(
      ({ startLineNumber, message }) => `line ${startLineNumber}: ${message}`
    );
    const hasContent = editorRef.current?.getValue();
    const hasError: boolean = errorMessage.length > 0;
    setIsValidJson(!!hasContent && !hasError);
    setErrors(errorMessage);
  }, []);

  const handleMinifyClick = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const value = editor.getValue();
    const minifiedValue = minifyJsonString(value);
    editor.setValue(minifiedValue);
  };

  const handleUploadClick = (file: File) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const result = fileReader.result as string;
      handleEditorUpdateValue(result);
    };
    fileReader.readAsText(file);
  };

  const handleDownloadClick = () => {
    const value = editorRef.current?.getValue();
    value && downloadJsonFile(value);
  };


  const handleEditorChange = useCallback(
    // @ts-ignore
    (value) => {
      isAutoPrettifyOn && handleEditorPrettify();
      onChange && onChange(value);
    },
    [isAutoPrettifyOn, handleEditorPrettify, onChange]
  );

  const handleFixClick = () => {
    const editor = editorRef.current;
    const value = editor && editor.getValue();
    const fixedValue = value && dirtyJson.parse(value);
    const formattedValue = fixedValue && prettifyJsonString(JSON.stringify(fixedValue));
    editor && editor.setValue(formattedValue);
  };

  return (
    <Stack styles={stackStyles}>
      {title && (
        <Stack.Item>
          <TitleBar title={title} />
        </Stack.Item>
      )}
      <Stack.Item>
        <ToolBar
          isValidJson={isValidJson}
          isAutoPrettifyOn={isAutoPrettifyOn}
          onAutoPrettifyChange={toggleAutoPrettifyOn}
          onClearClick={handleClearClick}
          onDownloadClick={handleDownloadClick}
          onMinifyClick={handleMinifyClick}
          onPrettifyClick={handleEditorPrettify}
          onUploadClick={handleUploadClick}
          onFixClick={handleFixClick}
        />
      </Stack.Item>
      <Stack styles={stackStyles}>
        <Stack.Item
          grow
          align="stretch"
          style={{
            height: `calc(100% - 20vh)`,
          }}
        >
          <Editor
            language="json"
            path={path}
            value={schemaValue}
            options={{
              automaticLayout: true,
              autoClosingBrackets: "always",
              autoClosingQuotes: "always",
              formatOnPaste: true,
              formatOnType: true,
              scrollBeyondLastLine: false,
            }}
            onMount={handleEditorDidMount}
            onChange={handleEditorChange}
            beforeMount={handleEditorWillMount}
            onValidate={handleEditorValidation}
            height={300}
          />
        </Stack.Item>
        <Stack.Item
          style={{
            height: `20vh`,
          }}
        >
          <ErrorMessageBar errors={errors} />
        </Stack.Item>
      </Stack>
    </Stack>
  );
};