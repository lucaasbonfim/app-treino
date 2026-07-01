const { badRequest } = require('./httpError');

function requiredText(value, field, maxLength) {
    const text = String(value ?? '').trim();
    if (!text) throw badRequest(`${field} é obrigatório.`);
    if (text.length > maxLength) {
        throw badRequest(`${field} deve ter no máximo ${maxLength} caracteres.`);
    }
    return text;
}

function optionalText(value, field, maxLength) {
    if (value === undefined || value === null || value === '') return null;
    const text = String(value).trim();
    if (text.length > maxLength) {
        throw badRequest(`${field} deve ter no máximo ${maxLength} caracteres.`);
    }
    return text || null;
}

function integer(value, field, { min, max, optional = false } = {}) {
    if (optional && (value === undefined || value === null || value === '')) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) throw badRequest(`${field} deve ser um número inteiro.`);
    if (min !== undefined && parsed < min) throw badRequest(`${field} deve ser no mínimo ${min}.`);
    if (max !== undefined && parsed > max) throw badRequest(`${field} deve ser no máximo ${max}.`);
    return parsed;
}

function decimal(value, field, { min, max, optional = false } = {}) {
    if (optional && (value === undefined || value === null || value === '')) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw badRequest(`${field} deve ser um número válido.`);
    if (min !== undefined && parsed < min) throw badRequest(`${field} deve ser no mínimo ${min}.`);
    if (max !== undefined && parsed > max) throw badRequest(`${field} deve ser no máximo ${max}.`);
    return parsed;
}

function id(value, field = 'ID') {
    return integer(value, field, { min: 1 });
}

module.exports = { requiredText, optionalText, integer, decimal, id };

