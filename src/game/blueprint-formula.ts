// Formula syntax gate shared by the blueprint validator and the
// Lab Exhibit assembler. Constrains formulas to a tiny safe alphabet
// (no quotes, no statements, no escapes) so they can be inlined as JS
// expressions during server-side assembly without an eval surface.

const ALLOWED_FORMULA_TOKENS = /^[\s\d\w+\-*/().,]+$/;

export function isFormulaSafe(formula: string): boolean {
  return ALLOWED_FORMULA_TOKENS.test(formula);
}
