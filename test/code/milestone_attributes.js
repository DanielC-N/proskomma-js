const test = require('tape');

const {pkWithDoc} = require('../lib/load');

const testGroup = "Milestones & Attributes";

const pk = pkWithDoc("../test_data/usfm/milestone_attributes.usfm", "fra", "hello")[0];

const topItems = items => {
    if (items.length === 0) {
        return [];
    } else if (items[0].subType === "startScope" && items[0].label === "milestone/zaln") {
        return items;
    } else {
        return topItems(items.slice(1));
    }
}

const tailItems = items => {
    if (items.length === 0) {
        return [];
    } else if (items[items.length - 1].subType === "endScope" && items[items.length - 1].label === "milestone/zaln") {
        return items;
    } else {
        return tailItems(items.slice(0, items.length - 2));
    }
}

const topNTailItems = items => {
    return tailItems(topItems(items));
}

test(
    `Attributes for Milestones and Tags (${testGroup})`,
    async function (t) {
        try {
            const zalnScopes = ["x-strong/H5662", "x-lemma/עֹבַדְיָה", "x-morph/He", "x-morph/Np", "x-occurrence/1", "x-occurrences/1"];
            const wScopes = ["x-occurrence/1", "x-occurrences/1"];
            t.plan(12 + (4 * zalnScopes.length) + (4 * wScopes.length));
            const query =
                '{ documents { mainSequence { blocks { c { ... on Token { subType chars }... on Scope { subType label }... on Graft { type sequenceId } } } } } }';
            const result = await pk.gqlQuery(query);
            t.ok("data" in result);
            const content = topNTailItems(result.data.documents[0].mainSequence.blocks[0].c);
            const zalnAtt = suffix => `attribute/milestone/zaln/${suffix}`;
            const wAtt = suffix => `attribute/spanWithAtts/w/${suffix}`;
            t.equal(content.length, 23);
            t.equal(content[0].subType, "startScope");
            t.equal(content[0].label, "milestone/zaln");
            for (const [n, s] of zalnScopes.entries()) {
                t.equal(content[n + 1].subType, "startScope");
                t.equal(content[n + 1].label, zalnAtt(s));
            }
            t.equal(content[8].subType, "startScope");
            t.equal(content[8].label, "spanWithAtts/w");
            for (const [n, s] of wScopes.entries()) {
                t.equal(content[n + 9].subType, "startScope");
                t.equal(content[n + 9].label, wAtt(s));
            }
            t.equal(content[11].subType, "wordLike");
            t.equal(content[11].chars, "Obadiah");
            for (const [n, s] of wScopes.entries()) {
                t.equal(content[13 - n].subType, "endScope");
                t.equal(content[13 - n].label, wAtt(s));
            }
            t.equal(content[14].subType, "endScope");
            t.equal(content[14].label, "spanWithAtts/w");
            t.equal(content[22].subType, "endScope");
            for (const [n, s] of zalnScopes.entries()) {
                t.equal(content[21 - n].subType, "endScope");
                t.equal(content[21 - n].label, zalnAtt(s));
            }
            t.equal(content[22].label, "milestone/zaln");
        } catch (err) {
            console.log(err)
        }
    }
);