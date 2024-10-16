import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGO_URI ?? '');

export const clientDB = client.db('database');