const test = require('tape');
const fse = require('fs-extra');
const path = require('path');

const {runQuery} = require('../../graph');
const {ProsKomma} = require('../../');

const testGroup = "Graph Basics";

test(
    `System (${testGroup})`,
    async function (t) {
        t.plan(7);
        const query = '{ packageVersion nDocSets nDocuments }';
        const pk = new ProsKomma();
        const result = await pk.gqlQuery(query);
        console.log(JSON.stringify(result, null, 2));
        t.ok("data" in result);
        t.ok("packageVersion" in result.data);
        t.equal(result.data.packageVersion, "0.1.0");
        t.ok("nDocSets" in result.data);
        t.equal(result.data.nDocSets, 0);
        t.ok("nDocuments" in result.data);
        t.equal(result.data.nDocuments, 0);
    }
);

test(
    `DocSets (${testGroup})`,
    async function (t) {
            const usx = fse.readFileSync(path.resolve(__dirname, '../test_data/usx/web_psa.usx'));
            const pk = new ProsKomma();
            pk.importDocument(
                "eng",
                "ust",
                "usx",
                usx,
                {}
            );
            t.plan(1);
            const query = '{ docSetList { id } }';
            const result = await pk.gqlQuery(query);
            console.log(JSON.stringify(result, null, 2));
            t.ok(result);
    }
);