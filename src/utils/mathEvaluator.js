// 安全的数学表达式计算器 - 替代 Function constructor
// 支持基本的数学运算，避免 eval 安全风险

const ALLOWED_OPERATORS = ['+', '-', '*', '/', '(', ')', '.', ' '];
const ALLOWED_FUNCTIONS = ['Math.sin', 'Math.cos', 'Math.tan', 'Math.sqrt', 'Math.pow', 'Math.PI', 'Math.E'];

export const safeMathEvaluator = (expression) => {
    try {
        // 基本安全检查
        if (!expression || typeof expression !== 'string') {
            return 0;
        }

        // 移除所有空格
        const cleanExpression = expression.replace(/\s/g, '');

        // 检查是否只包含安全字符
        const safeChars = /^[0-9+\-*/().\s]+$/;
        if (!safeChars.test(cleanExpression)) {
            console.warn('Expression contains unsafe characters:', expression);
            return 0;
        }

        // 检查括号匹配
        let openParens = 0;
        for (const char of cleanExpression) {
            if (char === '(') openParens++;
            if (char === ')') openParens--;
            if (openParens < 0) return 0; // 括号不匹配
        }
        if (openParens !== 0) return 0; // 括号不匹配

        // 使用更安全的方式计算简单表达式
        return evaluateSimpleExpression(cleanExpression);
    } catch (error) {
        console.error('Math evaluation error:', error);
        return 0;
    }
};

// 简单表达式计算器（递归下降解析）
function evaluateSimpleExpression(expr) {
    // 移除外层括号
    expr = expr.trim();
    while (expr.startsWith('(') && expr.endsWith(')')) {
        expr = expr.slice(1, -1).trim();
    }

    // 处理加减法（最低优先级）
    for (let i = expr.length - 1; i >= 0; i--) {
        if ((expr[i] === '+' || expr[i] === '-') && i > 0) {
            const left = expr.slice(0, i);
            const right = expr.slice(i + 1);
            const leftVal = evaluateSimpleExpression(left);
            const rightVal = evaluateSimpleExpression(right);
            return expr[i] === '+' ? leftVal + rightVal : leftVal - rightVal;
        }
    }

    // 处理乘除法（中等优先级）
    for (let i = expr.length - 1; i >= 0; i--) {
        if ((expr[i] === '*' || expr[i] === '/') && i > 0) {
            const left = expr.slice(0, i);
            const right = expr.slice(i + 1);
            const leftVal = evaluateSimpleExpression(left);
            const rightVal = evaluateSimpleExpression(right);
            return expr[i] === '*' ? leftVal * rightVal : leftVal / rightVal;
        }
    }

    // 基础数字
    const num = parseFloat(expr);
    return isNaN(num) ? 0 : num;
}

// 预定义的安全数学函数
export const safeMathFunctions = {
    add: (a, b) => Number(a) + Number(b),
    subtract: (a, b) => Number(a) - Number(b),
    multiply: (a, b) => Number(a) * Number(b),
    divide: (a, b) => Number(b) !== 0 ? Number(a) / Number(b) : 0,
    power: (a, b) => Math.pow(Number(a), Number(b)),
    sqrt: (a) => Math.sqrt(Number(a)),
    sin: (a) => Math.sin(Number(a)),
    cos: (a) => Math.cos(Number(a)),
    tan: (a) => Math.tan(Number(a)),
};

// 主要导出函数 - 用于替代 Function constructor
export const evaluateExpression = (expression, parameters = {}) => {
    try {
        // 如果表达式包含参数，先替换参数值
        let processedExpression = expression;

        if (parameters && typeof parameters === 'object') {
            Object.keys(parameters).forEach(paramName => {
                const paramValue = Number(parameters[paramName]) || 0;
                processedExpression = processedExpression.replace(
                    new RegExp(paramName, 'g'),
                    paramValue.toString()
                );
            });
        }

        // 使用安全的数学计算器
        return safeMathEvaluator(processedExpression);
    } catch (error) {
        console.error('Expression evaluation failed:', error);
        return 0;
    }
};

// 默认导出
export default evaluateExpression;