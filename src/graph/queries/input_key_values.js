const {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
} = require('graphql');

const keyValuesSchemaString = `
"""Input Key/Values Object"""
input KeyValues {
    """The key"""
    key: String!
    """The values"""
    values: [String!]!
}
`;

const keyValuesType = new GraphQLInputObjectType({
  name: 'KeyValues',
  description: 'Key/Values tuple',
  fields: () => ({
    key: {
      type: GraphQLNonNull(GraphQLString),
      description: 'The key',
    },
    values: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))),
      description: 'The values',
    },
  }),
});

module.exports = { keyValuesSchemaString, keyValuesType };
