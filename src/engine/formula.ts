export interface CalculationFormulas {
  writeOff: string;
  donation: string;
  deductionUsed: string;
  nowTaxable: string;
  optionTaxable: string;
  taxSaved: string;
  cashOut: string;
  net: string;
}

export type FormulaKey = keyof CalculationFormulas;

export const FORMULA_KEYS: FormulaKey[] = [
  'writeOff',
  'donation',
  'deductionUsed',
  'nowTaxable',
  'optionTaxable',
  'taxSaved',
  'cashOut',
  'net',
];

const NAMES = [
  'agi',
  'standard',
  'qbi',
  'gasOil',
  'writeOffRate',
  'multiplier',
  'contribution',
  'writeOff',
  'donation',
  'deductionUsed',
  'nowTaxable',
  'optionTaxable',
  'nowTax',
  'optionTax',
  'taxSaved',
  'cashOut',
  'net',
] as const;

export type FormulaName = (typeof NAMES)[number];

const NAME_SET = new Set<string>(NAMES);

export function defaultFormulas(): CalculationFormulas {
  return {
    writeOff: 'writeOffRate > 0 ? agi * writeOffRate : contribution * multiplier',
    donation: 'writeOffRate > 0 ? writeOff / 5 : contribution',
    deductionUsed: 'max(standard, writeOff)',
    nowTaxable: 'max(0, agi - standard - qbi)',
    optionTaxable: 'max(0, agi - deductionUsed - qbi - gasOil)',
    taxSaved: 'nowTax - optionTax',
    cashOut: 'donation + gasOil',
    net: 'taxSaved - cashOut',
  };
}

export interface FlowInputs {
  agi: number;
  standard: number;
  qbi: number;
  gasOil: number;
  writeOffRate: number;
  multiplier: number;
  contribution: number;
}

export type FormulaScope = FlowInputs & {
  writeOff: number;
  donation: number;
  deductionUsed: number;
  nowTaxable: number;
  optionTaxable: number;
  nowTax: number;
  optionTax: number;
  taxSaved: number;
  cashOut: number;
  net: number;
};

type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'name'; name: string }
  | { kind: 'neg'; expr: Expr }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr }
  | { kind: 'cmp'; op: '>' | '<' | '>=' | '<=' | '==' | '!='; left: Expr; right: Expr }
  | { kind: 'cond'; cond: Expr; yes: Expr; no: Expr }
  | { kind: 'call'; name: 'max' | 'min'; args: [Expr, Expr] };

class FormulaError extends Error {}

class Parser {
  private index = 0;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  parse(): Expr {
    const expr = this.ternary();
    this.skip();
    if (this.index < this.source.length) throw new FormulaError('Unexpected text in the formula.');
    return expr;
  }

  private skip(): void {
    while (this.source[this.index] === ' ' || this.source[this.index] === '\n' || this.source[this.index] === '\t') {
      this.index += 1;
    }
  }

  private ternary(): Expr {
    const cond = this.comparison();
    this.skip();
    if (this.source[this.index] !== '?') return cond;
    this.index += 1;
    const yes = this.ternary();
    this.skip();
    if (this.source[this.index] !== ':') throw new FormulaError('Finish the ? : with the other result.');
    this.index += 1;
    const no = this.ternary();
    return { kind: 'cond', cond, yes, no };
  }

  private comparison(): Expr {
    const left = this.addition();
    this.skip();
    const op = this.comparisonOp();
    if (!op) return left;
    const right = this.addition();
    return { kind: 'cmp', op, left, right };
  }

  private comparisonOp(): '>' | '<' | '>=' | '<=' | '==' | '!=' | null {
    const two = this.source.slice(this.index, this.index + 2);
    if (two === '>=' || two === '<=' || two === '==' || two === '!=') {
      this.index += 2;
      return two;
    }
    const one = this.source[this.index];
    if (one === '>' || one === '<') {
      this.index += 1;
      return one;
    }
    return null;
  }

  private addition(): Expr {
    let left = this.product();
    for (;;) {
      this.skip();
      const op = this.source[this.index];
      if (op !== '+' && op !== '-') return left;
      this.index += 1;
      left = { kind: 'bin', op, left, right: this.product() };
    }
  }

  private product(): Expr {
    let left = this.unary();
    for (;;) {
      this.skip();
      const op = this.source[this.index];
      if (op !== '*' && op !== '/') return left;
      this.index += 1;
      left = { kind: 'bin', op, left, right: this.unary() };
    }
  }

  private unary(): Expr {
    this.skip();
    if (this.source[this.index] === '-') {
      this.index += 1;
      return { kind: 'neg', expr: this.unary() };
    }
    return this.primary();
  }

  private primary(): Expr {
    this.skip();
    const char = this.source[this.index];
    if (char === '(') {
      this.index += 1;
      const inner = this.ternary();
      this.skip();
      if (this.source[this.index] !== ')') throw new FormulaError('Close the parenthesis.');
      this.index += 1;
      return inner;
    }
    if (char != null && char >= '0' && char <= '9') return this.number();
    if (char != null && /[A-Za-z_]/.test(char)) return this.nameOrCall();
    throw new FormulaError('Enter a number, a name, or a calculation.');
  }

  private number(): Expr {
    const start = this.index;
    while (this.source[this.index] != null && this.source[this.index]! >= '0' && this.source[this.index]! <= '9') {
      this.index += 1;
    }
    if (this.source[this.index] === '.') {
      this.index += 1;
      const fraction = this.index;
      while (this.source[this.index] != null && this.source[this.index]! >= '0' && this.source[this.index]! <= '9') {
        this.index += 1;
      }
      if (this.index === fraction) throw new FormulaError('Finish the decimal number.');
    }
    return { kind: 'num', value: Number(this.source.slice(start, this.index)) };
  }

  private nameOrCall(): Expr {
    const start = this.index;
    while (this.source[this.index] != null && /[A-Za-z0-9_]/.test(this.source[this.index]!)) this.index += 1;
    const name = this.source.slice(start, this.index);
    this.skip();
    if (this.source[this.index] !== '(') {
      if (!NAME_SET.has(name)) throw new FormulaError(`"${name}" is not a value in this plan.`);
      return { kind: 'name', name };
    }
    if (name !== 'max' && name !== 'min') throw new FormulaError('Only max and min can be used as functions.');
    this.index += 1;
    const first = this.ternary();
    this.skip();
    if (this.source[this.index] !== ',') throw new FormulaError(`${name} needs two values.`);
    this.index += 1;
    const second = this.ternary();
    this.skip();
    if (this.source[this.index] !== ')') throw new FormulaError(`Close ${name}(...).`);
    this.index += 1;
    return { kind: 'call', name, args: [first, second] };
  }
}

function evaluateExpr(expr: Expr, scope: Partial<FormulaScope>): number {
  switch (expr.kind) {
    case 'num':
      return expr.value;
    case 'name': {
      const value = scope[expr.name as FormulaName];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new FormulaError(`"${expr.name}" is not ready in this step.`);
      }
      return value;
    }
    case 'neg':
      return -evaluateExpr(expr.expr, scope);
    case 'bin': {
      const left = evaluateExpr(expr.left, scope);
      const right = evaluateExpr(expr.right, scope);
      if (expr.op === '+') return left + right;
      if (expr.op === '-') return left - right;
      if (expr.op === '*') return left * right;
      if (right === 0) throw new FormulaError('Cannot divide by zero.');
      return left / right;
    }
    case 'cmp': {
      const left = evaluateExpr(expr.left, scope);
      const right = evaluateExpr(expr.right, scope);
      const pass =
        expr.op === '>'
          ? left > right
          : expr.op === '<'
            ? left < right
            : expr.op === '>='
              ? left >= right
              : expr.op === '<='
                ? left <= right
                : expr.op === '=='
                  ? left === right
                  : left !== right;
      return pass ? 1 : 0;
    }
    case 'cond':
      return evaluateExpr(expr.cond, scope) !== 0
        ? evaluateExpr(expr.yes, scope)
        : evaluateExpr(expr.no, scope);
    case 'call': {
      const first = evaluateExpr(expr.args[0], scope);
      const second = evaluateExpr(expr.args[1], scope);
      return expr.name === 'max' ? Math.max(first, second) : Math.min(first, second);
    }
    default:
      throw new FormulaError('That formula could not run.');
  }
}

export function formulaProblem(source: string): string | null {
  const text = source.trim();
  if (text === '') return 'Enter a formula.';
  if (text.length > 180) return 'Keep the formula under 180 characters.';
  try {
    new Parser(text).parse();
    return null;
  } catch (error) {
    return error instanceof FormulaError ? error.message : 'That formula could not be read.';
  }
}

export function explainFormula(
  source: string,
  scope: Partial<FormulaScope>,
): { ok: true; value: number } | { ok: false; error: string } {
  const problem = formulaProblem(source);
  if (problem) return { ok: false, error: problem };
  try {
    const value = evaluateExpr(new Parser(source.trim()).parse(), scope);
    if (!Number.isFinite(value)) return { ok: false, error: 'The formula did not produce a finite number.' };
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error instanceof FormulaError ? error.message : 'That formula could not run.' };
  }
}

function run(source: string, fallback: string, scope: Partial<FormulaScope>): number {
  const next = explainFormula(source, scope);
  if (next.ok) return next.value;
  const builtIn = explainFormula(fallback, scope);
  return builtIn.ok ? builtIn.value : 0;
}

export function normalizeFormulas(value: unknown): CalculationFormulas {
  const defaults = defaultFormulas();
  if (!value || typeof value !== 'object') return defaults;
  const record = value as Partial<Record<FormulaKey, unknown>>;
  const next = { ...defaults };
  for (const key of FORMULA_KEYS) {
    const raw = record[key];
    if (typeof raw === 'string' && formulaProblem(raw) == null) next[key] = raw.trim();
  }
  return next;
}

export function applyInputFormulas(
  input: FlowInputs,
  formulas: CalculationFormulas = defaultFormulas(),
): Pick<FormulaScope, 'writeOff' | 'donation' | 'deductionUsed' | 'nowTaxable' | 'optionTaxable'> {
  const builtIn = defaultFormulas();
  const scope: Partial<FormulaScope> = { ...input };
  scope.writeOff = run(formulas.writeOff, builtIn.writeOff, scope);
  scope.donation = run(formulas.donation, builtIn.donation, scope);
  scope.deductionUsed = run(formulas.deductionUsed, builtIn.deductionUsed, scope);
  scope.nowTaxable = run(formulas.nowTaxable, builtIn.nowTaxable, scope);
  scope.optionTaxable = run(formulas.optionTaxable, builtIn.optionTaxable, scope);
  return {
    writeOff: scope.writeOff,
    donation: scope.donation,
    deductionUsed: scope.deductionUsed,
    nowTaxable: scope.nowTaxable,
    optionTaxable: scope.optionTaxable,
  };
}

export function applyResultFormulas(
  scope: Partial<FormulaScope>,
  formulas: CalculationFormulas = defaultFormulas(),
): Pick<FormulaScope, 'taxSaved' | 'cashOut' | 'net'> {
  const builtIn = defaultFormulas();
  const next: Partial<FormulaScope> = { ...scope };
  next.taxSaved = run(formulas.taxSaved, builtIn.taxSaved, next);
  next.cashOut = run(formulas.cashOut, builtIn.cashOut, next);
  next.net = run(formulas.net, builtIn.net, next);
  return { taxSaved: next.taxSaved, cashOut: next.cashOut, net: next.net };
}
