const {Sequence} = require("./sequence");
const {specs} = require("../resources/parser_specs");
const {Token, Scope, Graft} = require("./items");
const {labelForScope} = require("../label_for_scope");

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
            parentSequence: null,
            baseSequenceType: "main",
            inlineSequenceType: null,
            attributeContext: null
        }
    }

    parse(lexedItems) {
        let changeBaseSequence;
        for (const lexedItem of lexedItems) {
            if (["endTag"].includes(lexedItem.subclass)) {
                this.closeActiveScopes(`endTag/${lexedItem.fullTagName}`)
            }
            if (["startMilestoneTag"].includes(lexedItem.subclass) && lexedItem.sOrE === "e") {
                this.closeActiveScopes(`endMilestone/${lexedItem.tagName}`)
            }
            if (["chapter", "verses"].includes(lexedItem.subclass)) {
                this.closeActiveScopes(lexedItem.subclass);
            }
            const spec = this.specForItem(lexedItem);
            if (spec) {
                if ("before" in spec.parser) {
                    spec.parser.before(this, lexedItem);
                }
                changeBaseSequence = spec.parser.baseSequenceType && (
                    (spec.parser.baseSequenceType !== this.current.baseSequenceType) ||
                    spec.parser.forceNewSequence
                );
                if (changeBaseSequence) {
                    this.closeActiveScopes("baseSequenceChange");
                    this.changeBaseSequence(spec.parser);
                    if ("newBlock" in spec.parser) {
                        this.closeActiveScopes("endBlock");
                        this.current.sequence.newBlock(labelForScope("blockTag", [lexedItem.fullTagName]));
                        const blockScope = {
                            label: pt => labelForScope("blockTag", [pt.fullTagName]),
                            endedBy: ["endBlock"]
                        };
                        this.openNewScope(lexedItem, blockScope, false);
                    }
                } else if (spec.parser.inlineSequenceType) {
                    this.current.inlineSequenceType = spec.parser.inlineSequenceType;
                    this.current.parentSequence = this.current.sequence;
                    this.current.sequence = new Sequence(this.current.inlineSequenceType);
                    this.current.sequence.newBlock();
                    this.sequences[this.current.inlineSequenceType].push(this.current.sequence);
                    this.current.parentSequence.addItem(new Graft(this.current.inlineSequenceType, this.current.sequence.id))
                }
                if ("during" in spec.parser) {
                    spec.parser.during(this, lexedItem);
                }
                this.openNewScopes(spec.parser, lexedItem);
                if ("after" in spec.parser) {
                    spec.parser.after(this, lexedItem);
                }
            }
        }
    }

    tidy() {
        for (const seq of this.allSequences()) {
            seq.trim();
            seq.reorderSpanWithAtts();
            seq.close(this);
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
                    this.sequences[seqName].forEach(s => {
                        ret.push(s)
                    });
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

    closeActiveScopes(closeLabel) {
        const matchedScopes = this.current.sequence.activeScopes.filter(
            sc => sc.endedBy.includes(closeLabel)
        ).reverse();
        this.current.sequence.activeScopes = this.current.sequence.activeScopes.filter(
            sc => !sc.endedBy.includes(closeLabel)
        );
        matchedScopes.forEach(ms => this.closeActiveScope(ms));
    }

    closeActiveScope(sc) {
        this.addScope("end", sc.label);
        if (sc.onEnd) {
            sc.onEnd(this, sc.label);
        }
    }

    changeBaseSequence(parserSpec) {
        const previousSequence = this.current.sequence;
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
        if (!parserSpec.useTempSequence) {
            previousSequence.addItem(new Graft(this.current.baseSequenceType, this.current.sequence.id))
        }
    }

    returnToBaseSequence() {
        this.current.inlineSequenceType = null;
        this.current.sequence = this.current.parentSequence;
        this.current.parentSequence = null;
    }

    openNewScopes(parserSpec, pt) {
        if (parserSpec.newScopes) {
            parserSpec.newScopes.forEach(sc => this.openNewScope(pt, sc));
        }
    }

    openNewScope(pt, sc, addItem) {
        if (addItem === undefined) {addItem = true};
        if (addItem) {
            this.current.sequence.addItem(new Scope("start", sc.label(pt)));
        }
        const newScope = {
            label: sc.label(pt),
            endedBy: this.substituteEndedBys(sc.endedBy, pt)
        };
        if ("onEnd" in sc) {
            newScope.onEnd = sc.onEnd;
        }
        this.current.sequence.activeScopes.push(newScope);
    }

    substituteEndedBys(endedBy, pt) {
        const r = endedBy.map(
            eb => {
                let ret = eb
                    .replace("$fullTagName$", pt.fullTagName)
                    .replace("$tagName$", pt.tagName);
                if (this.current.attributeContext) {
                    ret = ret.replace(
                        "$attributeContext$",
                        this.current.attributeContext
                            .replace("milestone", "endMilestone")
                            .replace("spanWithAtts", "endTag")
                    );
                }
                return ret;
            }
        );
        return r;
    }

    addToken(pt) {
        this.current.sequence.addItem(new Token(pt));
    }

    addScope(sOrE, label) {
        this.current.sequence.addItem(new Scope(sOrE, label));
    }

    addEmptyMilestone(label) {
        this.current.sequence.addItem(new Scope("start", label));
        this.current.sequence.addItem(new Scope("end", label));
    }

    setAttributeContext(label) {
        this.current.attributeContext = label;
    }

    clearAttributeContext() {
        this.current.attributeContext = null;
    }

}

module.exports = {Parser};
