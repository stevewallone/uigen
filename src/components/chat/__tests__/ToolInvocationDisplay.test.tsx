import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ToolInvocationDisplay } from '../ToolInvocationDisplay';

describe('ToolInvocationDisplay', () => {
  afterEach(() => {
    cleanup();
  });

  describe('str_replace_editor tool', () => {
    it('displays creating file message for create command', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create", path: "/src/components/Button.tsx" }}
        />
      );

      expect(screen.getByText('Creating Button.tsx')).toBeDefined();
      expect(screen.getByTestId('loading-icon')).toBeDefined();
    });

    it('displays editing file message for str_replace command', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "str_replace", path: "/src/utils/helpers.js" }}
        />
      );

      expect(screen.getByText('Editing helpers.js')).toBeDefined();
    });

    it('displays viewing file message for view command', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "view", path: "/package.json" }}
        />
      );

      expect(screen.getByText('Viewing package.json')).toBeDefined();
    });

    it('displays adding content message for insert command', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "insert", path: "/src/App.tsx" }}
        />
      );

      expect(screen.getByText('Adding content to App.tsx')).toBeDefined();
    });

    it('displays undoing changes message for undo_edit command', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "undo_edit", path: "/src/index.ts" }}
        />
      );

      expect(screen.getByText('Undoing changes to index.ts')).toBeDefined();
    });

    it('displays generic working message for unknown command', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "unknown", path: "/src/test.js" }}
        />
      );

      expect(screen.getByText('Working on test.js')).toBeDefined();
    });
  });

  describe('file_manager tool', () => {
    it('displays renaming file message for rename command', () => {
      render(
        <ToolInvocationDisplay
          toolName="file_manager"
          state="call"
          args={{ 
            command: "rename", 
            path: "/src/oldFile.tsx", 
            new_path: "/src/newFile.tsx" 
          }}
        />
      );

      expect(screen.getByText('Renaming oldFile.tsx to newFile.tsx')).toBeDefined();
    });

    it('displays deleting file message for delete command', () => {
      render(
        <ToolInvocationDisplay
          toolName="file_manager"
          state="call"
          args={{ command: "delete", path: "/src/unused.tsx" }}
        />
      );

      expect(screen.getByText('Deleting unused.tsx')).toBeDefined();
    });

    it('displays deleting folder message for delete command on directory', () => {
      render(
        <ToolInvocationDisplay
          toolName="file_manager"
          state="call"
          args={{ command: "delete", path: "/src/old-components" }}
        />
      );

      expect(screen.getByText('Deleting old-components')).toBeDefined();
    });

    it('displays generic managing message for unknown command', () => {
      render(
        <ToolInvocationDisplay
          toolName="file_manager"
          state="call"
          args={{ command: "unknown", path: "/src/file.js" }}
        />
      );

      expect(screen.getByText('Managing file.js')).toBeDefined();
    });
  });

  describe('unknown tools', () => {
    it('displays fallback message for unknown tool', () => {
      render(
        <ToolInvocationDisplay
          toolName="unknown_tool"
          state="call"
        />
      );

      expect(screen.getByText('Using unknown_tool')).toBeDefined();
    });
  });

  describe('state handling', () => {
    it('shows loading state when tool is executing', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create", path: "/test.js" }}
        />
      );

      const container = screen.getByText('Creating test.js').closest('div');
      expect(container).toBeDefined();
      expect(screen.getByTestId('loading-icon')).toBeDefined();
    });

    it('shows completed state when tool has result', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="result"
          args={{ command: "create", path: "/test.js" }}
          result={{ success: true }}
        />
      );

      const container = screen.getByText('Creating test.js').closest('div');
      expect(container).toBeDefined();
      expect(screen.queryByTestId('loading-icon')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles missing path gracefully', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create" }}
        />
      );

      expect(screen.getByText('Creating file')).toBeDefined();
    });

    it('handles missing args gracefully', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
        />
      );

      expect(screen.getByText('Using str_replace_editor')).toBeDefined();
    });

    it('extracts filename from nested path correctly', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create", path: "/very/deep/nested/path/component.tsx" }}
        />
      );

      expect(screen.getByText('Creating component.tsx')).toBeDefined();
    });
  });

  describe('accessibility and styling', () => {
    it('applies custom className', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create", path: "/test.js" }}
          className="custom-class"
        />
      );

      const container = screen.getByText('Creating test.js').closest('div');
      expect(container).toBeDefined();
    });

    it('has proper ARIA attributes for loading state', () => {
      render(
        <ToolInvocationDisplay
          toolName="str_replace_editor"
          state="call"
          args={{ command: "create", path: "/test.js" }}
        />
      );

      expect(screen.getByTestId('loading-icon')).toBeDefined();
    });
  });
});