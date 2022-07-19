"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoDB = __importStar(require("mongodb"));
const dotenv = __importStar(require("dotenv"));
class Transaction {
    constructor(status, transAction, id) {
        this.status = status;
        this.transAction = transAction;
        this.id = id;
    }
}
const collections = {};
function connectToDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        dotenv.config();
        if (process.env.DB_CONN_STRING &&
            process.env.DB_NAME &&
            process.env.TRANS_COLLECTION_NAME) {
            const client = new mongoDB.MongoClient(process.env.DB_CONN_STRING);
            yield client.connect();
            const db = client.db(process.env.DB_NAME);
            const transCollection = db.collection(process.env.TRANS_COLLECTION_NAME);
            collections.transaction = transCollection;
            console.log(`Successfully connected to database: ${db.databaseName} and collection: ${transCollection.collectionName}`);
        }
    });
}
const superagent_1 = __importDefault(require("superagent"));
const getAlert = (startTime) => {
    setTimeout(() => {
        let endTime = Math.floor(Date.now() / 1000);
        superagent_1.default
            .get(`https://api.whale-alert.io/v1/transactions?api_key=OO5TFgDg7j9vo0mAbRG95CgDUHSAP6JV&min_value=500000&start=${startTime}&end=${endTime}`)
            .then((res, req) => {
            var _a;
            (_a = collections.transaction) === null || _a === void 0 ? void 0 : _a.insertOne(req.body);
            getAlert(endTime);
        });
    }, 60000);
};
getAlert(Math.floor(Date.now() / 1000));
const transController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const games = (yield ((_a = collections.transaction) === null || _a === void 0 ? void 0 : _a.find({}).toArray()));
        res.status(200).send(games);
    }
    catch (error) {
        res.status(500).send(error.message);
    }
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/transactions', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
});
connectToDatabase().then(() => {
    app.route('/transactions').get(transController);
    app.listen(5000, () => {
        console.log(`Server started at http://localhost:5000`);
    });
});
