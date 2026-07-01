const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const { unauthorized } = require('../utils/httpError');

module.exports = async function authMiddleware(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
        throw unauthorized('Token de autenticação não fornecido.');
    }

    const token = authorization.slice(7);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userRepository.findById(payload.id);

        if (!user) throw unauthorized('Usuário do token não existe.');
        req.user = user;
        next();
    } catch (error) {
        if (error.status) throw error;
        throw unauthorized('Token inválido ou expirado.');
    }
};

