import { VariableReference, BlockData, ValidationError } from '../types';

/**
 * VariableSystem handles parsing and resolving variable references in prompts.
 * Variables use the syntax [BlockNumber] to reference upstream block outputs.
 */
export class VariableSystem {
  // Regular expression to match variable syntax: [A01], [B02], etc.
  private static readonly VARIABLE_REGEX = /\[([A-Z]\d{2})\]/g;

  /**
   * Parses a prompt string to find all variable references
   */
  parseVariables(prompt: string): VariableReference[] {
    const variables: VariableReference[] = [];
    let match;

    // Reset regex state
    VariableSystem.VARIABLE_REGEX.lastIndex = 0;

    while ((match = VariableSystem.VARIABLE_REGEX.exec(prompt)) !== null) {
      variables.push({
        variable: match[0],        // Full match like "[A01]"
        blockNumber: match[1],     // Captured group like "A01"
        position: [match.index, match.index + match[0].length]
      });
    }

    return variables;
  }

  /**
   * Resolves variables in a prompt using provided block data context
   */
  resolveVariables(prompt: string, context: BlockData[]): string {
    // Create a map for quick lookup
    const dataMap = new Map(context.map(data => [data.blockNumber, data.content]));

    return prompt.replace(VariableSystem.VARIABLE_REGEX, (match, blockNumber) => {
      const content = dataMap.get(blockNumber);
      return content !== undefined ? content : match; // Keep original if not found
    });
  }

  /**
   * Validates variables in a prompt against available blocks
   */
  validateVariables(prompt: string, availableBlocks: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const variables = this.parseVariables(prompt);
    const availableSet = new Set(availableBlocks);

    for (const variable of variables) {
      if (!availableSet.has(variable.blockNumber)) {
        errors.push({
          type: 'invalid_variable',
          message: `Variable ${variable.variable} references unavailable block ${variable.blockNumber}`
        });
      }
    }

    return errors;
  }

  /**
   * Gets available variables for a specific block based on its connections
   */
  getAvailableVariables(blockId: string, upstreamData: BlockData[]): string[] {
    return upstreamData.map(data => data.blockNumber).sort();
  }

  /**
   * Generates variable suggestions for UI display
   */
  generateVariableSuggestions(availableBlocks: string[]): Array<{
    variable: string;
    description: string;
    example: string;
  }> {
    return availableBlocks.map(blockNumber => ({
      variable: `[${blockNumber}]`,
      description: `Output from block ${blockNumber}`,
      example: `Use [${blockNumber}] to reference the content from block ${blockNumber}`
    }));
  }

  /**
   * Checks if a prompt contains any variables
   */
  hasVariables(prompt: string): boolean {
    VariableSystem.VARIABLE_REGEX.lastIndex = 0;
    return VariableSystem.VARIABLE_REGEX.test(prompt);
  }

  /**
   * Gets unique variable references (removes duplicates)
   */
  getUniqueVariables(prompt: string): string[] {
    const variables = this.parseVariables(prompt);
    const unique = new Set(variables.map(v => v.blockNumber));
    return Array.from(unique).sort();
  }

  /**
   * Replaces a specific variable in a prompt
   */
  replaceVariable(prompt: string, blockNumber: string, replacement: string): string {
    const variablePattern = new RegExp(`\\[${blockNumber}\\]`, 'g');
    return prompt.replace(variablePattern, replacement);
  }

  /**
   * Escapes a string to be safely used as variable content
   */
  escapeVariableContent(content: string): string {
    // Remove or escape characters that might break prompt formatting
    return content
      .replace(/\[/g, '(')  // Replace [ with (
      .replace(/\]/g, ')')  // Replace ] with )
      .trim();
  }

  /**
   * Validates variable syntax (for input validation)
   */
  isValidVariableSyntax(variable: string): boolean {
    const fullPattern = /^\[([A-Z]\d{2})\]$/;
    return fullPattern.test(variable);
  }

  /**
   * Extracts block number from variable syntax
   */
  extractBlockNumber(variable: string): string | null {
    const match = variable.match(/^\[([A-Z]\d{2})\]$/);
    return match ? match[1] : null;
  }
}

// Singleton instance for global use
export const variableSystem = new VariableSystem();