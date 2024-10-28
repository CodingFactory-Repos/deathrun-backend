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
    bank: 10,
    score: 0,
    enterInRoomAt: new Date()
});

// Insertion de plusieurs documents dans la collection "traps"
db.traps.insertMany([
    {name: "crossbow_down_prefab", price: 5},
    {name: "crossbow_side_left_prefab", price: 5},
    {name: "crossbow_side_right_prefab", price: 5},
    {name: "crossbow_up_prefab", price: 5},
    {name: "bear_trap_prefab", price: 1},
    {name: "spike_prefab", price: 3},
]);