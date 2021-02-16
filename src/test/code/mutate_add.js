const path = require('path');
const test = require('tape');
const fse = require('fs-extra');
const { ProsKomma } = require('../../../src');
const { pkWithDoc, pkWithDocs } = require('../lib/load');

const testGroup = 'Mutate Add Operations';

const pk = new ProsKomma();
let content = fse.readFileSync(
  path.resolve(__dirname, '../test_data/usx/web_rut.usx'),
).toString();

test(
  `Document (${testGroup})`,
  async function (t) {
    try {
      t.plan(7);
      let query = '{ docSets { id } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.docSets.length, 0);
      query = `mutation { addDocument(` +
        `selectors: [{key: "lang", value: "eng"}, {key: "abbr", value: "ust"}], ` +
        `contentType: "usx", ` +
        `content: """${content}""") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.addDocument, true);
      query = '{ docSets { id documents { id mainSequence { nBlocks } } } }';
      result = await pk.gqlQuery(query);
      t.equal(result.data.docSets.length, 1);
      t.equal(result.data.docSets[0].documents.length, 1);
      t.ok(result.data.docSets[0].documents[0].mainSequence.nBlocks > 0);
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `Sequence (${testGroup})`,
  async function (t) {
    try {
      t.plan(7);
      let query = '{ documents { id nSequences sequences { id type } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      const docId = result.data.documents[0].id;
      const nSequences = result.data.documents[0].nSequences;
      t.equal(Object.values(result.data.documents[0].sequences).filter(s => s.type === 'banana').length, 0);
      query = `mutation { newSequence(` +
        ` documentId: "${docId}"` +
        ` type: "banana") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      const newSequenceId = result.data.newSequence;
      query = '{ documents { id nSequences sequences { id type } } }';
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.documents[0].nSequences, nSequences + 1);
      t.equal(Object.values(result.data.documents[0].sequences).filter(s => s.type === 'banana').length, 1);
      t.equal(Object.values(result.data.documents[0].sequences).filter(s => s.id === newSequenceId).length, 1);
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `Block (${testGroup})`,
  async function (t) {
    try {
      t.plan(7);
      const pk = pkWithDocs(
        [
          ['../test_data/usfm/1pe_webbe.usfm', {
            lang: 'eng',
            abbr: 'web',
          }],
        ],
      );
      let query = '{ documents { id mainSequence { id nBlocks } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      const docId = result.data.documents[0].id;
      const seqId = result.data.documents[0].mainSequence.id;
      const nBlocks = result.data.documents[0].mainSequence.nBlocks;
      t.equal(nBlocks, 3);
      query = `mutation { newBlock(documentId: "${docId}" sequenceId: "${seqId}" blockN: 1, blockScope: "blockTag/q4") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.newBlock, true);
      query = '{ documents { id mainSequence { id nBlocks blocks(positions:[1]) { bs { label } } } } }';
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.documents[0].mainSequence.nBlocks, nBlocks + 1);
      t.equal(result.data.documents[0].mainSequence.blocks[0].bs.label, 'blockTag/q4');
    } catch (err) {
      console.log(err);
    }
  },
);

