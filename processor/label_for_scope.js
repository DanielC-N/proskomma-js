const labelForScope = (scopeType, scopeFields) => {
    switch (scopeType) {
        case "blockTag":
            return `block/${scopeFields[0]}`;
        case "inline":
            return `inline/${scopeFields[0]}`;
        default:
            throw new Error(`Unknown scope type '${scopeType}' in labelForScope`);
    }
}

module.exports = { labelForScope };