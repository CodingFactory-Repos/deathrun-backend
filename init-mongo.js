// init-mongo.js
db = db.getSiblingDB('database'); // Création de la base de données "database"
db.createCollection('rooms'); // Création de la collection "rooms"

// Insertion d'un document dans la collection "rooms"
db.rooms.insertOne({
    code: "test",
    creator: "testPlayer",
    players: [{id: "testPlayer"}],
    gods: [],
    props: [{x: 4, y: 5}],
    started: false,
});