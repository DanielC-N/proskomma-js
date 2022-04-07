const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
} = require('graphql');

const xre = require('xregexp');

const kvEntryType = require('./kv_entry');
const keyMatchesType = require('./input_key_matches');
const keyValuesType = require('./input_key_values');
const keyValueType = require('./key_value');

const kvSequenceType = new GraphQLObjectType({
  name: 'kvSequence',
  description: 'A contiguous flow of content for key-values',
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The id of the sequence',
    },
    nEntries: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'The number of entries in the key-value sequence',
      resolve: root => root.blocks.length,
    },
    entries: {
      type: GraphQLList(GraphQLNonNull(kvEntryType)),
      description: 'The entries in the key-value sequence',
      args: {
        keyMatches: {
          type: GraphQLString,
          description: 'Only return entries whose key matches the specification',
        },
        keyEquals: {
          type: GraphQLList(GraphQLNonNull(GraphQLString)),
          description: 'Only return entries whose key equals one of the values in the specification',
        },
        secondaryMatches: {
          type: GraphQLList(GraphQLNonNull(keyMatchesType)),
          description: 'Only return entries whose secondary keys match the specification',
        },
        secondaryEquals: {
          type: GraphQLList(GraphQLNonNull(keyValuesType)),
          description: 'Only return entries whose secondary keys equal one of the values in the specification',
        },
        contentMatches: {
          type: GraphQLList(GraphQLNonNull(keyMatchesType)),
          description: 'Only return entries whose content matches the specification',
        },
        contentEquals: {
          type: GraphQLList(GraphQLNonNull(keyValuesType)),
          description: 'Only return entries whose content equals one of the values in the specification',
        },
      },
      resolve: (root, args, context) => {
        let ret = root.blocks.map(
          b => [
            context.docSet.unsuccinctifyScopes(b.bs)
              .map(s => s[2].split('/')[1])[0],
            context.docSet.unsuccinctifyScopes(b.is)
              .filter(s => s[2].startsWith('kvSecondary/'))
              .map(s => [s[2].split('/')[1], s[2].split('/')[2]]),
            context.docSet.sequenceItemsByScopes([b], ['kvField/'], false),
          ],
        );

        if (args.keyMatches) {
          ret = ret.filter(e => xre.test(e[0], xre(args.keyMatches)));
        }

        if (args.keyEquals) {
          ret = ret.filter(e => args.keyEquals.includes(e[0]));
        }

        if (args.secondaryMatches) {
          const matchesOb = {};
          args.secondaryMatches.forEach(sm => (matchesOb[sm.key] = sm.matches));
          ret = ret.filter(
            e => {
              const secondaryOb = {};
              e[1].forEach(st => (secondaryOb[st[0]] = st[1]));

              for (const mo of Object.entries(matchesOb)) {
                const secondaryString = secondaryOb[mo[0]];

                if (!secondaryString || !xre.test(secondaryString, xre(mo[1]))) {
                  return false;
                }
              }
              return true;
            });
        }

        if (args.secondaryEquals) {
          const equalsOb = {};
          args.secondaryEquals.forEach(sm => (equalsOb[sm.key] = sm.values));
          ret = ret.filter(
            e => {
              const secondaryOb = {};
              e[1].forEach(st => (secondaryOb[st[0]] = st[1]));

              for (const mo of Object.entries(equalsOb)) {
                const secondaryString = secondaryOb[mo[0]];

                if (!secondaryString || !mo[1].includes(secondaryString)) {
                  return false;
                }
              }
              return true;
            });
        }

        if (args.contentMatches) {
          const matchesOb = {};
          args.contentMatches.forEach(sm => (matchesOb[sm.key] = sm.matches));
          ret = ret.filter(
            e => {
              const contentOb = {};
              e[2].forEach(st => (contentOb[st[0].filter(s => s.startsWith('kvField'))[0].split('/')[1]] = st[1].filter(i => i[0] === 'token').map(t => t[2]).join('')));

              for (const mo of Object.entries(matchesOb)) {
                const contentString = contentOb[mo[0]];

                if (!contentString || !xre.test(contentString, xre(mo[1]))) {
                  return false;
                }
              }
              return true;
            });
        }

        if (args.contentEquals) {
          const equalsOb = {};
          args.contentEquals.forEach(sm => (equalsOb[sm.key] = sm.values));
          ret = ret.filter(
            e => {
              const contentOb = {};
              e[2].forEach(st => (contentOb[st[0].filter(s => s.startsWith('kvField'))[0].split('/')[1]] = st[1].filter(i => i[0] === 'token').map(t => t[2]).join('')));

              for (const mo of Object.entries(equalsOb)) {
                const contentString = contentOb[mo[0]];

                if (!contentString || !contentString.includes(mo[1])) {
                  return false;
                }
              }
              return true;
            });
        }

        return ret;
      },
    },
    tags: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))),
      description: 'A list of the tags of this sequence',
      resolve: root => Array.from(root.tags),
    },
    tagsKv: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(keyValueType))),
      description: 'A list of the tags of this sequence as key/value tuples',
      resolve: root => Array.from(root.tags).map(t => {
        if (t.includes(':')) {
          return [t.substring(0, t.indexOf(':')), t.substring(t.indexOf(':') + 1)];
        } else {
          return [t, ''];
        }
      }),
    },
    hasTag: {
      type: GraphQLNonNull(GraphQLBoolean),
      description: 'Whether or not the sequence has the specified tag',
      args: {
        tagName: {
          type: GraphQLNonNull(GraphQLString),
          description: 'The tag name',
        },
      },
      resolve: (root, args) => root.tags.has(args.tagName),
    },
  }),
});

module.exports = kvSequenceType;
