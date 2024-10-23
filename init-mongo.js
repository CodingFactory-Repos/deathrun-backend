// init-mongo.js
db = db.getSiblingDB('database'); // Création de la base de données "database"
db.createCollection('rooms'); // Création de la collection "rooms"
db.createCollection('traps'); // Création de la collection "traps"

// Insertion d'un document dans la collection "rooms"
db.rooms.insertOne({
    code: "test",
    creator: "testPlayer",
    players: [{id: "testPlayer"}],
    gods: [],
    props: [{x: 4, y: 5}],
    started: false,
    floor: 0,
    bank: 0
});

// Insertion de plusieurs documents dans la collection "traps"
db.traps.insertMany([
    {name: "crossbow_down_prefab", price: 3}
]);