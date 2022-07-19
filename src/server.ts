import { Request, Response, NextFunction } from 'express';
import express from 'express';
import { ObjectId } from 'mongodb';
import * as mongoDB from 'mongodb';
import * as dotenv from 'dotenv';

class Transaction {
  constructor(
    public status: string,
    public transAction: { [key: string]: string }[],
    public id?: ObjectId
  ) {}
}
const collections: { transaction?: mongoDB.Collection } = {};

async function connectToDatabase() {
  dotenv.config();
  if (
    process.env.DB_CONN_STRING &&
    process.env.DB_NAME &&
    process.env.TRANS_COLLECTION_NAME
  ) {
    const client: mongoDB.MongoClient = new mongoDB.MongoClient(
      process.env.DB_CONN_STRING
    );
    await client.connect();
    const db: mongoDB.Db = client.db(process.env.DB_NAME);
    const transCollection: mongoDB.Collection = db.collection(
      process.env.TRANS_COLLECTION_NAME
    );
    collections.transaction = transCollection;
    console.log(
      `Successfully connected to database: ${db.databaseName} and collection: ${transCollection.collectionName}`
    );
  }
}

import superagent from 'superagent';

const getAlert = (startTime: number) => {
  setTimeout(async () => {
    let endTime: number = Math.floor(Date.now() / 1000);
    let response = await superagent.get(
      `https://api.whale-alert.io/v1/transactions?api_key=OO5TFgDg7j9vo0mAbRG95CgDUHSAP6JV&min_value=500000&start=${startTime}&end=${endTime}`
    );
    if (response !== undefined) {
      collections.transaction?.insertOne(response.body);
      getAlert(endTime);
    }
  }, 60000);
};
getAlert(Math.floor(Date.now() / 1000));

const transController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const games = (await collections.transaction
      ?.find({})
      .toArray()) as unknown as Transaction[];

    res.status(200).send(games);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};

const app = express();

app.use(express.json());

app.get(
  '/transactions',
  (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  }
);

connectToDatabase().then(() => {
  app.route('/transactions').get(transController);

  app.listen(5000, () => {
    console.log(`Server started at http://localhost:5000`);
  });
});
