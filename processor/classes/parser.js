const { Sequence } = require("./sequence");
const { specs } = require("../resources/parser_specs");
const { Token, Scope } = require("./items");
const { labelForScope } = require("../label_for_scope");

const Parser = class {

    constructor() {
        this.specs = specs;
        this.headers = {};
        this.setSequenceTypes();
        this.setSequences();
        this.setCurrent();
    }

    setSequenceTypes() {
        this.baseSequenceTypes = {
            main: "1",
            intro: "*",
            title: "?",
            endTitle: "?",
            heading: "*",
            header: "*",
            remark: "*",
            footnote: "*"
        };
        this.inlineSequenceTypes = {
            xref: "*",
            temp: "?"
        };
    }

    setSequences() {
        this.sequences = {};
        for (const [sType, sArity] of Object.entries({...this.baseSequenceTypes, ...this.inlineSequenceTypes})) {
            switch (sArity) {
                case "1":
                    this.sequences[sType] = new Sequence(sType);
                    break;
                case "?":
                    this.sequences[sType] = null;
                    break;
                case "*":
                    this.sequences[sType] = [];
                    break;
                default:
                    throw new Error(`Unexpected sequence arity '${sArity}' for '${sType}'`);
            }
        }
    }

    setCurrent() {
        this.current = {
            sequence: this.sequences.main,
            baseSequenceType: "main",
            inlineSequenceType: null
        }
    }

    parse(lexedItems) {
        this.parseFirstPass(lexedItems);
        for (const seq of this.allSequences()) {
            seq.close(this);
        }
        console.log(JSON.stringify(this.sequences.main.lastBlock()));
    }

    parseFirstPass(lexedItems) {
        let changeSequence;
        for (const lexedItem of lexedItems) {
            const spec = this.specForItem(lexedItem);
            if (spec) {
                if ("before" in spec.parser) {
                    spec.parser.before(this, lexedItem);
                }
                changeSequence = spec.parser.baseSequenceType && (
                    (spec.parser.baseSequenceType !== this.current.baseSequenceType) ||
                    spec.parser.forceNewSequence
                );
                if (changeSequence) {
                    this.closeActiveScopes(spec.parser, "baseSequenceChange");
                    this.changeBaseSequence(spec.parser);
                }
                if ("newBlock" in spec.parser) {
                    this.closeActiveScopes(spec.parser, "endBlock");
                    this.current.sequence.newBlock(labelForScope("blockTag", [lexedItem.fullTagName]));
                    const blockScope = {
                        label: pt => labelForScope("blockTag", [pt.fullTagName]),
                        endedBy: ["endBlock"]
                    };
                    this.openNewScope(lexedItem, blockScope);
                }
                if ("during" in spec.parser) {
                    spec.parser.during(this, lexedItem);
                }
                if (changeSequence) {
                    this.openNewScopes(spec.parser, lexedItem);
                }
                if ("after" in spec.parser) {
                    spec.parser.after(this, lexedItem);
                }
            }
        }
    }

    allSequences() {
        const ret = [];
        for (const [seqName, seqArity] of Object.entries({...this.baseSequenceTypes, ...this.inlineSequenceTypes})) {
            switch (seqArity) {
                case "1":
                case "?":
                    if (this.sequences[seqName]) {
                        ret.push(this.sequences[seqName]);
                    }
                    break;
                case "*":
                    this.sequences[seqName].forEach(s => {ret.push(s)});
                    break;
                default:
                    throw new Error(`Unexpected sequence arity '${seqArity}' for '${seqName}'`);
            }
        }
        return ret;
    }

    specForItem(item) {
        let ret = null;
        for (const spec of this.specs) {
            if (this.specMatchesItem(spec, item)) {
                ret = spec;
                break;
            }
        }
        return ret;
    }

    specMatchesItem(spec, item) {
        for (const [subclass, accessor, values] of spec.contexts) {
            if (
                (item.subclass === subclass) &&
                (!accessor || values.includes(item[accessor]))
            ) {
                return true;
            }
        }
        return false;
    }

    closeActiveScopes(parserSpec, closeLabel) {
        const matchedScopes = this.current.sequence.activeScopes.filter(
            sc => sc.endedBy.includes(closeLabel)
        );
        const parser = this;
        matchedScopes.forEach(ms => this.closeActiveScope(ms));
        this.current.sequence.activeScopes = this.current.sequence.activeScopes.filter(
            sc => !sc.endedBy.includes(closeLabel)
        );
    }

    closeActiveScope(sc) {
        this.addScope("close", sc.label);
        if (sc.onEnd) {
            sc.onEnd(this, sc.label);
        }
    }

changeBaseSequence(parserSpec) {
        const newType = parserSpec.baseSequenceType
        this.current.baseSequenceType = newType;
        const arity = this.baseSequenceTypes[newType];
        switch (arity) {
            case "1":
                this.current.sequence = this.sequences[newType];
                break;
            case "?":
                if (!this.sequences[newType]) {
                    this.sequences[newType] = new Sequence(newType);
                }
                this.current.sequence = this.sequences[newType];
                break;
            case "*":
                this.current.sequence = new Sequence(newType);
                if (!parserSpec.useTempSequence) {
                    this.sequences[newType].push(this.current.sequence);
                }
                break;
            default:
                throw new Error(`Unexpected base sequence arity '${arity}' for '${newType}'`);
        }
    }

    openNewScopes(parserSpec, pt) {
        parserSpec.newScopes.forEach(sc => this.openNewScope(pt, sc));
    }

    openNewScope(pt, sc) {
        const newScope = {
            label: sc.label(pt),
            endedBy: sc.endedBy
        };
        if ("onEnd" in sc) {
            newScope.onEnd = sc.onEnd;
        }
        this.current.sequence.activeScopes.push(newScope);
    }

    addToken(pt) {
        this.current.sequence.addItem(new Token(pt));
    }

    addScope(sOrE, label) {
    this.current.sequence.addItem(new Scope(sOrE, label));
}

}

module.exports = {Parser};
