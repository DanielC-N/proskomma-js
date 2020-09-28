const { generateId } = require("../lib/generate_id");
const { lexifyUsfm, lexifyUsx } = require("../lexers");
const { Parser } = require("../parser");
const { nComponentsForScope } = require('../resources/scope_defs');

class Document {

    constructor(processor, lang, abbr, docSetId, contentType, contentString, filterOptions) {
        this.id = generateId();
        this.processor = processor;
        this.docSetId = docSetId;
        this.headers = {};
        this.mainId = null;
        this.sequences = {};
        switch (contentType) {
            case "usfm":
                this.processUsfm(contentString, filterOptions);
                break;
            case "usx":
                this.processUsx(contentString, filterOptions);
                break;
            default:
                throw new Error(`Unknown document contentType '${contentType}'`);
        }
    }

    mainSequence() {
        return this.sequences[this.mainId];
    }

    processUsfm(usfmString, filterOptions) {
        const lexed = lexifyUsfm(usfmString);
        this.processLexed(lexed, filterOptions);
    }

    processUsx(usxString, filterOptions) {
        const lexed = lexifyUsx(usxString);
        this.processLexed(lexed, filterOptions);
    }

    processLexed(lexed, filterOptions) {
        // console.log(JSON.stringify(lexed, null, 2))
        const parser = new Parser();
        parser.parse(lexed);
        parser.tidy();
        parser.filter(filterOptions);
        this.headers = parser.headers;
        this.succinctPass1(parser);
        this.succinctPass2(parser);
    }

    succinctPass1(parser) {
        const docSet = this.processor.docSets[this.docSetId];
        docSet.buildPreEnums();
        for (const seq of parser.allSequences()) {
            docSet.recordPreEnum("ids", seq.id);
            this.recordPreEnums(docSet, seq);
        }
        if (docSet.enums.wordLike.length === 0) {
            docSet.sortPreEnums();
        }
        docSet.buildEnums();
    }

    recordPreEnums(docSet, seq) {
        for (const block of seq.blocks) {
            for (const item of [...block.items, block.blockScope, ...block.blockGrafts]) {
                if (item.itemType === "wordLike") {
                    docSet.recordPreEnum("wordLike", item.chars);
                } else if (["lineSpace", "eol", "punctuation"].includes(item.itemType)) {
                    docSet.recordPreEnum("notWordLike", item.chars);
                } else if (item.itemType === "graft") {
                    docSet.recordPreEnum("graftTypes", item.graftType);
                } else if (item.itemType === "startScope") {
                    const labelBits = item.label.split("/");
                    if (labelBits.length !== nComponentsForScope(labelBits[0])) {
                        throw new Error(`Scope ${item.label} has unexpected number of components`);
                    }
                    for (const labelBit of labelBits.slice(1)) {
                        docSet.recordPreEnum("scopeBits", labelBit);
                    }
                }
            }
        }
    }

    succinctPass2(parser) {
        const docSet = this.processor.docSets[this.docSetId];
        this.mainId = parser.sequences.main.id;
        for (const seq of parser.allSequences()) {
            this.sequences[seq.id] = {
                id: seq.id,
                type: seq.type,
                isBaseType: (seq.type in parser.baseSequenceTypes),
                blocks: seq.succinctifyBlocks(docSet)
            };
        }
        docSet.preEnums = {};
    }

    unsuccinctifySequence(seqId, options) {
        const sequence = this.sequences[seqId];
        const ret = [];
        for (const block of sequence.blocks) {
            ret.push(this.unsuccinctifyBlock(block, options));
        }
        return ret;
    }

    unsuccinctifyBlock(block, options) {
        const docSet = this.processor.docSets[this.docSetId];
        docSet.unsuccinctifyBlock(block, options);
    }

    serializeSuccinct() {
        const ret = {sequences: {}};
        ret.headers = this.headers;
        ret.mainId = this.mainId;
        for (const [seqId, seqOb] of Object.entries(this.sequences)) {
            ret.sequences[seqId] = this.serializeSuccinctSequence(seqOb);
        }
        return ret;
    }

    serializeSuccinctSequence(seqOb) {
        const ret = {
            type: seqOb.type,
            blocks: seqOb.blocks.map(b => this.serializeSuccinctBlock(b))
        }
        return ret;
    }

    serializeSuccinctBlock(blockOb) {
        return {
            bs: blockOb.bs.base64(),
            bg: blockOb.bg.base64(),
            c: blockOb.c.base64()
        };
    }

    describe() {
        console.log(
            JSON.stringify(
                this,
                (k, v) => {
                    if (["processor"].includes(k)) {
                        return "(circular)";
                    } else if (k === "blocks") {
                        return v.map(b => `ByteArray(length=${b.c.length})`)
                    } else {
                        return v;
                    }
                },
                2
            )
        );
    }

}

module.exports = { Document }
