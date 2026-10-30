// Team photos as responsive pictures (AVIF, WebP, JPEG). Widths cover every
// ProfilePicture slot at 1x and 2x: 56/96/112 px on the home team cards and
// 192 px on /websites. The photos are portrait or square, so width is the
// dimension object-cover fills. Sources use a lowercase .jpg extension because
// imagetools ignores .JPEG. quality=80 because the AVIF default (50) visibly
// smooths skin and foliage at these sizes.
import larry from './larryProfilePicture2024.jpg?w=384;224;112&quality=80&enhanced';
import blake from './IMG_2021.jpg?w=384;224;112&quality=80&enhanced';
import jackson from './100_2013.jpg?w=384;224;112&quality=80&enhanced';

export const headshots = { larry, blake, jackson };
