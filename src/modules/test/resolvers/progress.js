// const {  progress, test, student, randomStudent } = require("../mongoDB");

const mongoDB = require("mongodb");
const { connectTodb } = require("../../../shared/db/connection");

const date = new Date();

const resolver = {
  Query: {
    progress: async (
      _,
      { testEvaluationType, testId, limit = 10 },
      { tenantDB }
    ) => {
      try {
        const { progress } = connectTodb(tenantDB);
        if (testEvaluationType == "Manual") {
          let pipeline = [
            {
              $addFields: {
                testsId: { $toObjectId: "$testId" },
              },
            },
            {
              $lookup: {
                from: "test",
                localField: "testsId",
                foreignField: "_id",
                as: "testMatches",
              },
            },
            {
              $match: {
                "testMatches.testEvaluationType": "Manual",
              },
            },
            { $limit: limit + 1 },
          ];
          if (testId) {
            pipeline.unshift({
              $match: {
                testId: testId,
              },
            });
          }

          const data = await progress
            .aggregate(pipeline)
            .sort({ _id: -1 })
            .toArray();

          return data;
        } else {
          const data = await progress.find({}).sort({ _id: -1 }).limit(1000).toArray();

          return data;
        }
      } catch (error) {
        return { err: error.message };
      }
    },
    progressLimit: async (_, { cursor, limit, skip }, { tenantDB }) => {
      try {
        const { progress } = connectTodb(tenantDB);
        if (!limit) limit = 10;
        if (limit > 500) limit = 500;
        const skipCount = skip || 0;
        let query = cursor
          ? { _id: { $gt: new mongoDB.ObjectId(cursor) } }
          : {};
        const data = await progress
          .find(query)
          .sort({ _id: -1 })
          .skip(skipCount)
          .limit(limit)
          .toArray();

        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
    progressTotal: async (_, args, { tenantDB }) => {
      try {
        const { progress } = connectTodb(tenantDB);
        const total = await progress.countDocuments({});
        return total;
      } catch (error) {
        return 0;
      }
    },
    progresses: async (_, args, { tenantDB }) => {
      try {
        const { progress } = connectTodb(tenantDB);
        const id = new mongoDB.ObjectId(args._id);

        const data = await progress.findOne({ _id: id });

        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
  },

  ProgressUnion: {
    __resolveType(obj, context, info) {
      if (obj._id) {
        return "Progress";
      }
      if (obj.err) {
        return "err";
      }
      return null;
    },
  },

  Progress: {
    testDetails: async (parent, _, { tenantDB }) => {
      if (!parent.testId) return [];
      const ids = parent.testId;
      const { test } = connectTodb(tenantDB);
      try {
        // for (c of ids) {
        const id = new mongoDB.ObjectId(ids);
        const data = await test.findOne({ _id: id });
        // }

        return data;
      } catch (error) {
        return error;
      }
    },

    studentDetails: async (parent, _, { tenantDB }) => {
      const { student, randomStudent } = connectTodb(tenantDB);
      if (!parent.studentId) return [];

      const ids = parent.studentId;
      try {
        const id = new mongoDB.ObjectId(ids);
        let data = await student.findOne({ _id: id });

        if (!data) data = await randomStudent.findOne({ _id: id });

        return data;
      } catch (error) {
        return error;
      }
    },
  },
};

module.exports = resolver;
