export class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name || `Jugador ${id.slice(0, 4)}`;
        this.symbol = null;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            symbol: this.symbol,
        };
    }
}