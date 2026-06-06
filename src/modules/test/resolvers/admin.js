const { connectTodb } = require("../../../shared/db/connection");
// const { course, admin } = require("../mongoDB");

const mongoDB = require("mongodb");

const date = new Date();
const resolvers = {
  Query: {
    admins: async (_, _, { tenantDB }) => {
      try {
        const { admin } = connectTodb(tenantDB);
        const data = await admin.find({}).toArray();
        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
    admin: async (_, args, { tenantDB }) => {
      try {
        const { admin } = connectTodb(tenantDB);
        const id = new mongoDB.ObjectId(args.id);
        const data = await admin.findOne({ _id: id });

        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
  },

  AdminUnion: {
    __resolveType(obj, context, info) {
      if (obj._id) {
        return "Admin";
      }
      if (obj.err) {
        return "err";
      }
      return null;
    },
  },
};

module.exports = resolvers;
