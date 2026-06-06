const { connectTodb } = require("../../../shared/db/connection");
// const { languages } = require("../mongoDB");
const mongoDB = require("mongodb");

const date = new Date();
const resolvers = {
  Query: {
    language: async (_, args, { tenantDB }) => {
      try {
        const { languages } = connectTodb(tenantDB);
        const data = await languages.find({ type: args.type }).toArray();
        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
  },
};

module.exports = resolvers;
