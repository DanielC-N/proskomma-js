const {
  generateId,
  nComponentsForScope,
  validateTags,
  addTag,
  removeTag,
} = require('proskomma-utils');
const {
  parseUsfm, parseUsx, parseLexicon,
} = require('../parser/lexers');
const { Parser } = require('../parser');

class Document {
  constructor(processor, docSetId, contentType, contentString, filterOptions, customTags, emptyBlocks, tags) {
    this.processor = processor;
    this.docSetId = docSetId;

    if (contentType) {
      this.id = generateId();
      this.filterOptions = filterOptions;
      this.customTags = customTags;
      this.emptyBlocks = emptyBlocks;
      this.tags = new Set(tags || []);
      validateTags(this.tags);
      this.headers = {};
      this.mainId = null;
      this.sequences = {};

      switch (contentType) {
      case 'usfm':
        this.processUsfm(contentString);
        break;
      case 'usx':
        this.processUsx(contentString);
        break;
      case 'lexicon':
        this.processLexicon(contentString);
        break;
      default:
        throw new Error(`Unknown document contentType '${contentType}'`);
      }
    }
  }

  addTag(tag) {
    addTag(this.tags, tag);
  }

  removeTag(tag) {
    removeTag(this.tags, tag);
  }

  makeParser() {
    return new Parser(
      this.filterOptions,
      this.customTags,
      this.emptyBlocks,
    );
  }

  processUsfm(usfmString) {
    const parser = this.makeParser();
    parseUsfm(usfmString, parser);
    this.postParseScripture(parser);
  }

  processUsx(usxString) {
    const parser = this.makeParser();
    parseUsx(usxString, parser);
    this.postParseScripture(parser);
  }

  postParseScripture(parser) {
    parser.tidy();
    parser.filter();
    this.headers = parser.headers;
    this.succinctPass1(parser);
    this.succinctPass2(parser);
  }

  processLexicon(lexiconString) {
    const parser = this.makeParser();
    parseLexicon(lexiconString, parser);
    this.headers = parser.headers;
    this.succinctPass1(parser);
    this.succinctPass2(parser);
  }

  succinctPass1(parser) {
    const docSet = this.processor.docSets[this.docSetId];

    for (const seq of parser.allSequences()) {
      docSet.recordPreEnum('ids', seq.id);
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
        if (item.itemType === 'wordLike') {
          docSet.recordPreEnum('wordLike', item.chars);
        } else if (['lineSpace', 'eol', 'punctuation', 'softLineBreak', 'bareSlash', 'unknown'].includes(item.itemType)) {
          docSet.recordPreEnum('notWordLike', item.chars);
        } else if (item.itemType === 'graft') {
          docSet.recordPreEnum('graftTypes', item.graftType);
        } else if (item.itemType === 'startScope') {
          const labelBits = item.label.split('/');

          if (labelBits.length !== nComponentsForScope(labelBits[0])) {
            throw new Error(`Scope ${item.label} has unexpected number of components`);
          }

          for (const labelBit of labelBits.slice(1)) {
            docSet.recordPreEnum('scopeBits', labelBit);
          }
        }
      }
    }
  }

  rerecordPreEnums(docSet, seq) {
    docSet.recordPreEnum('ids', seq.id);

    for (const block of seq.blocks) {
      for (const blockKey of ['bs', 'bg', 'c', 'is', 'os']) {
        this.rerecordBlockPreEnums(docSet, block[blockKey]);
      }
    }
  }

  rerecordBlockPreEnums(docSet, ba) {
    for (const item of docSet.unsuccinctifyItems(ba, {}, false)) {
      if (item[0] === 'token') {
        if (item[1] === 'wordLike') {
          docSet.recordPreEnum('wordLike', item[2]);
        } else {
          docSet.recordPreEnum('notWordLike', item[2]);
        }
      } else if (item[0] === 'graft') {
        docSet.recordPreEnum('graftTypes', item[1]);
      } else if (item[0] === 'startScope') {
        const labelBits = item[1].split('/');

        if (labelBits.length !== nComponentsForScope(labelBits[0])) {
          throw new Error(`Scope ${item[1]} has unexpected number of components`);
        }

        for (const labelBit of labelBits.slice(1)) {
          docSet.recordPreEnum('scopeBits', labelBit);
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
        tags: new Set(seq.tags),
        isBaseType: (seq.type in parser.baseSequenceTypes),
        blocks: seq.succinctifyBlocks(docSet),
      };
    }
  }

  rewriteSequenceBlocks(sequenceId, oldToNew) {
    const sequence = this.sequences[sequenceId];

    for (const block of sequence.blocks) {
      this.rewriteSequenceBlock(block, oldToNew);
    }
  }

  rewriteSequenceBlock(block, oldToNew) {
    const docSet = this.processor.docSets[this.docSetId];

    for (const blockKey of ['bs', 'bg', 'c', 'is', 'os']) {
      const ba = block[blockKey];

      for (const item of docSet.unsuccinctifyItems(ba, {}, false)) {
        if (item[0] === 'token') {
          if (item[1] === 'wordLike') {
          } else {
          }
        } else if (item[0] === 'graft') {
        } else if (item[0] === 'startScope') {
        }
      }
    }
  }

  serializeSuccinct() {
    const ret = { sequences: {} };
    ret.headers = this.headers;
    ret.mainId = this.mainId;
    ret.tags = Array.from(this.tags);

    for (const [seqId, seqOb] of Object.entries(this.sequences)) {
      ret.sequences[seqId] = this.serializeSuccinctSequence(seqOb);
    }
    return ret;
  }

  serializeSuccinctSequence(seqOb) {
    return {
      type: seqOb.type,
      blocks: seqOb.blocks.map(b => this.serializeSuccinctBlock(b)),
      tags: Array.from(seqOb.tags),
    };
  }

  serializeSuccinctBlock(blockOb) {
    return {
      bs: blockOb.bs.base64(),
      bg: blockOb.bg.base64(),
      c: blockOb.c.base64(),
      is: blockOb.is.base64(),
      os: blockOb.os.base64(),
    };
  }
}

module.exports = { Document };
