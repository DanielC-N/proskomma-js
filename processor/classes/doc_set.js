const {generateId} = require("../generate_id");
const ByteArray = require("../../lib/byte_array");

class DocSet {

    constructor(processor, lang, abbr) {
        this.id = generateId();
        this.processor = processor;
        this.lang = lang;
        this.abbr = abbr;
        this.preEnums = {};
        this.enums = {
            ids: new ByteArray(),
            wordLike: new ByteArray(),
            notWordLike: new ByteArray(),
            scopeBits: new ByteArray(),
            graftTypes: new ByteArray(),
        };
        this.docIds = [];
    }

    buildPreEnums() {
        for (const [category, succinct] of Object.entries(this.enums)) {
            this.preEnums[category] = this.buildPreEnum(succinct);
        }
    }

    buildPreEnum(succinct) {
        const ret = {};
        let pos = 0;
        let enumCount = 0;
        while (pos < succinct.length) {
            ret[succinct.countedString(pos)] = {
                "enum": enumCount++,
                frequency: 0
            };
            pos += succinct.byte(pos);
        }
        return ret;
    }

    recordPreEnum(category, value) {
        if (!(category in this.preEnums)) {
            throw new Error(`Unknown category ${category} in recordPreEnum. Maybe call buildPreEnums()?`);
        }
        if (!(value in this.preEnums[category])) {
            this.preEnums[category][value] = {
                "enum": Object.keys(this.preEnums[category]).length,
                frequency: 1
            }
        } else {
            this.preEnums[category][value].frequency++;
        }
    }

    sortPreEnums() {
        for (const category of Object.values(this.preEnums)) {
            let count = 0;
            for (const [k, v] of Object.entries(category).sort((a, b) => b[1].frequency - a[1].frequency)) {
                v.enum = count++;
            }
        }
    }

    enumForCategoryValue(category, value) {
        if (!(category in this.preEnums)) {
            throw new Error(`Unknown category ${category} in recordPreEnum. Maybe call buildPreEnums()?`);
        }
        if (value in this.preEnums[category]) {
            return this.preEnums[category][value];
        } else {
            throw new Error(`Unknown value ${value} for category ${category} in enumForCategoryValue. Maybe call buildPreEnums()?`);
        }
    }

    describe() {
        console.log(
            JSON.stringify(
                this,
                (k, v) => {
                    if (["processor"].includes(k)) {
                        return "(circular)";
                    } else if (v instanceof ByteArray) {
                        return `ByteArray(length=${v.length})`
                    } else {
                        return v;
                    }
                },
                2
            )
        );
    }

}

module.exports = {DocSet}
