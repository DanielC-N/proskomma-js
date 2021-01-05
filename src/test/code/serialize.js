const test = require('tape');
const Validator = require('jsonschema').Validator;
const {serializedSchema, unpackEnum} = require('proskomma-utils');

const {pkWithDoc} = require('../lib/load');

const testGroup = "Serialize";

const pk = pkWithDoc("../test_data/usx/web_rut.usx", {lang: "fra", abbr: "hello"})[0];

test(
    `WEB RUT (${testGroup})`,
    async function (t) {
        try {
            t.plan(3);
            const query = '{ docSets { id } }';
            const result = await pk.gqlQuery(query);
            const docSetId = result.data.docSets[0].id;
            const serialized = pk.serializeSuccinct(docSetId);
            console.log(serialized)
            t.ok(serialized);
            const validationReport = new Validator().validate(serialized, serializedSchema);
            t.equal(validationReport.errors, []);
            const wordLikes = unpackEnum(pk.docSets[docSetId].enums["wordLike"]);
            t.ok(wordLikes.includes("Ruth"));
        } catch (err) {
            console.log(err);
        }
    }
);
