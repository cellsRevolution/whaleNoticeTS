import { Request, Response, NextFunction } from 'express';
import express from 'express';
import { ObjectId } from 'mongodb';
import * as mongoDB from 'mongodb';
import * as dotenv from 'dotenv';

class Transaction {
  constructor(
    public count: string,
    public status: string,
    public transactions: { [key: string]: string }[],
    public id: string
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

function prefixObj(obj: object, prefix: string): object {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]: [string, string]) => {
      return [
        `${prefix}${key}`,
        typeof value === 'object' ? prefixObj(value, prefix) : value,
      ];
    })
  );
}

const transController = async (req: Request, res: Response): Promise<void> => {
  try {
    let pageNumber: number;
    pageNumber = parseInt(req.query.page as string);
    delete req.query.page;

    const query = prefixObj(req.query, 'transactions.');

    if (collections.transaction) {
      const transactionRecord = (await collections.transaction
        .aggregate([
          {
            $unwind: '$transactions',
          },
          {
            $match: query,
          },
        ])
        .toArray()) as unknown as Transaction[];
      const data = transactionRecord.slice(
        20 * (pageNumber - 1),
        20 * pageNumber
      );
      data.forEach((_item, index) => {
        data[index].id = '' + index;
      });
      res.status(200).send(data);
    } else {
      throw new Error();
    }
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};

const app = express();

app.use(express.json());

app.use('/', (req: Request, res: Response, next: NextFunction): void => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});

connectToDatabase().then(() => {
  app.route('/').get(transController);

  app.listen(5000, () => {
    console.log(`Server started at http://localhost:5000`);
  });
});
