const {GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList} = require('graphql');

const blockType = require('./block');

const htmlStyles = ".blocktag-q1 {font-family: italic}" +
    ".blocktag-q2 {font-family: italic; padding-left: 2em}" +
    ".blocktag-b1 {min-height: 1em}" +
    ".blocktag-d1 {font-weight: bold}" +
    ".chapter {font-size: xx-large; font-weight: bold; padding-right: 0.2em}" +
    ".verses {font-size: x-small; font-weight: bold; padding-right: 0.2em}"

const htmlHead = (s => {
    return `<html>\n<head>\n<title>Sequence ${s.id}</title>\n<style>${htmlStyles}</style></head>\n<body>\n<h1>Sequence ${s.id}</h1>`;
})

const htmlFoot = (s => {
    return "</body>\n</html>\n";
})

const sequenceType = new GraphQLObjectType({
    name: "Sequence",
    fields: () => ({
        id: {type: GraphQLString},
        type: {type: GraphQLString},
        nBlocks: {type: GraphQLInt, resolve: root => root.blocks.length},
        htmlHead: {type: GraphQLString, resolve: root => htmlHead(root)},
        htmlFoot: {type: GraphQLString, resolve: root => htmlFoot(root)},
        blocks: {
            type: GraphQLList(blockType),
            resolve:
                (root, args, context) => root.blocks.map(b => context.docSet.unsuccinctifyBlock(b, {}))
        }
    })
})

module.exports = sequenceType;
