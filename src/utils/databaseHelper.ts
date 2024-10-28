import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URI ?? 'mongodb://localhost:27017/');

export const clientDB = client.db('database');