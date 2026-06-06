// const {
//     Business,
//     Integrations

//   } = require("../mongoDB");

const mongoDB = require("mongodb");
const { connectTodb } = require("../../../shared/db/connection");

const date = new Date();
const resolvers = {
  Query: {
    business: async (_, args, { tenantDb }) => {
      try {
        const { Business, Integrations } = connectTodb(tenantDb);
        const id = new mongoDB.ObjectId(args.id);
        const data = await Business.findOne({ _id: id });
        const { integrations } = data;
        const newIntegrationDataPromise = integrations
          .filter((e) => e.tkId)
          .map((e) => Integrations.findOne({ _id: e.tkId }));
        const finalIntegrationsValue = await Promise.allSettled(
          newIntegrationDataPromise
        );
        data.integrations = integrations.map((e) => {
          if (e.tkId) {
            let data = { ...e };
            const integrationData = {
              ...finalIntegrationsValue.find(
                (res) => res.value._id.toString() == e.tkId.toString()
              ).value,
            };
            delete integrationData._id;
            delete integrationData.active;
            return {
              ...data,
              ...integrationData,
            };
          }
          return e;
        });
        return data;
      } catch (error) {
        return { err: error.message };
      }
    },
  },

  BusinessUnion: {
    __resolveType(obj, context, info) {
      if (obj._id) {
        return "Business";
      }
      if (obj.err) {
        return "err";
      }
      return null;
    },
  },
};

module.exports = resolvers;
