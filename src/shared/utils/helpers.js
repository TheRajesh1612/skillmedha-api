module.exports.parseIfJSON = (str) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return str;
  }
};
