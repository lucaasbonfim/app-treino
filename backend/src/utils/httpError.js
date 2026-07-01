class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.details = details;
    }
}

function badRequest(message, details) {
    return new HttpError(400, message, details);
}

function unauthorized(message = 'Não autorizado.') {
    return new HttpError(401, message);
}

function notFound(message = 'Registro não encontrado.') {
    return new HttpError(404, message);
}

function conflict(message) {
    return new HttpError(409, message);
}

module.exports = { HttpError, badRequest, unauthorized, notFound, conflict };

