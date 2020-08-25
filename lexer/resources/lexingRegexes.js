const xre = require('xregexp');

module.exports = [
    [
        "chapter",
        "chapter",
        xre("([\\r\\n]*\\\\c[ \\t]+(\\d+)[ \\t\\r\\n]*)")
    ],
    [
        "verses",
        "verses",
        xre("([\\r\\n]*\\\\v[ \\t]+([\\d\\-]+)[ \\t\\r\\n]*)")
    ],
    [
        "attribute",
        "attribute",
        xre("([ \\t]*\\|?[ \\t]*([A-Za-z0-9\\-]+)=\"([^\"]*)\"[ \\t]?)")
    ],
    [
        "milestone",
        "emptyMilestone",
        xre("(\\\\([a-z1-9]+)\\\\[*])")
    ],
    [
        "milestone",
        "startMilestoneTag",
        xre("(\\\\([a-z1-9]+)-([se]))")
    ],
    [
        "milestone",
        "endMilestoneTag",
        xre("(\\\\([*]))")
    ],
    [
        "tag",
        "endTag",
        xre("(\\\\([a-z1-9\\-]+)[*][ \\t]?)")
    ],
    [
        "tag",
        "startTag",
        xre("(\\\\([a-z1-9\\-]+)[ \\t]?)")
    ],
    [
        "bad",
        "bareSlash",
        xre("(\\\\)")
    ],
    [
        "printable",
        "eol",
        xre("([ \\t]*[\\r\\n]+[ \\t]*)")
    ],
    [
        "break",
        "noBreakSpace",
        xre("~")
    ],
    [
        "break",
        "softLineBreak",
        xre("//")
    ],
    [
        "printable",
        "wordLike",
        xre("([\\p{Letter}\\p{Number}\\p{Mark}\\u2060]+)")
    ],
    [
        "printable",
        "lineSpace",
        xre("([\\p{Separator}]+)")
    ],
    [
        "printable",
        "punctuation",
        xre("([\\p{Punctuation}+®])")
    ],
    [
        "bad",
        "unknown",
        xre("(.)")
    ]
];