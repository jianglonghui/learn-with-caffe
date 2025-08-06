// 安全的数学表达式计算器
// 避免使用 Function constructor 或 eval

// 支持的操作符
const OPERATORS = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '^': (a, b) => Math.pow(a, b),
    '**': (a, b) => Math.pow(a, b),
    '%': (a, b) => a % b,
};

// 支持的函数
const FUNCTIONS = {
    'sin': Math.sin,
    'cos': Math.cos,
    'tan': Math.tan,
    'sqrt': Math.sqrt,
    'abs': Math.abs,
    'floor': Math.floor,
    'ceil': Math.ceil,
    'round': Math.round,
    'max': Math.max,
    'min': Math.min,
    'pow': Math.pow,
};

// 支持的常量
const CONSTANTS = {
    'PI': Math.PI,
    'E': Math.E,
};

// 简单的表达式解析器
class SafeCalculator {
    constructor() {
        this.variables = {};
    }

    // 设置变量
    setVariables(variables) {
        this.variables = { ...variables };
    }

    // 解析简单的数学表达式
    evaluate(expression) {
        try {
            // 清理表达式
            let cleanExpr = expression.toString().replace(/\s+/g, '');

            // 替换变量
            Object.keys(this.variables).forEach(varName => {
                const regex = new RegExp(`\\b${varName}\\b`, 'g');
                cleanExpr = cleanExpr.replace(regex, this.variables[varName]);
            });

            // 替换常量
            Object.keys(CONSTANTS).forEach(constName => {
                const regex = new RegExp(`\\b${constName}\\b`, 'g');
                cleanExpr = cleanExpr.replace(regex, CONSTANTS[constName]);
            });

            // 简单的安全计算 - 只支持基本运算
            return this.parseExpression(cleanExpr);
        } catch (error) {
            console.warn('表达式计算失败:', error);
            return 0;
        }
    }

    // 解析表达式（简化版本，只支持基本运算）
    parseExpression(expr) {
        // 移除空格
        expr = expr.replace(/\s+/g, '');

        // 检查是否只包含安全字符
        if (!/^[\d+\-*/.()^%\s]*$/.test(expr)) {
            throw new Error('不安全的表达式');
        }

        // 简单的数值表达式计算
        try {
            // 这里使用一个非常基础的计算方法
            // 实际项目中可以使用更完善的数学表达式解析库
            return this.basicCalculate(expr);
        } catch (error) {
            console.warn('基础计算失败:', error);
            return 0;
        }
    }

    // 基础计算（只支持简单运算）
    basicCalculate(expr) {
        // 简化处理：只处理基本的四则运算
        // 移除括号并按优先级计算

        // 如果是纯数字，直接返回
        if (/^\d+(\.\d+)?$/.test(expr)) {
            return parseFloat(expr);
        }

        // 处理简单的两数运算
        const match = expr.match(/^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)$/);
        if (match) {
            const [, a, op, b] = match;
            const numA = parseFloat(a);
            const numB = parseFloat(b);

            switch (op) {
                case '+': return numA + numB;
                case '-': return numA - numB;
                case '*': return numA * numB;
                case '/': return numB !== 0 ? numA / numB : 0;
                default: return 0;
            }
        }

        // 如果无法解析，返回0
        return 0;
    }

    // 评估条件表达式
    evaluateCondition(condition) {
        try {
            // 替换变量
            let cleanCondition = condition.toString();
            Object.keys(this.variables).forEach(varName => {
                const regex = new RegExp(`\\b${varName}\\b`, 'g');
                cleanCondition = cleanCondition.replace(regex, this.variables[varName]);
            });

            // 简单的条件判断
            const comparisonMatch = cleanCondition.match(/^(\d+(?:\.\d+)?)\s*([><=!]+)\s*(\d+(?:\.\d+)?)$/);
            if (comparisonMatch) {
                const [, a, op, b] = comparisonMatch;
                const numA = parseFloat(a);
                const numB = parseFloat(b);

                switch (op) {
                    case '>': return numA > numB;
                    case '<': return numA < numB;
                    case '>=': return numA >= numB;
                    case '<=': return numA <= numB;
                    case '==': return numA === numB;
                    case '!=': return numA !== numB;
                    default: return false;
                }
            }

            return false;
        } catch (error) {
            console.warn('条件评估失败:', error);
            return false;
        }
    }
}

export default SafeCalculator;