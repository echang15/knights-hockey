import type { Player } from '../../../shared/types';

/** Player headshot, or a jersey-number badge when there is no photo. */
export function Avatar({ player, size = 40 }: { player: Pick<Player, 'photoUrl' | 'number' | 'name'>; size?: number }) {
  return player.photoUrl
    ? <img className="avatar" src={player.photoUrl} width={size} height={size} alt={player.name} loading="lazy" />
    : <span className="avatar ph" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>{player.number}</span>;
}
