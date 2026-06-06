
const path = require("path");
// require("dotenv").config({
//   path: path.resolve(__dirname, "../../.env")
// });
require("dotenv").config({
  path: "../../.env",
});
const express = require("express");
const { ApolloServer } = require("apollo-server-express");

const { optional: authenticate } = require("./../../shared/middleware/auth.middleware");
const { selectTenantDB } = require("./../../shared/middleware/selectTenantDB.middleware");

const typeDefs = require("./schema/index");
const resolvers = require("./resolvers/index");

async function initializeApolloServer(parentApp, mountPath = "/gql") {
  const router = express.Router();

  router.use(authenticate);

  router.use((req, res, next) => {
    if (req.method === "GET" && req.path === "/") {
      return next();
    }
    return selectTenantDB(req, res, next);
  });

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req, res }) => ({
      req,
      res,
      user: req.user,
      tenantDB: req.tenantDB,
    }),
  });

  await server.start();

  server.applyMiddleware({
    app: router,
    path: "/",
    cors: {
      credentials: true,
      origin: "*",
    },
  });

  parentApp.use(mountPath, router);
  return router;
}

module.exports = { initializeApolloServer };