const { MongoClient } = require('mongodb');

async function main() {
    const username = "Deenan"; // From user
    const username2 = "deenan";
    const username3 = "Deenant";
    const username4 = "deenant";
    const passwords = ["Deenan290919", "Deenan290919!"];

    for (const u of [username, username2, username3, username4]) {
        for (const p of passwords) {
            const encodedPass = encodeURIComponent(p);
            const uri = `mongodb+srv://${u}:${encodedPass}@cluster0.tw8nu.mongodb.net/Seminar?retryWrites=true&w=majority`;

            console.log(`Trying ${u} / ${p.replace(/./g, '*')}`);
            const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

            try {
                await client.connect();
                console.log(`✅ SUCCESS with ${u} / ${p}`);
                await client.close();
                return;
            } catch (err) {
                console.error(`❌ FAILED: ${err.message}`);
            }
        }
    }
}

main();
