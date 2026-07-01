const repository = require('../repositories/exerciseLibrary.repository');
const { optionalText, id } = require('../utils/validation');
const { notFound } = require('../utils/httpError');

function list(query = {}) {
    return repository.list({
        muscleGroup: optionalText(query.muscle_group, 'Grupo muscular', 80),
        search: optionalText(query.search, 'Busca', 120),
    });
}

function groups() {
    return repository.groups();
}

async function get(exerciseIdValue) {
    const exercise = await repository.findActiveById(id(exerciseIdValue, 'ID do exercício'));
    if (!exercise) throw notFound('Exercício da biblioteca não encontrado.');
    return exercise;
}

module.exports = { list, groups, get };
