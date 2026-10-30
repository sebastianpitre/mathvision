export class Player {
    constructor(id, name, userId = null, verificado = false) {
        this.id = id;
        // Cuenta del jugador (para silenciarlo o reportarlo desde la partida).
        this.userId = userId ? String(userId) : null;
        this.name = name || `Jugador ${id.slice(0, 4)}`;
        this.symbol = null;
        this.verificado = Boolean(verificado);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            userId: this.userId,
            symbol: this.symbol,
            verificado: this.verificado,
        };
    }
}