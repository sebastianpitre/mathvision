export class Room {
  constructor({
    code,
    password = null,
    game,
    creatorId,
  }) {
    this.code = code;

    this.password = password || null;

    this.game = game;

    this.creatorId = creatorId;

    this.players = new Map();

    this.status = "waiting";

    this.createdAt = Date.now();

    this.gameState = {};
  }

  addPlayer(player) {
    this.players.set(player.id, player);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  hasPlayer(playerId) {
    return this.players.has(playerId);
  }

  getPlayerCount() {
    return this.players.size;
  }

  toJSON() {
    return {
      code: this.code,
      game: this.game,
      status: this.status,
      players: Array.from(this.players.values()).map(
        (player) => player.toJSON()
      ),
      createdAt: this.createdAt,
      gameState: this.gameState,
    };
  }
}