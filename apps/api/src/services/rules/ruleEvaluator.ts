import {
  AtomicCondition,
  ConditionGroup,
  ConditionOperator,
  ConditionEvaluationResult,
  RuleEvaluationSummary,
} from '@repo/contracts';

export function isConditionGroup(c: AtomicCondition | ConditionGroup): c is ConditionGroup {
  return 'operator' in c && ('AND' === c.operator || 'OR' === c.operator) && 'conditions' in c;
}

export class RuleEvaluator {
  evaluateRule(
    scholarshipId: string,
    ruleVersion: string,
    ruleAst: ConditionGroup,
    facts: Record<string, unknown>
  ): RuleEvaluationSummary {
    const conditionResults: ConditionEvaluationResult[] = [];
    const overallPassed = this.evaluateGroup(ruleAst, facts, conditionResults);
    const hasMissingOrUncertainInputs = conditionResults.some((r) => r.isUnknownOrMissing);

    return {
      scholarshipId,
      ruleVersion,
      overallPassed: overallPassed && !hasMissingOrUncertainInputs,
      hasMissingOrUncertainInputs,
      conditionResults,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private evaluateGroup(
    group: ConditionGroup,
    facts: Record<string, unknown>,
    resultsCollector: ConditionEvaluationResult[]
  ): boolean {
    if (!group.conditions || group.conditions.length === 0) {
      return true;
    }

    if (group.operator === 'AND') {
      let allPassed = true;
      for (const cond of group.conditions) {
        if (isConditionGroup(cond)) {
          const subPassed = this.evaluateGroup(cond, facts, resultsCollector);
          if (!subPassed) allPassed = false;
        } else {
          const singleResult = this.evaluateAtomic(cond, facts);
          resultsCollector.push(singleResult);
          if (!singleResult.passed) {
            allPassed = false;
          }
        }
      }
      return allPassed;
    }

    if (group.operator === 'OR') {
      let anyPassed = false;
      const orCollector: ConditionEvaluationResult[] = [];
      for (const cond of group.conditions) {
        if (isConditionGroup(cond)) {
          const subPassed = this.evaluateGroup(cond, facts, orCollector);
          if (subPassed) anyPassed = true;
        } else {
          const singleResult = this.evaluateAtomic(cond, facts);
          orCollector.push(singleResult);
          if (singleResult.passed) {
            anyPassed = true;
          }
        }
      }
      resultsCollector.push(...orCollector);
      return anyPassed;
    }

    return false;
  }

  evaluateAtomic(cond: AtomicCondition, facts: Record<string, unknown>): ConditionEvaluationResult {
    const actual = facts[cond.field];

    if (actual === undefined || actual === null) {
      return {
        field: cond.field,
        expectedOperator: cond.operator,
        expectedValue: cond.value,
        actualValue: null,
        passed: false,
        isUnknownOrMissing: true,
        reason: `Missing input: Field '${cond.field}' was not provided or could not be extracted from documents.`,
      };
    }

    const passed = this.compare(actual, cond.operator, cond.value);
    const reason = passed
      ? `Condition met: ${cond.field} (${JSON.stringify(actual)}) ${cond.operator} ${JSON.stringify(cond.value)}`
      : `Condition failed: ${cond.field} (${JSON.stringify(actual)}) does not satisfy ${cond.operator} ${JSON.stringify(cond.value)}`;

    return {
      field: cond.field,
      expectedOperator: cond.operator,
      expectedValue: cond.value,
      actualValue: actual,
      passed,
      isUnknownOrMissing: false,
      reason,
    };
  }

  private compare(actual: unknown, operator: ConditionOperator, expected: unknown): boolean {
    switch (operator) {
      case ConditionOperator.EQ:
        return this.normalizeStringOrNumber(actual) === this.normalizeStringOrNumber(expected);

      case ConditionOperator.NEQ:
        return this.normalizeStringOrNumber(actual) !== this.normalizeStringOrNumber(expected);

      case ConditionOperator.GT: {
        const numActual = Number(actual);
        const numExpected = Number(expected);
        return !isNaN(numActual) && !isNaN(numExpected) && numActual > numExpected;
      }

      case ConditionOperator.GTE: {
        const numActual = Number(actual);
        const numExpected = Number(expected);
        return !isNaN(numActual) && !isNaN(numExpected) && numActual >= numExpected;
      }

      case ConditionOperator.LT: {
        const numActual = Number(actual);
        const numExpected = Number(expected);
        return !isNaN(numActual) && !isNaN(numExpected) && numActual < numExpected;
      }

      case ConditionOperator.LTE: {
        const numActual = Number(actual);
        const numExpected = Number(expected);
        return !isNaN(numActual) && !isNaN(numExpected) && numActual <= numExpected;
      }

      case ConditionOperator.IN: {
        if (!Array.isArray(expected)) return false;
        const normActual = this.normalizeStringOrNumber(actual);
        return expected.some((item) => this.normalizeStringOrNumber(item) === normActual);
      }

      case ConditionOperator.NOT_IN: {
        if (!Array.isArray(expected)) return false;
        const normActual = this.normalizeStringOrNumber(actual);
        return !expected.some((item) => this.normalizeStringOrNumber(item) === normActual);
      }

      case ConditionOperator.CONTAINS: {
        const strActual = String(actual).toLowerCase();
        const strExpected = String(expected).toLowerCase();
        return strActual.includes(strExpected);
      }

      default:
        return false;
    }
  }

  private normalizeStringOrNumber(val: unknown): string | number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      const asNum = Number(trimmed);
      if (!isNaN(asNum) && trimmed !== '') return asNum;
      return trimmed.toLowerCase();
    }
    return String(val).toLowerCase();
  }
}

export const ruleEvaluator = new RuleEvaluator();

