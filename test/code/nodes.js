const test = require('tape');

const { pkWithDoc } = require('../lib/load');
const { Proskomma } = require('../../src');

const pk = pkWithDoc('../test_data/usfm/hello.usfm', {
  lang: 'eng',
  abbr: 'ust',
})[0];

const importNodes = pk => {
  pk.importDocument({
    lang: 'deu',
    abbr: 'xyz',
  }, 'nodes',
  JSON.stringify(
    {
      content: {
        label: 'me',
        name: 'Fred Smith',
        shoeSize: '78',
      },
      children: [
        {
          content: {
            label: 'mom',
            name: 'Sally Smith née Brown',
            shoeSize: '3',
          },
          children: [
            {
              content: {
                label: 'grandma',
                name: 'Emma Smith née Jones',
                shoeSize: '2',
              },
            },
            {
              content: {
                label: 'grandpa',
                name: 'Simon Smith',
                shoeSize: '89',
              },
            },
          ],
        },
        {
          content: {
            label: 'pop',
            name: 'Bob Smith',
            shoeSize: '91',
          },
          children: [
            {
              content: {
                label: 'granny',
                name: 'Deborah Smith née Black',
                shoeSize: '5',
              },
            },
            {
              content: {
                label: 'grandpops',
                name: 'Michael Smith',
                shoeSize: '79',
              },
            },
          ],
        },
      ],
    },
  ),
  {},
  );
};

const testGroup = 'Nodes';

test(
  `Return error for treeSequence on non-tree sequence (${testGroup})`,
  async function (t) {
    try {
      t.plan(3);
      let query = '{documents { id mainSequence { id } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      const docId = result.data.documents[0].id;
      const seqId = result.data.documents[0].mainSequence.id;
      query = `{document(id:"${docId}") { treeSequence(id:"${seqId}") { id } } }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors.length, 1);
      t.ok(result.errors[0].message.includes('type \'tree\', not \'main\''));
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `Import (${testGroup})`,
  async function (t) {
    try {
      t.plan(8);
      const pk = new Proskomma();
      importNodes(pk);
      let query = '{documents { mainSequence { id } sequences { id type tags blocks { bs { payload} bg { payload } is { payload } items { type subType payload } } } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      const doc = result.data.documents[0];
      const mainSequence = doc.sequences.filter(s => s.id === doc.mainSequence.id)[0];
      const treeGraft = mainSequence.blocks[0].bg[0].payload;
      const treeSequence = doc.sequences.filter(s => s.id === treeGraft)[0];
      t.equal(treeSequence.type, 'tree');
      t.equal(treeSequence.blocks.length, 7);
      t.equal(treeSequence.blocks[0].bs.payload, 'tTreeNode/0');
      const nodeChildren = treeSequence.blocks[0].is.filter(s => s.payload.startsWith('tTreeChild')).map(s => s.payload);
      t.equal(nodeChildren.length, 2);
      const nodeParent = treeSequence.blocks[0].is.filter(s => s.payload.startsWith('tTreeParent')).map(s => s.payload);
      t.equal(nodeParent.length, 1);
      t.equal(nodeParent[0], 'tTreeParent/none');
      const nodeName = treeSequence.blocks[0].is.filter(s => s.payload.startsWith('tTreeContent/name')).map(s => s.payload);
      t.equal(nodeName.length, 1);
    } catch (err) {
      console.log(err);
    }
  },
);

test(
  `treeSequence (${testGroup})`,
  async function (t) {
    try {
      t.plan(12);
      const pk = new Proskomma();
      importNodes(pk);
      let query = '{docSets { document(bookCode:"N00") { sequences(types:"tree") { id } } } }';
      let result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      const treeSequenceId = result.data.docSets[0].document.sequences[0].id;

      query = `{
        docSets {
          document(bookCode:"N00") {
            treeSequence(id:"${treeSequenceId}") {
             id
             nNodes
             nodes {
               id
               parentId
               childIds
               keys
               itemGroups {
                 scopeLabels(startsWith:"tTreeContent")
                 text
               }
             }
            }
          }
        }
      }`;
      result = await pk.gqlQuery(query);
      t.equal(result.errors, undefined);
      const treeSequence = result.data.docSets[0].document.treeSequence;
      t.equal(treeSequence.nNodes, 7);
      t.equal(treeSequence.nodes[0].parentId, null);
      t.equal(treeSequence.nodes[1].parentId, treeSequence.nodes[0].id);
      t.equal(treeSequence.nodes[0].childIds.length, 2);
      t.equal(treeSequence.nodes[0].childIds[0], '1');
      t.equal(treeSequence.nodes[0].childIds[1], '4');
      t.equal(treeSequence.nodes[0].keys.length, 3);
      t.equal(treeSequence.nodes[0].itemGroups.length, 3);
      t.equal(treeSequence.nodes[0].itemGroups[0].text, 'me');
      t.equal(treeSequence.nodes[0].itemGroups[0].scopeLabels[0].split('/')[1], 'label');
    } catch (err) {
      console.log(err);
    }
  },
);
