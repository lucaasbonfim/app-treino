// Opções fechadas compartilhadas entre a criação manual (workout/exercise
// service) e a importação por IA, para as duas nunca saírem de sincronia.
const WORKOUT_ICONS = [
    'fitness_center',
    'directions_run',
    'sports_gymnastics',
    'self_improvement',
    'sports_martial_arts',
    'hiking',
    'favorite',
    'local_fire_department',
];

const DEFAULT_WORKOUT_ICON = 'fitness_center';

const REST_TIMES = [30, 45, 60, 90, 120];

const DEFAULT_REST_TIME = 60;

module.exports = {
    WORKOUT_ICONS,
    WORKOUT_ICON_SET: new Set(WORKOUT_ICONS),
    DEFAULT_WORKOUT_ICON,
    REST_TIMES,
    REST_TIME_SET: new Set(REST_TIMES),
    DEFAULT_REST_TIME,
};
