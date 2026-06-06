const { connectTodb } = require("../../../shared/db/connection");
// const { categories } = require("../mongoDB");

const mongoDB = require("mongodb");

const date = new Date();
const resolvers = {
  Query: {
    category: async (_, args, { tenantDB }) => {
      try {
        const { categories } = connectTodb(tenantDB);
        const data = await categories.find({ type: args.type }).toArray();
        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
  },
};

module.exports = resolvers;
