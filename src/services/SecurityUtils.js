// ==================== 安全工具函数 ====================
export const SecurityUtils = {
    sanitizeInput: (input) => {
        if (!input || typeof input !== 'string') return '';
        return input.trim().replace(/[<>]/g, '');
    },

    validateApiResponse: (data, requiredFields) => {
        if (!data || typeof data !== 'object') return false;
        return requiredFields.every(field => field in data);
    },

    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

export default SecurityUtils;