function notFound(req, res) {
    res.status(404).json({ message: 'Rota não encontrada.' });
}

function errorHandler(error, req, res, next) {
    if (process.env.NODE_ENV !== 'test') console.error(error);

    if (error.status) {
        return res.status(error.status).json({
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
        });
    }

    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'O corpo da requisição contém JSON inválido.' });
    }

    if (error.code === '23505') {
        return res.status(409).json({ message: 'Já existe um registro com esses dados.' });
    }

    if (error.code === '23503') {
        return res.status(400).json({ message: 'A referência informada é inválida.' });
    }

    return res.status(500).json({ message: 'Erro interno do servidor.' });
}

module.exports = { notFound, errorHandler };

