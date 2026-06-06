const mongoDB = require("mongodb");

const { connectTodb } = require("../../../shared/db/connection");

const date = new Date();

const resolvers = {
  Query: {
    students: async (_, args, { req, tenantDB }) => {
      try {
        const { student } = connectTodb(tenantDB);
        const data = await student.find({}).toArray();
        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
    student: async (_, args, { req, tenantDB }) => {
      try {
        const { student } = connectTodb(tenantDB);
        const id = new mongoDB.ObjectId(args._id);

        const data = await student.findOne({ _id: id });
        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
  },

  StudentUnion: {
    __resolveType(obj, context, info) {
      if (obj._id) {
        return "Student";
      }
      if (obj.err) {
        return "err";
      }
      return null;
    },
  },

  Student: {
    progress: async (parent, _, {tenantDB}) => {
      if (!parent.progress) return [];
      const { progress, test } = connectTodb(tenantDB);
      const ids = parent.progress;

      let res = [];
      try {
        for (c of ids) {
          const id = new mongoDB.ObjectId(c);
          const data = await progress.findOne({ _id: id });

          res.push(data);
        }
      } catch (error) {
        return { err: error.message };
      }

      return res;
    },
    tests: async (parent, _, { tenantDB }) => {
      if (!parent.tests) return [];
      const { test } = connectTodb(tenantDB);
      const ids = parent.tests;

      let res = [];
      try {
        for (c of ids) {
          const id = new mongoDB.ObjectId(c);
          const data = await test.findOne({ _id: id });

          res.push(data);
        }
      } catch (error) {
        return { err: error.message };
      }

      return res;
    },
  },
};

module.exports = resolvers;
