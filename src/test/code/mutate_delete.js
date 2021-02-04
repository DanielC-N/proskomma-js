const test = require('tape');
const {
  pkWithDoc,
  pkWithDocs,
} = require('../lib/load');

const testGroup = 'Mutate Delete Operations';

test(
  `DocSet (${testGroup})`,
  async function (t) {
    try {
      t.plan(8);
      const pk = pkWithDoc('../test_data/usx/web_rut.usx', {
        lang: 'eng',
        abbr: 'ust',
      }, {}, {}, [], [])[0];
      let query = '{ docSets { id } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.docSets.length, 1);
      query = `mutation { deleteDocSet(docSetId: "foo/baa") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.deleteDocSet, false);
      query = '{ docSets { id } }';
      result = await pk.gqlQuery(query);
      t.equal(result.data.docSets.length, 1);
      query = `mutation { deleteDocSet(docSetId: "${result.data.docSets[0].id}") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.deleteDocSet, true);
      query = '{ docSets { id } }';
      result = await pk.gqlQuery(query);
      t.equal(result.data.docSets.length, 0);
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `Document (${testGroup})`,
  async function (t) {
    try {
      t.plan(9);
      const pk = pkWithDocs(
        [
          ['../test_data/usx/web_rut.usx', {
            lang: 'eng',
            abbr: 'ust',
          }],
          ['../test_data/usx/web_psa150.usx', {
            lang: 'eng',
            abbr: 'ust',
          }],
        ],
      );
      let query = '{ docSets { id documents { id } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.docSets.length, 1);
      t.equal(result.data.docSets[0].documents.length, 2);
      const aDocumentId = result.data.docSets[0].documents[0].id;
      query = `mutation { deleteDocument(docSetId: "${result.data.docSets[0].id}", documentId: "foobaa") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.deleteDocument, false);
      query = '{ docSets { id documents { id } } }';
      result = await pk.gqlQuery(query);
      t.equal(result.data.docSets[0].documents.length, 2);
      query = `mutation { deleteDocument(docSetId: "${result.data.docSets[0].id}", documentId: "${aDocumentId}") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.deleteDocument, true);
      query = '{ docSets { id documents { id } } }';
      result = await pk.gqlQuery(query);
      t.equal(result.data.docSets.length, 1);
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `Sequence (${testGroup})`,
  async function (t) {
    try {
      t.plan(10);
      const pk = pkWithDocs(
        [
          ['../test_data/usx/web_rut.usx', {
            lang: 'eng',
            abbr: 'ust',
          }],
        ],
      );
      let query = '{ documents { id nSequences mainSequence { id blocks(positions:[0]) { itemObjects { type subType payload } } } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.documents.length, 1);
      const docId = result.data.documents[0].id;
      const itemObjects = result.data.documents[0].mainSequence.blocks[0].itemObjects;
      const mainId = result.data.documents[0].mainSequence.id;
      const graft = itemObjects.filter(i => i.type === 'graft')[0];
      query = `mutation { deleteSequence(documentId: "foo" sequenceId: "${graft.payload}") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors.length, 1);
      t.ok(result.errors[0].message.startsWith('Document \'foo\' not found'));
      query = `mutation { deleteSequence(documentId: "${docId}" sequenceId: "${mainId}") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors.length, 1);
      t.ok(result.errors[0].message.startsWith('Cannot delete main sequence'));
      query = `mutation { deleteSequence(documentId: "${docId}" sequenceId: "baa") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.deleteSequence, false);
      query = `mutation { deleteSequence(documentId: "${docId}" sequenceId: "${graft.payload}") }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.equal(result.data.deleteSequence, true);
    } catch (err) {
      console.log(err);
    }
  },
);