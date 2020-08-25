const fse = require('fs-extra');

const { ProsKomma } = require('..');

const usfm = fse.readFileSync("/home/mark/sag-usfm/eng/ult/2ki.usfm");
const pk = new ProsKomma();
console.log(pk.importDocument("eng", "ust", usfm));
