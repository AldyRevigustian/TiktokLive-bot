const Eris = require("eris");
const keep_alive = require("./keep_alive.js");
const { WebcastPushConnection } = require("tiktok-live-connector");
const cron = require("node-cron");
const { MongoClient } = require("mongodb");
const fs = require('fs');
const { DateTime } = require('luxon');

const bot = new Eris(
  process.env['TOKEN'] 
);

const uri = process.env['MONGODB'];
const client = new MongoClient(uri, { useUnifiedTopology: true });

const db = client.db("tiktoker");
const collection = db.collection("users");

bot.on("error", (err) => {
  console.log(err);
});

bot.on("ready", () => {
  console.log("Bot Connected!");
});

bot.connect();

let tiktokers = process.env['TIKTOKERS']; // tiktokers written in array exam : ['michajourney', 'michajalan']
let channels = process.env['CHANNELS']; // discord channels written in array exam : ['0012....', '1201....']

tiktokers.forEach((tiktoker) => {
  let tiktokerLive = new WebcastPushConnection(tiktoker);

  cron.schedule("*/3 * * * *", function() {
    console.log("Cron Running");

    let currentDateTime = DateTime.local();
    let jakartaDateTime = currentDateTime.setZone('Asia/Jakarta');
    let formattedDateTime = jakartaDateTime.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS);

    tiktokerLive
      .connect()
      .then(async (state) => {
        console.info(`Connected to roomId ${state.roomId}`, tiktoker);
        logToFileAsync(formattedDateTime + ", " + `Connected to roomId ${state.roomId} ${tiktoker}`);

        let embed = {
          title: `${tiktoker} Is Live`,
          description: `${tiktoker} Is Live`,
          color: getColor(tiktoker),
          url: state.roomInfo.share_url,
          timestamp: new Date(),
          thumbnail: {
            url: getImage(tiktoker),
          },
        };

        let liveDatabase = await collection.find({ stream_id: state.roomInfo.stream_id }).toArray();
        let liveIds = liveDatabase.map((obj) => obj.stream_id);
        let cek = liveIds.length == 0;

        if (cek) {
          await collection
            .insertOne({
              user: tiktoker,
              stream_id: state.roomInfo.stream_id,
              date: new Date(),
            }).then(
              channels.forEach((channelId) => {
                bot.createMessage(channelId, { embed });
              }));
          console.log("Notif Sent", tiktoker);
          logToFileAsync(formattedDateTime + ", " + `Notif Sent ${tiktoker}`);
        } else {
          console.log("Notif Not Sent", tiktoker);
        }
      })
      .catch((err) => {
        console.log("Already connected", tiktoker);
        if (err.toString().includes("Already connected!")) {
          console.log("Already Connected, Notif Not Send", tiktoker);
        }
      });
  });
});

function getImage(tiktoker) {
  if (tiktoker == "tiktoklive") {
    return ""; // tiktoker profile picture
  }
  
}

function getColor(tiktoker) {
  if (tiktoker == "tiktoklive") {
    return 0x98eecc; // custom color
  }
}

function logToFileAsync(data) {
  fs.appendFile('log.txt', data + '\n', (err) => {
    if (err) throw err;
  });
}