const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const verificationRepository = require('../repositories/emailVerification.repository');
const { sendVerificationCodeEmail, sendEmailChangeCode } = require('./email.service');
const { requiredText } = require('../utils/validation');
const {
    HttpError,
    badRequest,
    conflict,
    notFound,
    unauthorized,
} = require('../utils/httpError');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

function normalizeEmail(value) {
    return String(value ?? '').trim().toLowerCase();
}

function authResponse(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET não foi configurado.');
    }

    return {
        token: jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
        ),
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            weekly_goal_trainings: user.weekly_goal_trainings ?? 3,
        },
    };
}

function validateRegistration(payload) {
    const name = requiredText(payload.name, 'Nome', 100);
    const email = normalizeEmail(payload.email);
    const password = String(payload.password ?? '');

    if (!emailPattern.test(email)) throw badRequest('Informe um e-mail válido.');
    if (password.length < 6) throw badRequest('A senha deve ter pelo menos 6 caracteres.');
    if (password.length > 72) throw badRequest('A senha deve ter no máximo 72 caracteres.');

    return { name, email, password };
}

function verificationExpiryMinutes() {
    const minutes = Number(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || 15);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
        throw new Error('EMAIL_VERIFICATION_EXPIRY_MINUTES deve ser um inteiro entre 1 e 60.');
    }
    return minutes;
}

async function register(payload) {
    const { name, email, password } = validateRegistration(payload);
    const existing = await userRepository.findByEmail(email);
    if (existing) throw conflict('Este e-mail já está em uso.');

    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const expiresInMinutes = verificationExpiryMinutes();
    const code = crypto.randomInt(100000, 1000000).toString();

    await verificationRepository.removeByEmail(email);
    await verificationRepository.create({
        name,
        email,
        password_hash: await bcrypt.hash(password, rounds),
        code,
        expires_at: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    });

    await sendVerificationCodeEmail({
        to: email,
        name,
        code,
        expiresInMinutes,
    });

    return {
        message: 'Enviamos um código de confirmação para o seu e-mail.',
        email,
        expiresInMinutes,
    };
}

async function verifyRegisterCode(payload) {
    const email = normalizeEmail(payload.email);
    const code = String(payload.code ?? '').trim();

    if (!emailPattern.test(email)) throw badRequest('Informe um e-mail válido.');
    if (!/^\d{6}$/.test(code)) throw badRequest('Informe o código de 6 dígitos enviado por e-mail.');

    const pending = await verificationRepository.findByEmail(email);
    if (!pending) throw badRequest('Nenhum cadastro pendente foi encontrado para este e-mail.');

    if (new Date(pending.expires_at) < new Date()) {
        await verificationRepository.removeByEmail(email);
        throw badRequest('O código expirou. Solicite um novo para continuar.');
    }

    if (pending.code !== code) throw badRequest('Código de confirmação inválido.');

    const existing = await userRepository.findByEmail(email);
    if (existing) {
        await verificationRepository.removeByEmail(email);
        throw conflict('Este e-mail já está em uso.');
    }

    const user = await userRepository.create({
        name: pending.name,
        email,
        password: pending.password_hash,
    });
    await verificationRepository.removeByEmail(email);

    return user;
}

async function login(payload) {
    const email = normalizeEmail(payload.email);
    const password = String(payload.password ?? '');

    if (!email || !password) throw badRequest('Informe e-mail e senha.');

    const user = await userRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw unauthorized('E-mail ou senha inválidos.');
    }

    return authResponse(user);
}

// Valida o ID token no endpoint público do Google: ele já confere assinatura e
// expiração, então aqui só resta garantir que o token foi emitido para este app.
async function verifyGoogleCredential(credential, clientId) {
    let response;
    try {
        response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`);
    } catch {
        throw new HttpError(503, 'Não foi possível falar com o Google agora. Tente de novo.');
    }

    if (!response.ok) throw unauthorized('Não foi possível validar o login com Google.');

    const profile = await response.json();

    if (profile.aud !== clientId) {
        throw unauthorized('Este login do Google não pertence ao KorVix Gym.');
    }
    if (profile.email_verified !== 'true' && profile.email_verified !== true) {
        throw unauthorized('O e-mail da conta Google ainda não foi verificado.');
    }

    const email = normalizeEmail(profile.email);
    if (!emailPattern.test(email)) {
        throw unauthorized('A conta Google não retornou um e-mail válido.');
    }

    return email;
}

async function googleLogin(payload) {
    const clientId = String(process.env.GOOGLE_CLIENT_ID ?? '').trim();
    if (!clientId) throw new HttpError(503, 'Login com Google não está configurado no servidor.');

    const credential = String(payload.credential ?? '').trim();
    if (!credential) throw badRequest('Token do Google não informado.');

    const email = await verifyGoogleCredential(credential, clientId);

    // Sem cadastro automático: o 404 é o sinal para o app levar a pessoa ao
    // cadastro com nome e e-mail já preenchidos.
    const user = await userRepository.findByEmail(email);
    if (!user) throw notFound('Ainda não existe conta com este e-mail.');

    return authResponse(user);
}

async function updateName(userId, payload) {
    const name = requiredText(payload.name, 'Nome', 100);
    const user = await userRepository.update(userId, { name });
    return { message: 'Nome atualizado com sucesso.', user };
}

async function changePassword(userId, payload) {
    const currentPassword = String(payload.currentPassword ?? '');
    const newPassword = String(payload.newPassword ?? '');
    if (!currentPassword) throw badRequest('Informe a senha atual.');
    if (newPassword.length < 6) throw badRequest('A nova senha deve ter pelo menos 6 caracteres.');
    if (newPassword.length > 72) throw badRequest('A nova senha deve ter no máximo 72 caracteres.');

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        throw unauthorized('Senha atual incorreta.');
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    await userRepository.update(userId, { password: await bcrypt.hash(newPassword, rounds) });
    return { message: 'Senha alterada com sucesso.' };
}

async function requestEmailChange(userId, payload) {
    const newEmail = normalizeEmail(payload.newEmail);
    const password = String(payload.password ?? '');
    if (!emailPattern.test(newEmail)) throw badRequest('Informe um novo e-mail válido.');
    if (!password) throw badRequest('Informe sua senha para alterar o e-mail.');

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw unauthorized('Senha incorreta.');
    }
    if (normalizeEmail(user.email) === newEmail) throw badRequest('Informe um e-mail diferente do atual.');
    if (await userRepository.findByEmail(newEmail)) throw conflict('Este e-mail já está em uso.');

    const expiresInMinutes = verificationExpiryMinutes();
    const code = crypto.randomInt(100000, 1000000).toString();
    await verificationRepository.removeByEmail(newEmail);
    await verificationRepository.create({
        name: user.name,
        email: newEmail,
        password_hash: String(userId),
        code,
        expires_at: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    });
    await sendEmailChangeCode({
        to: newEmail,
        name: user.name,
        code,
        expiresInMinutes,
    });

    return {
        message: 'Enviamos um código para o novo e-mail.',
        email: newEmail,
        expiresInMinutes,
    };
}

async function confirmEmailChange(userId, payload) {
    const newEmail = normalizeEmail(payload.newEmail);
    const code = String(payload.code ?? '').trim();
    if (!emailPattern.test(newEmail)) throw badRequest('Informe um e-mail válido.');
    if (!/^\d{6}$/.test(code)) throw badRequest('Informe o código de 6 dígitos.');

    const pending = await verificationRepository.findByEmail(newEmail);
    if (!pending || String(pending.password_hash) !== String(userId)) {
        throw badRequest('Nenhuma alteração pendente foi encontrada.');
    }
    if (new Date(pending.expires_at) < new Date()) {
        await verificationRepository.removeByEmail(newEmail);
        throw badRequest('O código expirou. Solicite um novo.');
    }
    if (pending.code !== code) throw badRequest('Código de confirmação inválido.');
    if (await userRepository.findByEmail(newEmail)) {
        await verificationRepository.removeByEmail(newEmail);
        throw conflict('Este e-mail já está em uso.');
    }

    const user = await userRepository.update(userId, { email: newEmail });
    await verificationRepository.removeByEmail(newEmail);
    return { message: 'E-mail atualizado com sucesso.', user };
}

module.exports = {
    register,
    verifyRegisterCode,
    login,
    googleLogin,
    updateName,
    changePassword,
    requestEmailChange,
    confirmEmailChange,
    normalizeEmail,
};
