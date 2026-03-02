function assertNoError(error, context) {
  if (error) {
    const wrapped = new Error(`${context}: ${error.message}`);
    wrapped.cause = error;
    throw wrapped;
  }
}

module.exports = {
  assertNoError
};
