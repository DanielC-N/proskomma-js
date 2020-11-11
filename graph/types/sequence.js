const {GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLBoolean, GraphQLList, GraphQLNonNull} = require('graphql');
const xre = require('xregexp');

const blockType = require('./block');
const inputAttSpecType = require('./input_att_spec');

const options = {
    tokens: false,
    scopes: true,
    grafts: false,
    requiredScopes: []
};

const blockHasStrongs = (docSet, block, strongs, requireAll) => {

    const cleanStrong = (s) => {
        return xre.match(s, xre("[HG][0-9]+"));
    }

    if (strongs.length === 0) {
        return true;
    }
    let matched = new Set([]);
    for (const item of docSet.unsuccinctifyPrunedItems(block, options)) {
        const [att, attType, element, key, count, value] = item[1].split("/");
        if (
            (attType === "spanWithAtts" && element === "w" && key === "strong" && strongs.includes(cleanStrong(value))) ||
            (attType === "spanWithAtts" && element === "w" && key === "strongs" && strongs.includes(cleanStrong(value))) ||
            (attType === "milestone" && element === "zaln" && key === "x-strong" && strongs.includes(cleanStrong(value)))
        ) {
            matched.add(value);
            if (!requireAll || matched.size === strongs.length) {
                return true;
            }
        }
    }
    return false;
}

const blockHasAtts = (docSet, block, attSpecsArray, attValuesArray, requireAll) => {
    let matched = new Set([]);
    for (const item of docSet.unsuccinctifyPrunedItems(block, options)) {
        const [att, attType, element, key, count, value] = item[1].split("/");
        for (const [n, attSpecs] of attSpecsArray.entries()) {
            for (const attSpec of attSpecs) {
                if (
                    attType === attSpec.attType &&
                    element === attSpec.tagName &&
                    key === attSpec.attKey &&
                    parseInt(count) === attSpec.valueN &&
                    attValuesArray[n].includes(value)
                ) {
                    if (!requireAll) {
                        return true;
                    }
                    matched.add(n);
                    break;
                }
            }
            if (matched.size === attSpecsArray.length) {
                return true;
            }
        }
    }
    return false;
}

const checkStrongsFormat = (strongs) => {
    for (const strong of strongs) {
        if (!xre.match(strong, xre("^[HG][0-9]+$"))) {
            throw new Error(`Bad Strongs format '${strong} in query'`);
        }
    }
}

const sequenceType = new GraphQLObjectType({
    name: "Sequence",
    fields: () => ({
        id: {type: GraphQLNonNull(GraphQLString)},
        type: {type: GraphQLNonNull(GraphQLString)},
        nBlocks: {type: GraphQLNonNull(GraphQLInt), resolve: root => root.blocks.length},
        blocks: {
            type: GraphQLNonNull(GraphQLList(GraphQLNonNull(blockType))),
            args: {
                withScopes: {type: GraphQLList(GraphQLNonNull(GraphQLString))},
                withScriptureCV: {type: GraphQLString},
                withAllStrongs: {type: GraphQLList(GraphQLNonNull(GraphQLString))},
                withAnyStrongs: {type: GraphQLList(GraphQLNonNull(GraphQLString))},
                attSpecs: {type: GraphQLList(GraphQLNonNull(GraphQLList(GraphQLNonNull(inputAttSpecType))))},
                attValues: {type: GraphQLList(GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString))))},
                allAtts: {type: GraphQLBoolean}
            },
            resolve: (root, args, context) => {
                context.docSet.maybeBuildEnumIndexes();
                if (args.withScopes && args.withScriptureCV) {
                    throw new Error("Cannot specify both withScopes and withScriptureCV");
                }
                if (args.withAllStrongs && args.withAnyStrongs) {
                    throw new Error("Cannot specify both withAllStrongs and withAnyStrongs");
                }
                if (args.attSpecs && !args.attValues) {
                    throw new Error("Cannot specify attSpecs without attValues");
                }
                if (!args.attSpecs && args.attValues) {
                    throw new Error("Cannot specify attValues without attSpecs");
                }
                let ret;
                if (args.withScopes) {
                    ret = root.blocks.filter(b => context.docSet.allScopesInBlock(b, args.withScopes));
                } else if (args.withScriptureCV) {
                    ret = context.docSet.blocksWithScriptureCV(root.blocks, args.withScriptureCV);
                } else {
                    ret = root.blocks;
                }
                if (args.withAllStrongs) {
                    checkStrongsFormat(args.withAllStrongs);
                    ret = ret.filter(b => blockHasStrongs(context.docSet, b, args.withAllStrongs, true));
                }
                if (args.withAnyStrongs) {
                    checkStrongsFormat(args.withAnyStrongs);
                    ret = ret.filter(b => blockHasStrongs(context.docSet, b, args.withAnyStrongs, false));
                }
                if (args.attSpecs) {
                    ret = ret.filter(b => blockHasAtts(context.docSet, b, args.attSpecs, args.attValues, args.allAtts || false));
                }
                return ret;
            }
        }
    })
})

module.exports = sequenceType;
