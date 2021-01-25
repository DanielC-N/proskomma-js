const test = require('tape');

const { pkWithDoc } = require('../lib/load');

const testGroup = 'Graph Sequence';

const [pk, pkDoc] = pkWithDoc('../test_data/usfm/hello.usfm', {
  lang: 'eng',
  abbr: 'ust',
});
const pk2 = pkWithDoc('../test_data/usx/web_rut.usx', {
  lang: 'eng',
  abbr: 'web',
})[0];

test(
  `Scalars (${testGroup})`,
  async function (t) {
    try {
      t.plan(5);
      const query = '{ documents { mainSequence { id type nBlocks } } }';
      const result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.ok('mainSequence' in result.data.documents[0]);
      t.ok('id' in result.data.documents[0].mainSequence);
      t.equal(result.data.documents[0].mainSequence.type, 'main');
      t.equal(result.data.documents[0].mainSequence.nBlocks, 1);
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `Blocks (${testGroup})`,
  async function (t) {
    try {
      t.plan(4);
      const query = '{ documents { mainSequence { blocks { text } } } }';
      const result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.ok('blocks' in result.data.documents[0].mainSequence);
      t.ok('text' in result.data.documents[0].mainSequence.blocks[0]);
      t.equal(result.data.documents[0].mainSequence.blocks[0].text, 'This is how the Good News of JC began...');
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `withScopes (${testGroup})`,
  async function (t) {
    try {
      t.plan(7);
      let query = '{ documents { mainSequence { blocks(withScopes:["chapter/1", "verse/1"]) { text } } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.ok('blocks' in result.data.documents[0].mainSequence);
      t.equal(result.data.documents[0].mainSequence.blocks.length, 1);
      t.equal(result.data.documents[0].mainSequence.blocks[0].text, 'This is how the Good News of JC began...');
      query = '{ documents { mainSequence { blocks(withScopes:["chapter/1", "verse/2"]) { text } } } }';
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.ok('blocks' in result.data.documents[0].mainSequence);
      t.equal(result.data.documents[0].mainSequence.blocks.length, 0);
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `withBlockScope (${testGroup})`,
  async function (t) {
    try {
      t.plan(6);
      let query = '{ documents { mainSequence { blocks(withBlockScope:"blockTag/p") { text } } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.ok('blocks' in result.data.documents[0].mainSequence);
      t.equal(result.data.documents[0].mainSequence.blocks.length, 1);
      query = '{ documents { mainSequence { blocks(withBlockScope:"blockTag/q") { text } } } }';
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.ok('blocks' in result.data.documents[0].mainSequence);
      t.equal(result.data.documents[0].mainSequence.blocks.length, 0);
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `withChars (${testGroup})`,
  async function (t) {
    try {
      t.plan(21);
      let query = '{ documents { mainSequence { blocks(withChars:"Boaz") { text } } } }';
      let result = await pk2.gqlQuery(query);
      t.equal(result.errors, undefined);
      t.ok('blocks' in result.data.documents[0].mainSequence);
      const blocks = result.data.documents[0].mainSequence.blocks;
      t.equal(blocks.length, 18);

      for (const block of blocks) {
        t.ok(block.text.includes('Boaz'));
      }
    } catch (err) {
      console.log(err);
    }
  },
);
