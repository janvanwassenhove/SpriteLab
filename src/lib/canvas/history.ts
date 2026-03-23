/**
 * Command-pattern undo/redo system for the pixel editor.
 */

export interface UndoCommand {
  /** Description for UI display */
  label: string;
  /** Layer ID that was modified */
  layerId: string;
  /** Snapshot of the layer data before the action */
  before: Uint8ClampedArray;
  /** Snapshot of the layer data after the action */
  after: Uint8ClampedArray;
}

export class HistoryManager {
  private undoStack: UndoCommand[] = [];
  private redoStack: UndoCommand[] = [];
  private maxDepth: number;

  constructor(maxDepth = 100) {
    this.maxDepth = maxDepth;
  }

  push(command: UndoCommand) {
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action
    this.redoStack = [];
  }

  undo(): UndoCommand | null {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    this.redoStack.push(cmd);
    return cmd;
  }

  redo(): UndoCommand | null {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    this.undoStack.push(cmd);
    return cmd;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get undoCount() { return this.undoStack.length; }
  get redoCount() { return this.redoStack.length; }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
