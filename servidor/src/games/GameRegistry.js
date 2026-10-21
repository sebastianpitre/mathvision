const games = new Map();

export function registerGame({
  id,
  name,
  maxPlayers = 2,
}) {
  games.set(id, {
    id,
    name,
    maxPlayers,
  });
}

export function getGame(id) {
  return games.get(id);
}

export function getGames() {
  return Array.from(
    games.values()
  );
}